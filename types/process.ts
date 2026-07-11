import { z } from "zod";

export const ProcessItemSchema = z.object({
  id: z.string().optional().describe("工艺行稳定 ID，加载时自动补全"),
  part: z.string().describe("部位，如：袖口、领圈"),
  process: z.string().describe("工艺描述"),
  stitch: z.string().optional().describe("针法/线迹"),
  seam_allowance: z.string().optional().describe("缝份"),
  hotspotId: z.string().optional().describe("@deprecated"),
});

export const ProcessListSchema = z.object({
  items: z.array(ProcessItemSchema),
});

export const BomItemSchema = z.object({
  name: z.string().describe("物料名称"),
  category: z
    .enum(["fabric", "trim", "accessory", "packaging"])
    .optional()
    .describe("物料分类：面料/辅料/配件/包装"),
  garmentPart: z
    .string()
    .optional()
    .describe("所属部件，如：上装、下装、共用"),
  spec: z.string().optional().describe("规格"),
  color: z.string().optional().describe("颜色"),
  usage: z.string().optional().describe("用量"),
  supplier: z.string().optional().describe("供应商"),
  code: z.string().optional().describe("物料编码"),
});

export const BomListSchema = z.object({
  items: z.array(BomItemSchema),
});

export const BomAssistSchema = z.object({
  bom_items: z.array(BomItemSchema).describe("物料清单条目"),
  plainExplanation: z
    .string()
    .describe("用非专业人士能理解的语言说明物料选择依据"),
});

export const IntentAnalysisSchema = z.object({
  summary: z.string().describe("对用户意图的简要理解"),
  detectedCategory: z.string().describe("识别出的品类，如：针织T恤"),
  detectedFeatures: z.array(z.string()).describe("识别出的结构或工艺特征"),
  suggestedTitle: z.string().describe("建议的款式名称"),
  confidence: z.enum(["high", "medium", "low"]),
});

export const QuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const AiQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["single", "multi", "text"]),
  options: z.array(QuestionOptionSchema).optional(),
  required: z.boolean(),
});

export const QuestionnaireSchema = z.object({
  intro: z.string().describe("向用户说明为何需要补充这些信息"),
  questions: z.array(AiQuestionSchema),
});

export const SuggestedHotspotSchema = z.object({
  label: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const StudioDraftSchema = z.object({
  process_items: z.array(ProcessItemSchema),
  bom_items: z.array(BomItemSchema),
  suggestedHotspots: z.array(SuggestedHotspotSchema).optional(),
  size_chart: z
    .object({
      sizes: z.array(z.string()),
      rows: z.array(
        z.object({
          part: z.string(),
          method: z.string(),
          values: z.record(z.string(), z.string()),
        }),
      ),
    })
    .optional(),
  aiSummary: z.string().optional().describe("版房专家初稿说明"),
});

export const SizeChartAssistSchema = z.object({
  sizes: z
    .array(z.string())
    .describe("该区域标准常用尺码列，必须包含基准码，其他码列预留给跳码"),
  rows: z.array(
    z.object({
      part: z.string().describe("测量点名称，符合区域标准习惯"),
      method: z.string().max(12).describe("简写量法，≤12字"),
      baseline_cm: z.coerce
        .string()
        .describe("该部位在样衣基准码下的测量值（cm，一位小数，必填，如 72.5）"),
      values: z
        .record(z.string(), z.coerce.string())
        .optional()
        .describe("可选；若提供则仅需填基准码 key"),
    }),
  ),
  plainExplanation: z
    .string()
    .describe("用非专业人士能理解的语言解释测量点选择与基准码估算依据"),
});

export const BatchAnnotateRegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  process: ProcessItemSchema.omit({ id: true }),
  linkToExistingProcessId: z.string().optional(),
});

export const BatchAnnotateSchema = z.object({
  regions: z.array(BatchAnnotateRegionSchema).max(6),
  userTips: z.string(),
});

export const RegionAnnotateSchema = z.object({
  part: z.string(),
  process: z.string(),
  stitch: z.string().optional(),
  seam_allowance: z.string().optional(),
});

export const SmartAnnotationItemSchema = z.object({
  type: z.enum(["rect", "circle", "arrow", "text", "dimension", "marker"]),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  text: z.string().optional(),
  markerIndex: z.number().optional(),
  linkedPart: z.string().optional(),
  color: z.string().optional(),
});

export const SmartAnnotateSchema = z.object({
  annotations: z.array(SmartAnnotationItemSchema),
  userTips: z
    .string()
    .describe("给非服装专业用户的简短操作提示，说明图上标注了什么"),
});

export const EnhanceTechPackSchema = z.object({
  process_items: z.array(ProcessItemSchema).optional(),
  bom_items: z.array(BomItemSchema).optional(),
  size_chart: SizeChartAssistSchema.optional(),
  summary: z.string().describe("本次补全了什么，用户还需要确认什么"),
});

export const AiChatResponseSchema = z.object({
  reply: z.string().describe("给用户的友好回复"),
  process_items: z.array(ProcessItemSchema).optional().describe("新增或修改的工艺条目"),
  bom_items: z.array(BomItemSchema).optional().describe("新增或修改的物料"),
  size_chart: SizeChartAssistSchema.optional().describe("更新后的尺码表"),
  title: z.string().optional().describe("更新款式标题"),
});

export type ProcessItem = z.infer<typeof ProcessItemSchema>;
export type ProcessList = z.infer<typeof ProcessListSchema>;
export type BomItem = z.infer<typeof BomItemSchema>;
export type AiProvider = "gateway" | "dashscope" | "zhipu";

export type Hotspot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};
