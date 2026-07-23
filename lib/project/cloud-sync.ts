import type { TechPackProject } from "@/types/project";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  mergeProjectsPreferNewer,
  projectToRow,
  rowToProject,
  type TechPackRow,
} from "@/lib/project/cloud-map";
import { migrateProject } from "@/lib/project/hotspots";

async function currentUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function isLoggedInForCloud(): Promise<boolean> {
  return Boolean(await currentUserId());
}

export async function fetchCloudProjects(): Promise<TechPackProject[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tech_packs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as TechPackRow[]).map((row) =>
    migrateProject(rowToProject(row)),
  );
}

export async function fetchCloudProject(
  id: string,
): Promise<TechPackProject | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tech_packs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return migrateProject(rowToProject(data as TechPackRow));
}

/** 登录时：先尽量上传图片，再把表数据（含图片引用）写到云端 */
export async function mirrorSaveToCloud(
  project: TechPackProject,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "not_logged_in" };
  try {
    const { uploadProjectImagesForCloud } = await import(
      "@/lib/project/cloud-images"
    );
    const withImages = await uploadProjectImagesForCloud(project, userId);
    const supabase = createClient();
    const row = projectToRow(withImages, userId);
    const { error } = await supabase.from("tech_packs").upsert(row, {
      onConflict: "id",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "cloud_save_failed",
    };
  }
}

export async function mirrorDeleteFromCloud(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "not_logged_in" };
  try {
    const { removeStyleImagesForProject } = await import(
      "@/lib/project/cloud-images"
    );
    await removeStyleImagesForProject(userId, id);
    const supabase = createClient();
    const { error } = await supabase
      .from("tech_packs")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "cloud_delete_failed",
    };
  }
}

export async function mergeLocalWithCloud(
  localList: TechPackProject[],
): Promise<TechPackProject[]> {
  try {
    const cloud = await fetchCloudProjects();
    if (cloud.length === 0) return localList;
    return mergeProjectsPreferNewer(localList, cloud);
  } catch {
    return localList;
  }
}

export async function mergeOneLocalWithCloud(
  id: string,
  local: TechPackProject | null,
): Promise<TechPackProject | null> {
  try {
    const cloud = await fetchCloudProject(id);
    if (!local && !cloud) return null;
    if (!local) return cloud;
    if (!cloud) return local;
    return mergeProjectsPreferNewer([local], [cloud])[0] ?? local;
  } catch {
    return local;
  }
}

/** 从云端拉取并写入本机缓存（登录后 / 换设备） */
export async function pullAllFromCloudAndCache(): Promise<{
  pulled: number;
  cached: number;
  message: string;
  ok: boolean;
}> {
  if (!(await isLoggedInForCloud())) {
    return {
      pulled: 0,
      cached: 0,
      ok: false,
      message: "还没登录，请先登录再从云端拉取。",
    };
  }
  try {
    const { listLocalProjectsOnly, cacheProjectsDurable } = await import(
      "@/lib/project/storage"
    );
    const cloud = await fetchCloudProjects();
    const local = await listLocalProjectsOnly();
    const merged = mergeProjectsPreferNewer(local, cloud);
    const cached = await cacheProjectsDurable(merged);
    const { reportCloudSyncResult } = await import("@/lib/project/sync-status");
    const message =
      cloud.length === 0
        ? "云端暂时没有项目。本机有的仍在；可点「同步到云端」上传。"
        : `已从云端合并 ${cloud.length} 个项目到本机缓存（共 ${cached} 条）。`;
    reportCloudSyncResult({ ok: true, message });
    return { pulled: cloud.length, cached, message, ok: true };
  } catch (err) {
    const message =
      err instanceof Error
        ? `拉取失败：${err.message}（请检查网络后重试）`
        : "拉取失败，请检查网络后重试。";
    const { reportCloudSyncResult } = await import("@/lib/project/sync-status");
    reportCloudSyncResult({ ok: false, message, offlineHint: true });
    return { pulled: 0, cached: 0, message, ok: false };
  }
}

/** 登录后：先拉云端到本机，再把本机差额推上去 */
export async function syncAfterLogin(): Promise<{
  ok: boolean;
  message: string;
}> {
  const pull = await pullAllFromCloudAndCache();
  const { listLocalProjectsOnly } = await import("@/lib/project/storage");
  const local = await listLocalProjectsOnly();
  const push = await pushAllLocalProjectsToCloud(local);
  const ok = pull.ok && (push.skipped || push.fail === 0);
  const message = `${pull.message} ${push.message}`;
  const { reportCloudSyncResult } = await import("@/lib/project/sync-status");
  reportCloudSyncResult({
    ok,
    message,
    offlineHint: !ok,
  });
  return { ok, message };
}

/** 把本机全部项目尽量推到云端（登录后一键用） */
export async function pushAllLocalProjectsToCloud(
  localList: TechPackProject[],
): Promise<{
  ok: number;
  fail: number;
  skipped: boolean;
  message: string;
}> {
  if (!(await isLoggedInForCloud())) {
    return {
      ok: 0,
      fail: 0,
      skipped: true,
      message: "还没登录，请先登录再同步到云端。",
    };
  }
  if (localList.length === 0) {
    try {
      const cloud = await fetchCloudProjects();
      if (cloud.length > 0) {
        return {
          ok: 0,
          fail: 0,
          skipped: true,
          message: `云端已有 ${cloud.length} 个项目；本机没有新的要上传。`,
        };
      }
    } catch {
      /* ignore */
    }
    return {
      ok: 0,
      fail: 0,
      skipped: true,
      message: "本机没有项目可同步。",
    };
  }
  let ok = 0;
  let fail = 0;
  for (const p of localList) {
    const res = await mirrorSaveToCloud(p);
    if (res.ok) ok += 1;
    else fail += 1;
  }
  const message =
    fail === 0
      ? `已同步 ${ok} 个项目到云端（含图片上传，可能稍慢）。`
      : `成功 ${ok} 个，失败 ${fail} 个。本机未丢，可稍后重试。`;
  const { reportCloudSyncResult } = await import("@/lib/project/sync-status");
  reportCloudSyncResult({
    ok: fail === 0,
    message,
    offlineHint: fail > 0,
  });
  return {
    ok,
    fail,
    skipped: false,
    message,
  };
}

export { mergeProjectsPreferNewer };
