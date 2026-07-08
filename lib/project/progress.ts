import type { TechPackProject } from "@/types/project";

export function calcProgress(project: TechPackProject): number {
  return Math.min(
    100,
    Math.round(
      (project.process_items.length > 0 ? 40 : 0) +
        (project.canvas_data.hotspots.length > 0 ? 30 : 0) +
        (project.bom_items.length > 0 ? 15 : 0) +
        (project.size_chart.rows.length > 0 ? 15 : 0),
    ),
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
