import type { Annotation } from "@/types/project";

/** AI 标注（一键标注 / 区域识别） */
export const AI_ANNOTATION_COLOR = "#3b82f6";

/** 手动画框或人工修改后的标注 */
export const MANUAL_ANNOTATION_COLOR = "#ef4444";

export function withAiAnnotationColor(ann: Annotation): Annotation {
  return { ...ann, color: AI_ANNOTATION_COLOR };
}

export function withManualAnnotationColor(ann: Annotation): Annotation {
  return { ...ann, color: MANUAL_ANNOTATION_COLOR };
}

export function mapAnnotationColor(
  annotations: Annotation[],
  annId: string,
  color: string,
): Annotation[] {
  return annotations.map((a) => (a.id === annId ? { ...a, color } : a));
}
