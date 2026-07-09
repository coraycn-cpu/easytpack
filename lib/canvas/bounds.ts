import type { Hotspot } from "@/types/process";
import type { Annotation } from "@/types/project";

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

export function computeStudioStageBounds(input: {
  imageFit?: { x: number; y: number; width: number; height: number } | null;
  imageOffset?: { x: number; y: number };
  hotspots: Hotspot[];
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

  for (const hs of input.hotspots) {
    content = mergeBounds(content, {
      minX: hs.x,
      minY: hs.y,
      maxX: hs.x + hs.width,
      maxY: hs.y + hs.height,
    });
  }

  for (const ann of input.annotations) {
    content = mergeBounds(content, annotationBounds(ann));
  }

  const pad = STUDIO_CONTENT_PAD;
  const contentW = content.maxX - content.minX;
  const contentH = content.maxY - content.minY;

  return {
    width: Math.max(MIN_STUDIO_W, contentW + pad * 2),
    height: Math.max(MIN_STUDIO_H, contentH + pad * 2),
    offsetX: pad - content.minX,
    offsetY: pad - content.minY,
  };
}
