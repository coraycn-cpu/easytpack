import { NextRequest } from "next/server";
import {
  chatWithAssistant,
  type ChatImageAttachment,
} from "@/lib/ai/chat";
import type { ChatProjectContext } from "@/lib/ai/chat-context";
import { buildChatProjectContext } from "@/lib/ai/chat-context";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
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
  return runMeteredAiJsonRoute(req, {
    action: "chat",
    run: async (body) => {
      const message = body.message;
      if (typeof message !== "string" || !message.trim()) {
        throw new Error("message 必填");
      }
      const project = body.project as TechPackProject | undefined;
      const context =
        (body.context as ChatProjectContext | undefined) ??
        (project ? buildChatProjectContext(project) : undefined);
      if (!context) {
        throw new Error("context 或 project 必填");
      }
      return chatWithAssistant({
        message: message.trim(),
        history: Array.isArray(body.history)
          ? (body.history as Array<{
              role: "user" | "assistant";
              content: string;
            }>)
          : [],
        context,
        images: sanitizeImages(body.images),
        imageDataUrl:
          typeof body.imageDataUrl === "string" &&
          body.imageDataUrl.startsWith("data:")
            ? body.imageDataUrl
            : undefined,
      });
    },
  });
}
