import { NextRequest } from "next/server";
import { generateBomAssist } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "bom",
    run: async (body) => generateBomAssist(body as never),
  });
}
