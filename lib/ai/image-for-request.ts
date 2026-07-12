/** base64 data URL 字符长度上限（约 1.3MB JPEG），避免 API / JSON 请求体过大 */
export const MAX_DATA_URL_LEN = 1_800_000;

/** 按优先级选取可发送给 AI 的图片（跳过过大的 data URL，不压缩） */
export function pickImageDataUrlForAi(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  for (const url of candidates) {
    if (!url?.startsWith("data:")) continue;
    if (url.length <= MAX_DATA_URL_LEN) return url;
  }
  return undefined;
}

/** 将过大的 data URL 压缩为 JPEG，便于 AI 接口接收 */
export async function compressImageDataUrlForAi(
  dataUrl: string,
  maxDim = 1280,
  maxLen = MAX_DATA_URL_LEN,
  quality = 0.82,
): Promise<string | undefined> {
  if (!dataUrl.startsWith("data:")) return undefined;
  if (typeof window === "undefined") return pickImageDataUrlForAi(dataUrl);

  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight, 1));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(undefined);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      let q = quality;
      let result = canvas.toDataURL("image/jpeg", q);
      while (result.length > maxLen && q > 0.45) {
        q -= 0.08;
        result = canvas.toDataURL("image/jpeg", q);
      }
      resolve(result.length <= maxLen ? result : undefined);
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

/** 选取并必要时压缩图片，供 AI 请求使用 */
export async function resolveImageDataUrlForAi(
  ...candidates: (string | null | undefined)[]
): Promise<string | undefined> {
  for (const url of candidates) {
    if (!url?.startsWith("data:")) continue;
    if (url.length <= MAX_DATA_URL_LEN) return url;
    const compressed = await compressImageDataUrlForAi(url);
    if (compressed) return compressed;
  }
  return undefined;
}
