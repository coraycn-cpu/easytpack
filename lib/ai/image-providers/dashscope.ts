import type { SynthesizeViewImageOptions, SynthesizeViewImageResult } from "./types";

export function isDashscopeImageConfigured(): boolean {
  return Boolean(process.env.DASHSCOPE_API_KEY);
}

/** 通义万相文生图（纯文生图，无参考图，作最后兜底） */
export async function synthesizeViaDashscope(
  options: SynthesizeViewImageOptions,
): Promise<SynthesizeViewImageResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return { imageDataUrl: null, error: "未配置 DASHSCOPE_API_KEY" };
  }

  const model = "wanx-v1";

  try {
    const createRes = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable",
        },
        body: JSON.stringify({
          model,
          input: { prompt: options.prompt },
          parameters: { size: "768*1024", n: 1 },
        }),
      },
    );

    if (!createRes.ok) {
      const err = await createRes.text();
      return {
        imageDataUrl: null,
        provider: "dashscope",
        model,
        error: `通义万相请求失败 (${createRes.status}): ${err.slice(0, 200)}`,
      };
    }

    const createData = await createRes.json();
    const taskId = createData.output?.task_id as string | undefined;
    if (!taskId) {
      return {
        imageDataUrl: null,
        provider: "dashscope",
        model,
        error: "通义万相未返回 task_id",
      };
    }

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();
      const status = pollData.output?.task_status;
      if (status === "SUCCEEDED") {
        const url = pollData.output?.results?.[0]?.url as string | undefined;
        if (!url) {
          return {
            imageDataUrl: null,
            provider: "dashscope",
            model,
            error: "通义万相任务成功但未返回图片 URL",
          };
        }
        const imgRes = await fetch(url);
        if (!imgRes.ok) {
          return {
            imageDataUrl: null,
            provider: "dashscope",
            model,
            error: "下载通义万相图片失败",
          };
        }
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const mime = imgRes.headers.get("content-type") ?? "image/png";
        return {
          imageDataUrl: `data:${mime};base64,${buf.toString("base64")}`,
          provider: "dashscope",
          model,
        };
      }
      if (status === "FAILED") {
        return {
          imageDataUrl: null,
          provider: "dashscope",
          model,
          error: "通义万相生图任务失败",
        };
      }
    }

    return {
      imageDataUrl: null,
      provider: "dashscope",
      model,
      error: "通义万相生图超时",
    };
  } catch (e) {
    return {
      imageDataUrl: null,
      provider: "dashscope",
      model,
      error: e instanceof Error ? e.message : "通义万相生图失败",
    };
  }
}
