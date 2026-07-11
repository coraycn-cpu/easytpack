import { NextRequest, NextResponse } from "next/server";
import { generateBomAssist } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateBomAssist(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI bom]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "物料清单生成失败" },
      { status: 500 },
    );
  }
}
