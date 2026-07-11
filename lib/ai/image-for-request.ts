/** base64 data URL 字符长度上限（约 1.3MB 原图），避免 API / JSON 请求体过大 */
const MAX_DATA_URL_LEN = 1_800_000;

/** 按优先级选取可发送给 AI 的图片（跳过过大的 data URL） */
export function pickImageDataUrlForAi(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  for (const url of candidates) {
    if (!url?.startsWith("data:")) continue;
    if (url.length <= MAX_DATA_URL_LEN) return url;
  }
  return undefined;
}
