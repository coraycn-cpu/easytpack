import type { ImageCropRect } from "@/lib/canvas/crop-image";
import {
  applyCropToImageDataUrl,
  displayCropToSourcePixels,
} from "@/lib/canvas/crop-image";

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 从全图按显示选区裁出局部 patch（源图像素） */
export async function extractRegionPatch(input: {
  imageDataUrl: string;
  displayCrop: ImageCropRect;
  displaySize: { width: number; height: number };
  padRatio?: number;
}): Promise<{ patchDataUrl: string; sourceCrop: ImageCropRect }> {
  const img = await loadImageElement(input.imageDataUrl);
  const pad = input.padRatio ?? 0.06;
  const padded: ImageCropRect = {
    x: Math.max(0, input.displayCrop.x - input.displayCrop.width * pad),
    y: Math.max(0, input.displayCrop.y - input.displayCrop.height * pad),
    width: Math.min(
      input.displaySize.width - Math.max(0, input.displayCrop.x - input.displayCrop.width * pad),
      input.displayCrop.width * (1 + pad * 2),
    ),
    height: Math.min(
      input.displaySize.height - Math.max(0, input.displayCrop.y - input.displayCrop.height * pad),
      input.displayCrop.height * (1 + pad * 2),
    ),
  };
  const sourceCrop = displayCropToSourcePixels(padded, input.displaySize, {
    width: img.naturalWidth,
    height: img.naturalHeight,
  });
  if (sourceCrop.width < 8 || sourceCrop.height < 8) {
    throw new Error("选区太小，请框选更大一些");
  }
  const patchDataUrl = await applyCropToImageDataUrl(
    input.imageDataUrl,
    sourceCrop,
  );
  return { patchDataUrl, sourceCrop };
}

/** 将编辑后的 patch 缩放贴回原图对应像素区域 */
export async function compositeRegionPatch(input: {
  baseDataUrl: string;
  patchDataUrl: string;
  sourceCrop: ImageCropRect;
}): Promise<string> {
  const base = await loadImageElement(input.baseDataUrl);
  const patch = await loadImageElement(input.patchDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = base.naturalWidth;
  canvas.height = base.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法合成选区图");
  ctx.drawImage(base, 0, 0);
  ctx.drawImage(
    patch,
    input.sourceCrop.x,
    input.sourceCrop.y,
    input.sourceCrop.width,
    input.sourceCrop.height,
  );
  let out = canvas.toDataURL("image/jpeg", 0.92);
  if (out.length > 2_500_000) {
    out = canvas.toDataURL("image/jpeg", 0.8);
  }
  return out;
}
