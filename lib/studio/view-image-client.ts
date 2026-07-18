function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function getImageDimensions(dataUrl: string) {
  const img = await loadImage(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/** 将 AI 输出缩放至与主图相同的像素尺寸 */
export async function matchImageToSourceSize(
  outputDataUrl: string,
  sourceDataUrl: string,
): Promise<string> {
  const [src, out] = await Promise.all([
    loadImage(sourceDataUrl),
    loadImage(outputDataUrl),
  ]);
  const w = src.naturalWidth;
  const h = src.naturalHeight;
  if (out.naturalWidth === w && out.naturalHeight === h) return outputDataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return outputDataUrl;
  ctx.drawImage(out, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

/**
 * 无图像 API 时的占位：复制源图尺寸内容，不再盖「AI · 名称」条
 *（画板标题已在图上方显示，避免与真实视角混淆）
 */
export async function createViewPlaceholderImage(
  sourceUrl: string,
  _label?: string,
): Promise<string> {
  const img = await loadImage(sourceUrl);
  const w = Math.min(900, img.naturalWidth);
  const h = Math.min(900, img.naturalHeight);
  const scale = Math.min(1, w / img.naturalWidth, h / img.naturalHeight);
  const cw = Math.round(img.naturalWidth * scale);
  const ch = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceUrl;

  ctx.drawImage(img, 0, 0, cw, ch);
  return canvas.toDataURL("image/png");
}
