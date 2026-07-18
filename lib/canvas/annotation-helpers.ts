import { AI_ANNOTATION_COLOR, MANUAL_ANNOTATION_COLOR } from "@/lib/canvas/annotation-colors";
import type { Annotation } from "@/types/project";

export function isAiAnnotation(ann: Annotation): boolean {
  return ann.color === AI_ANNOTATION_COLOR;
}

export function isManualAnnotation(ann: Annotation): boolean {
  return ann.color === MANUAL_ANNOTATION_COLOR;
}

export function isAnnotationLocked(ann: Annotation): boolean {
  return Boolean(ann.locked);
}

/** 以原点为锚，按 sx/sy 缩放标注几何（用于款式图拉伸） */
export function scaleAnnotationAroundOrigin(
  ann: Annotation,
  originX: number,
  originY: number,
  sx: number,
  sy: number,
): Annotation {
  const mapX = (x: number) => originX + (x - originX) * sx;
  const mapY = (y: number) => originY + (y - originY) * sy;
  const next: Annotation = {
    ...ann,
    x: mapX(ann.x),
    y: mapY(ann.y),
  };
  if (ann.width != null) next.width = Math.max(1, ann.width * sx);
  if (ann.height != null) next.height = Math.max(1, ann.height * sy);
  if (ann.x2 != null) next.x2 = mapX(ann.x2);
  if (ann.y2 != null) next.y2 = mapY(ann.y2);
  if (ann.points && ann.points.length >= 2) {
    const pts = [...ann.points];
    for (let i = 0; i + 1 < pts.length; i += 2) {
      pts[i] = mapX(pts[i]);
      pts[i + 1] = mapY(pts[i + 1]);
    }
    next.points = pts;
  }
  return next;
}

type Rect = { x: number; y: number; width: number; height: number };

function rectArea(r: Rect): number {
  return Math.max(0, r.width) * Math.max(0, r.height);
}

function intersectionArea(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

/** 新 AI 区域与已有工艺框重叠比例（相对较小框） */
export function rectsOverlapSignificantly(
  a: Rect,
  b: Rect,
  threshold = 0.35,
): boolean {
  const inter = intersectionArea(a, b);
  if (inter <= 0) return false;
  const minArea = Math.min(rectArea(a), rectArea(b));
  return minArea > 0 && inter / minArea >= threshold;
}

export function annotationToRect(ann: Annotation): Rect | null {
  if (ann.type !== "rect" && ann.type !== "circle") return null;
  const w = ann.width ?? 0;
  const h = ann.height ?? 0;
  if (w <= 0 || h <= 0) return null;
  return { x: ann.x, y: ann.y, width: w, height: h };
}

/** 批量 AI 标工艺：跳过与已有区域显著重叠的候选框（坐标系需一致） */
export function filterNonOverlappingRects<T extends Rect>(
  regions: T[],
  existingRects: Rect[],
  threshold = 0.35,
): T[] {
  return regions.filter((region) => {
    const candidate = {
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
    };
    return !existingRects.some((ex) => rectsOverlapSignificantly(candidate, ex, threshold));
  });
}

/** @deprecated 使用 filterNonOverlappingRects，传入 annotationToRect 结果 */
export function filterNonOverlappingRegions<T extends Rect>(
  regions: T[],
  existing: Annotation[],
  threshold = 0.35,
): T[] {
  const existingRects = existing
    .map(annotationToRect)
    .filter(Boolean) as Rect[];
  return filterNonOverlappingRects(regions, existingRects, threshold);
}

export function markAnnotationsManual(
  annotations: Annotation[],
  ids: Set<string>,
): Annotation[] {
  return annotations.map((a) =>
    ids.has(a.id) ? { ...a, color: MANUAL_ANNOTATION_COLOR } : a,
  );
}

export function toggleAnnotationsLock(
  annotations: Annotation[],
  ids: Set<string>,
  locked: boolean,
): Annotation[] {
  return annotations.map((a) => (ids.has(a.id) ? { ...a, locked } : a));
}

export function removeAnnotationsByIds(
  annotations: Annotation[],
  ids: Set<string>,
): Annotation[] {
  return annotations.filter((a) => !ids.has(a.id));
}
