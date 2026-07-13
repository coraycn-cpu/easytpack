export type ImageCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 画板显示坐标 → 原图像素坐标 */
export function displayCropToSourcePixels(
  crop: ImageCropRect,
  displaySize: { width: number; height: number },
  naturalSize: { width: number; height: number },
): ImageCropRect {
  const sx = naturalSize.width / displaySize.width;
  const sy = naturalSize.height / displaySize.height;
  const x = Math.max(0, Math.round(crop.x * sx));
  const y = Math.max(0, Math.round(crop.y * sy));
  const width = Math.min(
    naturalSize.width - x,
    Math.max(1, Math.round(crop.width * sx)),
  );
  const height = Math.min(
    naturalSize.height - y,
    Math.max(1, Math.round(crop.height * sy)),
  );
  return { x, y, width, height };
}

/** 按源图像素区域裁剪并输出新 data URL */
export async function applyCropToImageDataUrl(
  dataUrl: string,
  crop: ImageCropRect,
): Promise<string> {
  const img = await loadImageElement(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布");
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  let result = canvas.toDataURL("image/jpeg", 0.92);
  if (result.length > 1_800_000) {
    result = canvas.toDataURL("image/jpeg", 0.75);
  }
  return result;
}
