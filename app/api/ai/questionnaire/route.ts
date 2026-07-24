import { NextRequest } from "next/server";
import { generateQuestionnaire } from "@/lib/ai/intake";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
import type { IntakeData } from "@/types/project";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "questionnaire",
    run: async (body) => {
      const intentSummary = body.intentSummary;
      const detectedCategory = body.detectedCategory;
      if (!intentSummary || !detectedCategory) {
        throw new Error("缺少意图分析结果");
      }
      return generateQuestionnaire({
        description:
          typeof body.description === "string" ? body.description : "",
        imageDataUrl:
          typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined,
        intentSummary: String(intentSummary),
        detectedCategory: String(detectedCategory),
        detectedFeatures: Array.isArray(body.detectedFeatures)
          ? (body.detectedFeatures as string[])
          : [],
        intake: body.intake as IntakeData | undefined,
      });
    },
  });
}
