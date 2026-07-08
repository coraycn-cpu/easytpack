import { NextRequest, NextResponse } from "next/server";
import { generateSizeChartAssist } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateSizeChartAssist(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI size-chart]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "尺码表生成失败" },
      { status: 500 },
    );
  }
}
