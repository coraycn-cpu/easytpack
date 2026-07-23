import { NextRequest } from "next/server";
import { generateSizeDimensionAssist } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "size-dimension",
    run: async (body) => generateSizeDimensionAssist(body as never),
  });
}
