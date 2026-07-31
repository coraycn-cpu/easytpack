/**
 * AI 请求用图：体积上限 + 尽量保真压缩。
 * 原则：能发就别压；必须压时先降边长、质量尽量留高，逐步加码。
 * 支持 data: / idb: / sbstorage: / https（云端签名链）→ 最终得到可发送的 data URL。
 */

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

export type ResolveAiImageFailureReason =
  | "missing"
  | "unreadable"
  | "too_large";

export type ResolveAiImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: ResolveAiImageFailureReason };

type CompressPass = {
  maxDim: number;
  quality: number;
  /** 质量下限：本档只降到这里，不够再换更小边长 */
  minQuality: number;
};

/**
 * 多档压缩：边长从大到小，每档内只小幅降质量。
 * 避免一上来就把图压糊。
 */
const AI_COMPRESS_PASSES: CompressPass[] = [
  { maxDim: 1600, quality: 0.88, minQuality: 0.72 },
  { maxDim: 1280, quality: 0.85, minQuality: 0.68 },
  { maxDim: 1024, quality: 0.82, minQuality: 0.62 },
  { maxDim: 900, quality: 0.78, minQuality: 0.55 },
  // 最后兜底：仍宁可变小一点，也不把质量砸到发糊
  { maxDim: 768, quality: 0.72, minQuality: 0.5 },
];

function loadImageElement(dataUrl: string): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function encodeJpegFromImage(
  img: HTMLImageElement,
  maxDim: number,
  quality: number,
): string | undefined {
  const scale = Math.min(
    1,
    maxDim / Math.max(img.naturalWidth, img.naturalHeight, 1),
  );
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/** 把 http(s)/blob 拉成 data URL（云端签名图走这条，才能压体积发给 AI） */
export async function fetchUrlAsDataUrl(
  url: string,
): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    if (!blob || blob.size === 0) return undefined;
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/**
 * 将过大的 data URL 压到 maxLen 以内。
 * 默认走保真优先的多档策略；也可指定单档（兼容旧调用）。
 */
export async function compressImageDataUrlForAi(
  dataUrl: string,
  maxDim = 1280,
  maxLen = MAX_DATA_URL_LEN,
  quality = 0.82,
): Promise<string | undefined> {
  if (!dataUrl.startsWith("data:")) return undefined;
  if (typeof window === "undefined") return pickImageDataUrlForAi(dataUrl);
  if (dataUrl.length <= maxLen) return dataUrl;

  const img = await loadImageElement(dataUrl);
  if (!img) return undefined;

  // 显式传了非默认参数时：保持旧「单档 + 小幅降质」行为（存储压缩等）
  const useLegacySinglePass =
    maxDim !== 1280 || maxLen !== MAX_DATA_URL_LEN || quality !== 0.82;

  if (useLegacySinglePass) {
    let q = quality;
    let result = encodeJpegFromImage(img, maxDim, q);
    if (!result) return undefined;
    while (result.length > maxLen && q > 0.5) {
      q = Math.max(0.5, q - 0.06);
      result = encodeJpegFromImage(img, maxDim, q);
      if (!result) return undefined;
    }
    return result.length <= maxLen ? result : undefined;
  }

  for (const pass of AI_COMPRESS_PASSES) {
    let q = pass.quality;
    let result = encodeJpegFromImage(img, pass.maxDim, q);
    if (!result) continue;

    while (result.length > maxLen && q > pass.minQuality) {
      q = Math.max(pass.minQuality, +(q - 0.05).toFixed(2));
      result = encodeJpegFromImage(img, pass.maxDim, q);
      if (!result) break;
    }

    if (result && result.length <= maxLen) {
      // 第一档就成功 → 最保真，直接返回
      return result;
    }
  }

  // 兜底：768 + 不低于 0.48，再试一次（极少见的超大图）
  let q = 0.65;
  let last = encodeJpegFromImage(img, 720, q);
  while (last && last.length > maxLen && q > 0.48) {
    q = Math.max(0.48, +(q - 0.04).toFixed(2));
    last = encodeJpegFromImage(img, 720, q);
  }
  if (last && last.length <= maxLen) return last;

  return undefined;
}

/** 把任意引用尽量解析成 data:（含云端 https 签名链） */
async function coerceToDataUrl(
  raw: string,
): Promise<{ dataUrl?: string; sawCandidate: boolean }> {
  let url = raw.trim();
  if (!url) return { sawCandidate: false };

  if (!url.startsWith("data:")) {
    try {
      const { resolveImageRef } = await import("@/lib/project/image-idb");
      const resolved = await resolveImageRef(url);
      if (resolved) url = resolved;
    } catch {
      /* keep url */
    }
  }

  if (url.startsWith("data:")) {
    return { dataUrl: url, sawCandidate: true };
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:")
  ) {
    const asData = await fetchUrlAsDataUrl(url);
    return { dataUrl: asData, sawCandidate: true };
  }

  // idb:/sbstorage: 解析失败时仍算「有候选但读不出」
  if (url.startsWith("idb:") || url.startsWith("sbstorage:")) {
    return { dataUrl: undefined, sawCandidate: true };
  }

  return { sawCandidate: false };
}

/**
 * 选取并在需要时自动压缩，供 AI 请求使用（带失败原因）。
 */
export async function resolveImageDataUrlForAiDetailed(
  ...candidates: (string | null | undefined)[]
): Promise<ResolveAiImageResult> {
  let sawCandidate = false;
  let sawTooLarge = false;

  for (const raw of candidates) {
    if (!raw) continue;
    const coerced = await coerceToDataUrl(raw);
    if (coerced.sawCandidate) sawCandidate = true;
    const url = coerced.dataUrl;
    if (!url) continue;

    if (url.length <= MAX_DATA_URL_LEN) {
      return { ok: true, dataUrl: url };
    }

    const compressed = await compressImageDataUrlForAi(url);
    if (compressed) return { ok: true, dataUrl: compressed };
    sawTooLarge = true;
  }

  if (!sawCandidate) return { ok: false, reason: "missing" };
  if (sawTooLarge) return { ok: false, reason: "too_large" };
  return { ok: false, reason: "unreadable" };
}

/** 用户可读的准备失败说明 */
export function resolveAiImageFailureMessage(
  reason: ResolveAiImageFailureReason,
): string {
  switch (reason) {
    case "too_large":
      return "参考图过大，已尝试自动压缩仍无法发送。请换一张边长约 2000 以内的图再试";
    case "unreadable":
      return "参考图暂时无法读取（可能是云端链接未就绪或已过期）。请稍后重试，或重新打开该项目后再试";
    case "missing":
    default:
      return "缺少可用的参考图，请先确认画板上有图片";
  }
}

/**
 * 选取并在需要时自动压缩，供 AI 请求使用。
 * - 已够小：原样发送（不额外压）
 * - 过大：自动多档压缩，优先保边长与清晰度
 * - 支持先把 idb: / sbstorage: / https 解析成 data:
 */
export async function resolveImageDataUrlForAi(
  ...candidates: (string | null | undefined)[]
): Promise<string | undefined> {
  const result = await resolveImageDataUrlForAiDetailed(...candidates);
  return result.ok ? result.dataUrl : undefined;
}
