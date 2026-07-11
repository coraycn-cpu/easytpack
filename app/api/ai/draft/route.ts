import { NextRequest, NextResponse } from "next/server";
import { generateStudioDraft } from "@/lib/ai/intake";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      description,
      imageDataUrl,
      intentSummary,
      detectedCategory,
      answers,
      questions,
      regionStandard,
      sampleSize,
    } = body;

    if (!intentSummary || !detectedCategory) {
      return NextResponse.json(
        { error: "缺少必要上下文" },
        { status: 400 },
      );
    }

    const result = await generateStudioDraft({
      description: description ?? "",
      imageDataUrl,
      intentSummary,
      detectedCategory,
      answers: answers ?? {},
      questions: questions ?? [],
      regionStandard,
      sampleSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI draft]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "初稿生成失败" },
      { status: 500 },
    );
  }
}
