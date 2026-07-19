import { NextRequest, NextResponse } from "next/server";
import {
  chatWithAssistant,
  type ChatImageAttachment,
} from "@/lib/ai/chat";
import type { ChatProjectContext } from "@/lib/ai/chat-context";
import { buildChatProjectContext } from "@/lib/ai/chat-context";
import type { TechPackProject } from "@/types/project";

function sanitizeImages(raw: unknown): ChatImageAttachment[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ChatImageAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as ChatImageAttachment).role;
    const dataUrl = (item as ChatImageAttachment).dataUrl;
    const label = (item as ChatImageAttachment).label;
    if (
      (role === "intake" || role === "active") &&
      typeof dataUrl === "string" &&
      dataUrl.startsWith("data:") &&
      typeof label === "string" &&
      label.trim()
    ) {
      out.push({ role, dataUrl, label: label.trim().slice(0, 80) });
    }
  }
  return out.length > 0 ? out : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, context, project, imageDataUrl, images } =
      body as {
        message?: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
        context?: ChatProjectContext;
        /** @deprecated 兼容旧客户端整包上传；优先用 context */
        project?: TechPackProject;
        imageDataUrl?: string;
        images?: unknown;
      };

    if (!message?.trim()) {
      return NextResponse.json({ error: "message 必填" }, { status: 400 });
    }

    const chatContext =
      context ??
      (project ? buildChatProjectContext(project) : undefined);

    if (!chatContext) {
      return NextResponse.json(
        { error: "context 或 project 必填" },
        { status: 400 },
      );
    }

    const result = await chatWithAssistant({
      message: message.trim(),
      history: history ?? [],
      context: chatContext,
      images: sanitizeImages(images),
      imageDataUrl:
        typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:")
          ? imageDataUrl
          : undefined,
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
