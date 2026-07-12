import { computeArtboardSlots, nextArtboardOrigin } from "@/lib/studio/artboard-layout";
import { createArtboard } from "@/lib/project/hotspots";
import type { Artboard, PhotoType } from "@/types/project";

export const MODEL_REFERENCE_NAME = "模特参考";
export const COLLAGE_REFERENCE_NAME = "拼贴参考";

const REFERENCE_NAMES = new Set([
  MODEL_REFERENCE_NAME,
  COLLAGE_REFERENCE_NAME,
  "参考图",
]);

export function getPhotoReferenceArtboardName(photoType?: PhotoType): string | null {
  if (photoType === "model") return MODEL_REFERENCE_NAME;
  if (photoType === "collage") return COLLAGE_REFERENCE_NAME;
  return null;
}

export function shouldKeepPhotoReference(photoType?: PhotoType): boolean {
  return photoType === "model" || photoType === "collage";
}

export function findPhotoReferenceArtboard(artboards: Artboard[]): Artboard | undefined {
  return artboards.find((ab) => REFERENCE_NAMES.has(ab.name));
}

/** 模特/拼贴原图保留为参考画板，并排放在主款右侧 */
export async function appendPhotoReferenceArtboard(
  artboards: Artboard[],
  referenceImageUrl: string,
  photoType?: PhotoType,
): Promise<Artboard[]> {
  const refName = getPhotoReferenceArtboardName(photoType);
  if (!refName || !referenceImageUrl.trim()) return artboards;
  if (findPhotoReferenceArtboard(artboards)) return artboards;

  const slots = await computeArtboardSlots(artboards);
  const ref = createArtboard(refName, referenceImageUrl);
  ref.canvasOrigin = nextArtboardOrigin(slots);
  return [...artboards, ref];
}
