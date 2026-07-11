import { NextRequest, NextResponse } from "next/server";
import { generateBatchAnnotations } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateBatchAnnotations(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI annotate-batch]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "一键标注失败" },
      { status: 500 },
    );
  }
}
