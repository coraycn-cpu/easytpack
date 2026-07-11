import type { Annotation, Artboard } from "@/types/project";
import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";
import type { ArtboardSlot } from "@/lib/studio/artboard-layout";

export type RectBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** 工作室画板最小工作区（支持后续多图并排） */
export const MIN_STUDIO_W = 2400;
export const MIN_STUDIO_H = 1600;
export const STUDIO_CONTENT_PAD = 600;

/** 按原图比例放置，仅限制最大边长，不绑定固定画板尺寸 */
export function computeImagePlacement(
  naturalWidth: number,
  naturalHeight: number,
  maxDim = 900,
) {
  const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight));
  return {
    x: 0,
    y: 0,
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}

function mergeBounds(a: RectBounds, b: RectBounds): RectBounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function annotationBounds(ann: Annotation): RectBounds {
  if (ann.type === "arrow" || ann.type === "dimension") {
    const x2 = ann.x2 ?? ann.x;
    const y2 = ann.y2 ?? ann.y;
    return {
      minX: Math.min(ann.x, x2),
      minY: Math.min(ann.y, y2),
      maxX: Math.max(ann.x, x2),
      maxY: Math.max(ann.y, y2),
    };
  }

  if (ann.type === "freehand" && ann.points && ann.points.length >= 2) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < ann.points.length; i += 2) {
      const px = ann.points[i];
      const py = ann.points[i + 1];
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return { minX, minY, maxX, maxY };
  }

  if (ann.type === "text") {
    const w = Math.max(80, (ann.text?.length ?? 4) * 14);
    return { minX: ann.x, minY: ann.y, maxX: ann.x + w, maxY: ann.y + 28 };
  }

  if (ann.type === "marker") {
    const r = 16;
    return {
      minX: ann.x - r,
      minY: ann.y - r,
      maxX: ann.x + r,
      maxY: ann.y + r,
    };
  }

  return {
    minX: ann.x,
    minY: ann.y,
    maxX: ann.x + (ann.width ?? 0),
    maxY: ann.y + (ann.height ?? 0),
  };
}

export function computeMultiStudioStageBounds(input: {
  slots: ArtboardSlot[];
  artboards: Artboard[];
}): { width: number; height: number; offsetX: number; offsetY: number } {
  let content: RectBounds = {
    minX: 0,
    minY: 0,
    maxX: MIN_STUDIO_W,
    maxY: MIN_STUDIO_H,
  };

  for (const slot of input.slots) {
    const ab = input.artboards.find((a) => a.id === slot.id);
    if (!ab) continue;
    const ox = slot.origin.x + slot.imageOffset.x;
    const oy = slot.origin.y + slot.imageOffset.y;
    content = mergeBounds(content, {
      minX: ox + slot.imageFit.x,
      minY: oy + slot.imageFit.y,
      maxX: ox + slot.imageFit.x + slot.imageFit.width,
      maxY: oy + slot.imageFit.y + slot.imageFit.height,
    });
    for (const ann of ab.annotations) {
      const b = annotationBounds(ann);
      content = mergeBounds(content, {
        minX: slot.origin.x + b.minX,
        minY: slot.origin.y + b.minY,
        maxX: slot.origin.x + b.maxX,
        maxY: slot.origin.y + b.maxY,
      });
    }
  }

  const pad = STUDIO_CONTENT_PAD;
  return {
    width: Math.max(MIN_STUDIO_W, content.maxX + pad),
    height: Math.max(MIN_STUDIO_H, content.maxY + pad),
    offsetX: pad,
    offsetY: pad,
  };
}

export function computeStudioStageBounds(input: {
  imageFit?: { x: number; y: number; width: number; height: number } | null;
  imageOffset?: { x: number; y: number };
  annotations: Annotation[];
}): { width: number; height: number; offsetX: number; offsetY: number } {
  let content: RectBounds = {
    minX: 0,
    minY: 0,
    maxX: MIN_STUDIO_W,
    maxY: MIN_STUDIO_H,
  };

  if (input.imageFit) {
    const ox = input.imageOffset?.x ?? 0;
    const oy = input.imageOffset?.y ?? 0;
    content = mergeBounds(content, {
      minX: input.imageFit.x + ox,
      minY: input.imageFit.y + oy,
      maxX: input.imageFit.x + ox + input.imageFit.width,
      maxY: input.imageFit.y + oy + input.imageFit.height,
    });
  }

  for (const ann of input.annotations) {
    content = mergeBounds(content, annotationBounds(ann));
  }

  const pad = STUDIO_CONTENT_PAD;

  // 固定内容原点偏移，不随拖动补偿 minX/minY（否则图片会被拉回中心）
  return {
    width: Math.max(MIN_STUDIO_W, content.maxX + pad),
    height: Math.max(MIN_STUDIO_H, content.maxY + pad),
    offsetX: pad,
    offsetY: pad,
  };
}

/** 将 AI 返回的 1000×750 坐标映射到当前款式图位置 */
export function mapAiAnnotationToCanvas(
  ann: Partial<Annotation> & Pick<Annotation, "type" | "x" | "y"> & { label?: string },
  imageFit: { x: number; y: number; width: number; height: number },
  imageOffset: { x: number; y: number },
  id: string,
): Annotation {
  const sx = imageFit.width / CANVAS_W;
  const sy = imageFit.height / CANVAS_H;
  const ox = imageFit.x + imageOffset.x;
  const oy = imageFit.y + imageOffset.y;

  const mapped: Annotation = {
    id,
    type: ann.type,
    color: ann.color ?? "#ef4444",
    x: ann.x * sx + ox,
    y: ann.y * sy + oy,
    strokeWidth: ann.strokeWidth ?? 3,
    text: ann.text ?? ann.label,
    linkedProcessIds: ann.linkedProcessIds,
  };

  if (ann.width != null) mapped.width = ann.width * sx;
  if (ann.height != null) mapped.height = ann.height * sy;
  if (ann.x2 != null) mapped.x2 = ann.x2 * sx + ox;
  if (ann.y2 != null) mapped.y2 = ann.y2 * sy + oy;
  if (ann.points?.length) {
    mapped.points = ann.points.map((v, i) => (i % 2 === 0 ? v * sx + ox : v * sy + oy));
  }

  return mapped;
}

/** 画布坐标 → 1000×750 逻辑坐标（AI 区域识别用） */
export function annotationToLogicalRect(
  ann: Pick<Annotation, "x" | "y" | "width" | "height">,
  imageFit: { x: number; y: number; width: number; height: number },
  imageOffset: { x: number; y: number },
) {
  const sx = CANVAS_W / imageFit.width;
  const sy = CANVAS_H / imageFit.height;
  const ox = imageFit.x + imageOffset.x;
  const oy = imageFit.y + imageOffset.y;
  return {
    x: Math.round((ann.x - ox) * sx),
    y: Math.round((ann.y - oy) * sy),
    width: Math.round((ann.width ?? 0) * sx),
    height: Math.round((ann.height ?? 0) * sy),
  };
}

export function loadImagePlacement(dataUrl: string, maxDim = 900) {
  return new Promise<ReturnType<typeof computeImagePlacement>>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () =>
      resolve(computeImagePlacement(img.naturalWidth, img.naturalHeight, maxDim));
    img.onerror = reject;
    img.src = dataUrl;
  });
}
