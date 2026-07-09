import type { TechPackProject } from "@/types/project";
import {
  countLinkedProcessParts,
  hasCanvasAnnotations,
} from "@/lib/canvas/part-annotations";

export function calcProgress(project: TechPackProject): number {
  let score = 0;
  if (project.process_items.length > 0) score += 30;
  if (hasCanvasAnnotations(project)) score += 20;
  if (project.bom_items.length > 0) score += 15;
  if (project.size_chart.rows.length > 0) score += 15;

  const linked = countLinkedProcessParts(project);
  if (linked > 0) score += 10;

  const hasMarkers = project.canvas_data.artboards.some((a) =>
    a.annotations.some((ann) => ann.type === "marker"),
  );
  if (hasMarkers) score += 5;

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

export const WORKFLOW_LABELS: Record<string, string> = {
  draft: "草稿",
  in_review: "审核中",
  finalized: "已定稿",
};
