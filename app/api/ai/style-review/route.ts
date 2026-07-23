import { NextRequest } from "next/server";
import { generateStyleReview } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
import { STYLE_REVIEW_MAX } from "@/types/process";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "style-review",
    run: async (body) => {
      const result = await generateStyleReview(body as never);
      const review =
        typeof result.review === "string" ? result.review.trim() : "";
      if (review.length < 20) {
        throw new Error("AI 未返回有效评语，请重试");
      }
      return { review: review.slice(0, STYLE_REVIEW_MAX) };
    },
  });
}
