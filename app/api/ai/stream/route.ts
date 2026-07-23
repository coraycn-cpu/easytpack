import { NextRequest, NextResponse } from "next/server";
import { streamDebugText } from "@/lib/ai/router";
import { meterAiCallServer } from "@/lib/ai/metering";
import {
  assertWithinAiQuota,
  persistCloudAiUsage,
} from "@/lib/ai/quota";
import type { AiProvider } from "@/types/process";

export async function POST(req: NextRequest) {
  const quota = await assertWithinAiQuota(1);
  if (!quota.ok) return quota.response;

  try {
    const { prompt, provider } = (await req.json()) as {
      prompt?: string;
      provider?: AiProvider;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt 必填" }, { status: 400 });
    }

    const result = await streamDebugText(prompt, provider);
    meterAiCallServer({ action: "other", ok: true });
    await persistCloudAiUsage({
      userId: quota.userId,
      action: "other",
      ok: true,
    });
    const res = result.toTextStreamResponse();
    res.headers.set("x-ai-action", "stream");
    return res;
  } catch (error) {
    console.error("[AI stream]", error);
    const message =
      error instanceof Error ? error.message : "流式调用失败";
    meterAiCallServer({ action: "other", ok: false, error: message });
    await persistCloudAiUsage({
      userId: quota.userId,
      action: "other",
      ok: false,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
