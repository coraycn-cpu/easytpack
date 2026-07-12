import type { Artboard } from "@/types/project";
import type { ArtboardSlot } from "@/lib/studio/artboard-layout";

const FRONT_NAME = /正面|front|主图|主款|款式/i;

/** 主款画板（第一张 / 名称含正面），不可删除 */
export function getPrimaryArtboardId(artboards: Artboard[]): string | undefined {
  if (artboards.length === 0) return undefined;
  const namedFront = artboards.find((a) => FRONT_NAME.test(a.name));
  return namedFront?.id ?? artboards[0].id;
}

export function isPrimaryArtboard(artboards: Artboard[], artboardId: string): boolean {
  return getPrimaryArtboardId(artboards) === artboardId;
}

export function canDeleteArtboard(artboards: Artboard[], artboardId: string): boolean {
  if (artboards.length <= 1) return false;
  return !isPrimaryArtboard(artboards, artboardId);
}

/** @deprecated 尺寸标注已改为跟随当前选中画板；保留供旧逻辑或测试参考 */
export function findPrimarySizingArtboard(
  artboards: Artboard[],
): Artboard | undefined {
  const primaryId = getPrimaryArtboardId(artboards);
  if (primaryId) {
    return artboards.find((a) => a.id === primaryId);
  }
  const withImage = artboards.filter((a) => a.imageDataUrl);
  return withImage[0] ?? artboards[0];
}

export function findSlotForArtboard(
  slots: ArtboardSlot[],
  artboardId: string,
): ArtboardSlot | undefined {
  return slots.find((s) => s.id === artboardId);
}
