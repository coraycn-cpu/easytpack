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
  FLAT_FRONT_SET_VIEW_HINT,
  type ViewImageKind,
} from "@/lib/studio/view-types";
import {
  VIEW_IMAGE_FIDELITY_RULES,
  appendCorrectionToPrompt,
} from "@/lib/studio/view-image-constraints";
import { buildGarmentScopeContext, isSetTarget } from "@/lib/ai/garment-scope";
import type { GarmentScopeInput } from "@/lib/ai/assist";

export type { SynthesizeViewImageResult } from "@/lib/ai/image-providers";
export type { ViewImageKind } from "@/lib/studio/view-types";
export { VIEW_IMAGE_PRESETS } from "@/lib/studio/view-types";

const ViewPromptSchema = z.object({
  imagePrompt: z
    .string()
    .describe(
      "英文 image prompt，约 60–100 词：必须点名袖长、领口、裙/衣长、花型方向与主色",
    ),
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
  correctionPrompt?: string;
  category?: string;
  description?: string;
  sourceImageUrl?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  intake?: GarmentScopeInput;
}) {
  const viewDesc =
    input.kind === "flat_front" && input.intake && isSetTarget(input.intake)
      ? FLAT_FRONT_SET_VIEW_HINT
      : getViewPresetHint(input.kind, input.customPrompt);
  const scope = input.intake
    ? buildGarmentScopeContext(input.intake)
    : buildGarmentScopeContext({
        detectedCategory: input.category,
        description: input.description ?? "",
      });
  const modelNote =
    input.intake?.photoType === "model"
      ? isSetTarget(input.intake)
        ? "参考图为模特穿着图：提取整套上下装（或多件套装）一起生成平铺，不得只保留上装或下装，不得混入其他可见服装。"
        : "参考图为模特穿着图：从穿着状态提取目标单款生成平铺/线稿，不得改变目标款本身，不得混入其他可见服装。"
      : "";
  const sizeNote =
    input.sourceWidth && input.sourceHeight
      ? `参考主图像素尺寸：${input.sourceWidth}×${input.sourceHeight}，输出须同比例同尺度。`
      : "输出须与参考主图同比例、同平铺尺度。";
  const correctionNote = input.correctionPrompt?.trim()
    ? `\n用户修正要求（生成 prompt 时必须体现）：${input.correctionPrompt.trim()}`
    : "";

  const { object } = await generateObject({
    model: getModel(),
    schema: ViewPromptSchema,
    schemaName: "ViewImagePrompt",
    instructions: `你是服装款式图助手。根据正面款式参考图，为指定视角生成图像生成 prompt 与画板名称。

${scope}
${modelNote}

${VIEW_IMAGE_FIDELITY_RULES}

prompt 要求：
- 英文，约 60–100 词，描述视角与必须保留的款式细节
- 必须写明：袖长（short / cap / 3/4 / long）、领口、衣/裙长、花型或条纹方向与主色
- 明确写出与参考图一致的版型、面料、颜色、工艺，禁止改写印花
- ${sizeNote}
- artboardName 用简短中文（2-8 字）`,
    messages: [
      {
        role: "user",
        content: buildUserContent(
          `品类：${input.category ?? "服装"}
描述：${input.description ?? "无"}
目标视角：${viewDesc}
${sizeNote}${correctionNote}`,
          input.sourceImageUrl,
        ),
      },
    ],
  });

  return object;
}

export async function synthesizeViewImage(
  prompt: string,
  options?: { sourceImageUrl?: string; correctionPrompt?: string },
): Promise<SynthesizeViewImageResult> {
  const fullPrompt = appendCorrectionToPrompt(prompt, options?.correctionPrompt);
  return synthesizeViewImageWithProviders({
    prompt: fullPrompt,
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
