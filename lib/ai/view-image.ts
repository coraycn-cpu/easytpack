import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/assist";
import {
  getImageProvidersConfig,
  synthesizeViewImageWithProviders,
  type SynthesizeViewImageResult,
} from "@/lib/ai/image-providers";
import {
  getViewPresetHint,
  type ViewImageKind,
} from "@/lib/studio/view-types";

export type { SynthesizeViewImageResult } from "@/lib/ai/image-providers";
export type { ViewImageKind } from "@/lib/studio/view-types";
export { VIEW_IMAGE_PRESETS } from "@/lib/studio/view-types";

const ViewPromptSchema = z.object({
  imagePrompt: z.string().describe("用于图像生成的英文 prompt，50词以内"),
  artboardName: z.string().describe("画板显示名称，中文，2-8字"),
});

function buildUserContent(text: string, imageDataUrl?: string) {
  if (!imageDataUrl) return text;
  return [
    { type: "text" as const, text },
    { type: "image" as const, image: imageDataUrl },
  ];
}

export async function generateViewImagePrompt(input: {
  kind: ViewImageKind;
  customPrompt?: string;
  category?: string;
  description?: string;
  sourceImageUrl?: string;
}) {
  const viewDesc = getViewPresetHint(input.kind, input.customPrompt);

  const { object } = await generateObject({
    model: getModel(),
    schema: ViewPromptSchema,
    schemaName: "ViewImagePrompt",
    instructions: `你是服装款式图助手。根据正面款式图与描述，为指定视角生成图像生成 prompt 与画板名称。
要求：保持款式一致；prompt 用英文；artboardName 用简短中文。`,
    messages: [
      {
        role: "user",
        content: buildUserContent(
          `品类：${input.category ?? "服装"}
描述：${input.description ?? "无"}
目标视角：${viewDesc}`,
          input.sourceImageUrl,
        ),
      },
    ],
  });

  return object;
}

export async function synthesizeViewImage(
  prompt: string,
  options?: { sourceImageUrl?: string },
): Promise<SynthesizeViewImageResult> {
  return synthesizeViewImageWithProviders({
    prompt,
    sourceImageUrl: options?.sourceImageUrl,
  });
}

export function getViewImageConfig() {
  const imageProviders = getImageProvidersConfig();
  return {
    ...imageProviders,
    textModel: getModel(),
  };
}
