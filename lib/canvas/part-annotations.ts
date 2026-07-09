import type { Annotation, Artboard, TechPackProject } from "@/types/project";
import type { ProcessItem } from "@/types/process";

const MARKER_CHARS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

export function getMarkerLabel(index: number): string {
  if (index >= 1 && index <= MARKER_CHARS.length) return MARKER_CHARS[index - 1];
  return `${index}`;
}

/** 从标注中提取已关联的部位名 */
export function getLinkedPartsFromAnnotations(annotations: Annotation[]): string[] {
  const parts = new Set<string>();
  for (const ann of annotations) {
    if (ann.linkedPart?.trim()) parts.add(ann.linkedPart.trim());
    else if (ann.type === "marker" && ann.text?.trim()) parts.add(ann.text.trim());
  }
  return [...parts];
}

export function getAllLinkedParts(project: TechPackProject): string[] {
  const parts = new Set<string>();
  for (const ab of project.canvas_data.artboards) {
    for (const p of getLinkedPartsFromAnnotations(ab.annotations)) {
      parts.add(p);
    }
  }
  return [...parts];
}

export function hasCanvasAnnotations(project: TechPackProject): boolean {
  return project.canvas_data.artboards.some((a) => a.annotations.length > 0);
}

export function countLinkedProcessParts(project: TechPackProject): number {
  const linked = new Set(getAllLinkedParts(project));
  return project.process_items.filter((p) => p.part && linked.has(p.part)).length;
}

/** 工艺行 index（0-based）对应的标注 */
export function findAnnotationForProcessIndex(
  annotations: Annotation[],
  processItems: ProcessItem[],
  processIndex: number,
): Annotation | undefined {
  const item = processItems[processIndex];
  if (!item) return undefined;
  const part = item.part?.trim();
  const markerIdx = processIndex + 1;

  const byMarker = annotations.find(
    (a) => a.type === "marker" && a.markerIndex === markerIdx,
  );
  if (byMarker) return byMarker;

  if (part) {
    return annotations.find((a) => a.linkedPart?.trim() === part);
  }
  return undefined;
}

/** 在全项目画板中查找工艺行对应的标注 */
export function findAnnotationForProcessInProject(
  project: TechPackProject,
  processIndex: number,
): { annotation: Annotation; artboardId: string } | null {
  for (const ab of project.canvas_data.artboards) {
    const ann = findAnnotationForProcessIndex(
      ab.annotations,
      project.process_items,
      processIndex,
    );
    if (ann) return { annotation: ann, artboardId: ab.id };
  }
  return null;
}

/** 标注对应的工艺行 index，未匹配返回 -1 */
export function findProcessIndexForAnnotation(
  annotations: Annotation[],
  processItems: ProcessItem[],
  ann: Annotation,
): number {
  if (ann.type === "marker" && ann.markerIndex != null) {
    const idx = ann.markerIndex - 1;
    if (idx >= 0 && idx < processItems.length) return idx;
  }
  const part = ann.linkedPart?.trim();
  if (part) {
    const idx = processItems.findIndex((p) => p.part?.trim() === part);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** 新建序号标注时写入 linkedPart */
export function linkedPartForMarkerIndex(
  processItems: ProcessItem[],
  markerIndex: number,
): string | undefined {
  return processItems[markerIndex - 1]?.part?.trim() || undefined;
}

/** 工艺部位改名时同步标注 linkedPart */
export function syncLinkedPartOnProcessRename(
  annotations: Annotation[],
  oldPart: string,
  newPart: string,
  processIndex: number,
): Annotation[] {
  const oldTrim = oldPart.trim();
  const newTrim = newPart.trim();
  if (!oldTrim || oldTrim === newTrim) return annotations;

  return annotations.map((a) => {
    const matchesPart = a.linkedPart?.trim() === oldTrim;
    const matchesIndex =
      a.type === "marker" && a.markerIndex === processIndex + 1;
    if (matchesPart || matchesIndex) {
      return { ...a, linkedPart: newTrim || undefined };
    }
    return a;
  });
}

/** 删除工艺行后清除对应标注关联 */
export function clearAnnotationLinkForProcessIndex(
  annotations: Annotation[],
  processIndex: number,
  part?: string,
): Annotation[] {
  const markerIdx = processIndex + 1;
  const partTrim = part?.trim();
  return annotations.map((a) => {
    const matchesMarker = a.type === "marker" && a.markerIndex === markerIdx;
    const matchesPart = partTrim && a.linkedPart?.trim() === partTrim;
    if (matchesMarker || matchesPart) {
      const { linkedPart: _lp, ...rest } = a;
      return rest as Annotation;
    }
    return a;
  });
}

/** 将选中标注关联到工艺行 */
export function linkAnnotationToProcess(
  annotations: Annotation[],
  annId: string,
  processIndex: number,
  part: string,
): Annotation[] {
  const markerIdx = processIndex + 1;
  return annotations.map((a) => {
    if (a.id === annId) {
      return {
        ...a,
        linkedPart: part.trim() || undefined,
        markerIndex: a.type === "marker" ? a.markerIndex ?? markerIdx : a.markerIndex,
      };
    }
    if (a.type === "marker" && a.markerIndex === markerIdx && a.id !== annId) {
      const { linkedPart: _lp, markerIndex: _mi, ...rest } = a;
      return rest as Annotation;
    }
    if (part.trim() && a.linkedPart?.trim() === part.trim() && a.id !== annId) {
      const { linkedPart: _lp, ...rest } = a;
      return rest as Annotation;
    }
    return a;
  });
}

export function getArtboardAnnotations(
  artboards: Artboard[],
  artboardId: string,
): Annotation[] {
  return artboards.find((a) => a.id === artboardId)?.annotations ?? [];
}
