/** 无图像 API 时在浏览器生成带标签的占位图 */
export async function createViewPlaceholderImage(
  sourceUrl: string,
  label: string,
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
  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.fillRect(0, ch - 48, cw, 48);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText(`AI · ${label}`, 16, ch - 18);

  return canvas.toDataURL("image/png");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
