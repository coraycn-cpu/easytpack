import { generateObject } from "ai";
import { AiChatResponseSchema } from "@/types/process";
import type { TechPackProject } from "@/types/project";
import { buildGarmentScopeContext } from "@/lib/ai/garment-scope";
import { getModel } from "./assist";

type ChatMessage = { role: "user" | "assistant"; content: string };

function summarizeProject(project: TechPackProject) {
  return `
${buildGarmentScopeContext(project.intake)}

款式：${project.title}
品类：${project.intake.detectedCategory ?? "未指定"}
描述：${project.intake.description || "无"}
工艺条目：${project.process_items.map((p) => `${p.part}=${p.process}`).join("；") || "无"}
物料：${project.bom_items.map((b) => b.name).join("、") || "无"}
尺码：${project.size_chart.sizes.join("/") || "未设置"}
`.trim();
}

export async function chatWithAssistant(input: {
  message: string;
  history: ChatMessage[];
  project: TechPackProject;
}) {
  const historyText = input.history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content}`)
    .join("\n");

  const userText = `
当前工艺包：
${summarizeProject(input.project)}

对话历史：
${historyText || "（无）"}

用户最新消息：${input.message}

请用非专业人士能听懂的语言回复。若用户要求修改工艺、物料、尺码或标题，在对应字段输出更新内容。
不要删除用户已有内容，除非用户明确要求替换。
`.trim();

  const { object } = await generateObject({
    model: getModel(),
    schema: AiChatResponseSchema,
    schemaName: "ai_chat",
    instructions: `你是 EasytPack 版房 AI 助手，帮助非服装专业人士完善 Tech Pack。
你能根据对话修改工艺说明、面辅料清单、尺码表和款式标题。
回复要简洁、友好、可操作。`,
    messages: [{ role: "user", content: userText }],
  });

  return object;
}
