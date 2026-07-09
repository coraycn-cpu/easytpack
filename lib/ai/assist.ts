import { generateObject } from "ai";
import type { z } from "zod";
import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";
import {
  EnhanceTechPackSchema,
  SizeChartAssistSchema,
  SmartAnnotateSchema,
  type AiProvider,
} from "@/types/process";
import type { SizeChart, TechPackProject } from "@/types/project";

export function getModel(): string {
  const provider = (process.env.AI_PROVIDER as AiProvider) || "gateway";
  if (provider === "dashscope") return process.env.AI_MODEL_DASHSCOPE || "qwen-plus";
  if (provider === "zhipu") return process.env.AI_MODEL_ZHIPU || "glm-4-flash";
  return process.env.AI_MODEL_GATEWAY || "google/gemini-2.5-flash";
}

/** Gateway 生图模型（Nano Banana / Imagen / Flux 等） */
export function getImageModel(): string {
  return process.env.AI_MODEL_GATEWAY_IMAGE || "google/gemini-2.5-flash-image";
}

export function isGatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
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
  instructions,
  userText,
  imageDataUrl,
  schema,
  schemaName,
}: {
  instructions: string;
  userText: string;
  imageDataUrl?: string;
  schema: S;
  schemaName: string;
}) {
  const { object } = await generateObject({
    model: getModel(),
    schema,
    schemaName,
    instructions,
    messages: [{ role: "user", content: buildContent(userText, imageDataUrl) }],
  });
  return object as z.infer<S>;
}

export async function generateSizeChartAssist(input: {
  category?: string;
  description?: string;
  imageDataUrl?: string;
  answers?: Record<string, string | string[]>;
  existingChart?: SizeChart;
}) {
  const context = `
品类：${input.category ?? "未指定"}
用户描述：${input.description ?? "无"}
已有尺码表：${JSON.stringify(input.existingChart ?? {})}
补充信息：${JSON.stringify(input.answers ?? {})}
`.trim();

  return callStructured({
    instructions: `你是资深版师，正在为「非服装专业人士」生成尺码表。
要求：
- 根据品类给出行业标准尺码（通常 S/M/L/XL 或 26-34）
- 数值单位 cm，保留一位小数
- method 字段用通俗语言说明怎么量（如「衣服平铺，量腋下最宽处」）
- plainExplanation 用小白能懂的话总结，告诉用户这些数字代表什么
- 如果是套装，上下装分开列出部位`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: SizeChartAssistSchema,
    schemaName: "size_chart_assist",
  });
}

export async function generateSmartAnnotations(input: {
  category?: string;
  description?: string;
  imageDataUrl?: string;
  processItems: Array<{ part: string; process: string }>;
}) {
  const parts = input.processItems
    .map((p, i) => `${i + 1}. ${p.part}：${p.process}`)
    .join("\n");

  const context = `
品类：${input.category ?? "未指定"}
描述：${input.description ?? "无"}
工艺条目：
${parts || "（尚无，请根据图片识别主要部位）"}

画布尺寸：${CANVAS_W}×${CANVAS_H} 像素。坐标原点在左上角。
请只在服装区域标注，不要标注人脸。标注类型：
- marker：序号圆点 ①②③，linkedPart 填对应工艺部位名
- arrow：箭头指向细节
- rect：框选结构区域
- dimension：尺寸线，text 写如「胸宽 52cm」
- text：简短说明文字
最多 8 个标注，避免拥挤。userTips 告诉用户「图上标了什么、版师会怎么看」。`;

  return callStructured({
    instructions: `你是服装技术插画师，帮非专业用户在款式图上做清晰标注，方便版师和工厂理解。
标注坐标必须合理落在服装结构上。`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: SmartAnnotateSchema,
    schemaName: "smart_annotate",
  });
}

export async function enhanceTechPack(project: TechPackProject) {
  const context = `
款式：${project.title}
品类：${project.intake.detectedCategory}
描述：${project.intake.description}
现有工艺 ${project.process_items.length} 条，BOM ${project.bom_items.length} 条
尺寸表行数 ${project.size_chart.rows.length}
问卷回答：${JSON.stringify(project.questionnaire.answers)}
`.trim();

  return callStructured({
    instructions: `你是版房总监，帮非服装专业人士补全 Tech Pack 中缺失的部分。
用户不懂专业术语，但你需要输出版师能直接使用的专业内容。
补全缺失的工艺条目、BOM、尺码表。不要删除用户已有内容，只补充和完善。
summary 用友好语气告诉用户补了什么、还需要他们确认什么。`,
    userText: context,
    imageDataUrl: project.intake.imageDataUrl,
    schema: EnhanceTechPackSchema,
    schemaName: "enhance_techpack",
  });
}
