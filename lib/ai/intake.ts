import { generateObject } from "ai";
import type { z } from "zod";
import { buildGarmentScopeContext } from "@/lib/ai/garment-scope";
import type { GarmentScopeInput } from "@/lib/ai/assist";
import {
  IntentAnalysisSchema,
  QuestionnaireSchema,
  type AiProvider,
} from "@/types/process";

function resolveProvider(): AiProvider {
  return (process.env.AI_PROVIDER as AiProvider) || "gateway";
}

function getModel(): string {
  const provider = resolveProvider();
  if (provider === "dashscope") {
    return process.env.AI_MODEL_DASHSCOPE || "qwen-plus";
  }
  if (provider === "zhipu") {
    return process.env.AI_MODEL_ZHIPU || "glm-4-flash";
  }
  return process.env.AI_MODEL_GATEWAY || "google/gemini-2.5-flash";
}

type UserContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string | URL }
    >;

function buildContent(text: string, imageDataUrl?: string): UserContent {
  if (!imageDataUrl) return text;
  return [
    { type: "text", text },
    { type: "image", image: imageDataUrl },
  ];
}

async function callStructured<S extends z.ZodType>({
  system,
  userText,
  imageDataUrl,
  schema,
  schemaName,
}: {
  system: string;
  userText: string;
  imageDataUrl?: string;
  schema: S;
  schemaName: string;
}) {
  const { object } = await generateObject({
    model: getModel(),
    schema,
    schemaName,
    instructions: system,
    messages: [{ role: "user", content: buildContent(userText, imageDataUrl) }],
  });
  return object as z.infer<S>;
}

export async function analyzeIntent(input: {
  description: string;
  imageDataUrl?: string;
}) {
  const hasImage = Boolean(input.imageDataUrl);
  const hasText = Boolean(input.description.trim());

  if (!hasImage && !hasText) {
    throw new Error("请至少提供文字描述或款式图");
  }

  const userText = hasText
    ? input.description
    : "用户仅上传了款式参考图，请分析图片中的款式信息。";

  return callStructured({
    system: `你是服装版房专家。一个 Tech Pack 项目只对应一个目标款式（可为单件或成套套装），请分析用户参考图。

规则：
- 判断 photoType：flat_lay（平铺/挂拍）、model（模特穿着）、collage（拼贴多图）、sketch（线稿手绘）
- visibleGarments：列出画面中可识别的各单件（上装、下装、外套等分别列出，id 用 g1、g2…），最多 6 项单件
- 若模特成套穿着且上装+下装（或多件）明显为同一套/同系列（颜色、面料、风格协调），除各单件外必须额外增加一项套装：id=g_set，kind=set，category=套装，label 为整套名称，componentIds 为各单件 id 数组
- 若各件为独立搭配、非成套，则不必生成 g_set
- 模特图、拼贴或多于 1 件可见服装时 requiresGarmentPick=true；单款平铺且高置信时 requiresGarmentPick=false
- detectedCategory、suggestedTitle、recommendedGarmentId 须对齐 AI 推荐的主款（单件或 g_set 均可）
- summary 用通俗易懂中文；detectedFeatures 为结构/工艺特征`,
    userText,
    imageDataUrl: input.imageDataUrl,
    schema: IntentAnalysisSchema,
    schemaName: "intent_analysis",
  });
}

export async function generateQuestionnaire(input: {
  description: string;
  imageDataUrl?: string;
  intentSummary: string;
  detectedCategory: string;
  detectedFeatures: string[];
  intake?: GarmentScopeInput;
}) {
  const scope = input.intake
    ? buildGarmentScopeContext(input.intake)
    : buildGarmentScopeContext({
        detectedCategory: input.detectedCategory,
        description: input.description,
      });

  const context = `
${scope}

用户描述：${input.description || "（无文字，仅有图片）"}
AI 理解：${input.intentSummary}
识别品类：${input.detectedCategory}
识别特征：${input.detectedFeatures.join("、") || "暂无"}
`.trim();

  const locked = Boolean(input.intake?.targetGarment && input.intake.garmentConfirmed);

  return callStructured({
    system: `你是服装版房专家，正在帮助「不懂服装」的用户补全信息。
${locked ? "目标单款已锁定，不要再问品类，改为确认面料、版型、季节、工艺细节等。" : "根据已有信息，生成 3-5 个简单问题，用大白话提问。"}
规则：
- 优先用选择题（面料感觉、穿着季节、预算档次、要不要印花绣花等）
- 每个问题必须有唯一 id
- intro 告诉用户「问这些是为了让版师看懂你的创意」`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: QuestionnaireSchema,
    schemaName: "questionnaire",
  });
}
