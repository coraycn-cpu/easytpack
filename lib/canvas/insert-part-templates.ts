import { mapAiAnnotationToCanvas, loadImagePlacement } from "@/lib/canvas/bounds";
import { mergeSuggestedPartAnnotations } from "@/lib/project/hotspots";
import { isSetTarget } from "@/lib/ai/garment-scope";
import { MANUAL_ANNOTATION_COLOR } from "@/lib/canvas/annotation-colors";
import type { Annotation, IntakeData } from "@/types/project";

/** 在当前画板插入品类标准工艺框（手动色，未关联工艺） */
export async function buildPartTemplateAnnotations(input: {
  category?: string;
  photoType?: IntakeData["photoType"];
  intake?: IntakeData;
  imageDataUrl?: string;
  imageOffset?: { x: number; y: number };
}): Promise<Annotation[]> {
  const imageFit = input.imageDataUrl
    ? await loadImagePlacement(input.imageDataUrl)
    : { x: 0, y: 0, width: 1000, height: 750 };
  const imageOffset = input.imageOffset ?? { x: 0, y: 0 };

  const templates = mergeSuggestedPartAnnotations(
    [],
    input.category,
    input.photoType,
    { isSet: input.intake ? isSetTarget(input.intake) : false },
  );

  return templates.map((ann, i) => {
    const mapped = mapAiAnnotationToCanvas(
      {
        type: "rect",
        x: ann.x,
        y: ann.y,
        width: ann.width,
        height: ann.height,
        color: MANUAL_ANNOTATION_COLOR,
        text: ann.text,
      },
      imageFit,
      imageOffset,
      ann.id || `ann_tpl_${i}_${Date.now()}`,
    );
    return { ...mapped, color: MANUAL_ANNOTATION_COLOR, locked: false };
  });
}
