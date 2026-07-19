import type { BomItem, ProcessItem } from "@/types/process";
import type { SizeChart, TechPackProject } from "@/types/project";
import { formatDate, WORKFLOW_LABELS } from "@/lib/project/progress";

export type AnnotatedImage = { name: string; dataUrl: string };

export type TechPackDocPage =
  | {
      id: string;
      kind: "cover";
      heroUrl: string | null;
      heroLabel: string;
    }
  | {
      id: string;
      kind: "view";
      boardName: string;
      imageDataUrl: string;
    }
  | {
      id: string;
      kind: "process";
      items: ProcessItem[];
      offset: number;
      pageIndex: number;
      pageCount: number;
    }
  | {
      id: string;
      kind: "bom";
      items: BomItem[];
      offset: number;
      pageIndex: number;
      pageCount: number;
      /** 垫到固定行数，贴近满页表 */
      padRows: number;
    }
  | {
      id: string;
      kind: "size";
      rows: SizeChart["rows"];
      sizes: string[];
      sampleSize?: string;
      offset: number;
      pageIndex: number;
      pageCount: number;
    }
  | {
      id: string;
      kind: "review";
      text: string;
    };

const PROCESS_ROWS = 8;
const BOM_ROWS = 12;
const BOM_PAD = 12;
const SIZE_ROWS = 12;

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export type DocMeta = {
  title: string;
  category: string;
  targetLabel: string;
  styleNo: string;
  date: string;
  workflow: string;
  materialsHint: string;
  sizeRange: string;
  description: string;
};

export function buildDocMeta(project: TechPackProject): DocMeta {
  const materials = project.bom_items
    .filter((b) => b.category === "fabric" || !b.category)
    .map((b) => b.name)
    .filter(Boolean)
    .slice(0, 4)
    .join("、");
  const sizes = project.size_chart.sizes ?? [];
  return {
    title: project.title,
    category:
      project.intake.targetGarment?.category ||
      project.intake.detectedCategory ||
      "—",
    targetLabel: project.intake.targetGarment?.label || project.title,
    styleNo: project.styleNo ?? project.id.slice(-8).toUpperCase(),
    date: formatDate(project.updatedAt),
    workflow: WORKFLOW_LABELS[project.workflowStatus] ?? "草稿",
    materialsHint: materials || "—",
    sizeRange: sizes.length ? `${sizes[0]}–${sizes[sizes.length - 1]}` : "—",
    description: project.intake.description?.trim() || "",
  };
}

/**
 * 从项目 + 标注图生成 A4 横向文档页列表。
 */
export function buildTechPackDocument(
  project: TechPackProject,
  annotatedImages: AnnotatedImage[],
): TechPackDocPage[] {
  const pages: TechPackDocPage[] = [];
  const hero =
    annotatedImages[0] ??
    (project.intake.imageDataUrl
      ? { name: "参考图", dataUrl: project.intake.imageDataUrl }
      : null);

  pages.push({
    id: "cover",
    kind: "cover",
    heroUrl: hero?.dataUrl ?? null,
    heroLabel: hero?.name ?? "款式图",
  });

  for (const img of annotatedImages) {
    pages.push({
      id: `view_${img.name}`,
      kind: "view",
      boardName: img.name,
      imageDataUrl: img.dataUrl,
    });
  }

  const processChunks = chunk(project.process_items, PROCESS_ROWS);
  processChunks.forEach((items, i) => {
    if (project.process_items.length === 0 && i > 0) return;
    pages.push({
      id: `process_${i}`,
      kind: "process",
      items,
      offset: i * PROCESS_ROWS,
      pageIndex: i + 1,
      pageCount: processChunks.length,
    });
  });

  const bomChunks = chunk(project.bom_items, BOM_ROWS);
  bomChunks.forEach((items, i) => {
    pages.push({
      id: `bom_${i}`,
      kind: "bom",
      items,
      offset: i * BOM_ROWS,
      pageIndex: i + 1,
      pageCount: bomChunks.length,
      padRows: Math.max(0, BOM_PAD - items.length),
    });
  });

  if (project.size_chart.rows.length > 0) {
    const sizeChunks = chunk(project.size_chart.rows, SIZE_ROWS);
    sizeChunks.forEach((rows, i) => {
      pages.push({
        id: `size_${i}`,
        kind: "size",
        rows,
        sizes: project.size_chart.sizes ?? [],
        sampleSize: project.size_chart.sampleSize,
        offset: i * SIZE_ROWS,
        pageIndex: i + 1,
        pageCount: sizeChunks.length,
      });
    });
  }

  if (project.style_review?.trim()) {
    pages.push({
      id: "review",
      kind: "review",
      text: project.style_review.trim(),
    });
  }

  return pages;
}
