import type { SupabaseClient } from "@supabase/supabase-js";
import { STYLE_IMAGES_BUCKET } from "@/lib/project/cloud-images";

export type StorageObjectInfo = {
  path: string;
  size: number;
  userId: string;
  projectId: string | null;
};

/**
 * 递归列出 style-images 对象（user / project / file 三级）。
 * 深度有限，适合运营巡查，不保证覆盖极深目录。
 */
export async function listStyleImageObjects(
  supabase: SupabaseClient,
  opts?: { userId?: string; maxUsers?: number; maxProjectsPerUser?: number },
): Promise<StorageObjectInfo[]> {
  const maxUsers = opts?.maxUsers ?? 80;
  const maxProjects = opts?.maxProjectsPerUser ?? 100;
  const out: StorageObjectInfo[] = [];

  let userFolders: Array<{ name: string; metadata?: unknown }> = [];
  if (opts?.userId) {
    userFolders = [{ name: opts.userId }];
  } else {
    const { data: roots, error } = await supabase.storage
      .from(STYLE_IMAGES_BUCKET)
      .list("", { limit: 200, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    userFolders = (roots ?? []).filter((f) => {
      const isFile = Boolean(f.metadata);
      return !isFile && Boolean(f.name);
    });
  }

  for (const folder of userFolders.slice(0, maxUsers)) {
    const userId = folder.name;
    const { data: level1 } = await supabase.storage
      .from(STYLE_IMAGES_BUCKET)
      .list(userId, { limit: maxProjects });

    for (const entry of level1 ?? []) {
      if (entry.metadata && typeof entry.metadata.size === "number") {
        out.push({
          path: `${userId}/${entry.name}`,
          size: entry.metadata.size,
          userId,
          projectId: null,
        });
        continue;
      }
      if (!entry.name) continue;
      const projectId = entry.name;
      const { data: level2 } = await supabase.storage
        .from(STYLE_IMAGES_BUCKET)
        .list(`${userId}/${projectId}`, { limit: 100 });
      for (const file of level2 ?? []) {
        if (!file.name) continue;
        const size =
          file.metadata && typeof file.metadata.size === "number"
            ? file.metadata.size
            : 0;
        out.push({
          path: `${userId}/${projectId}/${file.name}`,
          size,
          userId,
          projectId,
        });
      }
    }
  }

  return out;
}

/** 从任意 JSON 文本里抽出 sbstorage: 路径 */
export function collectSbStoragePathsFromJson(value: unknown): Set<string> {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") {
      if (v.startsWith("sbstorage:")) {
        const path = v.slice("sbstorage:".length).trim();
        if (path) found.add(path);
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (typeof v === "object") {
      for (const val of Object.values(v as Record<string, unknown>)) {
        walk(val);
      }
    }
  };
  walk(value);
  return found;
}

/**
 * 收集 tech_packs + pack_versions 里引用到的 Storage 路径。
 * 可选按 userId 收窄。
 */
export async function collectReferencedStylePaths(
  supabase: SupabaseClient,
  opts?: { userId?: string },
): Promise<Set<string>> {
  const refs = new Set<string>();

  let packsQuery = supabase
    .from("tech_packs")
    .select("id, user_id, canvas_data, intake");
  if (opts?.userId) packsQuery = packsQuery.eq("user_id", opts.userId);
  const { data: packs, error: packsErr } = await packsQuery.limit(2000);
  if (packsErr) throw new Error(packsErr.message);
  for (const row of packs ?? []) {
    for (const p of collectSbStoragePathsFromJson(row)) refs.add(p);
  }

  let versionsQuery = supabase
    .from("pack_versions")
    .select("id, user_id, snapshot");
  if (opts?.userId) versionsQuery = versionsQuery.eq("user_id", opts.userId);
  const { data: versions, error: verErr } = await versionsQuery.limit(3000);
  if (verErr) {
    // 表异常时不挡孤儿扫描：仅用主表引用
    console.warn("[storage-refs] pack_versions", verErr.message);
  } else {
    for (const row of versions ?? []) {
      for (const p of collectSbStoragePathsFromJson(row)) refs.add(p);
    }
  }

  return refs;
}

export type OrphanItem = StorageObjectInfo & { reason: string };

/** 对比 Storage 与库内引用，找出孤儿文件 */
export async function findOrphanStyleImages(
  supabase: SupabaseClient,
  opts?: { userId?: string },
): Promise<{
  orphans: OrphanItem[];
  totalObjects: number;
  referencedCount: number;
  note: string;
}> {
  const [objects, referenced] = await Promise.all([
    listStyleImageObjects(supabase, { userId: opts?.userId }),
    collectReferencedStylePaths(supabase, { userId: opts?.userId }),
  ]);

  const orphans: OrphanItem[] = [];
  for (const obj of objects) {
    if (referenced.has(obj.path)) continue;
    // 项目目录已不在 tech_packs，但路径仍在 → 孤儿
    orphans.push({
      ...obj,
      reason: obj.projectId
        ? "路径未被 tech_packs / pack_versions 引用"
        : "用户根下散落文件且未被引用",
    });
  }

  return {
    orphans,
    totalObjects: objects.length,
    referencedCount: referenced.size,
    note:
      "删除不可自动还原文件本身；若误删，可从 pack_versions 恢复工艺包元数据，但图片需用户重新上传。建议先 dry-run。",
  };
}
