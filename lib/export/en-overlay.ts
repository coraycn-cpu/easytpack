import type { BomItem, ProcessItem } from "@/types/process";
import type { TechPackProject } from "@/types/project";

/** AI 英译结果（不覆盖中文原稿，仅作导出预览叠加） */
export type TechPackEnOverlay = {
  title: string;
  description: string;
  category: string;
  targetLabel: string;
  style_review: string;
  process_items: Array<{
    part: string;
    process: string;
    stitch?: string;
    seam_allowance?: string;
  }>;
  bom_items: Array<{
    name: string;
    garmentPart?: string;
    spec?: string;
    color?: string;
    usage?: string;
    supplier?: string;
  }>;
  /** 与 size_chart.rows 下标对齐 */
  size_rows: Array<{
    part: string;
    method: string;
  }>;
  /** 画板 id → 英文名（可选） */
  artboard_names?: Record<string, string>;
  /** AI 说明：术语纠正要点 */
  correction_notes?: string;
};

export type ExportLocale = "zh" | "en";

/** 把英译叠加到项目副本（数值/尺码列/图片不动） */
export function applyEnOverlay(
  project: TechPackProject,
  overlay: TechPackEnOverlay | null | undefined,
): TechPackProject {
  if (!overlay) return project;

  const process_items: ProcessItem[] = project.process_items.map((item, i) => {
    const t = overlay.process_items[i];
    if (!t) return item;
    return {
      ...item,
      part: t.part || item.part,
      process: t.process || item.process,
      stitch: t.stitch ?? item.stitch,
      seam_allowance: t.seam_allowance ?? item.seam_allowance,
    };
  });

  const bom_items: BomItem[] = project.bom_items.map((item, i) => {
    const t = overlay.bom_items[i];
    if (!t) return item;
    return {
      ...item,
      name: t.name || item.name,
      garmentPart: t.garmentPart ?? item.garmentPart,
      spec: t.spec ?? item.spec,
      color: t.color ?? item.color,
      usage: t.usage ?? item.usage,
      supplier: t.supplier ?? item.supplier,
    };
  });

  const size_chart = {
    ...project.size_chart,
    rows: project.size_chart.rows.map((row, i) => {
      const t = overlay.size_rows[i];
      if (!t) return row;
      return {
        ...row,
        part: t.part || row.part,
        method: t.method || row.method,
      };
    }),
  };

  const nameMap = overlay.artboard_names ?? {};
  const artboards = project.canvas_data.artboards.map((ab) => ({
    ...ab,
    name: nameMap[ab.id]?.trim() || ab.name,
  }));

  return {
    ...project,
    title: overlay.title.trim() || project.title,
    style_review: overlay.style_review.trim() || project.style_review,
    intake: {
      ...project.intake,
      description: overlay.description.trim() || project.intake.description,
      detectedCategory:
        overlay.category.trim() || project.intake.detectedCategory,
      suggestedTitle: overlay.title.trim() || project.intake.suggestedTitle,
      targetGarment: project.intake.targetGarment
        ? {
            ...project.intake.targetGarment,
            label:
              overlay.targetLabel.trim() ||
              project.intake.targetGarment.label,
            category:
              overlay.category.trim() ||
              project.intake.targetGarment.category,
          }
        : project.intake.targetGarment,
    },
    process_items,
    bom_items,
    size_chart,
    canvas_data: {
      ...project.canvas_data,
      artboards,
    },
  };
}

export function slimProjectForTranslate(project: TechPackProject) {
  return {
    title: project.title,
    description: project.intake.description ?? "",
    category:
      project.intake.targetGarment?.category ||
      project.intake.detectedCategory ||
      "",
    targetLabel:
      project.intake.targetGarment?.label ||
      project.title ||
      "",
    style_review: project.style_review ?? "",
    process_items: project.process_items.map((p) => ({
      part: p.part ?? "",
      process: p.process ?? "",
      stitch: p.stitch ?? "",
      seam_allowance: p.seam_allowance ?? "",
    })),
    bom_items: project.bom_items.map((b) => ({
      name: b.name ?? "",
      garmentPart: b.garmentPart ?? "",
      spec: b.spec ?? "",
      color: b.color ?? "",
      usage: b.usage ?? "",
      supplier: b.supplier ?? "",
    })),
    size_rows: project.size_chart.rows.map((r) => ({
      part: r.part ?? "",
      method: r.method ?? "",
    })),
    artboards: project.canvas_data.artboards.map((ab) => ({
      id: ab.id,
      name: ab.name ?? "",
    })),
  };
}
