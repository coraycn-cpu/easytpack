import { partsMatch } from "@/lib/ai/merge-identity";
import type { Annotation, SizeChart, TechPackProject } from "@/types/project";

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
    (a) =>
      isDimensionAnnotation(a) &&
      Boolean(a.linkedSizePart?.trim()) &&
      partsMatch(a.linkedSizePart!, key),
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
    if (a.linkedSizePart?.trim() && partsMatch(a.linkedSizePart, key)) {
      const { linkedSizePart: _p, ...rest } = a;
      return rest as Annotation;
    }
    return a;
  });
}

/** 仅解除关联，保留尺寸线 */
export function clearSizePartFromAnnotations(
  annotations: Annotation[],
  part: string,
): Annotation[] {
  const key = part.trim();
  return annotations.map((a) => {
    if (
      !isDimensionAnnotation(a) ||
      !a.linkedSizePart?.trim() ||
      !partsMatch(a.linkedSizePart, key)
    ) {
      return a;
    }
    const { linkedSizePart: _p, ...rest } = a;
    return rest as Annotation;
  });
}

/** 删除与部位关联的尺寸线标注（删尺码表行时用） */
export function removeDimensionAnnotationsForPart(
  annotations: Annotation[],
  part: string,
): Annotation[] {
  const key = part.trim();
  if (!key) return annotations;
  return annotations.filter(
    (a) =>
      !(
        isDimensionAnnotation(a) &&
        a.linkedSizePart?.trim() &&
        partsMatch(a.linkedSizePart, key)
      ),
  );
}

export function findAnnotationsForSizePartInProject(
  project: TechPackProject,
  part: string,
): Array<{ annotation: Annotation; artboardId: string }> {
  const results: Array<{ annotation: Annotation; artboardId: string }> = [];
  for (const ab of project.canvas_data.artboards) {
    for (const ann of findAnnotationsForSizePart(ab.annotations, part)) {
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

function formatDimensionText(cm: string): string {
  const value = cm.trim();
  if (!value) return "";
  return /cm$/i.test(value) ? value : `${value}cm`;
}

/**
 * 把尺码表基准码数值写回画布尺寸线文字。
 */
export function syncDimensionTextsFromSizeChart(
  annotations: Annotation[],
  sizeChart: SizeChart,
): Annotation[] {
  const sample = sizeChart.sampleSize?.trim();
  if (!sample) return annotations;

  return annotations.map((ann) => {
    if (!isDimensionAnnotation(ann) || !ann.linkedSizePart?.trim()) return ann;
    const row = sizeChart.rows.find(
      (r) => r.part.trim() && partsMatch(r.part, ann.linkedSizePart!),
    );
    if (!row) return ann;
    const cm = row.values[sample]?.trim();
    if (!cm) return ann;
    const text = formatDimensionText(cm);
    if (text === ann.text) return ann;
    return { ...ann, text };
  });
}

export function syncDimensionTextsInProject(
  project: TechPackProject,
  sizeChart: SizeChart = project.size_chart,
): TechPackProject["canvas_data"]["artboards"] {
  return project.canvas_data.artboards.map((ab) => ({
    ...ab,
    annotations: syncDimensionTextsFromSizeChart(ab.annotations, sizeChart),
  }));
}
