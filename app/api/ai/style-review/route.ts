import { NextRequest, NextResponse } from "next/server";
import { generateStyleReview } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateStyleReview(body);
    const review = typeof result.review === "string" ? result.review.trim() : "";
    if (review.length < 20) {
      return NextResponse.json({ error: "AI 未返回有效评语，请重试" }, { status: 502 });
    }
    return NextResponse.json({ review: review.slice(0, 300) });
  } catch (error) {
    console.error("[AI style-review]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "款式评语生成失败" },
      { status: 500 },
    );
  }
}
