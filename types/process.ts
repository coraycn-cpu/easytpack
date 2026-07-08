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
