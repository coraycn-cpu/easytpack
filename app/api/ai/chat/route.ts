import { NextRequest, NextResponse } from "next/server";
import { chatWithAssistant } from "@/lib/ai/chat";
import type { TechPackProject } from "@/types/project";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, project } = body as {
      message?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      project?: TechPackProject;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "message 必填" }, { status: 400 });
    }
    if (!project) {
      return NextResponse.json({ error: "project 必填" }, { status: 400 });
    }

    const result = await chatWithAssistant({
      message: message.trim(),
      history: history ?? [],
      project,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI chat]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "对话失败" },
      { status: 500 },
    );
  }
}
