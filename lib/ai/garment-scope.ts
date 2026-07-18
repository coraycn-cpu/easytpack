import type { GarmentScopeInput } from "@/lib/ai/assist";

/** 目标款在身体上的区域，用于多件同框时强制隔离 */
export type GarmentBodyZone = "top" | "bottom" | "full" | "set" | "unknown";

function isTargetSet(
  target: GarmentScopeInput["targetGarment"],
): boolean {
  if (!target) return false;
  return (
    target.kind === "set" ||
    target.id === "g_set" ||
    /套装|整套/.test(target.category ?? "")
  );
}

/**
 * 根据品类/名称推断上下装区域。
 * 解决模特图选「短裤」却抽到「马甲」等更抢眼上装的问题。
 */
export function inferGarmentBodyZone(
  label?: string,
  category?: string,
  kind?: string,
): GarmentBodyZone {
  if (kind === "set") return "set";
  const t = `${label ?? ""} ${category ?? ""}`.toLowerCase();
  if (/套装|整套|\bset\b/.test(t)) return "set";
  // 连衣裙/连体优先于「裙」
  if (/连衣裙|连衣裤|连体|jumpsuit|romper|overall/.test(t)) return "full";
  if (
    /短裤|长裤|西裤|休闲裤|牛仔裤|阔腿|直筒|工装裤|裙裤|半身裙|A字裙|裤装|下装|legging|short|pant|trouser|skirt|bottom|裙子/.test(
      t,
    )
  ) {
    return "bottom";
  }
  if (
    /马甲|背心|外套|大衣|夹克|风衣|西装|T恤|tee|上衣|衬衫|衬衣|卫衣|针织|开衫|吊带|抹胸|Polo|hoodie|vest|jacket|coat|blouse|sweater|cardigan|top|外搭/.test(
      t,
    )
  ) {
    return "top";
  }
  return "unknown";
}

function zoneFocusNoteZh(zone: GarmentBodyZone, label: string): string {
  switch (zone) {
    case "bottom":
      return `目标是下装「${label}」：只看腰线以下的裤/裙，完全忽略上身马甲、背心、外套、衬衫等。`;
    case "top":
      return `目标是上装「${label}」：只看上身单件，完全忽略同框短裤、长裤、半身裙等下装。`;
    case "full":
      return `目标是连体/连衣裙「${label}」：分析整件，勿拆成上下装。`;
    case "set":
      return `目标是整套「${label}」：上装与下装一并保留。`;
    default:
      return `只分析「${label}」这一件，忽略同框其他服装。`;
  }
}

function componentLabels(
  intake: GarmentScopeInput,
  componentIds?: string[],
): string {
  if (!componentIds?.length) return "上装与下装";
  const garments = intake.visibleGarments ?? [];
  const names = componentIds
    .map((id) => garments.find((g) => g.id === id))
    .filter(Boolean)
    .map((g) => g!.label);
  return names.length > 0 ? names.join("、") : "上装与下装";
}

/** 构建注入各 AI prompt 的单款/套装范围说明 */
export function buildGarmentScopeContext(
  intake: GarmentScopeInput,
): string {
  const target = intake.targetGarment;
  const category = target?.category ?? intake.detectedCategory ?? "服装";
  const label = target?.label ?? intake.description?.trim().slice(0, 40) ?? "目标款式";
  const zone = target
    ? inferGarmentBodyZone(target.label, target.category, target.kind)
    : "unknown";
  const photoNote =
    intake.photoType === "model"
      ? "参考图为模特穿着图，只分析目标款式的穿着状态，忽略模特身体、鞋包、配饰、内搭及其他非目标服装。"
      : intake.photoType === "collage"
        ? "参考图为拼贴/多图，只分析与目标款式对应的那一件或那一套。"
        : "若画面中出现其他服装或配饰，一律忽略。";

  if (target && isTargetSet(target)) {
    const parts = componentLabels(intake, target.componentIds);
    return `本 Tech Pack 处理一套套装：${target.label}（${target.category}），包含 ${parts}。工艺、BOM、尺寸可分区标注上装与下装，但属于同一 Tech Pack。${photoNote}不得混入其他款式、配饰或背景元素。`;
  }

  if (target) {
    return `本 Tech Pack 仅处理一件目标款式：${target.label}（${target.category}）。${zoneFocusNoteZh(zone, target.label)}${photoNote}不得混入其他款式、配饰或背景元素。`;
  }

  return `本 Tech Pack 仅处理单款（品类：${category}，暂称：${label}）。${photoNote}不得混入其他款式、配饰或背景元素。`;
}

export function buildGarmentScopePrefix(intake: GarmentScopeInput): string {
  const scope = buildGarmentScopeContext(intake);
  return `${scope}\n\n`;
}

export function isModelPhoto(photoType?: GarmentScopeInput["photoType"]): boolean {
  return photoType === "model";
}

export function isSetTarget(intake: GarmentScopeInput): boolean {
  return isTargetSet(intake.targetGarment);
}

function zoneIsolationEn(
  zone: GarmentBodyZone,
  targetLabel: string,
  targetCategory: string,
): string {
  switch (zone) {
    case "bottom":
      return `CRITICAL BODY ZONE — LOWER BODY ONLY: Isolate ONLY the bottom garment "${targetLabel}" (${targetCategory}). Completely REMOVE any top, vest, waistcoat, jacket, blouse, shirt, or torso garment also worn in the photo. Do NOT invent a matching top. Output one isolated flat-lay of the shorts/pants/skirt alone.`;
    case "top":
      return `CRITICAL BODY ZONE — UPPER BODY ONLY: Isolate ONLY the top garment "${targetLabel}" (${targetCategory}). Completely REMOVE any shorts, pants, skirt, or other bottoms also worn in the photo. Do NOT invent matching bottoms. Output one isolated flat-lay of that top alone.`;
    case "full":
      return `CRITICAL: Isolate the one-piece garment "${targetLabel}" (${targetCategory}) as a whole. Do not split into separate top and bottom.`;
    default:
      return `CRITICAL: Isolate ONLY "${targetLabel}" (${targetCategory}) as a single product.`;
  }
}

/**
 * 生图英文隔离指令：单款时按上下装区域强制排除同框其他服装
 * （解决「选短裤却出马甲 / 选马甲却出整套」）
 */
export function buildTargetIsolationPrompt(intake: GarmentScopeInput): string {
  const target = intake.targetGarment;
  if (!target) return "";

  if (isTargetSet(target)) {
    const parts = componentLabels(intake, target.componentIds);
    return `TARGET SCOPE: Generate the COMPLETE SET "${target.label}" (${target.category}) including ${parts} together as one flat lay. Do not omit set components; do not add unrelated garments.`;
  }

  const zone = inferGarmentBodyZone(target.label, target.category, target.kind);
  const others = (intake.visibleGarments ?? [])
    .filter((g) => g.id !== target.id && g.kind !== "set")
    .map((g) => `${g.label} (${g.category})`);
  const exclude =
    others.length > 0
      ? `STRICTLY EXCLUDE these other garments also visible in the photo: ${others.join("; ")}. Do not show them, crop them out, or invent matching bottoms/tops.`
      : `STRICTLY EXCLUDE any other garments, bottoms, tops, or accessories that are not "${target.label}".`;

  return [
    `TARGET SCOPE: Generate ONLY this single garment — "${target.label}" (${target.category}).`,
    zoneIsolationEn(zone, target.label, target.category),
    exclude,
    "Output one isolated product flat lay of that piece alone — never the full coordinated outfit unless the target is a set.",
  ].join(" ");
}
