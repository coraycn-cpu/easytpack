import { resolveImageDataUrlForAi } from "@/lib/ai/image-for-request";
import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import type { IntakeData, TargetGarment, TechPackProject } from "@/types/project";

export type ResolvedGarmentImage = {
  dataUrl: string | undefined;
  artboardId: string | undefined;
  photoType: IntakeData["photoType"];
  targetGarment: TargetGarment | undefined;
};

type ResolveOptions = {
  activeArtboardId?: string;
  /** 优先使用 intake 原图而非画板图（BOM 等） */
  preferIntake?: boolean;
};

export async function resolveGarmentImageForAi(
  project: Pick<TechPackProject, "intake" | "canvas_data">,
  options?: ResolveOptions,
): Promise<ResolvedGarmentImage> {
  const { intake, canvas_data } = project;
  const photoType = intake.photoType;
  const targetGarment = intake.targetGarment;

  let sourceUrl: string | undefined;
  let artboardId: string | undefined;

  if (options?.preferIntake) {
    sourceUrl = intake.imageDataUrl;
  } else if (options?.activeArtboardId) {
    const active = canvas_data.artboards.find(
      (a) => a.id === options.activeArtboardId,
    );
    sourceUrl = active?.imageDataUrl ?? intake.imageDataUrl;
    artboardId = active?.id;
  }

  if (!sourceUrl) {
    const primaryId = getPrimaryArtboardId(canvas_data.artboards);
    const primary = primaryId
      ? canvas_data.artboards.find((a) => a.id === primaryId)
      : canvas_data.artboards[0];
    sourceUrl =
      primary?.imageDataUrl ??
      canvas_data.artboards.find((a) => a.imageDataUrl)?.imageDataUrl ??
      intake.imageDataUrl;
    artboardId = primary?.id;
  }

  const dataUrl = sourceUrl
    ? await resolveImageDataUrlForAi(sourceUrl, intake.imageDataUrl)
    : undefined;

  return { dataUrl, artboardId, photoType, targetGarment };
}
