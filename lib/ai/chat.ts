import { generateObject } from "ai";
import {
  summarizeChatContext,
  type ChatProjectContext,
} from "@/lib/ai/chat-context";
import { AiChatResponseSchema } from "@/types/process";
import { getModel } from "./assist";

type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatImageAttachment = {
  role: "intake" | "active";
  dataUrl: string;
  /** 给人/模型看的短标签 */
  label: string;
};

type UserContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string }
    >;

function buildContent(
  text: string,
  images: ChatImageAttachment[],
): UserContent {
  if (images.length === 0) return text;
  const parts: Array<
    { type: "text"; text: string } | { type: "image"; image: string }
  > = [{ type: "text", text }];
  for (const img of images) {
    parts.push({ type: "text", text: `\n【附图 · ${img.label}】` });
    parts.push({ type: "image", image: img.dataUrl });
  }
  return parts;
}

function describeAttachments(images: ChatImageAttachment[]): string {
  if (images.length === 0) {
    return "未附图：款式分析依据文字中的原始建款信息；工艺包文字修改依据【工艺包现状】。";
  }
  const roles = new Set(images.map((i) => i.role));
  const lines = [
    "附图说明：",
    ...images.map((i) => `- ${i.label}（role=${i.role}）`),
  ];
  if (roles.has("intake") && !roles.has("active")) {
    lines.push(
      "款式本体（面料/结构/领口袖长等）只看上传原图+原始建款信息；不要用画板名称臆造当前板画面。",
    );
  }
  if (roles.has("active")) {
    lines.push(
      "当前选中画板图仅用于讨论该板上的标注/构图/是否要标工艺或生图；不得用其重新定义本款品类与结构。款式本体仍以原图为准。",
    );
  }
  return lines.join("\n");
}

const CHAT_SYSTEM = `你是 EasytPack 版房 AI 助手，只服务「当前这一件/一套」Tech Pack 对应的服装款式。

【数据源 — 硬规则】
1. 款式本体分析（品类、结构、面料、领口/袖长做法等）：只依据「原始建款信息」与【上传原始参考图】。禁止用背面图、线稿、裁切图、AI 生成图重新定义本款。
2. 工艺包文字修改（工艺说明/BOM/尺码/标题/评语）：只依据【工艺包现状】文字字段，与画板选中无关。
3. 画布操作（标工艺、评当前板构图、生成背面/线稿等）：可依据【当前选中画板】附图与名称，用 suggested_actions 让用户确认；不要假装已执行。

【可以回答】
- 本款产品分析、面料/辅料与工艺建议（原图来源）
- 尺码与测量点建议
- 修改工艺包文字字段（结构化输出）
- 针对当前选中画板的标注/生图建议（suggested_actions）

【必须拒绝】
- 与服装、制衣、本款 Tech Pack 无关的问题
拒绝时：简短说明只能讨论本款，引导回面料/工艺/尺寸/改工艺包。不要输出修改字段。

【修改规则】
- 物料按名称合并可改规格；工艺按部位合并
- 除非用户明确要求删除，否则不删内容；删除时用 remove_process_parts / remove_bom_names
- 严格遵守目标款/套装范围；回复用大白话，简洁可操作`;

export async function chatWithAssistant(input: {
  message: string;
  history: ChatMessage[];
  context: ChatProjectContext;
  /** 按意图附带的图：intake=建款原图；active=当前选中画板 */
  images?: ChatImageAttachment[];
  /** @deprecated 等价于单张 intake */
  imageDataUrl?: string;
}) {
  const images: ChatImageAttachment[] =
    input.images && input.images.length > 0
      ? input.images
      : input.imageDataUrl
        ? [
            {
              role: "intake",
              dataUrl: input.imageDataUrl,
              label: "上传原始参考图（款式分析唯一图像来源）",
            },
          ]
        : [];

  const historyText = input.history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content}`)
    .join("\n");

  const target =
    input.context.intake.targetGarment?.label ||
    input.context.intake.suggestedTitle ||
    input.context.title;

  const userText = `
${summarizeChatContext(input.context)}

对话历史：
${historyText || "（无）"}

用户最新消息：${input.message}

${describeAttachments(images)}

先判断问题是否与「${target}」本款服装/工艺包相关：
- 相关：用大白话回答；改工艺包文字时填结构化字段。
- 无关：礼貌拒绝，不要答偏题，不要输出修改字段。
若用户需要「标工艺 / 填物料 / 填尺寸 / 一键补全 / 写评语 / 生成背面 / 生成线稿」，用 suggested_actions，不要假装已完成。
画布类建议请在 reason 里写清目标画板名称（若上下文有当前选中画板）。
`.trim();

  const { object } = await generateObject({
    model: getModel(),
    schema: AiChatResponseSchema,
    schemaName: "ai_chat",
    instructions: CHAT_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildContent(userText, images),
      },
    ],
  });

  return object;
}
