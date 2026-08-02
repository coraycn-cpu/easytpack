import type { TechPackProject } from "@/types/project";
import {
  countLinkedProcessItems,
  hasCanvasAnnotations,
} from "@/lib/canvas/part-annotations";
import type { TranslateFn } from "@/lib/i18n/translate";

export function calcProgress(project: TechPackProject): number {
  let score = 0;
  if (project.process_items.length > 0) score += 30;
  if (hasCanvasAnnotations(project)) score += 20;
  if (project.bom_items.length > 0) score += 15;
  if (project.size_chart.rows.length > 0) score += 15;

  const linked = countLinkedProcessItems(project);
  if (linked > 0) score += 15;

  if (project.workflowStatus === "finalized") score += 5;

  return Math.min(100, score);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 中文兼容（导出文档等无 Locale 处仍可用） */
export const WORKFLOW_LABELS: Record<string, string> = {
  draft: "草稿",
  in_review: "审核中",
  finalized: "已定稿",
};

/** i18n keys → common.draft / inReview / finalized */
export const WORKFLOW_LABEL_KEYS: Record<string, string> = {
  draft: "common.draft",
  in_review: "common.inReview",
  finalized: "common.finalized",
};

export function getWorkflowLabel(
  status: string | null | undefined,
  t: TranslateFn,
): string {
  if (!status) return "";
  const key = WORKFLOW_LABEL_KEYS[status];
  return key ? t(key) : status;
}
