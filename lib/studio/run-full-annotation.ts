import { mapAiAnnotationToCanvas, loadImagePlacement } from "@/lib/canvas/bounds";
import {
  applyBatchSizeDimensions,
  collectLinkedSizePartsFromProject,
} from "@/lib/canvas/apply-size-dimensions";
import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import { resolveGarmentImageForAi } from "@/lib/ai/resolve-garment-image";
import { applySizeChartAssist, countFilledBaselineValues } from "@/lib/size-chart/apply-assist";
import { buildInitialSizeChart } from "@/lib/project/create-style";
import { createDefaultCanvasData, PART_ANNOTATION_COLOR } from "@/lib/project/hotspots";
import { generateProcessId } from "@/lib/process/ids";
import { STYLE_REVIEW_MAX, type BomItem, type ProcessItem } from "@/types/process";
import type { TechPackProject, Annotation } from "@/types/project";
import type { SizeRegionStandard } from "@/lib/size-chart/standards";

export type RunFullAnnotationInput = {
  project: TechPackProject;
  answers: Record<string, string | string[]>;
  regionStandard: SizeRegionStandard;
  sampleSize: string;
};

export type RunFullAnnotationResult = {
  project: TechPackProject;
  summary: string;
  stats: {
    processRegions: number;
    bomAdded: number;
    sizeFilled: number;
    dimensionsAdded: number;
    hasReview: boolean;
  };
};

/** 与 Studio 分项 AI（标工艺 / 填物料 / 填尺寸 / 款式评语）使用相同 API 与输入字段 */
export async function runFullTechPackAnnotation(
  input: RunFullAnnotationInput,
): Promise<RunFullAnnotationResult> {
  const { answers, regionStandard, sampleSize } = input;
  let project: TechPackProject = {
    ...input.project,
    size_chart: {
      ...buildInitialSizeChart(regionStandard, sampleSize),
      ...input.project.size_chart,
      regionStandard,
      sampleSize,
    },
  };

  if (!project.canvas_data.artboards.length) {
    project = {
      ...project,
      canvas_data: createDefaultCanvasData(project.intake.imageDataUrl),
    };
  }

  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const primaryArtboard =
    project.canvas_data.artboards.find((a) => a.id === primaryId) ??
    project.canvas_data.artboards[0];

  if (!primaryArtboard) {
    throw new Error("缺少主款画板，无法生成标注");
  }

  const { dataUrl: processImageUrl } = await resolveGarmentImageForAi(project, {
    activeArtboardId: primaryArtboard.id,
  });
  if (!processImageUrl) {
    throw new Error("款式图过大或未加载，无法进行 AI 标注");
  }

  const aiBase = {
    category: project.intake.detectedCategory,
    description: project.intake.description,
    intake: project.intake,
  };

  // 1. AI 标工艺 — 同 /api/ai/annotate-batch + handleBatchAnnotate
  const batchRes = await fetch("/api/ai/annotate-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...aiBase,
      imageDataUrl: processImageUrl,
      processItems: project.process_items,
    }),
  });
  const batchData = await batchRes.json();
  if (!batchRes.ok) throw new Error(batchData.error ?? "工艺标注失败");

  const imgUrl = primaryArtboard.imageDataUrl ?? project.intake.imageDataUrl;
  const imageOffset = primaryArtboard.imageOffset ?? { x: 0, y: 0 };
  const imageFit = imgUrl
    ? await loadImagePlacement(imgUrl)
    : { x: 0, y: 0, width: 1000, height: 750 };

  let processItems: ProcessItem[] = [...project.process_items];
  const processAnnotations: Annotation[] = [];

  for (const [i, region] of (batchData.regions ?? []).entries()) {
    let processId = region.linkToExistingProcessId as string | undefined;
    const existingIdx = processId ? processItems.findIndex((p) => p.id === processId) : -1;

    if (existingIdx >= 0) {
      processItems[existingIdx] = {
        ...processItems[existingIdx],
        ...region.process,
        id: processItems[existingIdx].id,
      };
      processId = processItems[existingIdx].id;
    } else {
      processId = generateProcessId();
      processItems.push({ id: processId, ...region.process });
    }

    processAnnotations.push(
      mapAiAnnotationToCanvas(
        {
          type: "rect",
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          color: PART_ANNOTATION_COLOR,
          linkedProcessIds: [processId!],
        },
        imageFit,
        imageOffset,
        `ann_batch_${i}_${Date.now()}`,
      ),
    );
  }

  const artboardsAfterProcess = project.canvas_data.artboards.map((ab) =>
    ab.id === primaryArtboard.id
      ? { ...ab, annotations: [...ab.annotations, ...processAnnotations] }
      : ab,
  );

  project = {
    ...project,
    process_items: processItems,
    canvas_data: {
      ...project.canvas_data,
      artboards: artboardsAfterProcess,
      activeArtboardId: primaryArtboard.id,
    },
  };

  // 2. AI 填物料 — 同 /api/ai/bom + handleFillBom（preferIntake: true）
  let bomAdded = 0;
  try {
    const { dataUrl: bomImageUrl } = await resolveGarmentImageForAi(project, {
      preferIntake: true,
    });
    const bomRes = await fetch("/api/ai/bom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...aiBase,
        imageDataUrl: bomImageUrl,
        processItems: project.process_items,
        existingBom: project.bom_items,
        answers,
      }),
    });
    const bomData = await bomRes.json();
    if (bomRes.ok) {
      const existingNames = new Set(project.bom_items.map((b) => b.name.trim()));
      const newItems = (bomData.bom_items ?? []).filter(
        (b: BomItem) => b.name?.trim() && !existingNames.has(b.name.trim()),
      );
      bomAdded = newItems.length;
      project = {
        ...project,
        bom_items: [...project.bom_items, ...newItems],
      };
    }
  } catch {
    /* BOM 非阻断 */
  }

  // 3. AI 填尺寸 — 同 /api/ai/size-chart + runSizeChartAi
  let sizeFilled = 0;
  let dimensionsAdded = 0;
  const { dataUrl: sizeImageUrl } = await resolveGarmentImageForAi(project, {
    activeArtboardId: primaryArtboard.id,
  });

  try {
    const sizeRes = await fetch("/api/ai/size-chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...aiBase,
        imageDataUrl: sizeImageUrl,
        answers,
        existingChart: project.size_chart,
        regionStandard,
        sampleSize,
      }),
    });
    const sizeData = await sizeRes.json();
    if (sizeRes.ok) {
      const size_chart = applySizeChartAssist(
        { sizes: sizeData.sizes ?? [], rows: sizeData.rows ?? [] },
        { regionStandard, sampleSize },
        project.size_chart,
      );
      sizeFilled = countFilledBaselineValues(size_chart);
      project = { ...project, size_chart };

      // 4. 尺寸线 — 同 /api/ai/size-dimension-batch
      if (sizeFilled > 0 && sizeImageUrl) {
        try {
          const skipParts = collectLinkedSizePartsFromProject(project.canvas_data.artboards);
          const dimRes = await fetch("/api/ai/size-dimension-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...aiBase,
              imageDataUrl: sizeImageUrl,
              sizeChart: size_chart,
              sampleSize,
              regionStandard,
              skipParts,
            }),
          });
          const dimData = await dimRes.json();
          if (dimRes.ok && dimData.dimensions?.length) {
            const target = project.canvas_data.artboards.find((a) => a.id === primaryArtboard.id);
            if (target) {
              const fitSource =
                target.imageDataUrl ?? project.intake.imageDataUrl ?? sizeImageUrl;
              const fit = fitSource
                ? await loadImagePlacement(fitSource)
                : imageFit;
              const offset = target.imageOffset ?? { x: 0, y: 0 };
              const artboards = project.canvas_data.artboards.map((ab) => {
                if (ab.id !== primaryArtboard.id) return ab;
                const result = applyBatchSizeDimensions(
                  ab.annotations,
                  dimData.dimensions,
                  size_chart,
                  fit,
                  offset,
                );
                dimensionsAdded = result.added;
                return { ...ab, annotations: result.annotations };
              });
              project = {
                ...project,
                canvas_data: { ...project.canvas_data, artboards },
              };
            }
          }
        } catch {
          /* 尺寸线非阻断 */
        }
      }
    }
  } catch {
    /* 尺码表非阻断 */
  }

  // 5. 款式评语 — 同 /api/ai/style-review + handleStyleReview
  let hasReview = false;
  try {
    const reviewRes = await fetch("/api/ai/style-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: project.title,
        ...aiBase,
        imageDataUrl: processImageUrl,
        processItems: project.process_items.map(({ part, process, stitch }) => ({
          part,
          process,
          stitch,
        })),
        bomItems: project.bom_items.map(({ name, category, spec }) => ({
          name,
          category,
          spec,
        })),
        existingReview: project.style_review,
      }),
    });
    const reviewData = await reviewRes.json();
    if (reviewRes.ok) {
      const review = String(reviewData.review ?? "").trim().slice(0, STYLE_REVIEW_MAX);
      if (review.length >= 20) {
        project = { ...project, style_review: review };
        hasReview = true;
      }
    }
  } catch {
    /* 评语非阻断 */
  }

  const parts = [
    processAnnotations.length > 0 ? `${processAnnotations.length} 个工艺区域` : null,
    bomAdded > 0 ? `${bomAdded} 条物料` : null,
    sizeFilled > 0 ? `${sampleSize} 码 ${sizeFilled} 项尺寸` : null,
    dimensionsAdded > 0 ? `${dimensionsAdded} 条尺寸线` : null,
    hasReview ? "款式评语" : null,
  ].filter(Boolean);

  const summary =
    parts.length > 0
      ? `已生成：${parts.join("、")}`
      : (batchData.userTips ?? "AI 初稿已生成，请在画板中核对");

  return {
    project,
    summary,
    stats: {
      processRegions: processAnnotations.length,
      bomAdded,
      sizeFilled,
      dimensionsAdded,
      hasReview,
    },
  };
}
