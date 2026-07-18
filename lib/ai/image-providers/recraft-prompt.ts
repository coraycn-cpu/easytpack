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
  /** 目标款锁定；多件同框时必须只分析目标款 */
  targetLabel?: string;
  targetCategory?: string;
  excludeLabels?: string[];
  isSet?: boolean;
}): Promise<GarmentSpec> {
  const correction = input.correctionPrompt?.trim()
    ? `\n用户修正（必须写入 sleeve/print 相关字段）：${input.correctionPrompt.trim()}`
    : "";

  const targetNote = input.targetLabel
    ? input.isSet
      ? `\n目标范围：套装「${input.targetLabel}」（${input.targetCategory ?? ""}），上下装一并分析。`
      : `\n目标范围：仅「${input.targetLabel}」（${input.targetCategory ?? ""}）。画面中其他服装${
          input.excludeLabels?.length
            ? `（${input.excludeLabels.join("、")}）`
            : ""
        }一律忽略，字段只描述这一件。`
    : "";

  const { object } = await generateObject({
    model: getModel(),
    schema: GarmentSpecSchema,
    schemaName: "GarmentSpec",
    instructions: `你是服装工艺单视觉分析员。只根据参考图中【目标款】填写结构化字段，禁止臆造。

规则：
- 若指定了目标单款，严禁把同框其他服装的特征写入字段（例如目标是马甲时不要写短裤）
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
任务类型：${input.kind}${targetNote}${correction}
请只分析目标服装。`,
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

function removeModelDirective(
  kind: ViewImageKind,
  scopeNote?: string,
): string {
  if (kind === "line_art") {
    return "IMAGE EDIT / TRACE ONLY: Convert THE ATTACHED reference garment photo into a technical fashion LINE DRAWING of that SAME image. Do not invent a new garment from text. Trace exact silhouette, seams, sleeve length, hem, neckline, ties/belts/pockets, and print motif positions. Completely remove any human model. No recoloring, no restyling, no new patterns.";
  }
  if (kind === "collar" || kind === "cuff") {
    return "IMAGE EDIT: Crop to the garment detail only. Completely remove the human model, mannequin, and dress form. Neutral background, product close-up for tech pack.";
  }
  if (kind === "back") {
    return "IMAGE EDIT: Rotate / re-present the SAME garment as a TRUE BACK VIEW flat lay. The output MUST show the REAR of the garment (back neckline, back yoke/seams, back hem) — NOT a copy of the front. Completely remove the human model AND any ghost mannequin, dress form, or white torso. Keep fabric/color/print identity. If the reference is front-facing, invent the plausible back construction consistent with that garment type (e.g. vest back, dress back) while matching color and fabric.";
  }
  if (kind === "custom") {
    return "IMAGE EDIT: Produce a fashion tech-pack product image of the requested view. Completely remove any human model, face, hair, arms, body, ghost mannequin, and dress form. Keep garment identity; clean studio background.";
  }
  // flat_front — 真平铺，禁止幽灵人台/假模特
  const scope = scopeNote?.trim()
    ? ` ${scopeNote.trim()}`
    : " Show ONLY the target garment.";
  return `IMAGE EDIT: Transform into a FRONT true FLAT LAY product photo — the garment spread flat on a white/neutral surface (top-down or slight angle). Completely remove the human model, face, hair, arms, legs, AND any ghost mannequin, invisible mannequin, dress form, white torso, or 3D body form.${scope} NOT a mannequin shoot. Clean white or neutral studio background — not a fashion model shoot, not a full coordinated outfit unless the target is explicitly a set.`;
}

/** 按视角生成生图 prompt（适配 Kontext 参考图编辑 + Recraft 文生图） */
export function buildRecraftPromptForKind(input: {
  kind: ViewImageKind;
  spec?: GarmentSpec | null;
  viewHint: string;
  correctionPrompt?: string;
  /** LLM 额外英文补充，可选 */
  extraPrompt?: string;
  /** 目标款隔离（单款/套装），放在最前 */
  scopeNote?: string;
}): string {
  const { kind, spec, viewHint, correctionPrompt, extraPrompt, scopeNote } =
    input;
  const fix = correctionPrompt?.trim()
    ? ` User correction (priority): ${correctionPrompt.trim()}.`
    : "";
  const extra = extraPrompt?.trim() ? ` ${extraPrompt.trim()}` : "";
  const scope = scopeNote?.trim() ? `${scopeNote.trim()} ` : "";
  const core = spec ? garmentCore(spec) : viewHint;
  const locks = spec
    ? sleeveAndPrintLocks(spec)
    : "Preserve exact sleeve length and print orientation from the brief.";
  const removeModel = removeModelDirective(kind, scopeNote);

  if (kind === "line_art") {
    // 有源图时禁止用 LLM 结构摘要主导构图，避免「按描述重画」偏离源图
    const sleeveHint = spec
      ? SLEEVE_LOCK[spec.sleeveLength]
      : "match sleeve length from the reference photo";
    return [
      "PRIORITY 1 — REFERENCE IMAGE IS THE ONLY SOURCE OF TRUTH.",
      "Convert / TRACE the attached color garment photo into a black-and-white tech-pack line drawing.",
      "Match the reference pixel-for-pixel in structure: silhouette, proportions, sleeve length, hem length, neckline, waist, seams, openings, and every print/pattern motif position, scale, and orientation.",
      "If any text brief conflicts with the reference photo, IGNORE the text and FOLLOW THE PHOTO.",
      "DO NOT redesign, reinterpret, restyle, or generate a different dress from a written description.",
      removeModel,
      "Output: pure white background; thin clean black contour lines only.",
      "Allowed: outline strokes for prints/embroidery exactly where they appear in the photo.",
      "Forbidden: color fills, shading, photoreal fabric, inventing motifs, changing sleeve/hem/neckline, moving belts/ties, adding or removing panels.",
      spec
        ? `Secondary identity check only (never override the photo): ${garmentCoreLineArt(spec)}.`
        : "",
      sleeveHint + ".",
      fix ? `User correction (apply without changing unrelated geometry):${fix}` : "",
      extra ? `Note:${extra}` : "",
      `Task: ${viewHint}.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (kind === "collar" || kind === "cuff") {
    return [
      scope,
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
      scope,
      removeModel,
      "CRITICAL VIEW: BACK of the garment only — rear side facing camera. Do NOT output another front view.",
      "Professional fashion tech-pack BACK VIEW true flat lay — garment laid flat on a surface, NO ghost mannequin, NO dress form, NO white torso.",
      "Show rear construction: back neckline/collar from behind, back seams, back hem, any back vents/closures. Front placket/chest details must NOT dominate.",
      "Same garment identity as reference (color, fabric, silhouette family):",
      core + ".",
      locks,
      "White/neutral studio background, no watermark, no text overlays.",
      `Task: ${viewHint}.${extra}${fix}`,
    ].join(" ");
  }

  if (kind === "custom") {
    return [
      scope,
      removeModel,
      "Professional fashion tech-pack product image. Prefer flat lay on surface; no ghost mannequin or dress form.",
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
    scope,
    removeModel,
    "Professional fashion tech-pack FRONT true FLAT LAY product photo: garment spread flat on white/neutral surface.",
    "FORBIDDEN: ghost mannequin, invisible mannequin, dress form, white torso, 3D body form, worn-on-form presentation.",
    "REQUIRED: flat product photography as if the dress is laid on a table — hollow interior ok, but no mannequin body.",
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
  // 画板名跟生成类型走，不用 AI 瞎起的「马甲正面」等
  if (kind === "custom") {
    const name = spec?.artboardName?.trim();
    if (name) return name.slice(0, 8);
  }
  return ARTBOARD_FALLBACK[kind];
}

/**
 * 线稿：只使用能吃参考图的模型（Kontext / Seedream 等）。
 * 有源图时不把 Recraft V3 纯文生列入候选，避免「按描述另画一张」。
 */
export function lineArtModelCandidates(opts?: {
  requireReferenceImage?: boolean;
}): string[] {
  const preferred = process.env.AI_MODEL_GATEWAY_IMAGE_LINE_ART?.trim();
  const withRef = [
    preferred,
    "bfl/flux-kontext-pro",
    "bytedance/seedream-4.5",
  ].filter((m): m is string => Boolean(m));
  if (opts?.requireReferenceImage) {
    return [...new Set(withRef)];
  }
  const textFallback = ["recraft/recraft-v3", "xai/grok-imagine-image"];
  return [...new Set([...withRef, ...textFallback])];
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
