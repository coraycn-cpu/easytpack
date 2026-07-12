import { generateObject } from "ai";
import type { z } from "zod";
import { buildGarmentScopeContext } from "@/lib/ai/garment-scope";
import type { GarmentScopeInput } from "@/lib/ai/assist";
import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";
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
    system: `你是服装版房专家。一个 Tech Pack 项目只对应一件目标服装，请分析用户参考图。

规则：
- 判断 photoType：flat_lay（平铺/挂拍）、model（模特穿着）、collage（拼贴多图）、sketch（线稿手绘）
- visibleGarments：列出画面中独立可识别的服装件（上装、下装、外套等分别列出，不要合并为一套），最多 6 项，每项有唯一 id（g1、g2…）
- 模特图或多件可见服装时 requiresGarmentPick=true；单款平铺且高置信时 requiresGarmentPick=false
- detectedCategory、suggestedTitle、recommendedGarmentId 须对齐 AI 推荐的主款
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

export async function generateStudioDraft(input: {
  description: string;
  imageDataUrl?: string;
  intentSummary: string;
  detectedCategory: string;
  answers: Record<string, string | string[]>;
  questions: Array<{ id: string; question: string }>;
  regionStandard?: string;
  sampleSize?: string;
  intake?: GarmentScopeInput;
}) {
  const answersText = input.questions
    .map((q) => {
      const ans = input.answers[q.id];
      const val = Array.isArray(ans) ? ans.join("、") : ans;
      return `- ${q.question}：${val || "未答"}`;
    })
    .join("\n");

  const scope = input.intake
    ? buildGarmentScopeContext(input.intake)
    : buildGarmentScopeContext({
        detectedCategory: input.detectedCategory,
        description: input.description,
      });

  const context = `
${scope}

款式描述：${input.description || "（无）"}
AI 理解：${input.intentSummary}
品类：${input.detectedCategory}
区域标准：${input.regionStandard ?? "未指定"}
样衣基准码：${input.sampleSize ?? "未指定"}
用户补充信息：
${answersText}
`.trim();

  const draft = await callStructured({
    system: `你是资深版房工艺师。根据全部信息生成 Tech Pack 初稿。
要求：
- 仅针对目标单款；process_items 覆盖其主要结构部位（领、袖、下摆、侧缝等）
- bom_items 列出主要面辅料；非目标款物料不得加入
- suggestedHotspots 仅标注目标单款结构部位（坐标基于 ${CANVAS_W}×${CANVAS_H}，不要标注人脸/背景/其他服装，最多 6 个）
- size_chart 仅输出 sizes 列与 rows 的 part/method，values 留空
- aiSummary 用 2-3 句话说明初稿要点`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: StudioDraftSchema,
    schemaName: "studio_draft",
  });

  return draft;
}
