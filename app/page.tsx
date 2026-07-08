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
        title: intent.suggestedTitle || "我的创意款式",
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium text-blue-600">不用懂服装，也能做出专业工艺包</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            一张图，交给 AI 和版师
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
            你是业务员、爱好者还是设计师都行 — 上传灵感图或描述想法，AI 帮你整理成版师和工厂能看懂的
            Tech Pack
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
          {imagePreview ? (
            <div className="border-b border-slate-100 bg-slate-50 p-4">
              <img
                src={imagePreview}
                alt="预览"
                className="mx-auto max-h-56 rounded-lg object-contain shadow-sm"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center border-b border-dashed border-slate-200 bg-slate-50/50 py-12 text-slate-400 transition hover:bg-blue-50/50 hover:text-blue-600"
            >
              <span className="text-4xl">📷</span>
              <span className="mt-2 text-sm font-medium">点击上传款式图（推荐）</span>
              <span className="mt-1 text-xs">手绘稿、网购截图、灵感拼贴都可以</span>
            </button>
          )}

          <div className="p-5">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              用你自己的话描述这个款式（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：想做一件休闲马甲配短裤的套装，夏天穿，胸口有扣子，面料要舒服一点..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {imagePreview && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-slate-500 hover:text-blue-600"
                    >
                      换一张图
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageDataUrl(null);
                      }}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      移除
                    </button>
                  </>
                )}
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
              </div>
              <button
                type="button"
                disabled={!canSubmit || loading}
                onClick={handleSubmit}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40"
              >
                {loading ? "AI 正在理解你的创意..." : "开始制作 →"}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "🎨", title: "爱好者", desc: "有想法不会画工艺单" },
            { icon: "💼", title: "业务员", desc: "快速给客户提供方案" },
            { icon: "✏️", title: "设计师", desc: "加速初稿到工艺包" },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-100 bg-white/80 p-4 text-center"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="mt-2 text-sm font-medium text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>

        {recentProjects.length > 0 && (
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-500">继续未完成的项目</h2>
              <Link href="/projects" className="text-xs text-blue-600 hover:underline">
                全部项目
              </Link>
            </div>
            <ul className="space-y-2">
              {recentProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={
                      p.status === "collecting"
                        ? `/project/${p.id}/collect`
                        : `/project/${p.id}/studio`
                    }
                    className="flex justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-blue-200"
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="text-xs text-slate-400">{calcProgress(p)}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
