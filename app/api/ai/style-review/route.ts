import { NextRequest, NextResponse } from "next/server";
import { generateStyleReview } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateStyleReview(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI style-review]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "款式评语生成失败" },
      { status: 500 },
    );
  }
}
