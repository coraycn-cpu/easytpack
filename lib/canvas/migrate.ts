import type { Annotation } from "@/types/project";

type LegacyAnnotation = Omit<Annotation, "type"> & {
  type: Annotation["type"] | "label";
};

/** 兼容旧版 arrow / label 标注 */
export function normalizeAnnotation(ann: LegacyAnnotation): Annotation {
  if (ann.type === "label") {
    const { type: _legacy, ...rest } = ann;
    return { ...rest, type: "text" };
  }
  const { type, ...rest } = ann;
  return {
    ...rest,
    type,
    color: ann.color ?? "#ef4444",
    strokeWidth: ann.strokeWidth ?? 3,
  };
}

export function normalizeAnnotations(list: LegacyAnnotation[]): Annotation[] {
  return list.map(normalizeAnnotation);
}
