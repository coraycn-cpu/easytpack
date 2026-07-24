import type { TechPackProject } from "@/types/project";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { getCachedAuthUserId } from "@/lib/supabase/auth-cache";
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
  return getCachedAuthUserId();
}

export async function isLoggedInForCloud(): Promise<boolean> {
  return Boolean(await currentUserId());
}

/** 列表用瘦字段（不含大 jsonb） */
export type CloudProjectMeta = {
  id: string;
  title: string;
  status: string;
  workflow_status: string;
  updated_at: string;
  created_at: string;
  style_no: string | null;
};

const LIST_META_SELECT =
  "id, title, status, workflow_status, updated_at, created_at, style_no";

export async function fetchCloudProjectMetas(): Promise<CloudProjectMeta[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tech_packs")
    .select(LIST_META_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CloudProjectMeta[];
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

/** 并行拉取若干完整项目（限制并发，避免打爆网络） */
async function fetchCloudProjectsByIds(
  ids: string[],
  concurrency = 4,
): Promise<TechPackProject[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return [];
  const out: TechPackProject[] = [];
  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const id = unique[i++];
      const p = await fetchCloudProject(id);
      if (p) out.push(p);
    }
  }
  const n = Math.min(concurrency, unique.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
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
    // M3：定稿 / 审阅中自动写版本快照（同 updatedAt 去重）
    try {
      const { writePackVersionAfterCloudSave } = await import(
        "@/lib/project/pack-versions"
      );
      await writePackVersionAfterCloudSave(
        supabase,
        withImages,
        userId,
        "mirror_save",
      );
    } catch (verErr) {
      console.warn("[pack-versions]", verErr);
    }
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

/**
 * 本机与云端合并：先拉瘦列表，只对「云端更新 / 仅云端有」的项目拉整包。
 * 本机已是最新时避免把所有 jsonb 再下载一遍。
 */
export async function mergeLocalWithCloud(
  localList: TechPackProject[],
): Promise<TechPackProject[]> {
  try {
    // 本机空：一次 select * 往往比 N 次按 id 拉取更省
    if (localList.length === 0) {
      const cloud = await fetchCloudProjects();
      if (cloud.length === 0) return localList;
      return mergeProjectsPreferNewer(localList, cloud);
    }

    const metas = await fetchCloudProjectMetas();
    if (metas.length === 0) return localList;

    const localById = new Map(localList.map((p) => [p.id, p]));
    const needFull: string[] = [];
    for (const m of metas) {
      const local = localById.get(m.id);
      if (!local) {
        needFull.push(m.id);
        continue;
      }
      const localT = Date.parse(local.updatedAt) || 0;
      const cloudT = Date.parse(m.updated_at) || 0;
      if (cloudT > localT) needFull.push(m.id);
    }

    // 几乎都要整包时，退回一次 select *
    if (needFull.length >= Math.max(3, metas.length)) {
      const cloud = await fetchCloudProjects();
      return mergeProjectsPreferNewer(localList, cloud);
    }

    const cloudFull = await fetchCloudProjectsByIds(needFull);
    return mergeProjectsPreferNewer(localList, cloudFull);
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
  // 并发上传，避免登录/同步时一个项目卡住整条队列
  const concurrency = Math.min(3, localList.length);
  let cursor = 0;
  async function worker() {
    while (cursor < localList.length) {
      const p = localList[cursor++];
      const res = await mirrorSaveToCloud(p);
      if (res.ok) ok += 1;
      else fail += 1;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
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
