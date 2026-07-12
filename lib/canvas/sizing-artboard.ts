import type { Artboard } from "@/types/project";
import type { ArtboardSlot } from "@/lib/studio/artboard-layout";

const FRONT_NAME = /正面|front|主图|主款|款式/i;

/** 尺寸标注应落在正面主款图，而非当前选中的背面/细节画板 */
export function findPrimarySizingArtboard(
  artboards: Artboard[],
): Artboard | undefined {
  const withImage = artboards.filter((a) => a.imageDataUrl);
  if (withImage.length === 0) return artboards[0];

  const namedFront = withImage.find((a) => FRONT_NAME.test(a.name));
  if (namedFront) return namedFront;

  return withImage[0];
}

export function findSlotForArtboard(
  slots: ArtboardSlot[],
  artboardId: string,
): ArtboardSlot | undefined {
  return slots.find((s) => s.id === artboardId);
}
