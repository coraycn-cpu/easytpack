import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/assist";
import type { ViewImageKind } from "@/lib/studio/view-types";

const SleeveLengthSchema = z.enum([
  "cap",
  "short",
  "elbow",
  "three_quarter",
  "long",
  "sleeveless",
  "unknown",
]);

export const GarmentSpecSchema = z.object({
  garmentType: z.string().describe("英文品类，如 midi dress"),
  silhouette: z.string().describe("轮廓，如 A-line"),
  neckline: z.string(),
  sleeveLength: SleeveLengthSchema,
  sleeveNote: z
    .string()
    .describe("袖长精确英文，如 short sleeves ending well above the elbow"),
  hemLength: z.string().describe("衣/裙长，如 midi"),
  fabric: z.string(),
  mainColors: z.array(z.string()).max(6),
  printOrientation: z
    .enum(["horizontal_bands", "vertical", "allover", "solid", "other"])
    .describe("花型方向"),
  printDetail: z
    .string()
    .describe("花型细节英文：纹样、色带、人物/几何等，无印花则写 solid color"),
  construction: z
    .string()
    .describe("腰带/口袋/门襟等可见工艺，一句英文"),
  artboardName: z.string().describe("中文画板名，2-8字"),
});

export type GarmentSpec = z.infer<typeof GarmentSpecSchema>;

const SLEEVE_LOCK: Record<z.infer<typeof SleeveLengthSchema>, string> = {
  cap: "CAP SLEEVES only (cover shoulder, barely any sleeve length) — NOT short, elbow, or three-quarter",
  short:
    "SHORT SLEEVES ending WELL ABOVE the elbow — NOT elbow-length, NOT three-quarter, NOT mid sleeves",
  elbow: "ELBOW-LENGTH sleeves — not shorter, not three-quarter",
  three_quarter: "THREE-QUARTER sleeves — not full long sleeves",
  long: "LONG SLEEVES to wrist",
  sleeveless: "SLEEVELESS — no sleeves",
  unknown: "match sleeve length exactly as in the reference description",
};

const PRINT_LOCK: Record<GarmentSpec["printOrientation"], string> = {
  horizontal_bands:
    "HORIZONTAL banded ethnic/folk print — bands run left-to-right, NOT vertical stripes, NOT abstract blotches",
  vertical: "VERTICAL stripes/print — not horizontal bands",
  allover: "allover print matching described motif and scale",
  solid: "solid color, no invented print",
  other: "print exactly as described — do not invent a different motif",
};

const ARTBOARD_FALLBACK: Record<ViewImageKind, string> = {
  flat_front: "正面",
  line_art: "线稿",
  back: "背面",
  collar: "领口",
  cuff: "袖口",
  custom: "自定义视角",
};

export async function extractGarmentSpec(input: {
  sourceImageUrl: string;
  kind: ViewImageKind;
  category?: string;
  description?: string;
  correctionPrompt?: string;
}): Promise<GarmentSpec> {
  const correction = input.correctionPrompt?.trim()
    ? `\n用户修正（必须写入 sleeve/print 相关字段）：${input.correctionPrompt.trim()}`
    : "";

  const { object } = await generateObject({
    model: getModel(),
    schema: GarmentSpecSchema,
    schemaName: "GarmentSpec",
    instructions: `你是服装工艺单视觉分析员。只根据参考图可见内容填写结构化字段，禁止臆造。

规则：
- sleeveLength：短袖若明显止于肘上，必须 short 或 cap，绝不要标成 elbow/three_quarter
- printOrientation：横向色带/民族条带选 horizontal_bands；竖条选 vertical
- artboardName：中文 2-8 字，贴合任务（线稿/背面/正面等）
- 输出英文描述字段；不要写摄影棚套话`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text" as const,
            text: `品类提示：${input.category ?? "服装"}
描述提示：${input.description ?? "无"}
任务类型：${input.kind}${correction}
请分析图中目标服装。`,
          },
          { type: "image" as const, image: input.sourceImageUrl },
        ],
      },
    ],
  });

  return object;
}

function sleeveAndPrintLocks(spec: GarmentSpec): string {
  return `${SLEEVE_LOCK[spec.sleeveLength]}. ${PRINT_LOCK[spec.printOrientation]}.`;
}

function garmentCore(spec: GarmentSpec): string {
  return [
    `${spec.garmentType}, ${spec.silhouette} silhouette`,
    `${spec.neckline} neckline`,
    spec.sleeveNote || SLEEVE_LOCK[spec.sleeveLength],
    `${spec.hemLength} length`,
    `${spec.fabric} fabric`,
    `colors: ${spec.mainColors.join(", ") || "as described"}`,
    `print: ${spec.printDetail}`,
    spec.construction,
  ].join("; ");
}

/** 按视角生成 Recraft 文生图 prompt（线稿不得包成产品摄影） */
export function buildRecraftPromptForKind(input: {
  kind: ViewImageKind;
  spec?: GarmentSpec | null;
  viewHint: string;
  correctionPrompt?: string;
  /** LLM 额外英文补充，可选 */
  extraPrompt?: string;
}): string {
  const { kind, spec, viewHint, correctionPrompt, extraPrompt } = input;
  const fix = correctionPrompt?.trim()
    ? ` User correction (priority): ${correctionPrompt.trim()}.`
    : "";
  const extra = extraPrompt?.trim() ? ` ${extraPrompt.trim()}` : "";
  const core = spec ? garmentCore(spec) : viewHint;
  const locks = spec
    ? sleeveAndPrintLocks(spec)
    : "Preserve exact sleeve length and print orientation from the brief.";

  if (kind === "line_art") {
    return [
      "Black and white technical fashion FLAT SKETCH / tech-pack LINE ART only.",
      "Clean black ink outlines on pure white background.",
      "NO color, NO fill, NO shading, NO fabric texture, NO photoreal photo, NO model.",
      "Same garment construction as:",
      core + ".",
      locks,
      `Task: ${viewHint}.${extra}${fix}`,
      "Fashion design CAD / pattern-making line drawing style.",
    ].join(" ");
  }

  if (kind === "collar" || kind === "cuff") {
    return [
      "Close-up product detail photo for fashion tech pack.",
      `Focus: ${viewHint}.`,
      "Garment identity:",
      core + ".",
      locks,
      "Neutral background, sharp construction detail, no model, no watermark.",
      `${extra}${fix}`,
    ].join(" ");
  }

  if (kind === "back") {
    return [
      "Professional fashion tech-pack BACK VIEW flat lay product photo.",
      "Same garment as front:",
      core + ".",
      locks,
      "Show back construction clearly. White/neutral studio background, no model, no watermark.",
      `Task: ${viewHint}.${extra}${fix}`,
    ].join(" ");
  }

  // flat_front + custom
  return [
    "Professional fashion tech-pack FRONT flat lay product photo.",
    "Exact same garment:",
    core + ".",
    locks,
    "IMPORTANT: if sleeves are short/cap, do NOT lengthen them toward the elbow.",
    "White/neutral studio background, no model, no mannequin, no watermark, no text.",
    `Task: ${viewHint}.${extra}${fix}`,
  ].join(" ");
}

export function artboardNameForKind(
  kind: ViewImageKind,
  spec?: GarmentSpec | null,
): string {
  const name = spec?.artboardName?.trim();
  if (name) return name.slice(0, 8);
  return ARTBOARD_FALLBACK[kind];
}

export function resolveRecraftModelForKind(kind: ViewImageKind): string {
  const base =
    process.env.AI_MODEL_GATEWAY_IMAGE || "recraft/recraft-v4.1-utility";
  if (kind === "line_art") {
    // 线稿优先向量/线稿向模型；不可用时仍回退主模型
    return (
      process.env.AI_MODEL_GATEWAY_IMAGE_LINE_ART ||
      process.env.AI_MODEL_GATEWAY_IMAGE ||
      "recraft/recraft-v4.1-utility"
    );
  }
  return base;
}
