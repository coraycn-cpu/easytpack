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

const REF_FIDELITY_INSTRUCTION = `Based on the reference garment image, generate a professional fashion tech-pack image of THE SAME TARGET garment only.

CRITICAL fidelity:
- Follow TARGET SCOPE in the view instruction — if the user selected a bottom, output ONLY that bottom (no vest/top); if a top, output ONLY that top (no shorts/pants)
- Exact sleeve length (short stays short) when applicable
- Exact print/pattern motif and orientation
- Remove model; clean background; no watermark; never output the full outfit unless target is a set

Follow the view instruction below.`;

const BACK_VIEW_INSTRUCTION = `Using the reference garment photo, generate a TRUE BACK VIEW flat lay of THE SAME garment.

CRITICAL:
- Output must be the REAR of the garment, not another front
- Show back neckline, back seams, back hem
- Same color/fabric/silhouette family as the reference
- Flat on white/neutral surface; no model, no ghost mannequin
- No text overlays on the image`;

const LINE_ART_TRACE_INSTRUCTION = `TRACE the attached garment PHOTO into a black-and-white technical line drawing of THAT SAME garment and SAME VIEW.

CRITICAL:
- Do not invent or redesign — follow the photo exactly
- Keep the same camera view as the photo (if the photo is a BACK view, output a BACK line drawing; if front, output front)
- Keep silhouette, sleeve/hem length, seams, and print motif positions identical
- White background, black outlines only — no photoreal fabric, no color fill
- If text conflicts with the photo, follow the photo`;

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
  // 线稿以源图像素为准，不再二次抽 spec（避免文字结构带偏）
  if (kind === "line_art") return null;
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
  useRecraftStyle?: boolean;
}): Promise<SynthesizeViewImageResult> {
  const { model, prompt, kind, sourceImageUrl, useRecraftStyle = true } = input;

  const supportsLineArtStyle =
    useRecraftStyle &&
    kind === "line_art" &&
    /recraft-v3|vector/i.test(model);

  // Kontext / Seedream / Imagen：一律可带参考图（线稿=转线稿，平铺=去模特）
  const usePromptImages =
    Boolean(sourceImageUrl) && supportsPromptImages(model);

  try {
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gateway 生图失败";
    // Recraft Line art style 在 Gateway 上可能不被透传 → 去掉 style 重试
    if (supportsLineArtStyle) {
      return callGenerateImage({
        ...input,
        useRecraftStyle: false,
      });
    }
    return {
      imageDataUrl: null,
      provider: "gateway",
      model,
      error: message,
    };
  }
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

  // 线稿有源图时绝不回退到无参考文生图（会另画一张）
  if (kind === "line_art" && sourceImageUrl) {
    return {
      imageDataUrl: null,
      provider: "gateway",
      model,
      error: "线稿参考图编辑失败，已跳过无参考回退",
    };
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
      ? lineArtModelCandidates({
          requireReferenceImage: Boolean(sourceImageUrl),
        }).filter(
          (m) =>
            !sourceImageUrl ||
            supportsPromptImages(m) ||
            isMultimodalImageModel(m),
        )
      : viewImageModelCandidates();

  if (kind === "line_art" && sourceImageUrl && models.length === 0) {
    return {
      imageDataUrl: null,
      provider: "gateway",
      error: "线稿需要支持参考图的模型（如 flux-kontext / seedream）",
    };
  }

  let lastError = "Gateway 生图失败";
  let lastModel = models[0];

  try {
    // view-image 已按 kind 组装好最终 prompt 时直接用，避免二次包装。
    // 线稿无 garmentSpecJson，且 resolveSpec 恒为 null——若仍 rebuild 会把整段 prompt
    // 再塞进 viewHint，导致背面→线稿等路径偶发失败并落到彩图占位。
    let imagePrompt = prompt;
    if (!options.garmentSpecJson && kind !== "line_art") {
      const spec = await resolveSpec(options, kind);
      if (spec) {
        imagePrompt = buildRecraftPromptForKind({
          kind,
          spec,
          viewHint: prompt,
          correctionPrompt: options.correctionPrompt,
        });
      }
    }

    for (const model of models) {
      lastModel = model;

      // 仅当主模型本身就是多模态生图模型时才走该路径
      if (isMultimodalImageModel(model) && sourceImageUrl) {
        try {
          const correction = options.correctionPrompt?.trim();
          const instruction =
            kind === "line_art"
              ? [
                  LINE_ART_TRACE_INSTRUCTION,
                  correction ? `User correction: ${correction}` : "",
                  "Convert the attached garment PHOTO into a black-and-white tech-pack line drawing of that SAME view (front or back as shown).",
                ]
                  .filter(Boolean)
                  .join("\n\n")
              : `${
                  kind === "back"
                    ? BACK_VIEW_INSTRUCTION
                    : REF_FIDELITY_INSTRUCTION
                }\n\nView / task: ${imagePrompt}`;
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
        if (kind === "line_art" && sourceImageUrl && !supportsPromptImages(model)) {
          lastError = `[${model}] 不支持参考图，已跳过`;
          continue;
        }
        const result = await callGenerateImageWithOptionalRef({
          model,
          prompt: imagePrompt,
          kind,
          sourceImageUrl,
        });
        if (result.imageDataUrl) return result;
        lastError = `[${model}] ${result.error ?? "未返回图片"}`;
      } catch (e) {
        lastError =
          `[${model}] ` +
          (e instanceof Error ? e.message : "Gateway 生图失败");
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
