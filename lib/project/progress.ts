import type { TechPackProject } from "@/types/project";

export function calcProgress(project: TechPackProject): number {
  const allHotspots = project.canvas_data.artboards.flatMap((a) => a.hotspots);

  let score = 0;
  if (project.process_items.length > 0) score += 30;
  if (allHotspots.length > 0) score += 20;
  if (project.bom_items.length > 0) score += 15;
  if (project.size_chart.rows.length > 0) score += 15;

  const linked = project.process_items.filter((p) => p.hotspotId).length;
  if (linked > 0) score += 10;

  const hasAnnotations = project.canvas_data.artboards.some(
    (a) => a.annotations.length > 0,
  );
  if (hasAnnotations) score += 5;

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
