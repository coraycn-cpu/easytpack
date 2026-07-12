import type { IntakeData, PhotoType, TargetGarment } from "@/types/project";
import type { z } from "zod";
import type { IntentAnalysisSchema } from "@/types/process";

export type IntentAnalysisResult = z.infer<typeof IntentAnalysisSchema>;

/** 将 intake 分析结果写入 IntakeData 字段 */
export function applyIntentToIntake(
  intake: IntakeData,
  intent: IntentAnalysisResult,
): IntakeData {
  const visibleGarments = intent.visibleGarments.map((g) => ({
    id: g.id,
    label: g.label,
    category: g.category,
    confidence: g.confidence,
  }));

  const recommended = visibleGarments.find(
    (g) => g.id === intent.recommendedGarmentId,
  );
  const autoTarget =
    !intent.requiresGarmentPick && recommended
      ? {
          id: recommended.id,
          label: recommended.label,
          category: recommended.category,
        }
      : undefined;

  return {
    ...intake,
    aiIntentAnalysis: intent.summary,
    detectedCategory: intent.detectedCategory,
    detectedFeatures: intent.detectedFeatures,
    suggestedTitle: intent.suggestedTitle,
    photoType: intent.photoType,
    visibleGarments,
    recommendedGarmentId: intent.recommendedGarmentId,
    requiresGarmentPick: intent.requiresGarmentPick,
    intentConfidence: intent.confidence,
    targetGarment: autoTarget ?? intake.targetGarment,
    garmentConfirmed: autoTarget ? true : intake.garmentConfirmed,
  };
}

export function needsGarmentConfirmation(intake: IntakeData): boolean {
  if (!intake.imageDataUrl) return false;
  if (intake.garmentConfirmed && intake.targetGarment) return false;
  if (intake.requiresGarmentPick) return true;
  if ((intake.visibleGarments?.length ?? 0) > 1) return true;
  return !intake.targetGarment;
}

export function confirmTargetGarment(
  intake: IntakeData,
  garment: TargetGarment,
): IntakeData {
  return {
    ...intake,
    targetGarment: garment,
    garmentConfirmed: true,
    detectedCategory: garment.category,
    suggestedTitle: garment.label,
  };
}

export function photoTypeLabel(photoType?: PhotoType): string {
  switch (photoType) {
    case "flat_lay":
      return "平铺图";
    case "model":
      return "模特图";
    case "collage":
      return "拼贴图";
    case "sketch":
      return "线稿/手绘";
    default:
      return "参考图";
  }
}

/** 选款后是否需自动生成平铺正面主款图 */
export function needsFlatFrontAfterGarmentPick(intake: IntakeData): boolean {
  if (!intake.garmentConfirmed || !intake.targetGarment || !intake.imageDataUrl) {
    return false;
  }
  if (intake.flatFrontGenerated) return false;
  return intake.photoType === "model" || intake.photoType === "collage";
}
