import { NextRequest } from "next/server";
import { generateBatchAnnotations } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "annotate-batch",
    run: async (body) => generateBatchAnnotations(body as never),
  });
}
