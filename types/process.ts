import { z } from "zod";

export const ProcessItemSchema = z.object({
  part: z.string().describe("部位，如：袖口、领圈"),
  process: z.string().describe("工艺描述"),
  stitch: z.string().optional().describe("针法/线迹"),
  seam_allowance: z.string().optional().describe("缝份"),
});

export const ProcessListSchema = z.object({
  items: z.array(ProcessItemSchema),
});

export type ProcessItem = z.infer<typeof ProcessItemSchema>;
export type ProcessList = z.infer<typeof ProcessListSchema>;

export type AiProvider = "gateway" | "dashscope" | "zhipu";

export type Hotspot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};
