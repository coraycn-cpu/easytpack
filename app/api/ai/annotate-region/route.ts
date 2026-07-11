import { NextRequest, NextResponse } from "next/server";
import { generateRegionAnnotate } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateRegionAnnotate(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI annotate-region]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "区域工艺识别失败" },
      { status: 500 },
    );
  }
}
