import { NextRequest, NextResponse } from "next/server";
import { generateProcessItems, getAiConfigStatus } from "@/lib/ai/router";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
import type { AiProvider } from "@/types/process";

export async function GET() {
  return NextResponse.json(getAiConfigStatus());
}

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "generate",
    run: async (body) => {
      const prompt = body.prompt;
      if (typeof prompt !== "string" || !prompt.trim()) {
        throw new Error("prompt 必填");
      }
      return generateProcessItems(prompt, {
        imageUrl:
          (typeof body.imageUrl === "string" ? body.imageUrl : undefined) ??
          (typeof body.imageDataUrl === "string"
            ? body.imageDataUrl
            : undefined),
        provider: body.provider as AiProvider | undefined,
      });
    },
  });
}
