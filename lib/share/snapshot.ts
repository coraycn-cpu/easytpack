import type { BomItem, ProcessItem } from "@/types/process";
import type { SizeChart, TechPackProject } from "@/types/project";
import { buildShareSnapshotHash } from "@/lib/export/share-snapshot";
import { WORKFLOW_LABELS } from "@/lib/project/progress";

/** 公开分享页用的轻量快照（不含大图 dataUrl） */
export type ShareSnapshot = {
  title: string;
  category?: string;
  targetGarmentLabel?: string;
  workflowLabel?: string;
  process_items: ProcessItem[];
  bom_items: BomItem[];
  size_chart: SizeChart;
  style_review?: string;
  artboardNames: string[];
  sharedAt: string;
  note: string;
};

export function generateShareId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `sh_${rand}`;
}

/** 从项目生成可公开的只读快照 */
export function buildShareSnapshot(project: TechPackProject): ShareSnapshot {
  return {
    title: project.title?.trim() || "未命名款式",
    category:
      project.intake.targetGarment?.category ??
      project.intake.detectedCategory,
    targetGarmentLabel: project.intake.targetGarment?.label,
    workflowLabel: WORKFLOW_LABELS[project.workflowStatus] ?? project.workflowStatus,
    process_items: project.process_items ?? [],
    bom_items: project.bom_items ?? [],
    size_chart: project.size_chart ?? { sizes: [], rows: [] },
    style_review: project.style_review,
    artboardNames: (project.canvas_data.artboards ?? []).map(
      (a) => a.name || "画板",
    ),
    sharedAt: new Date().toISOString(),
    note: "此为只读沟通稿：以工艺/物料/尺寸表为准；款式大图请用导出 PDF/合拼图查看。",
  };
}

export function shareHashForProject(project: TechPackProject): string {
  return buildShareSnapshotHash(project);
}
