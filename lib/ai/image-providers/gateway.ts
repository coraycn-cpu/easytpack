import { generateImage, generateText } from "ai";
import { getImageModel, isGatewayConfigured } from "@/lib/ai/assist";
import {
  buildRecraftPromptForKind,
  extractGarmentSpec,
  isRasterUtilityModel,
  lineArtModelCandidates,
  resolveRecraftModelForKind,
  supportsPromptImages,
  viewImageModelCandidates,
  type GarmentSpec,
  GarmentSpecSchema,
} from "./recraft-prompt";
import type { SynthesizeViewImageOptions, SynthesizeViewImageResult } from "./types";
import type { ViewImageKind } from "@/lib/studio/view-types";

function isMultimodalImageModel(modelId: string): boolean {
  return /gemini-[\d.]+-(flash-)?image|gemini-3-pro-image|gemini-3\.1-flash-image/i.test(
    modelId,
  );
}

function filePartToDataUrl(file: {
  mediaType?: string;
  uint8Array?: Uint8Array;
}): string | null {
  if (!file.uint8Array?.length) return null;
  const mime = file.mediaType ?? "image/png";
  return `data:${mime};base64,${Buffer.from(file.uint8Array).toString("base64")}`;
}

const REF_FIDELITY_INSTRUCTION = `Based on the reference garment image, generate a professional fashion tech-pack image of THE SAME garment.

CRITICAL fidelity:
- Exact sleeve length (short stays short)
- Exact print/pattern motif and orientation
- Remove model; clean background; no watermark

Follow the view instruction below.`;

function parseGarmentSpec(json?: string): GarmentSpec | null {
  if (!json?.trim()) return null;
  try {
    const parsed = GarmentSpecSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function resolveSpec(
  options: SynthesizeViewImageOptions,
  kind: ViewImageKind,
): Promise<GarmentSpec | null> {
  const cached = parseGarmentSpec(options.garmentSpecJson);
  if (cached) return cached;
  if (!options.sourceImageUrl) return null;
  try {
    return await extractGarmentSpec({
      sourceImageUrl: options.sourceImageUrl,
      kind,
      correctionPrompt: options.correctionPrompt,
    });
  } catch {
    return null;
  }
}

function imageResultToDataUrl(img: {
  base64?: string;
  uint8Array?: Uint8Array;
  mediaType?: string;
}): string | null {
  const mime = img.mediaType ?? "image/png";
  if (img.base64) {
    return `data:${mime};base64,${img.base64}`;
  }
  if (img.uint8Array?.length) {
    return `data:${mime};base64,${Buffer.from(img.uint8Array).toString("base64")}`;
  }
  return null;
}

async function callGenerateImage(input: {
  model: string;
  prompt: string;
  kind: ViewImageKind;
  sourceImageUrl?: string;
}): Promise<SynthesizeViewImageResult> {
  const { model, prompt, kind, sourceImageUrl } = input;

  const supportsLineArtStyle =
    kind === "line_art" && /recraft-v3|vector/i.test(model);

  // Flux Kontext / Seedream 等：用 prompt.images 吃参考图（模特→平铺保真关键）
  // 线稿 + Kontext：也可带图做「转线稿」；Recraft V3 则纯文 + Line art style
  const usePromptImages =
    Boolean(sourceImageUrl) &&
    supportsPromptImages(model) &&
    (kind !== "line_art" || /flux-kontext/i.test(model));

  const result = await generateImage({
    model,
    prompt: usePromptImages
      ? { text: prompt, images: [sourceImageUrl as string] }
      : prompt,
    aspectRatio: "3:4",
    ...(supportsLineArtStyle
      ? { providerOptions: { recraft: { style: "Line art" } } }
      : {}),
  });

  const img = result.images?.[0];
  const imageDataUrl = img ? imageResultToDataUrl(img) : null;
  if (imageDataUrl) {
    return { imageDataUrl, provider: "gateway", model };
  }
  return {
    imageDataUrl: null,
    provider: "gateway",
    model,
    error: "生图模型未返回图片",
  };
}

async function callGenerateImageWithOptionalRef(input: {
  model: string;
  prompt: string;
  kind: ViewImageKind;
  sourceImageUrl?: string;
}): Promise<SynthesizeViewImageResult> {
  const { model, prompt, kind, sourceImageUrl } = input;

  // 优先 prompt.images（Kontext 等）
  if (sourceImageUrl && supportsPromptImages(model)) {
    try {
      const primary = await callGenerateImage({
        model,
        prompt,
        kind,
        sourceImageUrl,
      });
      if (primary.imageDataUrl) return primary;
    } catch {
      // fall through
    }
  }

  // Recraft 可选 image_url；线稿 + 彩图参考禁止（会锁彩色）
  const useRecraftRef =
    Boolean(sourceImageUrl) &&
    kind !== "line_art" &&
    /recraft/i.test(model) &&
    !isRasterUtilityModel(model);

  if (useRecraftRef && sourceImageUrl) {
    try {
      const result = await generateImage({
        model,
        prompt,
        aspectRatio: "3:4",
        providerOptions: {
          recraft: {
            image_url: sourceImageUrl,
            strength: 0.3,
          },
        },
      });
      const img = result.images?.[0];
      const imageDataUrl = img ? imageResultToDataUrl(img) : null;
      if (imageDataUrl) {
        return { imageDataUrl, provider: "gateway", model };
      }
    } catch {
      // fall through
    }
  }

  return callGenerateImage({ model, prompt, kind });
}

export function isGatewayImageConfigured(): boolean {
  return isGatewayConfigured();
}

export async function synthesizeViaGateway(
  options: SynthesizeViewImageOptions,
): Promise<SynthesizeViewImageResult> {
  if (!isGatewayConfigured()) {
    return { imageDataUrl: null, error: "未配置 AI_GATEWAY_API_KEY" };
  }

  const kind: ViewImageKind = options.kind ?? "flat_front";
  const { prompt, sourceImageUrl } = options;
  const models =
    kind === "line_art"
      ? lineArtModelCandidates()
      : viewImageModelCandidates();

  let lastError = "Gateway 生图失败";
  let lastModel = models[0];

  try {
    // view-image 已按 kind 组装好最终 prompt 时直接用，避免二次包装
    let imagePrompt = prompt;
    if (!options.garmentSpecJson) {
      const spec = await resolveSpec(options, kind);
      imagePrompt = buildRecraftPromptForKind({
        kind,
        spec,
        viewHint: prompt,
        correctionPrompt: options.correctionPrompt,
      });
    }

    for (const model of models) {
      lastModel = model;

      // 仅当主模型本身就是多模态生图模型时才走该路径
      if (isMultimodalImageModel(model) && sourceImageUrl) {
        try {
          const instruction = `${REF_FIDELITY_INSTRUCTION}\n\nView / task: ${prompt}`;
          const result = await generateText({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text" as const, text: instruction },
                  { type: "image" as const, image: sourceImageUrl },
                ],
              },
            ],
          });
          const file = result.files?.find((f) =>
            f.mediaType?.startsWith("image/"),
          );
          const imageDataUrl = file ? filePartToDataUrl(file) : null;
          if (imageDataUrl) {
            return { imageDataUrl, provider: "gateway", model };
          }
          lastError = "多模态生图模型未返回图片";
        } catch (e) {
          lastError = e instanceof Error ? e.message : "多模态生图失败";
        }
        continue;
      }

      try {
        const result = await callGenerateImageWithOptionalRef({
          model,
          prompt: imagePrompt,
          kind,
          sourceImageUrl,
        });
        if (result.imageDataUrl) return result;
        lastError = result.error ?? lastError;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Gateway 生图失败";
        // 当前候选模型不可用则试下一个（如 vector 未开通）
      }
    }

    return {
      imageDataUrl: null,
      provider: "gateway",
      model: lastModel,
      error: lastError,
    };
  } catch (e) {
    return {
      imageDataUrl: null,
      provider: "gateway",
      model: lastModel,
      error: e instanceof Error ? e.message : "Gateway 生图失败",
    };
  }
}

export function getGatewayImageModel(): string {
  return getImageModel();
}

export function getGatewayReferenceImageModel(): string {
  return getImageModel();
}

export function isGatewayMultimodalImage(): boolean {
  return isMultimodalImageModel(getImageModel());
}

/** 供调试页展示：线稿模型可能与主模型不同 */
export function getGatewayLineArtModel(): string {
  return resolveRecraftModelForKind("line_art");
}
