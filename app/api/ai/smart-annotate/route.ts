import { NextRequest, NextResponse } from "next/server";
import { generateSmartAnnotations } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateSmartAnnotations(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI smart-annotate]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "智能标注失败" },
      { status: 500 },
    );
  }
}
