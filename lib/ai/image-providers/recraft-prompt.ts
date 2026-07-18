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

/** 线稿只用结构信息，禁止写入颜色/花型色值（否则 Recraft 会出彩平铺） */
function garmentCoreLineArt(spec: GarmentSpec): string {
  const printStructure =
    spec.printOrientation === "solid"
      ? "no print motifs"
      : `suggest ${spec.printOrientation.replace(/_/g, " ")} motif placement with outline strokes only`;
  return [
    `${spec.garmentType}, ${spec.silhouette} silhouette`,
    `${spec.neckline} neckline`,
    spec.sleeveNote || SLEEVE_LOCK[spec.sleeveLength],
    `${spec.hemLength} length`,
    spec.construction,
    printStructure,
  ].join("; ");
}

function removeModelDirective(kind: ViewImageKind): string {
  if (kind === "line_art") {
    return "IMAGE EDIT: Convert the garment to monochrome technical LINE ART. Completely remove any human model, face, hair, hands and body. Black ink outlines on pure white only — no color, no photo realism.";
  }
  if (kind === "collar" || kind === "cuff") {
    return "IMAGE EDIT: Crop to the garment detail only. Completely remove the human model. Neutral background, product close-up for tech pack.";
  }
  if (kind === "back") {
    return "IMAGE EDIT: Transform into a BACK-VIEW garment flat lay / ghost mannequin. Completely remove the human model. Keep the same garment identity.";
  }
  // flat_front + custom-as-flat
  return "IMAGE EDIT: Transform into a FRONT garment FLAT LAY / ghost mannequin product photo. Completely remove the human model, face, hair, arms and legs. Show ONLY the clothing on a clean white or neutral studio background — not a fashion model shoot.";
}

/** 按视角生成生图 prompt（适配 Kontext 参考图编辑 + Recraft 文生图） */
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
  const removeModel = removeModelDirective(kind);

  if (kind === "line_art") {
    const structure = spec ? garmentCoreLineArt(spec) : viewHint;
    const sleeveLock = spec
      ? SLEEVE_LOCK[spec.sleeveLength]
      : "match sleeve length from the brief";
    return [
      removeModel,
      "Monochrome technical fashion flat sketch / CAD line drawing.",
      "BLACK pen outlines on WHITE background only.",
      "Absolute rules: zero color, zero fill, zero gradient, zero fabric texture, zero photorealism.",
      "Garment structure:",
      structure + ".",
      sleeveLock + ".",
      "Indicate seams, neckline, sleeve hem, waist and hem with thin clean lines.",
      `Task: ${viewHint}.${extra}${fix}`,
    ].join(" ");
  }

  if (kind === "collar" || kind === "cuff") {
    return [
      removeModel,
      "Close-up product detail photo for fashion tech pack.",
      `Focus: ${viewHint}.`,
      "Garment identity:",
      core + ".",
      locks,
      "Neutral background, sharp construction detail, no watermark.",
      `${extra}${fix}`,
    ].join(" ");
  }

  if (kind === "back") {
    return [
      removeModel,
      "Professional fashion tech-pack BACK VIEW flat lay product photo.",
      "Same garment as front:",
      core + ".",
      locks,
      "Show back construction clearly. White/neutral studio background, no watermark.",
      `Task: ${viewHint}.${extra}${fix}`,
    ].join(" ");
  }

  if (kind === "custom") {
    return [
      "Professional fashion tech-pack product image.",
      "Completely remove any human model if present.",
      "Garment identity:",
      core + ".",
      locks,
      `Custom view request: ${viewHint}.`,
      "Clean studio background, no watermark, no text.",
      `${extra}${fix}`,
    ].join(" ");
  }

  // flat_front
  return [
    removeModel,
    "Professional fashion tech-pack FRONT flat lay / ghost mannequin product photo.",
    "Exact same garment:",
    core + ".",
    locks,
    "IMPORTANT: if sleeves are short/cap, do NOT lengthen them toward the elbow.",
    "White/neutral studio background, no watermark, no text.",
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

/**
 * 线稿：优先 Flux Kontext（带参考图转线稿，成功率更高）；
 * Recraft V3 作备选（Line art style，纯文生图）。
 */
export function lineArtModelCandidates(): string[] {
  const preferred = process.env.AI_MODEL_GATEWAY_IMAGE_LINE_ART?.trim();
  const candidates = [
    preferred,
    "bfl/flux-kontext-pro",
    "recraft/recraft-v3",
    "bytedance/seedream-4.5",
    "xai/grok-imagine-image",
  ].filter((m): m is string => Boolean(m));
  return [...new Set(candidates)];
}

/** 平铺/背面等：优先能吃参考图的编辑模型 */
export function viewImageModelCandidates(): string[] {
  const preferred = process.env.AI_MODEL_GATEWAY_IMAGE?.trim();
  const candidates = [
    preferred,
    "bfl/flux-kontext-pro",
    "bytedance/seedream-4.5",
    "recraft/recraft-v4.1-utility",
    "xai/grok-imagine-image",
  ].filter((m): m is string => Boolean(m));
  return [...new Set(candidates)];
}

export function resolveRecraftModelForKind(kind: ViewImageKind): string {
  if (kind === "line_art") {
    return lineArtModelCandidates()[0] ?? "recraft/recraft-v3";
  }
  return viewImageModelCandidates()[0] ?? "bfl/flux-kontext-pro";
}

export function isRasterUtilityModel(modelId: string): boolean {
  return /recraft-v4(\.1)?-utility$/i.test(modelId) && !/vector/i.test(modelId);
}

/** 支持 prompt.images 参考图编辑的 Gateway 模型 */
export function supportsPromptImages(modelId: string): boolean {
  return /flux-kontext|gpt-image|seedream|imagen/i.test(modelId);
}
