import { NextRequest } from "next/server";
import { generateSizeChartAssist, isGatewayConfigured } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "size-chart",
    run: async (body) => {
      if (!isGatewayConfigured()) {
        throw new Error(
          "AI 未配置，请设置 AI_GATEWAY_API_KEY 或 VERCEL_OIDC_TOKEN",
        );
      }
      return generateSizeChartAssist(body as never);
    },
  });
}
