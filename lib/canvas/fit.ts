import { CANVAS_H, CANVAS_W } from "./constants";

/** 在固定画布内等比居中放置图片（不拉伸变形） */
export function computeImageFit(
  naturalWidth: number,
  naturalHeight: number,
  canvasW = CANVAS_W,
  canvasH = CANVAS_H,
) {
  const scale = Math.min(canvasW / naturalWidth, canvasH / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    x: (canvasW - width) / 2,
    y: (canvasH - height) / 2,
    width,
    height,
  };
}
