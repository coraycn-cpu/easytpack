import type { TechPackProject } from "@/types/project";

export type ComplianceIssue = {
  level: "error" | "warning";
  message: string;
};

export function checkCompliance(project: TechPackProject): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  if (!project.title?.trim()) {
    issues.push({ level: "error", message: "缺少款式名称" });
  }

  const allHotspots = project.canvas_data.artboards.flatMap((a) => a.hotspots);
  if (allHotspots.length === 0) {
    issues.push({ level: "warning", message: "画板未标注任何部位热区" });
  }

  if (project.process_items.length === 0) {
    issues.push({ level: "error", message: "结构工艺表为空" });
  }

  project.process_items.forEach((item, i) => {
    if (!item.part?.trim()) {
      issues.push({ level: "error", message: `工艺条目 ${i + 1} 缺少部位名称` });
    }
    if (!item.process?.trim()) {
      issues.push({ level: "warning", message: `「${item.part || i + 1}」缺少工艺描述` });
    }
    if (!item.stitch?.trim()) {
      issues.push({ level: "warning", message: `「${item.part}」未填写针法/线迹` });
    }
    if (!item.seam_allowance?.trim()) {
      issues.push({ level: "warning", message: `「${item.part}」未填写缝份` });
    }
  });

  const unlinkedHotspots = allHotspots.filter(
    (hs) => !project.process_items.some((p) => p.hotspotId === hs.id),
  );
  if (unlinkedHotspots.length > 0) {
    issues.push({
      level: "warning",
      message: `${unlinkedHotspots.length} 个热区尚未关联工艺条目`,
    });
  }

  if (project.bom_items.length === 0) {
    issues.push({ level: "warning", message: "BOM 面辅料清单为空" });
  }

  project.bom_items.forEach((item) => {
    if (!item.name?.trim()) {
      issues.push({ level: "warning", message: "BOM 存在未命名物料" });
    }
  });

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
