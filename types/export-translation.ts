import { z } from "zod";

export const TechPackEnOverlaySchema = z.object({
  title: z.string().describe("English style / pack title"),
  description: z.string().describe("English short description"),
  category: z.string().describe("English garment category"),
  targetLabel: z
    .string()
    .describe("English target garment label for header NAME"),
  style_review: z
    .string()
    .describe("English fashion tech-pack remarks / style review"),
  process_items: z
    .array(
      z.object({
        part: z.string(),
        process: z.string(),
        stitch: z.string().optional(),
        seam_allowance: z.string().optional(),
      }),
    )
    .describe("Same order and count as Chinese process rows"),
  bom_items: z
    .array(
      z.object({
        name: z.string(),
        garmentPart: z.string().optional(),
        spec: z.string().optional(),
        color: z.string().optional(),
        usage: z.string().optional(),
        supplier: z.string().optional(),
      }),
    )
    .describe("Same order and count as Chinese BOM rows"),
  size_rows: z
    .array(
      z.object({
        part: z.string().describe("POM / measurement point in English"),
        method: z.string().describe("How to measure, concise English"),
      }),
    )
    .describe("Same order and count as Chinese size chart rows"),
  artboard_names: z
    .record(z.string(), z.string())
    .optional()
    .describe("Map of artboard id to English view name"),
  correction_notes: z
    .string()
    .optional()
    .describe(
      "Brief notes on terminology fixes / industry-standard wording applied",
    ),
});

export type TechPackEnOverlayZ = z.infer<typeof TechPackEnOverlaySchema>;
