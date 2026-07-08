"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { calcProgress } from "@/lib/project/progress";
import {
  createEmptyProject,
  fileToDataUrl,
  listProjects,
  saveProject,
} from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

export default function IntakePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<TechPackProject[]>([]);

  useEffect(() => {
    setRecentProjects(listProjects().slice(0, 5));
  }, []);

  const canSubmit = description.trim().length > 0 || imageDataUrl;

  const handleImage = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setImageDataUrl(dataUrl);
    setImagePreview(dataUrl);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, imageDataUrl }),
      });

      const intent = await res.json();
      if (!res.ok) throw new Error(intent.error || "分析失败");

      const project = createEmptyProject({
        title: intent.suggestedTitle || "未命名款式",
        intake: {
          description,
          imageDataUrl: imageDataUrl ?? undefined,
          aiIntentAnalysis: intent.summary,
          detectedCategory: intent.detectedCategory,
          detectedFeatures: intent.detectedFeatures,
          suggestedTitle: intent.suggestedTitle,
        },
      });

      project.status = "collecting";
      saveProject(project);
      router.push(`/project/${project.id}/collect`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            开始制作工艺包
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            上传款式图、描述需求，或两者结合 — AI 版房专家将帮你分析并收集必要信息
          </p>
        </div>

        <div className="flex flex-1 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {imagePreview && (
            <div className="border-b border-zinc-100 p-4">
              <img
                src={imagePreview}
                alt="款式预览"
                className="mx-auto max-h-48 rounded-lg object-contain"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col p-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述你的款式，例如：针织圆领 T 恤，袖口和下摆做双针卷边，左胸有小 logo 绣花..."
              rows={5}
              className="flex-1 resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm leading-relaxed outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  📎 上传图片
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImage(file);
                  }}
                />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageDataUrl(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-red-500"
                  >
                    移除图片
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={!canSubmit || loading}
                onClick={handleSubmit}
                className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
              >
                {loading ? "AI 分析中..." : "开始分析 →"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          支持纯文字、纯图片、或图片 + 说明文字
        </p>

        {recentProjects.length > 0 && (
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-500">最近项目</h2>
              <Link href="/projects" className="text-xs text-blue-600 hover:underline">
                查看全部 →
              </Link>
            </div>
            <ul className="space-y-2">
              {recentProjects.map((p) => {
                const href =
                  p.status === "collecting"
                    ? `/project/${p.id}/collect`
                    : p.status === "studio" || p.status === "completed"
                      ? `/project/${p.id}/studio`
                      : `/project/${p.id}/collect`;
                return (
                  <li key={p.id}>
                    <Link
                      href={href}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-blue-200"
                    >
                      <span className="font-medium text-zinc-800">{p.title}</span>
                      <span className="text-xs text-zinc-400">
                        {p.intake.detectedCategory} · {calcProgress(p)}%
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
