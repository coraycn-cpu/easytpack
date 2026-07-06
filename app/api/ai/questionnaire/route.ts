import { NextRequest, NextResponse } from "next/server";
import { generateQuestionnaire } from "@/lib/ai/intake";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      description,
      imageDataUrl,
      intentSummary,
      detectedCategory,
      detectedFeatures,
    } = body;

    if (!intentSummary || !detectedCategory) {
      return NextResponse.json(
        { error: "缺少意图分析结果" },
        { status: 400 },
      );
    }

    const result = await generateQuestionnaire({
      description: description ?? "",
      imageDataUrl,
      intentSummary,
      detectedCategory,
      detectedFeatures: detectedFeatures ?? [],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI questionnaire]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "问卷生成失败" },
      { status: 500 },
    );
  }
}
