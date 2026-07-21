import { originalIntentAnalysis } from "@/lib/ai/chat-context";
import { photoTypeLabel } from "@/lib/intake/apply-intent";
import { normalizeProcessItemsForExport } from "@/lib/export/normalize-process";
import type { BomItem, ProcessItem } from "@/types/process";
import type { SizeChart, TechPackProject } from "@/types/project";
import { formatDate, WORKFLOW_LABELS } from "@/lib/project/progress";

export type AnnotatedImage = { name: string; dataUrl: string };

export type BuildTechPackDocOptions = {
  /** 封面主图净图（无标注）；VIEW 页仍用 annotatedImages */
  coverHeroUrl?: string | null;
  coverHeroLabel?: string;
};

/** 首页协作概览：版师/工厂一眼能用的摘要 */
export type CoverOverview = {
  heroUrl: string | null;
  heroLabel: string;
  sizeColumns: string[];
  sampleSize?: string;
  regionStandard?: string;
  features: string[];
  fabricLines: string[];
  trimLines: string[];
  processParts: string[];
  processCount: number;
  bomCount: number;
  viewCount: number;
  styleBrief: string;
  reviewBrief: string;
  photoType: string;
  questionnaireHints: string[];
};

export type TechPackDocPage =
  | {
      id: string;
      kind: "cover";
      overview: CoverOverview;
    }
  | {
      id: string;
      kind: "view";
      /** 一页最多 2 个视图，减少总页数 */
      boards: AnnotatedImage[];
      pageIndex: number;
      pageCount: number;
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
      padRows: number;
    }
  | {
      id: string;
      /** 工艺 + BOM 同页（横向分栏），短表时省页 */
      kind: "process_bom";
      processItems: ProcessItem[];
      bomItems: BomItem[];
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
      /** 同页附评语，省独立评语页 */
      reviewText?: string;
    }
  | {
      id: string;
      kind: "review";
      text: string;
    };

const PROCESS_ROWS = 10;
const BOM_ROWS = 14;
const BOM_PAD = 8;
const SIZE_ROWS = 14;
/** 工艺+BOM 合并阈值 */
const MERGE_PROCESS_MAX = 8;
const MERGE_BOM_MAX = 10;
const VIEWS_PER_PAGE = 2;

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function bomLine(b: BomItem): string {
  const bits = [b.name, b.spec, b.color, b.usage ? `用量${b.usage}` : ""]
    .map((x) => x?.trim())
    .filter(Boolean);
  return bits.join(" / ");
}

function questionnaireHints(project: TechPackProject): string[] {
  const answers = project.questionnaire?.answers ?? {};
  const questions = project.questionnaire?.questions ?? [];
  const hints: string[] = [];
  for (const q of questions.slice(0, 8)) {
    const raw = answers[q.id];
    if (raw == null || raw === "") continue;
    const val = Array.isArray(raw) ? raw.join("、") : String(raw);
    if (!val.trim()) continue;
    const label = q.question?.trim() || q.id;
    hints.push(`${label}：${val.trim()}`);
  }
  return hints.slice(0, 6);
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

export function buildCoverOverview(
  project: TechPackProject,
  annotatedImages: AnnotatedImage[],
  options?: BuildTechPackDocOptions,
): CoverOverview {
  const cleanHero = options?.coverHeroUrl?.trim();
  const hero = cleanHero
    ? {
        name: options?.coverHeroLabel?.trim() || "款式图",
        dataUrl: cleanHero,
      }
    : project.intake.imageDataUrl?.trim()
      ? {
          name: annotatedImages[0]?.name ?? "参考图",
          dataUrl: project.intake.imageDataUrl,
        }
      : annotatedImages[0]
        ? {
            name: annotatedImages[0].name,
            dataUrl: annotatedImages[0].dataUrl,
          }
        : null;

  const fabrics = project.bom_items.filter(
    (b) => b.category === "fabric" || !b.category,
  );
  const trims = project.bom_items.filter(
    (b) => b.category && b.category !== "fabric",
  );

  const analysis = originalIntentAnalysis(project.intake.aiIntentAnalysis);
  const styleBrief =
    project.intake.description?.trim() ||
    analysis ||
    project.intake.suggestedTitle ||
    "";

  const review = project.style_review?.trim() || "";
  const reviewBrief = review.length > 220 ? `${review.slice(0, 220)}…` : review;

  const processItems = normalizeProcessItemsForExport(project.process_items);

  return {
    heroUrl: hero?.dataUrl ?? null,
    heroLabel: hero?.name ?? "款式图",
    sizeColumns: project.size_chart.sizes?.length
      ? [...project.size_chart.sizes]
      : ["S", "M", "L", "XL"],
    sampleSize: project.size_chart.sampleSize,
    regionStandard: project.size_chart.regionStandard,
    features: (project.intake.detectedFeatures ?? [])
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, 8),
    fabricLines: fabrics.map(bomLine).filter(Boolean).slice(0, 5),
    trimLines: trims.map(bomLine).filter(Boolean).slice(0, 6),
    processParts: processItems
      .map((p) => p.part?.trim())
      .filter(Boolean)
      .slice(0, 10) as string[],
    processCount: processItems.length,
    bomCount: project.bom_items.length,
    viewCount: annotatedImages.length,
    styleBrief,
    reviewBrief,
    photoType: photoTypeLabel(project.intake.photoType),
    questionnaireHints: questionnaireHints(project),
  };
}

/**
 * 从项目 + 标注图生成 A4 横向文档页列表（尽量压缩页数）。
 *
 * 策略：视图 2 合 1；空表不占页；短工艺+短 BOM 同页；尺寸+评语同页。
 * 封面主图优先用 coverHeroUrl（无标注）；VIEW 页保留 annotatedImages。
 */
export function buildTechPackDocument(
  project: TechPackProject,
  annotatedImages: AnnotatedImage[],
  options?: BuildTechPackDocOptions,
): TechPackDocPage[] {
  const pages: TechPackDocPage[] = [];

  pages.push({
    id: "cover",
    kind: "cover",
    overview: buildCoverOverview(project, annotatedImages, options),
  });

  const viewChunks = chunk(annotatedImages, VIEWS_PER_PAGE);
  viewChunks.forEach((boards, i) => {
    pages.push({
      id: `view_${i}`,
      kind: "view",
      boards,
      pageIndex: i + 1,
      pageCount: viewChunks.length,
    });
  });

  const processItems = normalizeProcessItemsForExport(project.process_items);
  const bomItems = project.bom_items;
  const canMergeProcessBom =
    processItems.length > 0 &&
    bomItems.length > 0 &&
    processItems.length <= MERGE_PROCESS_MAX &&
    bomItems.length <= MERGE_BOM_MAX;

  if (canMergeProcessBom) {
    pages.push({
      id: "process_bom",
      kind: "process_bom",
      processItems,
      bomItems,
    });
  } else {
    const processChunks = chunk(processItems, PROCESS_ROWS);
    processChunks.forEach((items, i) => {
      pages.push({
        id: `process_${i}`,
        kind: "process",
        items,
        offset: i * PROCESS_ROWS,
        pageIndex: i + 1,
        pageCount: processChunks.length,
      });
    });

    const bomChunks = chunk(bomItems, BOM_ROWS);
    bomChunks.forEach((items, i) => {
      pages.push({
        id: `bom_${i}`,
        kind: "bom",
        items,
        offset: i * BOM_ROWS,
        pageIndex: i + 1,
        pageCount: bomChunks.length,
        padRows: Math.max(0, Math.min(BOM_PAD, BOM_PAD - items.length)),
      });
    });
  }

  const reviewText = project.style_review?.trim() || "";
  const sizeRows = project.size_chart.rows;

  if (sizeRows.length > 0) {
    const sizeChunks = chunk(sizeRows, SIZE_ROWS);
    sizeChunks.forEach((rows, i) => {
      const isLast = i === sizeChunks.length - 1;
      pages.push({
        id: `size_${i}`,
        kind: "size",
        rows,
        sizes: project.size_chart.sizes ?? [],
        sampleSize: project.size_chart.sampleSize,
        offset: i * SIZE_ROWS,
        pageIndex: i + 1,
        pageCount: sizeChunks.length,
        reviewText: isLast && reviewText ? reviewText : undefined,
      });
    });
  } else if (reviewText) {
    pages.push({
      id: "review",
      kind: "review",
      text: reviewText,
    });
  }

  return pages;
}
