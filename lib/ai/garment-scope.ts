import type { GarmentScopeInput } from "@/lib/ai/assist";

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

export function isSetTarget(intake: GarmentScopeInput): boolean {
  return isTargetSet(intake.targetGarment);
}
