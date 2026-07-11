import { NextRequest, NextResponse } from "next/server";
import { generateBatchSizeDimensions } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
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
