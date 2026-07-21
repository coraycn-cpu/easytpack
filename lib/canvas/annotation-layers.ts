import type { Annotation } from "@/types/project";

export type AnnotationLayer = "process" | "size" | "other";

export type LayerVisibility = {
  process: boolean;
  size: boolean;
};

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  process: true,
  size: true,
};

export type StudioDataTab = "process" | "bom" | "size" | "review";

export const TAB_LAYER_PRESETS: Record<StudioDataTab, LayerVisibility> = {
  process: { process: true, size: false },
  size: { process: false, size: true },
  bom: { process: true, size: true },
  review: { process: true, size: true },
};

export function getAnnotationLayer(ann: Annotation): AnnotationLayer {
  if (ann.type === "dimension") return "size";
  if (ann.type === "rect" || ann.type === "circle") return "process";
  return "other";
}

export function isLayerVisible(ann: Annotation, visibility: LayerVisibility): boolean {
  const layer = getAnnotationLayer(ann);
  if (layer === "other") return true;
  if (layer === "process") return visibility.process;
  return visibility.size;
}

export function filterAnnotationsByLayers(
  annotations: Annotation[],
  visibility: LayerVisibility,
): Annotation[] {
  return annotations.filter((ann) => isLayerVisible(ann, visibility));
}

export type ExportLayerFilter = "all" | "process" | "size" | "none";

export function filterAnnotationsForExport(
  annotations: Annotation[],
  filter: ExportLayerFilter,
): Annotation[] {
  if (filter === "none") return [];
  if (filter === "all") return annotations;
  return annotations.filter((ann) => {
    const layer = getAnnotationLayer(ann);
    if (layer === "other") return true;
    return filter === layer;
  });
}
