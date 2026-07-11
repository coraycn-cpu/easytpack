import { getMarkerLabel, isLinkableShape } from "@/lib/canvas/part-annotations";
import type { ProcessItem } from "@/types/process";
import type { Annotation } from "@/types/project";

export type SequenceBadge = {
  processId: string;
  processIndex: number;
  label: string;
  annotationId: string;
  x: number;
  y: number;
};

export { isLinkableShape };

/** 按工艺行顺序，在关联闭合形状边缘派生序号 badge */
export function computeSequenceBadges(
  processItems: ProcessItem[],
  annotations: Annotation[],
): SequenceBadge[] {
  const badges: SequenceBadge[] = [];
  const stackByAnn = new Map<string, number>();

  processItems.forEach((item, processIndex) => {
    if (!item.id) return;
    const label = getMarkerLabel(processIndex + 1);

    for (const ann of annotations) {
      if (!isLinkableShape(ann.type)) continue;
      const ids = ann.linkedProcessIds ?? [];
      if (!ids.includes(item.id)) continue;

      const stack = stackByAnn.get(ann.id) ?? 0;
      stackByAnn.set(ann.id, stack + 1);

      badges.push({
        processId: item.id,
        processIndex,
        label,
        annotationId: ann.id,
        x: ann.x - 8 + stack * 22,
        y: ann.y - 10,
      });
    }
  });

  return badges;
}
