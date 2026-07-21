import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import { resolveGarmentImageForAi } from "@/lib/ai/resolve-garment-image";
import type { AiQuestion, TechPackProject } from "@/types/project";

/** 互动补充问题上限（与问卷 schema / prompt 一致） */
export const FULL_COLLECT_MAX_QUESTIONS = 5;

export function clampQuestionnaireQuestions(
  questions: AiQuestion[],
): AiQuestion[] {
  return questions.slice(0, FULL_COLLECT_MAX_QUESTIONS);
}

/**
 * 生成补充问题用的图源：与一键标注「标工艺」相同——主款画板，
 * 避免问卷仍只看 intake 原图、与工艺/尺寸图源脱节。
 */
export async function resolveFullCollectQuestionImage(
  project: TechPackProject,
): Promise<string | undefined> {
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const { dataUrl } = await resolveGarmentImageForAi(project, {
    activeArtboardId: primaryId,
  });
  return dataUrl ?? project.intake.imageDataUrl;
}

export async function fetchFullCollectQuestionnaire(
  project: TechPackProject,
): Promise<{ intro: string; questions: AiQuestion[] }> {
  const imageDataUrl = await resolveFullCollectQuestionImage(project);
  const res = await fetch("/api/ai/questionnaire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: project.intake.description,
      imageDataUrl,
      intentSummary: project.intake.aiIntentAnalysis,
      detectedCategory: project.intake.detectedCategory,
      detectedFeatures: project.intake.detectedFeatures,
      intake: project.intake,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "问卷加载失败");
  return {
    intro: String(data.intro ?? ""),
    questions: clampQuestionnaireQuestions(
      (data.questions ?? []) as AiQuestion[],
    ),
  };
}
