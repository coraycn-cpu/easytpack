import { NextRequest, NextResponse } from "next/server";
import { generateProcessItems, getAiConfigStatus } from "@/lib/ai/router";
import type { AiProvider } from "@/types/process";

export async function GET() {
  return NextResponse.json(getAiConfigStatus());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, imageUrl, imageDataUrl, provider } = body as {
      prompt?: string;
      imageUrl?: string;
      imageDataUrl?: string;
      provider?: AiProvider;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt 必填" }, { status: 400 });
    }

    const result = await generateProcessItems(prompt, {
      imageUrl: imageUrl ?? imageDataUrl,
      provider,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI generate]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI 调用失败",
      },
      { status: 500 },
    );
  }
}
