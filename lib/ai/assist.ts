import { generateObject, generateText } from "ai";
import type { z } from "zod";
import { CANVAS_H, CANVAS_W } from "@/lib/canvas/constants";
import {
  BatchAnnotateSchema,
  BomAssistSchema,
  EnhanceTechPackSchema,
  RegionAnnotateSchema,
  SizeChartAssistSchema,
  SizeDimensionAssistSchema,
  BatchSizeDimensionSchema,
  StyleReviewSchema,
  STYLE_REVIEW_MAX,
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

function countBaselineRows(
  rows: Array<{ baseline_cm?: string | number; values?: Record<string, string | number> }>,
  sampleSize: string,
): number {
  return rows.filter((r) => {
    const base = String(r.baseline_cm ?? "").trim();
    if (base && base !== "0") return true;
    const v = r.values?.[sampleSize];
    return v != null && String(v).trim() !== "" && String(v).trim() !== "0";
  }).length;
}

function parseJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("无法解析 AI 返回的 JSON");
  }
}

function clampLineCoord(v: number, max: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, Math.round(v)));
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

  const instructions = `你是资深版师，根据款式图与区域标准为 Tech Pack 生成尺码表（POM）。

业务规则：
1. 结合款式结构（品类、廓形、袖型等）与「${region.label}」习惯，选出该款式常用测量点（5–10 个）。
2. sizes 数组输出该区域常用尺码列（必须包含「${input.sampleSize}」）。
3. 每一行必须填写 baseline_cm（基准码「${input.sampleSize}」的估算值，cm，一位小数，不能为空）。
4. 其他尺码列不要填数值；values 可省略或仅填基准码 key。
5. method 简写（≤12 字）。
6. 即使已有尺码表只有部位名，也必须为每个部位给出 baseline_cm 估算。

输出示例（基准码 M）：
{"sizes":["S","M","L"],"rows":[{"part":"衣长","method":"后中直量","baseline_cm":"72.0"},{"part":"胸围","method":"夹下1cm","baseline_cm":"108.0"}]}`;

  try {
    const structured = await callStructured({
      instructions,
      userText: context,
      imageDataUrl: input.imageDataUrl,
      schema: SizeChartAssistSchema,
      schemaName: "size_chart_assist",
    });
    const rows = structured.rows ?? [];
    if (rows.length > 0 && countBaselineRows(rows, input.sampleSize) > 0) {
      return {
        sizes: structured.sizes ?? [],
        rows,
        plainExplanation: structured.plainExplanation ?? "",
      };
    }
  } catch (err) {
    console.warn("[size-chart] structured output failed, falling back to text", err);
  }

  const { text } = await generateText({
    model: getModel(),
    system: `你是资深版师。只输出 JSON，不要 markdown 说明。格式：
{"sizes":["S","M","L"],"rows":[{"part":"衣长","method":"后中直量","baseline_cm":"72.0"}],"plainExplanation":"..."}
基准码 ${input.sampleSize}，每行 baseline_cm 必填且 > 0。`,
    messages: [{ role: "user", content: buildContent(context, input.imageDataUrl) }],
  });

  const parsed = parseJsonBlock(text) as {
    sizes?: string[];
    rows?: Array<{ part: string; method: string; baseline_cm?: string | number }>;
    plainExplanation?: string;
  };
  const rows = parsed.rows ?? [];
  if (rows.length === 0 || countBaselineRows(rows, input.sampleSize) === 0) {
    throw new Error("AI 未返回有效尺码表数据，请确认款式图清晰并重试");
  }
  return {
    sizes: parsed.sizes ?? [],
    rows,
    plainExplanation: parsed.plainExplanation ?? "",
  };
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

export async function generateSizeDimensionAssist(input: {
  category?: string;
  description?: string;
  imageDataUrl?: string;
  line: { x: number; y: number; x2: number; y2: number };
  sampleSize: string;
  regionStandard: SizeRegionStandard;
  existingPart?: string;
}) {
  const region = getRegionOption(input.regionStandard);
  const context = `
品类：${input.category ?? "未指定"}
描述：${input.description ?? "无"}
区域标准：${region.label}
样衣基准码：${input.sampleSize}
用户绘制的尺寸线（1000×750 坐标）：(${input.line.x},${input.line.y}) → (${input.line.x2},${input.line.y2})
${input.existingPart ? `已有部位参考：${input.existingPart}` : ""}
请识别该尺寸线对应的测量部位，输出 part/method/baseline_cm。`.trim();

  return callStructured({
    instructions: `你是资深版师。根据款式图上的尺寸标注线，识别测量部位并估算基准码「${input.sampleSize}」的 cm 值（一位小数）。method 简写 ≤12 字。`,
    userText: context,
    imageDataUrl: input.imageDataUrl,
    schema: SizeDimensionAssistSchema,
    schemaName: "size_dimension_assist",
  });
}

export async function generateBatchSizeDimensions(input: {
  category?: string;
  description?: string;
  imageDataUrl?: string;
  sizeChart: SizeChart;
  sampleSize: string;
  regionStandard: SizeRegionStandard;
  /** 已有尺寸线关联的部位，跳过 */
  skipParts?: string[];
}) {
  const region = getRegionOption(input.regionStandard);
  const rows = input.sizeChart.rows.filter((r) => r.part.trim());
  const skipSet = new Set((input.skipParts ?? []).map((p) => p.trim().toLowerCase()));
  const targetRows = rows.filter((r) => !skipSet.has(r.part.trim().toLowerCase()));

  if (targetRows.length === 0) {
    return { dimensions: [], userTips: "所有测量点已有尺寸线，未新增标注" };
  }

  const rowsText = targetRows
    .map((r) => {
      const val = input.sampleSize ? r.values[input.sampleSize]?.trim() : "";
      return `- ${r.part}（量法：${r.method}${val ? `，${input.sampleSize}码 ${val}cm` : ""}）`;
    })
    .join("\n");

  const context = `
品类：${input.category ?? "未指定"}
描述：${input.description ?? "无"}
区域标准：${region.label}
样衣基准码：${input.sampleSize}
需在款式图上标注的测量点（每条输出一条 dimension 线段）：
${rowsText}

画布尺寸：${CANVAS_W}×${CANVAS_H} 像素，原点在左上角。
每条线段用 (x,y)→(x2,y2) 表示，方向应符合该部位的标准量法（如衣长竖直、胸围水平）。
part 必须与上方列表中的部位名完全一致。`.trim();

  const instructions = `你是资深版师，在 Tech Pack 款式图上为尺码表测量点绘制尺寸标注线。
要求：
1. 为每个测量点输出一条线段，坐标落在服装对应测量位置，不要标注背景。
2. 线段长度合理（>30px），方向符合量法习惯。
3. 只输出 type=dimension 的线段数据，不要矩形或文字框。
4. userTips 简要说明标注了哪些测量点。`;

  const normalizeDimensions = (
    raw: Array<{ part: string; x: number; y: number; x2: number; y2: number }>,
  ) =>
    raw
      .map((d) => ({
        part: d.part.trim(),
        x: clampLineCoord(d.x, CANVAS_W),
        y: clampLineCoord(d.y, CANVAS_H),
        x2: clampLineCoord(d.x2, CANVAS_W),
        y2: clampLineCoord(d.y2, CANVAS_H),
      }))
      .filter(
        (d) =>
          d.part &&
          Math.hypot(d.x2 - d.x, d.y2 - d.y) >= 12,
      );

  try {
    const structured = await callStructured({
      instructions,
      userText: context,
      imageDataUrl: input.imageDataUrl,
      schema: BatchSizeDimensionSchema,
      schemaName: "batch_size_dimensions",
    });
    const dimensions = normalizeDimensions(structured.dimensions ?? []);
    if (dimensions.length > 0) {
      return {
        dimensions,
        userTips: structured.userTips ?? `已标注 ${dimensions.length} 条尺寸线`,
      };
    }
  } catch (err) {
    console.warn("[size-dimension-batch] structured failed, falling back to text", err);
  }

  const partList = targetRows.map((r) => r.part).join("、");
  const { text } = await generateText({
    model: getModel(),
    system: `你是版师。只输出 JSON：
{"dimensions":[{"part":"衣长","x":120,"y":80,"x2":120,"y2":420}],"userTips":"..."}
画布 ${CANVAS_W}×${CANVAS_H}，为每个部位输出一条线段，part 必须与给定列表一致：${partList}`,
    messages: [{ role: "user", content: buildContent(context, input.imageDataUrl) }],
  });

  const parsed = parseJsonBlock(text) as {
    dimensions?: Array<{ part: string; x: number; y: number; x2: number; y2: number }>;
    userTips?: string;
  };
  const dimensions = normalizeDimensions(parsed.dimensions ?? []);
  return {
    dimensions,
    userTips: parsed.userTips ?? (dimensions.length > 0 ? `已标注 ${dimensions.length} 条尺寸线` : "未能生成尺寸线"),
  };
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

export async function generateStyleReview(input: {
  title?: string;
  category?: string;
  description?: string;
  imageDataUrl?: string;
  processItems?: Array<{ part: string; process: string; stitch?: string }>;
  bomItems?: Array<{ name: string; category?: string; spec?: string }>;
  existingReview?: string;
}) {
  const processText =
    input.processItems
      ?.map((p) => `- ${p.part}：${p.process}${p.stitch ? `（${p.stitch}）` : ""}`)
      .join("\n") || "（尚无工艺）";

  const bomText =
    input.bomItems
      ?.map((b) => `- ${b.name}${b.spec ? ` ${b.spec}` : ""}（${b.category ?? "物料"}）`)
      .join("\n") || "（尚无物料）";

  const context = `
款式：${input.title ?? "未命名"}
品类：${input.category ?? "未指定"}
描述：${input.description ?? "无"}
工艺条目：
${processText}
物料清单：
${bomText}
${input.existingReview ? `已有评语（可改写优化）：${input.existingReview}` : ""}
`.trim();

  const instructions = `你是资深版房总监，为 Tech Pack 撰写「款式评语」，读者是版师、车版师、设计师等业内人员。

输出格式（必须包含以下四段标题，每段标题单独占一行）：
【款式特点】款式名称、廓形结构、设计亮点与风格定位
【面料建议】主辅料选型、克重/成分倾向、手感与功能性要求
【工艺建议】关键工序、缝型线迹、辅料搭配与品质标准
【注意事项】版型风险、对格对条、缩水/色牢度、车版与质检要点

写作要求：
1. 使用业内术语，简洁专业，可直接用于工艺沟通。
2. 四段内容连贯，不要写成无关清单。
3. 总字数严格控制在 ${STYLE_REVIEW_MAX} 字以内（含标点与段落标题）。`;

  const userContent = buildContent(context, input.imageDataUrl);

  try {
    const structured = await callStructured({
      instructions,
      userText: context,
      imageDataUrl: input.imageDataUrl,
      schema: StyleReviewSchema,
      schemaName: "style_review",
    });
    const review = structured.review?.trim() ?? "";
    if (review.length >= 20) return { review: review.slice(0, STYLE_REVIEW_MAX) };
  } catch (err) {
    console.warn("[style-review] structured output failed, falling back to text", err);
  }

  const { text } = await generateText({
    model: getModel(),
    system: instructions,
    messages: [{ role: "user", content: userContent }],
  });

  const review = text.trim().slice(0, STYLE_REVIEW_MAX);
  if (review.length < 20) {
    throw new Error("AI 未返回有效评语，请稍后重试");
  }
  return { review };
}
