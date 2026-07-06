import { NextRequest, NextResponse } from "next/server";
import { streamDebugText } from "@/lib/ai/router";
import type { AiProvider } from "@/types/process";

export async function POST(req: NextRequest) {
  try {
    const { prompt, provider } = (await req.json()) as {
      prompt?: string;
      provider?: AiProvider;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt 必填" }, { status: 400 });
    }

    const result = await streamDebugText(prompt, provider);
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[AI stream]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "流式调用失败",
      },
      { status: 500 },
    );
  }
}
