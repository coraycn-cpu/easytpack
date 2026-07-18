import { generateImage, generateText } from "ai";
import { getImageModel, getModel, isGatewayConfigured } from "@/lib/ai/assist";
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

const REF_FIDELITY_INSTRUCTION = `Based on the reference garment image, generate a professional fashion tech-pack flat / product photo of THE SAME garment.

CRITICAL fidelity (must match reference exactly — do not invent or restyle):
- Silhouette, neckline, hem length, and especially sleeve length (short stays short; no lengthening/shortening)
- Print/pattern: same motif, scale, orientation (horizontal bands stay horizontal), colorway and placement
- Fabric texture, trims, seams, pockets, buttons, zippers, belt/ties
- Remove the model/mannequin; clean white or neutral studio background; no watermark, no text, no logo

Follow the view instruction below while preserving every construction and print detail from the reference.`;

/** 用文本多模态看参考图，提炼给 Recraft 的英文描述（Recraft 本身不吃图） */
async function describeGarmentForTextToImage(
  sourceImageUrl: string,
  viewPrompt: string,
): Promise<string> {
  const result = await generateText({
    model: getModel(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text" as const,
            text: `You are a fashion tech-pack specialist. Look at this garment reference and write ONE English paragraph (90–140 words) for a text-to-image model (Recraft). No preamble, no bullets.

Must state explicitly:
- garment type / silhouette
- neckline
- EXACT sleeve length (cap / short / elbow / three-quarter / long) — never guess longer than visible
- hem / dress or top length
- fabric feel
- belt, ties, pockets, trims if visible
- print/pattern in detail: motif, orientation (e.g. horizontal ethnic bands vs vertical stripes), main colors, relative scale

End with the target view task: ${viewPrompt}

Only describe what is visible. Do not invent a different print or sleeve length.`,
          },
          { type: "image" as const, image: sourceImageUrl },
        ],
      },
    ],
  });
  return result.text.trim();
}

function buildRecraftPrompt(viewPrompt: string, garmentBrief?: string): string {
  if (!garmentBrief) {
    return `Professional fashion tech-pack flat lay / product photo. ${viewPrompt}. Clean white or neutral studio background, no model, no mannequin, no watermark, no text, high detail.`;
  }
  return `Professional fashion tech-pack flat lay / product photo of this exact garment: ${garmentBrief}

CRITICAL: keep the same sleeve length and the same print/pattern motif and orientation as described — do not restyle. ${viewPrompt}. Clean white or neutral studio background, no model, no mannequin, no watermark, no text, high detail.`;
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
    // 仅当显式配置了多模态「生图」模型时才走 generateText+出图（当前账号可能不可用）
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

    // 默认：Recraft 等文生图；有参考图时先用文本模型看图提炼细节
    let garmentBrief: string | undefined;
    if (sourceImageUrl) {
      try {
        garmentBrief = await describeGarmentForTextToImage(sourceImageUrl, prompt);
      } catch {
        // 看图失败仍继续用原 prompt，避免整条链路中断
        garmentBrief = undefined;
      }
    }

    const imagePrompt = buildRecraftPrompt(prompt, garmentBrief);
    const result = await generateImage({
      model,
      prompt: imagePrompt,
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

/** 当前策略：参考图也走同一文生图模型（Recraft）；细节靠文本看图提炼 */
export function getGatewayReferenceImageModel(): string {
  return getImageModel();
}

export function isGatewayMultimodalImage(): boolean {
  return isMultimodalImageModel(getImageModel());
}
