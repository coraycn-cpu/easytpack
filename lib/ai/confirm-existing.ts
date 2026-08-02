import type { TechPackProject } from "@/types/project";
import { hasCanvasAnnotations } from "@/lib/canvas/part-annotations";
import { isDimensionAnnotation } from "@/lib/canvas/size-annotations";
import { countFilledBaselineValues } from "@/lib/size-chart/apply-assist";

/** AI 顶栏菜单对应的数据版块 */
export type AiMenuSection =
  | "full-collect"
  | "annotate-process"
  | "fill-bom"
  | "fill-size"
  | "enhance"
  | "explain";

const SECTION_LABEL: Record<AiMenuSection, string> = {
  "full-collect": "AI 一键标注",
  "annotate-process": "AI 标工艺",
  "fill-bom": "AI 填物料",
  "fill-size": "AI 填尺寸",
  enhance: "一键补全",
  explain: "款式评语",
};

function hasProcessContent(project: TechPackProject): boolean {
  if (
    project.process_items.some(
      (p) =>
        Boolean(p.part?.trim()) ||
        Boolean(p.process?.trim()) ||
        Boolean(p.stitch?.trim()),
    )
  ) {
    return true;
  }
  return hasCanvasAnnotations(project);
}

function hasBomContent(project: TechPackProject): boolean {
  return project.bom_items.some((b) => Boolean(b.name?.trim()));
}

function hasSizeContent(project: TechPackProject): boolean {
  if (countFilledBaselineValues(project.size_chart) > 0) return true;
  if ((project.size_chart.rows?.length ?? 0) > 0) return true;
  return project.canvas_data.artboards.some((ab) =>
    ab.annotations.some(isDimensionAnnotation),
  );
}

function hasReviewContent(project: TechPackProject): boolean {
  return Boolean(project.style_review?.trim());
}

/** 该 AI 功能对应版块是否已有内容（需提示是否重做） */
export function projectHasSectionContent(
  project: TechPackProject,
  section: AiMenuSection,
): boolean {
  switch (section) {
    case "annotate-process":
      return hasProcessContent(project);
    case "fill-bom":
      return hasBomContent(project);
    case "fill-size":
      return hasSizeContent(project);
    case "explain":
      return hasReviewContent(project);
    case "enhance":
    case "full-collect":
      return (
        hasProcessContent(project) ||
        hasBomContent(project) ||
        hasSizeContent(project) ||
        hasReviewContent(project)
      );
    default:
      return false;
  }
}

/**
 * 已有内容时弹出确认：确定=重新标注，取消=中断（不发起 AI）。
 * 无内容时直接放行。
 */
export function confirmAiMenuIfNeeded(
  project: TechPackProject,
  section: AiMenuSection,
  message?: string,
): boolean {
  if (typeof window === "undefined") return true;
  if (!projectHasSectionContent(project, section)) return true;
  const label = SECTION_LABEL[section];
  return window.confirm(
    message ??
      `「${label}」对应版块已经有内容了。\n\n重新跑 AI 可能改动或合并现有标注，无法自动撤销。\n\n点「确定」继续重新标注；点「取消」中断，保留现有内容。`,
  );
}
