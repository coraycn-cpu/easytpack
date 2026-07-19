import type { Artboard, Annotation, TechPackProject } from "@/types/project";
import type { ProcessItem } from "@/types/process";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import {
  filterAnnotationsForExport,
  type ExportLayerFilter,
} from "@/lib/canvas/annotation-layers";
import { computeSequenceBadges } from "@/lib/canvas/sequence-badges";
import {
  annotationBounds,
  loadImagePlacement,
  type RectBounds,
} from "@/lib/canvas/bounds";
import { migrateArtboardHotspots } from "@/lib/project/hotspots";
import { sortArtboardsForExport } from "@/lib/export/artboard-order";
import { computeArtboardSlots } from "@/lib/studio/artboard-layout";
import {
  buildSheetSections,
  drawSheetSections,
  measureSheetSectionsHeight,
  MIN_SHEET_W,
} from "@/lib/export/sheet-layout";
import { formatDate } from "@/lib/project/progress";

export type AnnotatedImageMode = "merged" | "split";

export type RenderArtboardOptions = {
  layerFilter?: ExportLayerFilter;
  processItems?: ProcessItem[];
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
  const a = normalizeAnnotations([ann])[0];
  const c = a.color ?? "#ef4444";
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = a.strokeWidth ?? 3;

  switch (a.type) {
    case "rect":
      if (a.width && a.height) {
        if (a.linkedProcessIds?.length) ctx.setLineDash([6, 3]);
        ctx.fillStyle = `${c}33`;
        ctx.fillRect(a.x, a.y, a.width, a.height);
        ctx.strokeRect(a.x, a.y, a.width, a.height);
        ctx.setLineDash([]);
        const label = a.text;
        if (label) {
          ctx.fillStyle = a.linkedProcessIds?.length ? "#1d4ed8" : c;
          ctx.font = "bold 13px sans-serif";
          ctx.fillText(label, a.x + 4, a.y > 16 ? a.y - 6 : a.y + 16);
        }
      }
      break;
    case "circle": {
      const rx = (a.width ?? 40) / 2;
      const ry = (a.height ?? 40) / 2;
      ctx.beginPath();
      ctx.ellipse(a.x + rx, a.y + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = `${c}33`;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "arrow":
    case "dimension":
      if (a.x2 != null && a.y2 != null) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x2, a.y2);
        if (a.type === "dimension") ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        const angle = Math.atan2(a.y2 - a.y, a.x2 - a.x);
        const head = 12;
        ctx.beginPath();
        ctx.moveTo(a.x2, a.y2);
        ctx.lineTo(a.x2 - head * Math.cos(angle - 0.4), a.y2 - head * Math.sin(angle - 0.4));
        ctx.lineTo(a.x2 - head * Math.cos(angle + 0.4), a.y2 - head * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        if (a.text) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillText(a.text, a.x2 + 6, a.y2 - 4);
        }
      }
      break;
    case "line":
      if (a.x2 != null && a.y2 != null) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x2, a.y2);
        if (a.dashed) ctx.setLineDash([8, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;
    case "text":
      if (a.text) {
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(a.text, a.x, a.y);
      }
      break;
    case "freehand":
      if (a.points && a.points.length > 2) {
        ctx.beginPath();
        ctx.moveTo(a.points[0], a.points[1]);
        for (let i = 2; i < a.points.length; i += 2) {
          ctx.lineTo(a.points[i], a.points[i + 1]);
        }
        ctx.stroke();
      }
      break;
  }
}

function drawSequenceBadges(
  ctx: CanvasRenderingContext2D,
  processItems: ProcessItem[],
  annotations: Annotation[],
) {
  const badges = computeSequenceBadges(processItems, annotations);
  for (const b of badges) {
    ctx.beginPath();
    ctx.arc(b.x + 14, b.y + 14, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.label, b.x + 14, b.y + 19);
    ctx.textAlign = "left";
  }
}

const ARTBOARD_EXPORT_PAD = 32;
/** 单板导出长边上限，避免超大 dataURL */
const ARTBOARD_EXPORT_MAX_EDGE = 2200;

/**
 * 按工作室实际坐标渲染单板（含缩放/偏移），并裁到内容包围盒。
 * 不再塞进固定 1000×750，否则图会挤在角上、预览/PDF 看起来「错位」。
 */
export async function renderArtboardToDataUrl(
  artboard: Artboard,
  imageFallback?: string,
  options: RenderArtboardOptions = {},
): Promise<string | null> {
  const { layerFilter = "all", processItems = [] } = options;
  const src = artboard.imageDataUrl ?? imageFallback;
  if (!src) return null;

  const img = await loadImage(src);
  const fit = await loadImagePlacement(src);
  const offset = artboard.imageOffset ?? { x: 0, y: 0 };
  const scale = artboard.imageScale ?? { x: 1, y: 1 };
  const drawW = Math.max(1, fit.width * (scale.x || 1));
  const drawH = Math.max(1, fit.height * (scale.y || 1));
  const drawX = fit.x + offset.x;
  const drawY = fit.y + offset.y;

  const ab = migrateArtboardHotspots(artboard);
  const anns = filterAnnotationsForExport(
    normalizeAnnotations(ab.annotations),
    layerFilter,
  );

  let content: RectBounds = {
    minX: drawX,
    minY: drawY,
    maxX: drawX + drawW,
    maxY: drawY + drawH,
  };
  for (const ann of anns) {
    content = mergeRect(content, annotationBounds(ann));
  }

  const pad = ARTBOARD_EXPORT_PAD;
  let logicalW = Math.max(1, Math.ceil(content.maxX - content.minX + pad * 2));
  let logicalH = Math.max(1, Math.ceil(content.maxY - content.minY + pad * 2));
  const originX = pad - content.minX;
  const originY = pad - content.minY;

  let outScale = 1;
  const maxEdge = Math.max(logicalW, logicalH);
  if (maxEdge > ARTBOARD_EXPORT_MAX_EDGE) {
    outScale = ARTBOARD_EXPORT_MAX_EDGE / maxEdge;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(logicalW * outScale));
  canvas.height = Math.max(1, Math.floor(logicalH * outScale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(outScale, outScale);
  // 工艺包纸面白底；深色底会让黑/深色成衣在分页预览里看起来「整页发黑」
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, logicalW, logicalH);
  ctx.drawImage(img, drawX + originX, drawY + originY, drawW, drawH);

  ctx.save();
  ctx.translate(originX, originY);
  anns.forEach((ann) => drawAnnotation(ctx, ann));
  if (layerFilter === "all" || layerFilter === "process") {
    drawSequenceBadges(ctx, processItems, anns);
  }
  ctx.restore();

  return canvas.toDataURL("image/png");
}

export async function renderAllArtboards(
  artboards: Artboard[],
  imageFallback?: string,
  processItems: ProcessItem[] = [],
  mode: AnnotatedImageMode = "merged",
): Promise<Array<{ name: string; dataUrl: string; group?: "process" | "size" | "merged" }>> {
  const results: Array<{ name: string; dataUrl: string; group?: "process" | "size" | "merged" }> =
    [];

  for (const ab of sortArtboardsForExport(artboards)) {
    if (mode === "merged") {
      const dataUrl = await renderArtboardToDataUrl(ab, imageFallback, {
        layerFilter: "all",
        processItems,
      });
      if (dataUrl) results.push({ name: ab.name, dataUrl, group: "merged" });
    } else {
      const processUrl = await renderArtboardToDataUrl(ab, imageFallback, {
        layerFilter: "process",
        processItems,
      });
      const sizeUrl = await renderArtboardToDataUrl(ab, imageFallback, {
        layerFilter: "size",
        processItems,
      });
      if (processUrl) results.push({ name: `${ab.name}-工艺`, dataUrl: processUrl, group: "process" });
      if (sizeUrl) results.push({ name: `${ab.name}-尺寸`, dataUrl: sizeUrl, group: "size" });
    }
  }
  return results;
}

const STAGE_EXPORT_PAD = 48;
const STAGE_MAX_PIXELS = 16_000_000;
/** 微信转发友好：合拼大图长边上限 */
const SHARE_MAX_EDGE = 4096;

function mergeRect(a: RectBounds, b: RectBounds): RectBounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** 导出用紧凑包围盒（不含 Studio 最小画布空白） */
function computeStageExportBounds(
  slots: Awaited<ReturnType<typeof computeArtboardSlots>>,
  artboards: Artboard[],
): { width: number; height: number; offsetX: number; offsetY: number } | null {
  let content: RectBounds | null = null;

  for (const slot of slots) {
    const ab = artboards.find((a) => a.id === slot.id);
    if (!ab) continue;
    const ox = slot.origin.x + slot.imageOffset.x;
    const oy = slot.origin.y + slot.imageOffset.y;
    const imageRect: RectBounds = {
      minX: ox + slot.imageFit.x,
      minY: oy + slot.imageFit.y,
      maxX: ox + slot.imageFit.x + slot.imageFit.width,
      maxY: oy + slot.imageFit.y + slot.imageFit.height,
    };
    content = content ? mergeRect(content, imageRect) : imageRect;

    for (const ann of ab.annotations) {
      const b = annotationBounds(ann);
      const annRect: RectBounds = {
        minX: slot.origin.x + b.minX,
        minY: slot.origin.y + b.minY,
        maxX: slot.origin.x + b.maxX,
        maxY: slot.origin.y + b.maxY,
      };
      content = mergeRect(content, annRect);
    }
  }

  if (!content) return null;

  const pad = STAGE_EXPORT_PAD;
  return {
    width: Math.max(1, Math.ceil(content.maxX - content.minX + pad * 2)),
    height: Math.max(1, Math.ceil(content.maxY - content.minY + pad * 2)),
    offsetX: pad - content.minX,
    offsetY: pad - content.minY,
  };
}

function canvasToExportDataUrl(
  canvas: HTMLCanvasElement,
  options?: { preferJpeg?: boolean },
): string {
  try {
    if (options?.preferJpeg) {
      return canvas.toDataURL("image/jpeg", 0.88);
    }
    const png = canvas.toDataURL("image/png");
    if (png.length > 8_000_000) {
      return canvas.toDataURL("image/jpeg", 0.88);
    }
    return png;
  } catch {
    return canvas.toDataURL("image/jpeg", 0.85);
  }
}

/** 将画布缩放到适合微信转发的长边，优先 JPEG */
function canvasToShareDataUrl(source: HTMLCanvasElement): string {
  const maxEdge = Math.max(source.width, source.height);
  let canvas = source;
  if (maxEdge > SHARE_MAX_EDGE) {
    const scale = SHARE_MAX_EDGE / maxEdge;
    const w = Math.max(1, Math.floor(source.width * scale));
    const h = Math.max(1, Math.floor(source.height * scale));
    const scaled = document.createElement("canvas");
    scaled.width = w;
    scaled.height = h;
    const ctx = scaled.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
      canvas = scaled;
    }
  }
  return canvasToExportDataUrl(canvas, { preferJpeg: true });
}

/**
 * 按 Studio 画布摆放位置，将多画板图+标注合成为一张大图。
 * 坐标系与 AnnotationCanvas multiMode 一致：标注相对各板 origin。
 */
export async function renderStudioStageToDataUrl(
  artboards: Artboard[],
  processItems: ProcessItem[] = [],
  mode: AnnotatedImageMode = "merged",
): Promise<string | null> {
  const stage = await renderStudioStageToCanvas(artboards, processItems, mode);
  return stage ? canvasToExportDataUrl(stage.canvas) : null;
}

type StageCanvasResult = {
  canvas: HTMLCanvasElement;
  /** 逻辑宽度（未乘 scale 前的内容宽） */
  contentWidth: number;
  contentHeight: number;
};

async function renderStudioStageToCanvas(
  artboards: Artboard[],
  processItems: ProcessItem[] = [],
  mode: AnnotatedImageMode = "merged",
): Promise<StageCanvasResult | null> {
  const slots = await computeArtboardSlots(artboards);
  if (slots.length === 0) return null;

  const bounds = computeStageExportBounds(slots, artboards);
  if (!bounds) return null;

  let { width, height, offsetX, offsetY } = bounds;
  const contentWidth = width;
  const contentHeight = height;
  let scale = 1;
  if (width * height > STAGE_MAX_PIXELS) {
    scale = Math.sqrt(STAGE_MAX_PIXELS / (width * height));
    width = Math.max(1, Math.floor(width * scale));
    height = Math.max(1, Math.floor(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.scale(scale, scale);

  const layerFilter: ExportLayerFilter = mode === "split" ? "process" : "all";

  for (const slot of slots) {
    const ab = artboards.find((a) => a.id === slot.id);
    if (!ab?.imageDataUrl) continue;

    const img = await loadImage(ab.imageDataUrl);
    const drawX = offsetX + slot.origin.x + slot.imageOffset.x + slot.imageFit.x;
    const drawY = offsetY + slot.origin.y + slot.imageOffset.y + slot.imageFit.y;
    ctx.drawImage(img, drawX, drawY, slot.imageFit.width, slot.imageFit.height);

    ctx.fillStyle = "#64748b";
    ctx.font = "600 13px sans-serif";
    ctx.fillText(ab.name, drawX, Math.max(14, drawY - 8));

    const migrated = migrateArtboardHotspots(ab);
    const anns = filterAnnotationsForExport(
      normalizeAnnotations(migrated.annotations),
      layerFilter,
    );

    ctx.save();
    ctx.translate(offsetX + slot.origin.x, offsetY + slot.origin.y);
    anns.forEach((ann) => drawAnnotation(ctx, ann));
    if (layerFilter === "all" || layerFilter === "process") {
      drawSequenceBadges(ctx, processItems, anns);
    }
    ctx.restore();
  }

  return { canvas, contentWidth, contentHeight };
}

/**
 * 画布摆放图 + 有数据的工艺 / BOM / 尺寸 / 备注，合成一张完整导出图。
 * 默认按微信转发友好尺寸/JPEG 输出。
 */
export async function renderTechPackSheetToDataUrl(
  project: TechPackProject,
  mode: AnnotatedImageMode = "merged",
  options?: { forShare?: boolean },
): Promise<string | null> {
  const forShare = options?.forShare !== false;
  const stage = await renderStudioStageToCanvas(
    project.canvas_data.artboards,
    project.process_items,
    mode,
  );

  const sheetWidth = Math.max(MIN_SHEET_W, stage?.canvas.width ?? 0);
  const sections = buildSheetSections(project, sheetWidth);
  const tablesH = measureSheetSectionsHeight(sections);

  if (!stage && sections.length === 0) return null;

  const stageW = stage?.canvas.width ?? 0;
  const stageH = stage?.canvas.height ?? 0;
  const headerH = 56;
  const finalW = Math.max(sheetWidth, stageW);
  const finalH = headerH + stageH + tablesH + (stage || sections.length ? 24 : 0);

  let width = finalW;
  let height = finalH;
  let scale = 1;
  if (width * height > STAGE_MAX_PIXELS) {
    scale = Math.sqrt(STAGE_MAX_PIXELS / (width * height));
    width = Math.max(1, Math.floor(width * scale));
    height = Math.max(1, Math.floor(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.scale(scale, scale);

  // header strip
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, finalW, headerH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 16px sans-serif";
  ctx.textBaseline = "middle";
  const title = project.title?.trim() || "未命名款式";
  ctx.fillText(title, 24, headerH / 2 - 8);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#94a3b8";
  const meta = [
    project.intake.detectedCategory,
    project.styleNo ?? project.id.slice(-8).toUpperCase(),
    formatDate(project.updatedAt),
  ]
    .filter(Boolean)
    .join(" · ");
  ctx.fillText(meta || "Tech Pack", 24, headerH / 2 + 12);

  let y = headerH;
  if (stage) {
    const dx = Math.max(0, Math.floor((finalW - stageW) / 2));
    ctx.drawImage(stage.canvas, dx, y);
    y += stageH;
  }

  if (sections.length) {
    const tableX = Math.max(24, Math.floor((finalW - sheetWidth) / 2));
    // separator
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(24, y + 12);
    ctx.lineTo(finalW - 24, y + 12);
    ctx.stroke();
    drawSheetSections(ctx, sections, tableX, y, sheetWidth);
  }

  return forShare ? canvasToShareDataUrl(canvas) : canvasToExportDataUrl(canvas);
}
