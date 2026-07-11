import type { ProcessItem } from "@/types/process";
import type { Annotation, Artboard, TechPackProject } from "@/types/project";

const MARKER_CHARS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];
const LINKABLE_TYPES = new Set<Annotation["type"]>(["rect", "circle"]);

export function isLinkableShape(type: Annotation["type"]): boolean {
  return LINKABLE_TYPES.has(type);
}

export function getMarkerLabel(index: number): string {
  if (index >= 1 && index <= MARKER_CHARS.length) return MARKER_CHARS[index - 1];
  return `${index}`;
}

export function getAnnotationProcessIds(ann: Annotation): string[] {
  return ann.linkedProcessIds ?? [];
}

export function hasCanvasAnnotations(project: TechPackProject): boolean {
  return project.canvas_data.artboards.some((a) =>
    a.annotations.some(
      (ann) => isLinkableShape(ann.type) && getAnnotationProcessIds(ann).length > 0,
    ),
  );
}

export function getAllLinkedProcessIds(project: TechPackProject): Set<string> {
  const ids = new Set<string>();
  for (const ab of project.canvas_data.artboards) {
    for (const ann of ab.annotations) {
      for (const pid of getAnnotationProcessIds(ann)) ids.add(pid);
    }
  }
  return ids;
}

export function countLinkedProcessItems(project: TechPackProject): number {
  const linked = getAllLinkedProcessIds(project);
  return project.process_items.filter((p) => p.id && linked.has(p.id)).length;
}

export function findProcessIndexById(processItems: ProcessItem[], processId: string): number {
  return processItems.findIndex((p) => p.id === processId);
}

export function findProcessIdsForAnnotation(
  ann: Annotation,
  processItems: ProcessItem[],
): string[] {
  if (!isLinkableShape(ann.type)) return [];
  return getAnnotationProcessIds(ann).filter((id) =>
    processItems.some((p) => p.id === id),
  );
}

export function findAnnotationsForProcessId(
  annotations: Annotation[],
  processId: string,
): Annotation[] {
  return annotations.filter(
    (a) => isLinkableShape(a.type) && getAnnotationProcessIds(a).includes(processId),
  );
}

export function findAnnotationsForProcessInProject(
  project: TechPackProject,
  processId: string,
): Array<{ annotation: Annotation; artboardId: string }> {
  const results: Array<{ annotation: Annotation; artboardId: string }> = [];
  for (const ab of project.canvas_data.artboards) {
    for (const ann of findAnnotationsForProcessId(ab.annotations, processId)) {
      results.push({ annotation: ann, artboardId: ab.id });
    }
  }
  return results;
}

export function findAnnotationsForProcessIndex(
  project: TechPackProject,
  processIndex: number,
): Array<{ annotation: Annotation; artboardId: string }> {
  const item = project.process_items[processIndex];
  if (!item?.id) return [];
  return findAnnotationsForProcessInProject(project, item.id);
}

export function countShapesLinkedToProcess(
  project: TechPackProject,
  processId: string,
): number {
  return findAnnotationsForProcessInProject(project, processId).length;
}

export function linkShapeToProcesses(
  annotations: Annotation[],
  annId: string,
  processIds: string[],
): Annotation[] {
  const unique = [...new Set(processIds.filter(Boolean))];
  return annotations.map((a) => {
    if (a.id !== annId || !isLinkableShape(a.type)) return a;
    return { ...a, linkedProcessIds: unique.length ? unique : undefined };
  });
}

export function toggleShapeProcessLink(
  annotations: Annotation[],
  annId: string,
  processId: string,
  linked: boolean,
): Annotation[] {
  return annotations.map((a) => {
    if (a.id !== annId || !isLinkableShape(a.type)) return a;
    const current = new Set(getAnnotationProcessIds(a));
    if (linked) current.add(processId);
    else current.delete(processId);
    const next = [...current];
    return { ...a, linkedProcessIds: next.length ? next : undefined };
  });
}

export function clearProcessIdFromAnnotations(
  annotations: Annotation[],
  processId: string,
): Annotation[] {
  return annotations.map((a) => {
    if (!isLinkableShape(a.type)) return a;
    const next = getAnnotationProcessIds(a).filter((id) => id !== processId);
    return { ...a, linkedProcessIds: next.length ? next : undefined };
  });
}

export function getArtboardAnnotations(
  artboards: Artboard[],
  artboardId: string,
): Annotation[] {
  return artboards.find((a) => a.id === artboardId)?.annotations ?? [];
}
