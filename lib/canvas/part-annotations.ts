import type { Annotation, Artboard, TechPackProject } from "@/types/project";

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
