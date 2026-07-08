import { NextRequest, NextResponse } from "next/server";
import { enhanceTechPack } from "@/lib/ai/assist";

export async function POST(req: NextRequest) {
  try {
    const { project } = await req.json();
    if (!project) {
      return NextResponse.json({ error: "缺少项目数据" }, { status: 400 });
    }
    const result = await enhanceTechPack(project);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI enhance]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "一键补全失败" },
      { status: 500 },
    );
  }
}
