import { z } from "zod";

export const ProcessItemSchema = z.object({
  part: z.string().describe("部位，如：袖口、领圈"),
  process: z.string().describe("工艺描述"),
  stitch: z.string().optional().describe("针法/线迹"),
  seam_allowance: z.string().optional().describe("缝份"),
  hotspotId: z.string().optional().describe("关联热区 ID"),
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
  sizes: z.array(z.string()),
  rows: z.array(
    z.object({
      part: z.string().describe("部位名称，如胸宽、衣长"),
      method: z.string().describe("测量方法，通俗说明"),
      values: z.record(z.string(), z.string()).describe("各尺码数值，单位cm"),
    }),
  ),
  plainExplanation: z
    .string()
    .describe("用非专业人士能理解的语言解释这份尺码表"),
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
