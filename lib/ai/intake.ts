import { generateObject } from "ai";
import type { z } from "zod";
import {
  IntentAnalysisSchema,
  QuestionnaireSchema,
  StudioDraftSchema,
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
    system: `你是服装版房专家。分析用户的款式需求或参考图，识别品类、结构和工艺特征。
用户可能完全不懂服装术语，summary 要用通俗易懂的语言。
输出简洁，面向后续 Tech Pack 制作。`,
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
}) {
  const context = `
用户描述：${input.description || "（无文字，仅有图片）"}
AI 理解：${input.intentSummary}
识别品类：${input.detectedCategory}
识别特征：${input.detectedFeatures.join("、") || "暂无"}
`.trim();

  return callStructured({
    system: `你是服装版房专家，正在帮助「不懂服装」的用户补全信息。
根据已有信息，生成 3-5 个简单问题，用大白话提问，不要用专业缩写。
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

export async function generateStudioDraft(input: {
  description: string;
  imageDataUrl?: string;
  intentSummary: string;
  detectedCategory: string;
  answers: Record<string, string | string[]>;
  questions: Array<{ id: string; question: string }>;
}) {
  const answersText = input.questions
    .map((q) => {
      const ans = input.answers[q.id];
      const val = Array.isArray(ans) ? ans.join("、") : ans;
      return `- ${q.question}：${val || "未答"}`;
    })
    .join("\n");

  const context = `
款式描述：${input.description || "（无）"}
AI 理解：${input.intentSummary}
品类：${input.detectedCategory}
用户补充信息：
${answersText}
`.trim();

  const draft = await callStructured({
    system: `你是资深版房工艺师。根据全部信息生成 Tech Pack 初稿。
要求：
- process_items 覆盖主要结构部位（领、袖、下摆、侧缝等），工艺描述可直接用于工艺单
- bom_items 列出主要面辅料
- suggestedHotspots 给出主要部位在画板上的建议热区（坐标基于 800x600 画布，只标注服装结构部位，不要标注人脸/背景，最多 6 个）
- bom_items 列出主要面辅料，套装需区分上装/下装（garmentPart 字段）
- size_chart 如信息足够则给出基础尺码表（S/M/L/XL），否则留空 rows
- aiSummary 用 2-3 句话说明初稿要点和后续建议用户确认的地方`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: StudioDraftSchema,
    schemaName: "studio_draft",
  });

  return draft;
}
