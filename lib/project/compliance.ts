import type { TechPackProject } from "@/types/project";
import {
  countLinkedProcessItems,
  getAllLinkedProcessIds,
  hasCanvasAnnotations,
} from "@/lib/canvas/part-annotations";

export type ComplianceIssue = {
  level: "error" | "warning";
  message: string;
};

export function checkCompliance(project: TechPackProject): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  if (!project.title?.trim()) {
    issues.push({ level: "error", message: "缺少款式名称" });
  }

  if (!hasCanvasAnnotations(project)) {
    issues.push({ level: "warning", message: "建议在款式图上标注部位（可用智能标注）" });
  }

  if (project.process_items.length === 0) {
    issues.push({ level: "error", message: "结构工艺表为空" });
  }

  project.process_items.forEach((item, i) => {
    if (!item.part?.trim()) {
      issues.push({ level: "error", message: `工艺条目 ${i + 1} 缺少部位名称` });
      return;
    }
    const missing: string[] = [];
    if (!item.process?.trim()) missing.push("工艺描述");
    if (!item.stitch?.trim()) missing.push("针法/线迹");
    if (!item.seam_allowance?.trim()) missing.push("缝份");
    if (missing.length > 0) {
      issues.push({
        level: "warning",
        message: `「${item.part}」未填写：${missing.join("、")}`,
      });
    }
  });

  const linkedIds = getAllLinkedProcessIds(project);
  const unlinkedProcess = project.process_items.filter(
    (p) => p.id && p.part?.trim() && !linkedIds.has(p.id),
  );
  if (unlinkedProcess.length > 0 && hasCanvasAnnotations(project)) {
    issues.push({
      level: "warning",
      message: `${unlinkedProcess.length} 条工艺尚未在图上标注对应部位`,
    });
  }

  if (project.bom_items.length === 0) {
    issues.push({ level: "warning", message: "BOM 面辅料清单为空" });
  }

  const unnamedBom = project.bom_items.filter((item) => !item.name?.trim()).length;
  if (unnamedBom > 0) {
    issues.push({
      level: "warning",
      message: unnamedBom === 1 ? "BOM 存在未命名物料" : `BOM 有 ${unnamedBom} 条未命名物料`,
    });
  }

  if (project.size_chart.rows.length === 0) {
    issues.push({ level: "warning", message: "尺寸表为空" });
  }

  if (project.size_chart.rows.length > 0 && project.size_chart.sizes.length === 0) {
    issues.push({ level: "error", message: "尺寸表缺少尺码列" });
  }

  const hasMainImage = project.canvas_data.artboards.some((a) => a.imageDataUrl);
  if (!hasMainImage && !project.intake.imageDataUrl) {
    issues.push({ level: "warning", message: "缺少款式参考图" });
  }

  return issues;
}

export function canFinalize(project: TechPackProject): boolean {
  return !checkCompliance(project).some((i) => i.level === "error");
}
