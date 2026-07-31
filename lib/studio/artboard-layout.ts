import { computeImagePlacement, loadImagePlacement } from "@/lib/canvas/bounds";
import type { Artboard } from "@/types/project";

export const ARTBOARD_GAP = 80;
/** 画板上方不再预留标题条高度（名称改由侧栏展示） */
export const ARTBOARD_LABEL_HEIGHT = 0;

export type ArtboardSlot = {
  id: string;
  name: string;
  origin: { x: number; y: number };
  imageFit: ReturnType<typeof computeImagePlacement>;
  imageOffset: { x: number; y: number };
  hasImage: boolean;
};

export type ComputeArtboardSlotsOptions = {
  /** 每张图解码完成后回调（用于进入加载进度） */
  onProgress?: (done: number, total: number) => void;
};

export async function computeArtboardSlots(
  artboards: Artboard[],
  options?: ComputeArtboardSlotsOptions,
): Promise<ArtboardSlot[]> {
  const withImages = artboards.filter((ab) => Boolean(ab.imageDataUrl));
  const total = withImages.length;
  options?.onProgress?.(0, total);

  const slots: ArtboardSlot[] = [];
  let cursorX = 0;
  let done = 0;

  for (const ab of withImages) {
    const imageFit = await loadImagePlacement(ab.imageDataUrl!);
    const imageOffset = ab.imageOffset ?? { x: 0, y: 0 };
    const origin = ab.canvasOrigin ?? { x: cursorX, y: ARTBOARD_LABEL_HEIGHT };
    const scaleX = Math.abs(ab.imageScale?.x ?? 1) || 1;

    slots.push({
      id: ab.id,
      name: ab.name,
      origin,
      imageFit,
      imageOffset,
      hasImage: true,
    });

    cursorX = origin.x + imageFit.width * scaleX + ARTBOARD_GAP;
    done += 1;
    options?.onProgress?.(done, total);
  }

  return slots;
}

/** 仅随图片增删/替换、画板锚点变化而变；拖动/拉伸不触发重算（offset/scale 以 artboard 为准） */
export function artboardImageLayoutKey(artboards: Artboard[]): string {
  return artboards
    .map((a) => {
      const url = a.imageDataUrl ?? "";
      const tip = url
        ? `${url.length}:${url.slice(0, 32)}:${url.slice(-24)}`
        : "0";
      const cx = a.canvasOrigin?.x ?? "";
      const cy = a.canvasOrigin?.y ?? "";
      return `${a.id}:${tip}:${cx}:${cy}`;
    })
    .join("|");
}

export function countArtboardsWithImages(artboards: Artboard[]): number {
  return artboards.filter((a) => Boolean(a.imageDataUrl)).length;
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

/** 下一画板默认锚点（横向排列；考虑上一张的拉伸宽度） */
export function nextArtboardOrigin(
  slots: ArtboardSlot[],
  artboards?: Pick<Artboard, "id" | "imageScale">[],
) {
  if (slots.length === 0) {
    return { x: 0, y: ARTBOARD_LABEL_HEIGHT };
  }
  const last = slots[slots.length - 1];
  const ab = artboards?.find((a) => a.id === last.id);
  const scaleX = Math.abs(ab?.imageScale?.x ?? 1) || 1;
  return {
    x: last.origin.x + last.imageFit.width * scaleX + ARTBOARD_GAP,
    y: ARTBOARD_LABEL_HEIGHT,
  };
}
