import { generateImage, generateObject, generateText } from "ai";
import { z } from "zod";
import { getImageModel, getModel, isGatewayConfigured } from "@/lib/ai/assist";
import {
  VIEW_IMAGE_PRESETS,
  type ViewImageKind,
} from "@/lib/studio/view-types";

export type { ViewImageKind } from "@/lib/studio/view-types";
export { VIEW_IMAGE_PRESETS } from "@/lib/studio/view-types";

const ViewPromptSchema = z.object({
  imagePrompt: z.string().describe("用于图像生成的英文 prompt，50词以内"),
  artboardName: z.string().describe("画板显示名称，中文，2-8字"),
});

export type SynthesizeViewImageResult = {
  imageDataUrl: string | null;
  provider?: string;
  model?: string;
  error?: string;
};

function buildUserContent(text: string, imageDataUrl?: string) {
  if (!imageDataUrl) return text;
  return [
    { type: "text" as const, text },
    { type: "image" as const, image: imageDataUrl },
  ];
}

/** Gemini Nano Banana 等多模态生图模型 */
function isMultimodalImageModel(modelId: string): boolean {
  return /gemini-[\d.]+-(flash-)?image|gemini-3-pro-image|gemini-3\.1-flash-image/i.test(
    modelId,
  );
}

export async function generateViewImagePrompt(input: {
  kind: ViewImageKind;
  customPrompt?: string;
  category?: string;
  description?: string;
  sourceImageUrl?: string;
}) {
  const preset =
    input.kind !== "custom" ? VIEW_IMAGE_PRESETS[input.kind] : null;
  const viewDesc =
    input.kind === "custom"
      ? (input.customPrompt?.trim() ?? "自定义视角")
      : preset!.promptHint;

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

function filePartToDataUrl(file: {
  mediaType?: string;
  uint8Array?: Uint8Array;
}): string | null {
  if (!file.uint8Array?.length) return null;
  const mime = file.mediaType ?? "image/png";
  return `data:${mime};base64,${Buffer.from(file.uint8Array).toString("base64")}`;
}

/** 通过 Vercel AI Gateway 生图 */
async function synthesizeViaGateway(
  prompt: string,
  sourceImageUrl?: string,
): Promise<SynthesizeViewImageResult> {
  if (!isGatewayConfigured()) {
    return { imageDataUrl: null, error: "未配置 AI_GATEWAY_API_KEY" };
  }

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

/** 通义万相文生图（需 DASHSCOPE_API_KEY，作备选） */
async function synthesizeViaDashscope(prompt: string): Promise<string | null> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return null;

  const createRes = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wanx-v1",
        input: { prompt },
        parameters: { size: "1024*1024", n: 1 },
      }),
    },
  );

  if (!createRes.ok) return null;

  const createData = await createRes.json();
  const taskId = createData.output?.task_id as string | undefined;
  if (!taskId) return null;

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    const status = pollData.output?.task_status;
    if (status === "SUCCEEDED") {
      const url = pollData.output?.results?.[0]?.url as string | undefined;
      if (!url) return null;
      const imgRes = await fetch(url);
      if (!imgRes.ok) return null;
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const mime = imgRes.headers.get("content-type") ?? "image/png";
      return `data:${mime};base64,${buf.toString("base64")}`;
    }
    if (status === "FAILED") return null;
  }

  return null;
}

/** 优先 Gateway，其次 Dashscope */
export async function synthesizeViewImage(
  prompt: string,
  options?: { sourceImageUrl?: string },
): Promise<SynthesizeViewImageResult> {
  const gateway = await synthesizeViaGateway(prompt, options?.sourceImageUrl);
  if (gateway.imageDataUrl) return gateway;

  const dashscopeUrl = await synthesizeViaDashscope(prompt);
  if (dashscopeUrl) {
    return {
      imageDataUrl: dashscopeUrl,
      provider: "dashscope",
      model: "wanx-v1",
    };
  }

  return {
    imageDataUrl: null,
    provider: gateway.provider,
    model: gateway.model,
    error:
      gateway.error ??
      (isGatewayConfigured()
        ? "Gateway 与 Dashscope 均未成功出图"
        : "请配置 AI_GATEWAY_API_KEY 或 DASHSCOPE_API_KEY"),
  };
}

export function getViewImageConfig() {
  return {
    gateway: isGatewayConfigured(),
    dashscope: Boolean(process.env.DASHSCOPE_API_KEY),
    imageModel: getImageModel(),
    textModel: getModel(),
    multimodalImage: isMultimodalImageModel(getImageModel()),
  };
}
