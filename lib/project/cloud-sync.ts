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

/** 登录时把项目表数据写到云端；大图会先剥掉，下一步再传图 */
export async function mirrorSaveToCloud(
  project: TechPackProject,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "not_logged_in" };
  try {
    const supabase = createClient();
    const row = projectToRow(project, userId);
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
  return {
    ok,
    fail,
    skipped: false,
    message:
      fail === 0
        ? `已同步 ${ok} 个项目到云端（大图暂留在本机浏览器，下一步再传图）。`
        : `成功 ${ok} 个，失败 ${fail} 个。可稍后重试。`,
  };
}

export { mergeProjectsPreferNewer };
