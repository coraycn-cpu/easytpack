import { computeImagePlacement, loadImagePlacement } from "@/lib/canvas/bounds";
import type { Artboard } from "@/types/project";

export const ARTBOARD_GAP = 80;
export const ARTBOARD_LABEL_HEIGHT = 28;

export type ArtboardSlot = {
  id: string;
  name: string;
  origin: { x: number; y: number };
  imageFit: ReturnType<typeof computeImagePlacement>;
  imageOffset: { x: number; y: number };
  hasImage: boolean;
};

export async function computeArtboardSlots(
  artboards: Artboard[],
): Promise<ArtboardSlot[]> {
  const slots: ArtboardSlot[] = [];
  let cursorX = 0;

  for (const ab of artboards) {
    if (!ab.imageDataUrl) continue;

    const imageFit = await loadImagePlacement(ab.imageDataUrl);
    const imageOffset = ab.imageOffset ?? { x: 0, y: 0 };
    const origin = ab.canvasOrigin ?? { x: cursorX, y: ARTBOARD_LABEL_HEIGHT };

    slots.push({
      id: ab.id,
      name: ab.name,
      origin,
      imageFit,
      imageOffset,
      hasImage: true,
    });

    cursorX = origin.x + imageFit.width + ARTBOARD_GAP;
  }

  return slots;
}

export function findArtboardSlot(slots: ArtboardSlot[], artboardId: string) {
  return slots.find((s) => s.id === artboardId);
}

/** 将舞台坐标转换为指定画板本地坐标 */
export function stageToArtboardLocal(
  stageX: number,
  stageY: number,
  slot: ArtboardSlot,
) {
  return {
    x: stageX - slot.origin.x,
    y: stageY - slot.origin.y,
  };
}

/** 下一画板默认锚点（横向排列） */
export function nextArtboardOrigin(slots: ArtboardSlot[]) {
  if (slots.length === 0) {
    return { x: 0, y: ARTBOARD_LABEL_HEIGHT };
  }
  const last = slots[slots.length - 1];
  return {
    x: last.origin.x + last.imageFit.width + ARTBOARD_GAP,
    y: ARTBOARD_LABEL_HEIGHT,
  };
}
