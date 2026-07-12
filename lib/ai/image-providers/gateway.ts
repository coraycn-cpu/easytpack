import { generateImage, generateText } from "ai";
import { getImageModel, isGatewayConfigured } from "@/lib/ai/assist";
import type { SynthesizeViewImageOptions, SynthesizeViewImageResult } from "./types";

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

export function isGatewayImageConfigured(): boolean {
  return isGatewayConfigured();
}

export async function synthesizeViaGateway(
  options: SynthesizeViewImageOptions,
): Promise<SynthesizeViewImageResult> {
  if (!isGatewayConfigured()) {
    return { imageDataUrl: null, error: "未配置 AI_GATEWAY_API_KEY" };
  }

  const { prompt, sourceImageUrl } = options;
  const model = getImageModel();

  try {
    if (isMultimodalImageModel(model)) {
      const instruction = sourceImageUrl
        ? `Based on the reference garment image, generate a professional fashion flat-lay photo. ${prompt}. Keep the same garment style, color, fabric texture and construction. White or neutral background, no model, no watermark.`
        : prompt;

      const result = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: sourceImageUrl
              ? [
                  { type: "text" as const, text: instruction },
                  { type: "image" as const, image: sourceImageUrl },
                ]
              : instruction,
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
        error: "多模态模型未返回图片，请检查 AI_MODEL_GATEWAY_IMAGE 是否为生图模型",
      };
    }

    const result = await generateImage({
      model,
      prompt,
      aspectRatio: "3:4",
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

export function isGatewayMultimodalImage(): boolean {
  return isMultimodalImageModel(getImageModel());
}
