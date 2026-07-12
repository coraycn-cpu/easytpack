import type { GarmentScopeInput } from "@/lib/ai/assist";

/** 构建注入各 AI prompt 的单款范围说明 */
export function buildGarmentScopeContext(
  intake: GarmentScopeInput,
): string {
  const target = intake.targetGarment;
  const category = target?.category ?? intake.detectedCategory ?? "服装";
  const label = target?.label ?? intake.description?.trim().slice(0, 40) ?? "目标款式";
  const photoNote =
    intake.photoType === "model"
      ? "参考图为模特穿着图，只分析目标单款的穿着状态，忽略模特身体、鞋包、配饰、内搭及其他可见服装。"
      : intake.photoType === "collage"
        ? "参考图为拼贴/多图，只分析与目标单款对应的那一件。"
        : "若画面中出现其他服装或配饰，一律忽略。";

  if (target) {
    return `本 Tech Pack 仅处理一件目标款式：${target.label}（${target.category}）。${photoNote}不得混入其他款式、配饰或背景元素。`;
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
