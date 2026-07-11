import { generateProcessId } from "@/lib/process/ids";
import { isLinkableShape } from "@/lib/canvas/part-annotations";
import type { ProcessItem } from "@/types/process";
import type { Annotation, TechPackProject } from "@/types/project";

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

function partToProcessId(part: string, processItems: ProcessItem[]): string | undefined {
  const trim = part.trim();
  if (!trim) return undefined;
  return processItems.find((p) => p.part?.trim() === trim)?.id;
}

function nearestLinkableShape(
  annotations: Annotation[],
  x: number,
  y: number,
): Annotation | undefined {
  let best: Annotation | undefined;
  let bestDist = Infinity;
  for (const ann of annotations) {
    if (!isLinkableShape(ann.type)) continue;
    const cx = ann.x + (ann.width ?? 0) / 2;
    const cy = ann.y + (ann.height ?? 0) / 2;
    const d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = ann;
    }
  }
  return best;
}

function stripLegacyLinkFields(ann: Annotation): Annotation {
  const { linkedPart: _lp, markerIndex: _mi, ...rest } = ann;
  return rest as Annotation;
}

function addProcessIdToShape(
  annotations: Annotation[],
  annId: string,
  processId: string,
): Annotation[] {
  return annotations.map((a) => {
    if (a.id !== annId || !isLinkableShape(a.type)) return a;
    const ids = new Set(a.linkedProcessIds ?? []);
    ids.add(processId);
    return stripLegacyLinkFields({ ...a, linkedProcessIds: [...ids] });
  });
}

/** 迁移 linkedPart / marker → linkedProcessIds，移除 marker 图形 */
export function migrateAnnotationLinks(project: TechPackProject): TechPackProject {
  const process_items = project.process_items.map((item) => ({
    ...item,
    id: item.id ?? generateProcessId(),
  }));

  const artboards = project.canvas_data.artboards.map((ab) => {
    let annotations = normalizeAnnotations(ab.annotations as LegacyAnnotation[]);

    const markers = annotations.filter((a) => a.type === "marker");
    const nonMarkers = annotations.filter((a) => a.type !== "marker");

    let migrated = nonMarkers.map((ann) => {
      if (!isLinkableShape(ann.type)) {
        return stripLegacyLinkFields(ann);
      }

      const ids = new Set(ann.linkedProcessIds ?? []);

      if (ann.linkedPart?.trim()) {
        const pid = partToProcessId(ann.linkedPart, process_items);
        if (pid) ids.add(pid);
      }

      const cleaned = stripLegacyLinkFields(ann);
      return ids.size ? { ...cleaned, linkedProcessIds: [...ids] } : cleaned;
    });

    for (const marker of markers) {
      const idx = (marker.markerIndex ?? 1) - 1;
      const processId = process_items[idx]?.id;
      if (!processId) continue;

      const target =
        nearestLinkableShape(migrated, marker.x, marker.y) ??
        migrated.find((a) => isLinkableShape(a.type));

      if (target) {
        migrated = addProcessIdToShape(migrated, target.id, processId);
      }
    }

    return { ...ab, annotations: migrated };
  });

  return {
    ...project,
    process_items,
    canvas_data: { ...project.canvas_data, artboards },
  };
}
