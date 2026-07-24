import type { TechPackProject } from "@/types/project";
import {
  projectToRow,
  rowToProject,
  stripHeavyImagesFromProject,
  type TechPackRow,
} from "@/lib/project/cloud-map";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PackVersionKind = "ai_draft" | "user_checkpoint" | "user_final";

export type PackVersionSnapshot = {
  /** 与 tech_packs 对齐的瘦身快照（无超长 data URL） */
  row: Omit<TechPackRow, "user_id"> & { user_id?: string };
  projectUpdatedAt: string;
  capturedAt: string;
};

/** 把当前工艺包压成可落库的版本快照 */
export function buildPackVersionSnapshot(
  project: TechPackProject,
  userId: string,
): PackVersionSnapshot {
  const slim = stripHeavyImagesFromProject(project);
  const row = projectToRow(slim, userId);
  return {
    row: {
      ...row,
      // 快照里保留 user_id，恢复时以目标行为准
    },
    projectUpdatedAt: slim.updatedAt,
    capturedAt: new Date().toISOString(),
  };
}

/** 从快照还原为 TechPackProject（再交给 projectToRow 写回主表） */
export function projectFromPackVersionSnapshot(
  snapshot: unknown,
): TechPackProject | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const s = snapshot as Partial<PackVersionSnapshot> & {
    id?: string;
    canvas_data?: TechPackProject["canvas_data"];
  };
  // 新格式：{ row, projectUpdatedAt, capturedAt }
  if (s.row && typeof s.row === "object") {
    try {
      return rowToProject(s.row as TechPackRow);
    } catch {
      return null;
    }
  }
  // 兼容：直接存了 row 字段形态
  if (s.id && s.canvas_data) {
    try {
      return rowToProject(s as unknown as TechPackRow);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 写入 pack_versions。
 * dedupeSameUpdatedAt：若同 kind 最新一条的 projectUpdatedAt 相同则跳过（防定稿后每次自动同步刷版本）。
 */
export async function insertPackVersion(
  supabase: SupabaseClient,
  opts: {
    techPackId: string;
    userId: string;
    kind: PackVersionKind;
    snapshot: PackVersionSnapshot;
    sourceAction?: string;
    dedupeSameUpdatedAt?: boolean;
  },
): Promise<{ id: string | null; skipped: boolean; error?: string }> {
  if (opts.dedupeSameUpdatedAt) {
    const { data: latest } = await supabase
      .from("pack_versions")
      .select("id, snapshot")
      .eq("tech_pack_id", opts.techPackId)
      .eq("kind", opts.kind)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const prev = latest?.snapshot as PackVersionSnapshot | null;
    if (
      prev &&
      prev.projectUpdatedAt &&
      prev.projectUpdatedAt === opts.snapshot.projectUpdatedAt
    ) {
      return { id: latest?.id ? String(latest.id) : null, skipped: true };
    }
  }

  const { data, error } = await supabase
    .from("pack_versions")
    .insert({
      tech_pack_id: opts.techPackId,
      user_id: opts.userId,
      kind: opts.kind,
      snapshot: opts.snapshot,
      source_action: opts.sourceAction ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return { id: null, skipped: false, error: error.message };
  }
  return { id: data?.id ? String(data.id) : null, skipped: false };
}

/**
 * 云端保存后按工作流写版本：
 * - finalized → user_final（同 updatedAt 去重）
 * - in_review → user_checkpoint（同 updatedAt 去重）
 * draft 不自动写，避免每次保存刷库
 */
export async function writePackVersionAfterCloudSave(
  supabase: SupabaseClient,
  project: TechPackProject,
  userId: string,
  sourceAction = "cloud_save",
): Promise<void> {
  const ws = project.workflowStatus;
  if (ws !== "finalized" && ws !== "in_review") return;

  const kind: PackVersionKind =
    ws === "finalized" ? "user_final" : "user_checkpoint";
  const snapshot = buildPackVersionSnapshot(project, userId);
  const res = await insertPackVersion(supabase, {
    techPackId: project.id,
    userId,
    kind,
    snapshot,
    sourceAction: `${sourceAction}:${ws}`,
    dedupeSameUpdatedAt: true,
  });
  if (res.error) {
    console.warn("[pack-versions]", res.error);
  }
}
