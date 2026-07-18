import { generateObject, streamText } from "ai";
import { ProcessListSchema, type AiProvider } from "@/types/process";

const SYSTEM_PROMPT = `你是资深服装工艺师。根据用户描述生成工艺条目。
输出必须符合 JSON Schema：每项含 part（部位）、process（工艺描述）、stitch（针法，可选）、seam_allowance（缝份，可选）。
使用中文，描述简洁专业，适合写入工艺单。`;

function resolveProvider(override?: AiProvider): AiProvider {
  if (override) return override;
  return (process.env.AI_PROVIDER as AiProvider) || "gateway";
}

function getGatewayModel(): string {
  return process.env.AI_MODEL_GATEWAY || "google/gemini-2.5-flash";
}

function getDashscopeModel(): string {
  return process.env.AI_MODEL_DASHSCOPE || "qwen-plus";
}

function getZhipuModel(): string {
  return process.env.AI_MODEL_ZHIPU || "glm-4-flash";
}

type UserContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string | URL }
    >;

function buildUserContent(prompt: string, imageUrl?: string): UserContent {
  if (!imageUrl) return prompt;

  const image = imageUrl.startsWith("data:") ? imageUrl : new URL(imageUrl);

  return [
    { type: "text", text: prompt },
    { type: "image", image },
  ];
}

async function generateViaGateway(prompt: string, imageUrl?: string) {
  const model = getGatewayModel();

  const { object } = await generateObject({
    model,
    schema: ProcessListSchema,
    instructions: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserContent(prompt, imageUrl),
      },
    ],
  });

  return { provider: "gateway" as const, model, ...object };
}

async function generateViaDashscope(prompt: string, imageUrl?: string) {
  const model = getDashscopeModel();
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 未配置");
  }

  const userContent = imageUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ]
    : prompt;

  const res = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT} 只返回 JSON，格式为 {"items":[...]}。`,
          },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`通义 API 错误 (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("通义 API 返回空内容");
  }

  const parsed = ProcessListSchema.parse(JSON.parse(content));
  return { provider: "dashscope" as const, model, ...parsed };
}

async function generateViaZhipu(prompt: string, imageUrl?: string) {
  const model = getZhipuModel();
  const apiKey = process.env.ZHIPU_API_KEY;

  if (!apiKey) {
    throw new Error("ZHIPU_API_KEY 未配置");
  }

  const userContent = imageUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ]
    : prompt;

  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT} 只返回 JSON，格式为 {"items":[...]}。`,
        },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`智谱 API 错误 (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("智谱 API 返回空内容");
  }

  const parsed = ProcessListSchema.parse(JSON.parse(content));
  return { provider: "zhipu" as const, model, ...parsed };
}

export async function generateProcessItems(
  prompt: string,
  options?: { imageUrl?: string; imageDataUrl?: string; provider?: AiProvider },
) {
  const provider = resolveProvider(options?.provider);
  const imageUrl = options?.imageUrl ?? options?.imageDataUrl;

  switch (provider) {
    case "dashscope":
      return generateViaDashscope(prompt, imageUrl);
    case "zhipu":
      return generateViaZhipu(prompt, imageUrl);
    default:
      return generateViaGateway(prompt, imageUrl);
  }
}

export async function streamDebugText(prompt: string, provider?: AiProvider) {
  const resolved = resolveProvider(provider);

  if (resolved !== "gateway") {
    throw new Error("流式输出目前仅支持 gateway provider");
  }

  return streamText({
    model: getGatewayModel(),
    instructions: SYSTEM_PROMPT,
    prompt,
  });
}

export function getAiConfigStatus() {
  return {
    provider: resolveProvider(),
    gateway: Boolean(
      process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
    ),
    dashscope: Boolean(process.env.DASHSCOPE_API_KEY),
    zhipu: Boolean(process.env.ZHIPU_API_KEY),
    models: {
      gateway: getGatewayModel(),
      gatewayImage:
        process.env.AI_MODEL_GATEWAY_IMAGE || "bfl/flux-kontext-pro",
      gatewayImageLineArt:
        process.env.AI_MODEL_GATEWAY_IMAGE_LINE_ART || "recraft/recraft-v3",
      dashscope: getDashscopeModel(),
      zhipu: getZhipuModel(),
    },
  };
}
