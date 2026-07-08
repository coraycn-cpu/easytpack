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
输出简洁专业，面向后续 Tech Pack 制作。`,
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
    system: `你是服装版房专家。根据已有信息，生成 3-5 个必要的追问，帮助补全 Tech Pack 所需信息。
规则：
- 优先用 single/multi 选择题，减少用户输入负担
- 每个问题必须有唯一 id（如 q_category, q_fabric）
- 只问做工艺包真正必要的信息：面料、尺码段、特殊工艺、品质要求、目标市场等
- 如果信息已足够，也要至少问 1 个确认性问题
- intro 用一句话说明为何需要补充`,
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
- suggestedHotspots 给出主要部位在画板上的建议热区（坐标基于 800x600 画布，尽量合理）
- size_chart 如信息足够则给出基础尺码表，否则留空 rows
- aiSummary 用 2-3 句话说明初稿要点和后续建议用户确认的地方`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: StudioDraftSchema,
    schemaName: "studio_draft",
  });

  return draft;
}
