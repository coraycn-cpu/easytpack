import type { TechPackProject } from "@/types/project";
import {
  countLinkedProcessItems,
  getAllLinkedProcessIds,
  hasCanvasAnnotations,
} from "@/lib/canvas/part-annotations";
import {
  countDimensionsLinkedToSizePart,
  isDimensionAnnotation,
} from "@/lib/canvas/size-annotations";
import { isSetTarget } from "@/lib/ai/garment-scope";

export type ComplianceIssue = {
  level: "error" | "warning";
  message: string;
  /** 侧栏点击跳转：工艺 / 物料 / 尺寸 / 画布标注 / 标题 / 评语 */
  action?: "process" | "bom" | "size" | "canvas" | "title" | "review";
  processId?: string;
};

export function checkCompliance(project: TechPackProject): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  if (!project.title?.trim()) {
    issues.push({ level: "error", message: "缺少款式名称", action: "title" });
  }

  if (!hasCanvasAnnotations(project)) {
    issues.push({
      level: "warning",
      message: "建议在款式图上标注部位（可用智能标注）",
      action: "canvas",
    });
  }

  if (project.process_items.length === 0) {
    issues.push({
      level: "error",
      message: "结构工艺表为空",
      action: "process",
    });
  }

  project.process_items.forEach((item, i) => {
    if (!item.part?.trim()) {
      issues.push({
        level: "error",
        message: `工艺条目 ${i + 1} 缺少部位名称`,
        action: "process",
        processId: item.id,
      });
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
        action: "process",
        processId: item.id,
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
      action: "process",
      processId: unlinkedProcess[0]?.id,
    });
  }

  const unlinkedShapes = project.canvas_data.artboards.reduce((n, ab) => {
    for (const ann of ab.annotations) {
      if (
        (ann.type === "rect" || ann.type === "circle") &&
        !(ann.linkedProcessIds?.length ?? 0)
      ) {
        n += 1;
      }
    }
    return n;
  }, 0);
  if (unlinkedShapes > 0) {
    issues.push({
      level: "warning",
      message:
        unlinkedShapes === 1
          ? "图上有 1 个工艺框未关联工艺表"
          : `图上有 ${unlinkedShapes} 个工艺框未关联工艺表`,
      action: "canvas",
    });
  }

  const unlinkedDimensions = project.canvas_data.artboards.reduce((n, ab) => {
    for (const ann of ab.annotations) {
      if (isDimensionAnnotation(ann) && !ann.linkedSizePart?.trim()) n += 1;
    }
    return n;
  }, 0);
  if (unlinkedDimensions > 0) {
    issues.push({
      level: "warning",
      message:
        unlinkedDimensions === 1
          ? "图上有 1 条尺寸线未关联尺码表"
          : `图上有 ${unlinkedDimensions} 条尺寸线未关联尺码表`,
      action: "size",
    });
  }

  for (const row of project.size_chart.rows) {
    const part = row.part?.trim();
    if (!part) continue;
    if (countDimensionsLinkedToSizePart(project, part) === 0) {
      issues.push({
        level: "warning",
        message: `尺码表「${part}」尚无对应尺寸线标注`,
        action: "size",
      });
    }
  }

  if (project.bom_items.length === 0) {
    issues.push({
      level: "warning",
      message: "BOM 面辅料清单为空",
      action: "bom",
    });
  }

  const unnamedBom = project.bom_items.filter((item) => !item.name?.trim()).length;
  if (unnamedBom > 0) {
    issues.push({
      level: "warning",
      message: unnamedBom === 1 ? "BOM 存在未命名物料" : `BOM 有 ${unnamedBom} 条未命名物料`,
      action: "bom",
    });
  }

  if (project.size_chart.rows.length === 0) {
    issues.push({
      level: "warning",
      message: "尺寸表为空",
      action: "size",
    });
  }

  if (project.size_chart.rows.length > 0 && project.size_chart.sizes.length === 0) {
    issues.push({
      level: "error",
      message: "尺寸表缺少尺码列",
      action: "size",
    });
  }

  const hasMainImage = project.canvas_data.artboards.some((a) => a.imageDataUrl);
  if (!hasMainImage && !project.intake.imageDataUrl) {
    issues.push({ level: "warning", message: "缺少款式参考图" });
  }

  if (
    project.intake.imageDataUrl &&
    !project.intake.garmentConfirmed &&
    (project.intake.requiresGarmentPick ||
      (project.intake.visibleGarments?.length ?? 0) > 1)
  ) {
    issues.push({ level: "warning", message: "请先确认目标单款" });
  }

  if (project.intake.photoType === "model") {
    issues.push({
      level: "warning",
      message: "当前为模特图，尺寸/工艺建议核对后定稿",
    });
  }

  if (isSetTarget(project.intake)) {
    issues.push({
      level: "warning",
      message: "当前为套装 Tech Pack，建议工艺与尺寸分别标注上装、下装部位",
    });
    const bomWithoutPart = project.bom_items.filter((b) => !b.garmentPart?.trim()).length;
    if (project.bom_items.length > 0 && bomWithoutPart > 0) {
      issues.push({
        level: "warning",
        message:
          bomWithoutPart === 1
            ? "BOM 有 1 条未标明上装/下装"
            : `BOM 有 ${bomWithoutPart} 条未标明上装/下装`,
      });
    }
  }

  return issues;
}

export function canFinalize(project: TechPackProject): boolean {
  return !checkCompliance(project).some((i) => i.level === "error");
}
