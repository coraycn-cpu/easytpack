import type { SynthesizeViewImageOptions, SynthesizeViewImageResult } from "./types";

const SILICONFLOW_API = "https://api.siliconflow.cn/v1/images/generations";

const DEFAULT_MODEL = "Qwen/Qwen-Image-Edit-2509";
const FALLBACK_MODEL = "Kwai-Kolors/Kolors";

const VIEW_NEGATIVE_PROMPT =
  "model, mannequin, ghost mannequin, invisible mannequin, dress form, white torso, body form, watermark, text, logo, blurry, distorted, wrong color, different garment, low quality, wrong silhouette, fabric change, style drift, size mismatch";

export function getSiliconflowImageModel(): string {
  return process.env.AI_MODEL_SILICONFLOW_IMAGE || DEFAULT_MODEL;
}

export function isSiliconflowImageConfigured(): boolean {
  return Boolean(process.env.SILICONFLOW_API_KEY);
}

function isQwenImageEdit(model: string): boolean {
  return /Qwen\/Qwen-Image-Edit/i.test(model);
}

function buildFashionPrompt(prompt: string, hasReference: boolean): string {
  if (hasReference) {
    return `Professional fashion tech pack true flat lay photo — garment laid flat on a surface, NO ghost mannequin or dress form. ${prompt}. CRITICAL fidelity: identical garment silhouette, sleeve length, hem length, neckline, pattern/print motif and orientation, fabric texture, color, and construction details as the reference image — zero deviation. Same scale, proportions and framing as reference. Clean white or neutral background, no model, no mannequin, studio lighting, high detail.`;
  }
  return `Professional fashion tech pack true flat lay photo — garment laid flat on a surface, NO ghost mannequin or dress form. ${prompt}. Clean white or neutral background, no model, no mannequin, studio lighting, high detail.`;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

type SiliconflowPayload = Record<string, unknown>;

function buildPayload(
  model: string,
  prompt: string,
  sourceImageUrl?: string,
): SiliconflowPayload {
  const fashionPrompt = buildFashionPrompt(prompt, Boolean(sourceImageUrl));

  if (isQwenImageEdit(model)) {
    const payload: SiliconflowPayload = {
      model,
      prompt: fashionPrompt,
      num_inference_steps: 20,
      guidance_scale: 4,
    };
    if (sourceImageUrl) payload.image = sourceImageUrl;
    return payload;
  }

  const payload: SiliconflowPayload = {
    model,
    prompt: fashionPrompt,
    negative_prompt: VIEW_NEGATIVE_PROMPT,
    image_size: "768x1024",
    batch_size: 1,
    num_inference_steps: 20,
    guidance_scale: 7.5,
  };
  if (sourceImageUrl) payload.image = sourceImageUrl;
  return payload;
}

async function callSiliconflow(
  model: string,
  options: SynthesizeViewImageOptions,
): Promise<SynthesizeViewImageResult> {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    return { imageDataUrl: null, error: "未配置 SILICONFLOW_API_KEY" };
  }

  const payload = buildPayload(model, options.prompt, options.sourceImageUrl);

  try {
    const res = await fetch(SILICONFLOW_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return {
        imageDataUrl: null,
        provider: "siliconflow",
        model,
        error: `硅基流动生图失败 (${res.status}): ${err.slice(0, 300)}`,
      };
    }

    const data = (await res.json()) as {
      images?: Array<{ url?: string }>;
    };
    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) {
      return {
        imageDataUrl: null,
        provider: "siliconflow",
        model,
        error: "硅基流动未返回图片 URL",
      };
    }

    const imageDataUrl = await urlToDataUrl(imageUrl);
    if (!imageDataUrl) {
      return {
        imageDataUrl: null,
        provider: "siliconflow",
        model,
        error: "下载硅基流动图片失败（URL 有效期 1 小时）",
      };
    }

    return { imageDataUrl, provider: "siliconflow", model };
  } catch (e) {
    return {
      imageDataUrl: null,
      provider: "siliconflow",
      model,
      error: e instanceof Error ? e.message : "硅基流动生图失败",
    };
  }
}

/** 硅基流动 img2img / image-edit（B 区视角补全主通道） */
export async function synthesizeViaSiliconflow(
  options: SynthesizeViewImageOptions,
): Promise<SynthesizeViewImageResult> {
  if (!isSiliconflowImageConfigured()) {
    return { imageDataUrl: null, error: "未配置 SILICONFLOW_API_KEY" };
  }

  const primaryModel = getSiliconflowImageModel();
  const primary = await callSiliconflow(primaryModel, options);
  if (primary.imageDataUrl) return primary;

  if (primaryModel !== FALLBACK_MODEL && options.sourceImageUrl) {
    const fallback = await callSiliconflow(FALLBACK_MODEL, options);
    if (fallback.imageDataUrl) return fallback;
    return {
      imageDataUrl: null,
      provider: "siliconflow",
      model: primaryModel,
      error: fallback.error ?? primary.error,
    };
  }

  return primary;
}
