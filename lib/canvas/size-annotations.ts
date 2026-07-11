import type { Annotation, TechPackProject } from "@/types/project";

export function isDimensionAnnotation(ann: Annotation): boolean {
  return ann.type === "dimension";
}

export function getAnnotationSizePart(ann: Annotation): string | undefined {
  if (!isDimensionAnnotation(ann)) return undefined;
  return ann.linkedSizePart?.trim() || undefined;
}

export function findAnnotationsForSizePart(
  annotations: Annotation[],
  part: string,
): Annotation[] {
  const key = part.trim();
  if (!key) return [];
  return annotations.filter(
    (a) => isDimensionAnnotation(a) && a.linkedSizePart?.trim() === key,
  );
}

export function toggleDimensionSizePartLink(
  annotations: Annotation[],
  annId: string,
  part: string,
  linked: boolean,
): Annotation[] {
  const key = part.trim();
  return annotations.map((a) => {
    if (a.id !== annId || !isDimensionAnnotation(a)) return a;
    if (linked && key) {
      return { ...a, linkedSizePart: key };
    }
    if (a.linkedSizePart?.trim() === key) {
      const { linkedSizePart: _p, ...rest } = a;
      return rest as Annotation;
    }
    return a;
  });
}

export function clearSizePartFromAnnotations(
  annotations: Annotation[],
  part: string,
): Annotation[] {
  const key = part.trim();
  return annotations.map((a) => {
    if (!isDimensionAnnotation(a) || a.linkedSizePart?.trim() !== key) return a;
    const { linkedSizePart: _p, ...rest } = a;
    return rest as Annotation;
  });
}

export function findAnnotationsForSizePartInProject(
  project: TechPackProject,
  part: string,
): Array<{ annotation: Annotation; artboardId: string }> {
  const key = part.trim();
  const results: Array<{ annotation: Annotation; artboardId: string }> = [];
  for (const ab of project.canvas_data.artboards) {
    for (const ann of findAnnotationsForSizePart(ab.annotations, key)) {
      results.push({ annotation: ann, artboardId: ab.id });
    }
  }
  return results;
}

export function countDimensionsLinkedToSizePart(
  project: TechPackProject,
  part: string,
): number {
  return findAnnotationsForSizePartInProject(project, part).length;
}
