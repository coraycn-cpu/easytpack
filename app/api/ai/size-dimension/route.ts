import { NextRequest, NextResponse } from "next/server";
import { generateSizeDimensionAssist } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateSizeDimensionAssist(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI size-dimension]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "尺寸识别失败" },
      { status: 500 },
    );
  }
}
