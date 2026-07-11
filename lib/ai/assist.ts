import { generateObject } from "ai";
import type { z } from "zod";
import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";
import {
  BatchAnnotateSchema,
  BomAssistSchema,
  EnhanceTechPackSchema,
  RegionAnnotateSchema,
  SizeChartAssistSchema,
  type AiProvider,
} from "@/types/process";
import type { BomItem } from "@/types/process";
import { getRegionOption, type SizeRegionStandard } from "@/lib/size-chart/standards";
import type { SizeChart, TechPackProject } from "@/types/project";

export function getModel(): string {
  const provider = (process.env.AI_PROVIDER as AiProvider) || "gateway";
  if (provider === "dashscope") return process.env.AI_MODEL_DASHSCOPE || "qwen-plus";
  if (provider === "zhipu") return process.env.AI_MODEL_ZHIPU || "glm-4-flash";
  return process.env.AI_MODEL_GATEWAY || "google/gemini-2.5-flash";
}

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
  sampleSize: string;
  regionStandard: SizeRegionStandard;
}) {
  const region = getRegionOption(input.regionStandard);
  const context = `
品类：${input.category ?? "未指定"}
用户描述：${input.description ?? "无"}
区域标准：${region.label}（${region.hint}）
图片中样衣基准码：${input.sampleSize}
建议尺码列：${region.defaultSizes.join(" / ")}
已有尺码表（可参考部位，数值可重写）：${JSON.stringify(input.existingChart ?? {})}
补充信息：${JSON.stringify(input.answers ?? {})}
`.trim();

  return callStructured({
    instructions: `你是资深版师，根据款式图与区域标准为 Tech Pack 生成尺码表（POM）。

业务规则：
1. 结合款式结构（品类、廓形、袖型、是否有帽/拉链等）与「${region.label}」习惯，选出该款式应有的常用测量点（一般 5–10 个），不要机械照搬模板。
2. 测量点命名、尺码列标签须符合「${region.label}」行业习惯。
3. sizes 数组输出该区域常用尺码列（含基准码「${input.sampleSize}」），其他码列数值留空，供后续跳码功能使用。
4. 仅对基准码「${input.sampleSize}」估算各测量点数值（cm，一位小数），须结合款式图视觉比例与品类经验；看不清的部位给出合理估算并注明不确定性。
5. values 的 key 必须与 sizes 中字符串完全一致；非基准码一律填空字符串 ""。
6. method 简写即可（≤12 字），如「夹下1cm平量」「后中直量」，不要长句。
7. plainExplanation 说明选了哪些测量点、基准码估算依据。`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: SizeChartAssistSchema,
    schemaName: "size_chart_assist",
  });
}

export async function generateBomAssist(input: {
  category?: string;
  description?: string;
  imageDataUrl?: string;
  processItems?: Array<{ part: string; process: string }>;
  existingBom?: BomItem[];
  answers?: Record<string, string | string[]>;
}) {
  const processText =
    input.processItems
      ?.map((p) => `- ${p.part}：${p.process}`)
      .join("\n") ?? "（尚无工艺条目）";

  const existingText =
    input.existingBom?.map((b) => `- ${b.name}（${b.category ?? "未分类"}）`).join("\n") ??
    "（尚无物料）";

  const context = `
品类：${input.category ?? "未指定"}
描述：${input.description ?? "无"}
现有工艺：
${processText}
已有物料（勿重复，可补充完善）：
${existingText}
补充信息：${JSON.stringify(input.answers ?? {})}
`.trim();

  return callStructured({
    instructions: `你是版房面辅料专员，根据款式图与工艺为 Tech Pack 生成 BOM 物料清单。
要求：
1. 列出主要面辅料（面料、里料、衬、拉链、纽扣、线、标等），套装需用 garmentPart 区分上装/下装。
2. category 必须是 fabric/trim/accessory/packaging 之一。
3. 不要删除用户已有物料；新条目不与已有 name 重复。
4. spec/color/usage 尽量填写，用量可估算。
5. plainExplanation 用小白能懂的话说明物料选择依据。`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: BomAssistSchema,
    schemaName: "bom_assist",
  });
}

export async function generateBatchAnnotations(input: {
  category?: string;
  description?: string;
  imageDataUrl?: string;
  processItems: Array<{ id?: string; part: string; process: string }>;
}) {
  const parts = input.processItems
    .map((p) => `- id=${p.id ?? "?"} | ${p.part}：${p.process}`)
    .join("\n");

  const context = `
品类：${input.category ?? "未指定"}
描述：${input.description ?? "无"}
现有工艺条目：
${parts || "（尚无，请识别主要结构部位并创建工艺描述）"}

画布尺寸：${CANVAS_W}×${CANVAS_H} 像素，原点在左上角。
请输出最多 6 个矩形区域（x,y,width,height），每个区域对应一条工艺。
若已有工艺 id 匹配，填 linkToExistingProcessId；否则在 process 字段给出 part/process/stitch/seam_allowance。
只输出 rect 区域数据，不要 arrow/marker/text。
userTips 简要说明标注了什么。`.trim();

  return callStructured({
    instructions: `你是服装 Tech Pack 版师，在款式图上标注结构部位区域。
坐标必须落在服装结构上，不要标注人脸或背景。每个区域一个矩形框。`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: BatchAnnotateSchema,
    schemaName: "batch_annotate",
  });
}

export async function generateRegionAnnotate(input: {
  category?: string;
  description?: string;
  imageDataUrl?: string;
  region: { x: number; y: number; width: number; height: number };
  existingPart?: string;
}) {
  const context = `
品类：${input.category ?? "未指定"}
描述：${input.description ?? "无"}
用户框选区域（1000×750 坐标）：x=${input.region.x}, y=${input.region.y}, width=${input.region.width}, height=${input.region.height}
${input.existingPart ? `已有部位名参考：${input.existingPart}` : ""}
请识别该区域的服装结构部位，输出 part/process/stitch/seam_allowance。`.trim();

  return callStructured({
    instructions: `你是版房工艺师，根据款式图局部区域填写工艺说明。输出简洁专业。`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: RegionAnnotateSchema,
    schemaName: "region_annotate",
  });
}

/** @deprecated 使用 generateBatchAnnotations */
export async function generateSmartAnnotations(input: {
  category?: string;
  description?: string;
  imageDataUrl?: string;
  processItems: Array<{ part: string; process: string }>;
}) {
  return generateBatchAnnotations({ ...input, processItems: input.processItems });
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
