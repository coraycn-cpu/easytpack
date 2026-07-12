"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import type { AiProvider, ProcessItem } from "@/types/process";

type AiStatus = {
  provider: AiProvider;
  gateway: boolean;
  dashscope: boolean;
  zhipu: boolean;
  models: Record<string, string>;
};

type ViewImageStatus = {
  mode?: string;
  fallbackOrder?: string[];
  providers?: {
    siliconflow?: { configured: boolean; model: string };
    gateway?: { configured: boolean; model: string; multimodalImage: boolean };
    dashscope?: { configured: boolean; model: string };
  };
  textModel?: string;
};

const DEFAULT_PROMPT =
  "为一款针织 T 恤生成以下部位的工艺说明：领口、袖口、下摆、肩缝。包含针法和缝份。";

export default function AiDebugPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [imageUrl, setImageUrl] = useState("");
  const [provider, setProvider] = useState<AiProvider>("gateway");
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ProcessItem[]>([]);
  const [streamText, setStreamText] = useState("");
  const [meta, setMeta] = useState<{ provider?: string; model?: string } | null>(
    null,
  );
  const [viewStatus, setViewStatus] = useState<ViewImageStatus | null>(null);
  const [imagePrompt, setImagePrompt] = useState(
    "Back view flat lay of the same garment, white background, fashion e-commerce style",
  );
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageMeta, setImageMeta] = useState<{
    provider?: string;
    model?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/ai/generate")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null);
    fetch("/api/ai/view-image")
      .then((r) => r.json())
      .then(setViewStatus)
      .catch(() => null);
  }, []);

  const handleGenerate = async (overrideProvider?: AiProvider) => {
    setLoading(true);
    setError(null);
    setStreamText("");
    setItems([]);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageUrl: imageUrl || undefined,
          provider: overrideProvider ?? provider,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");

      setItems(data.items ?? []);
      setMeta({ provider: data.provider, model: data.model });
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  const handleTestViewImage = async () => {
    setImageLoading(true);
    setError(null);
    setGeneratedImage(null);
    setImageMeta(null);

    try {
      const res = await fetch("/api/ai/view-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "back",
          sourceImageUrl: imageUrl || undefined,
          category: "T恤",
          description: imagePrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生图请求失败");

      if (data.imageDataUrl) {
        setGeneratedImage(data.imageDataUrl);
        setImageMeta({ provider: data.provider, model: data.model });
      } else {
        setImageMeta({
          provider: data.provider,
          model: data.model,
          error: data.synthesisError ?? "未返回图片",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setImageLoading(false);
    }
  };

  const handleStream = async () => {
    setStreaming(true);
    setError(null);
    setStreamText("");
    setItems([]);

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider: "gateway" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "流式请求失败");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("无法读取流");

      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setStreamText(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">AI 调试台</h1>
          <p className="mt-1 text-sm text-zinc-500">
            测试工艺生成效果，支持 Vercel AI Gateway 与通义/智谱切换
          </p>
        </div>

        {status && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <StatusBadge label="Gateway" ok={status.gateway} />
            <StatusBadge label="通义" ok={status.dashscope} />
            <StatusBadge label="智谱" ok={status.zhipu} />
          </div>
        )}

        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="gateway">Vercel AI Gateway</option>
                <option value="dashscope">通义 Dashscope</option>
                <option value="zhipu">智谱 GLM</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">
                款式图 URL（可选）
              </span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://xxx.supabase.co/storage/..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">提示词</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-relaxed"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || streaming}
              onClick={() => handleGenerate()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "生成中..." : "结构化生成"}
            </button>
            <button
              type="button"
              disabled={loading || streaming}
              onClick={handleStream}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {streaming ? "流式输出中..." : "流式输出 (Gateway)"}
            </button>
            <button
              type="button"
              disabled={loading || streaming}
              onClick={() => handleGenerate("dashscope")}
              className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              对比通义
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {meta && (
          <p className="mt-4 text-xs text-zinc-400">
            provider: {meta.provider} · model: {meta.model}
          </p>
        )}

        {items.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">部位</th>
                  <th className="px-4 py-3">工艺</th>
                  <th className="px-4 py-3">针法</th>
                  <th className="px-4 py-3">缝份</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-medium">{item.part}</td>
                    <td className="px-4 py-3">{item.process}</td>
                    <td className="px-4 py-3 text-zinc-500">{item.stitch ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {item.seam_allowance ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {streamText && (
          <pre className="mt-6 overflow-auto rounded-xl border border-zinc-200 bg-zinc-900 p-4 text-sm leading-relaxed text-green-300">
            {streamText}
          </pre>
        )}

        <div className="mt-10 space-y-4 rounded-xl border border-violet-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">视角图生图测试</h2>
            <p className="mt-1 text-sm text-zinc-500">
              验证 B 区同款链路（硅基流动 / Gateway / 通义 fallback）
            </p>
          </div>

          {viewStatus && (
            <div className="flex flex-wrap gap-2 text-xs">
              {viewStatus.mode && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                  模式: {viewStatus.mode}
                  {viewStatus.fallbackOrder?.length
                    ? ` (${viewStatus.fallbackOrder.join(" → ")})`
                    : ""}
                </span>
              )}
              <StatusBadge
                label="硅基流动"
                ok={viewStatus.providers?.siliconflow?.configured ?? false}
              />
              <StatusBadge
                label="Gateway"
                ok={viewStatus.providers?.gateway?.configured ?? false}
              />
              <StatusBadge
                label="Dashscope"
                ok={viewStatus.providers?.dashscope?.configured ?? false}
              />
              {viewStatus.providers?.siliconflow?.model && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">
                  SF: {viewStatus.providers.siliconflow.model}
                </span>
              )}
              {viewStatus.providers?.gateway?.model && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">
                  GW: {viewStatus.providers.gateway.model}
                  {viewStatus.providers.gateway.multimodalImage
                    ? " (多模态)"
                    : ""}
                </span>
              )}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              参考图 URL（推荐填正面款式图，data URL 或 https 均可）
            </span>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="与上方共用，或粘贴 base64 data:image/..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">视角描述（英文更佳）</span>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-relaxed"
            />
          </label>

          <button
            type="button"
            disabled={imageLoading}
            onClick={handleTestViewImage}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {imageLoading ? "生图中（约 10–30 秒）…" : "测试生成背面图"}
          </button>

          {imageMeta && (
            <p className="text-xs text-zinc-500">
              provider: {imageMeta.provider ?? "—"} · model: {imageMeta.model ?? "—"}
              {imageMeta.error && (
                <span className="mt-1 block text-red-600">错误: {imageMeta.error}</span>
              )}
            </p>
          )}

          {generatedImage && (
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImage}
                alt="Generated view"
                className="max-h-[480px] w-full object-contain bg-zinc-100"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 ${
        ok ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-400"
      }`}
    >
      {label}: {ok ? "已配置" : "未配置"}
    </span>
  );
}
