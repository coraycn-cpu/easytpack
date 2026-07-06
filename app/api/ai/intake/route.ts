import { NextRequest, NextResponse } from "next/server";
import { analyzeIntent } from "@/lib/ai/intake";

export async function POST(req: NextRequest) {
  try {
    const { description, imageDataUrl } = await req.json();

    const result = await analyzeIntent({
      description: description ?? "",
      imageDataUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI intake]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "意图分析失败" },
      { status: 500 },
    );
  }
}
