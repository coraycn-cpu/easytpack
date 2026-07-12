import { NextRequest, NextResponse } from "next/server";
import { generateBatchSizeDimensions, isGatewayConfigured } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    if (!isGatewayConfigured()) {
      return NextResponse.json(
        { error: "AI 未配置，请设置 AI_GATEWAY_API_KEY 或 VERCEL_OIDC_TOKEN" },
        { status: 503 },
      );
    }
    const body = await req.json();
    const result = await generateBatchSizeDimensions(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI size-dimension-batch]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量尺寸标注失败" },
      { status: 500 },
    );
  }
}
