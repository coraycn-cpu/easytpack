import { generateImage, generateText } from "ai";
import { getImageModel, isGatewayConfigured } from "@/lib/ai/assist";
import {
  buildRecraftPromptForKind,
  extractGarmentSpec,
  resolveRecraftModelForKind,
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

async function callGenerateImage(input: {
  model: string;
  prompt: string;
  kind: ViewImageKind;
  sourceImageUrl?: string;
  withReference: boolean;
}): Promise<SynthesizeViewImageResult> {
  const { model, prompt, kind, sourceImageUrl, withReference } = input;

  const recraft: {
    image_url?: string;
    strength?: number;
    style?: string;
  } = {};
  if (withReference && sourceImageUrl) {
    recraft.image_url = sourceImageUrl;
    recraft.strength = kind === "line_art" ? 0.55 : 0.3;
  }
  if (kind === "line_art") {
    recraft.style = "Line art";
  }

  const result = await generateImage({
    model,
    prompt,
    aspectRatio: "3:4",
    ...(Object.keys(recraft).length > 0
      ? { providerOptions: { recraft } }
      : {}),
  });

  const img = result.images?.[0];
  if (img?.base64) {
    const mime = img.mediaType ?? "image/png";
    return {
      imageDataUrl: `data:${mime};base64,${img.base64}`,
      provider: "gateway",
      model,
    };
  }
  return {
    imageDataUrl: null,
    provider: "gateway",
    model,
    error: "生图模型未返回图片",
  };
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
  const model = resolveRecraftModelForKind(kind);
  const { prompt, sourceImageUrl } = options;

  try {
    // 仅当主模型本身就是多模态生图模型时才走该路径（当前账号通常不可用）
    if (isMultimodalImageModel(model) && sourceImageUrl) {
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
      const file = result.files?.find((f) => f.mediaType?.startsWith("image/"));
      const imageDataUrl = file ? filePartToDataUrl(file) : null;
      if (imageDataUrl) {
        return { imageDataUrl, provider: "gateway", model };
      }
      return {
        imageDataUrl: null,
        provider: "gateway",
        model,
        error: "多模态生图模型未返回图片",
      };
    }

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

    // 先尝试带参考图的 Recraft 参数；Gateway 不支持则回退纯文生图
    if (sourceImageUrl) {
      try {
        const withRef = await callGenerateImage({
          model,
          prompt: imagePrompt,
          kind,
          sourceImageUrl,
          withReference: true,
        });
        if (withRef.imageDataUrl) return withRef;
      } catch {
        // fall through to text-only
      }
    }

    return await callGenerateImage({
      model,
      prompt: imagePrompt,
      kind,
      sourceImageUrl,
      withReference: false,
    });
  } catch (e) {
    return {
      imageDataUrl: null,
      provider: "gateway",
      model,
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
