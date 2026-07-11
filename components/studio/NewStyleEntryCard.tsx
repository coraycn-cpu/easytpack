"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import AiAnalysisOverlay from "@/components/ui/AiAnalysisOverlay";
import SizeStandardFields, {
  defaultSizeStandard,
  type SizeStandardInput,
} from "@/components/studio/SizeStandardFields";
import { createStyleProject } from "@/lib/project/create-style";
import { fileToDataUrl } from "@/lib/project/storage";
import type { IntakeData } from "@/types/project";

export type NewStyleMode = "quick" | "full";

type NewStyleEntryCardProps = {
  variant?: "home" | "overlay";
  onCreated?: (projectId: string, mode: NewStyleMode) => void;
};

export default function NewStyleEntryCard({
  variant = "home",
  onCreated,
}: NewStyleEntryCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [sizeStandard, setSizeStandard] = useState<SizeStandardInput>(defaultSizeStandard());
  const [loading, setLoading] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<"intake" | "default">("default");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(imageDataUrl) && sizeStandard.sampleSize.trim().length > 0;

  const handleImage = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setImageDataUrl(dataUrl);
    setImagePreview(dataUrl);
  };

  const createProject = async (mode: NewStyleMode) => {
    if (!canSubmit || !imageDataUrl) return;
    setLoading(true);
    setLoadingPreset(mode === "full" ? "intake" : "default");
    setError(null);

    try {
      const sampleSize = sizeStandard.sampleSize.trim();
      let intake: IntakeData = {
        description,
        imageDataUrl,
        detectedCategory: "未分类",
      };

      if (mode === "full") {
        const res = await fetch("/api/ai/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, imageDataUrl }),
        });
        const intent = await res.json();
        if (!res.ok) throw new Error(intent.error || "分析失败");
        intake = {
          description,
          imageDataUrl,
          aiIntentAnalysis: intent.summary,
          detectedCategory: intent.detectedCategory,
          detectedFeatures: intent.detectedFeatures,
          suggestedTitle: intent.suggestedTitle,
        };
      }

      const project = createStyleProject({
        title:
          intake.suggestedTitle ||
          description.trim().slice(0, 40) ||
          "我的款式",
        intake,
        regionStandard: sizeStandard.regionStandard,
        sampleSize,
        status: mode === "full" ? "collecting" : "studio",
      });

      onCreated?.(project.id, mode);
      return project;
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const isOverlay = variant === "overlay";

  return (
    <>
      {loading && (
        <AiAnalysisOverlay preset={loadingPreset} imagePreview={imagePreview} />
      )}
      <div
        className={`w-full rounded-2xl border bg-white shadow-xl ${
          loading ? "pointer-events-none opacity-60" : ""
        } ${
          isOverlay ? "max-w-md border-slate-200" : "max-w-lg border-slate-200/80"
        }`}
      >
        {imagePreview ? (
          <div className="border-b border-slate-100 bg-slate-50 p-3">
            <img
              src={imagePreview}
              alt="款式预览"
              className="mx-auto max-h-40 rounded-lg object-contain"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center border-b border-dashed border-slate-200 bg-slate-50/80 py-10 text-slate-400 transition hover:bg-blue-50/50 hover:text-blue-600"
          >
            <span className="text-3xl">📷</span>
            <span className="mt-2 text-sm font-medium">上传款式图</span>
            <span className="mt-0.5 text-[11px]">手绘稿、参考图、灵感拼贴均可</span>
          </button>
        )}

        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              款式描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="例如：夏季休闲马甲，胸口有扣..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
            />
          </div>

          <SizeStandardFields value={sizeStandard} onChange={setSizeStandard} compact={isOverlay} />

          {imagePreview && (
            <div className="flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-slate-500 hover:text-blue-600"
              >
                换图
              </button>
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setImageDataUrl(null);
                }}
                className="text-slate-400 hover:text-red-500"
              >
                移除
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              disabled={!canSubmit || loading}
              onClick={() => createProject("quick")}
              className="rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              进入画布
            </button>
            <button
              type="button"
              disabled={!canSubmit || loading}
              onClick={() => createProject("full")}
              className="rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              全功能 AI 标注
            </button>
            <p className="text-center text-[10px] leading-relaxed text-slate-400">
              进入画布：手动 + 按需 AI · 全功能标注：问卷 + 工艺/BOM/标注/尺寸一键生成
            </p>
          </div>

          {error && <p className="text-center text-xs text-red-600">{error}</p>}
        </div>

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
    </>
  );
}

export function CanvasHubChrome({
  recentProjects,
}: {
  recentProjects?: Array<{ id: string; title: string; href: string; progress: number }>;
}) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
      <Link
        href="/"
        className="pointer-events-auto rounded-lg bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur"
      >
        EasytPack
      </Link>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <Link
          href="/projects"
          className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur hover:text-blue-600"
        >
          我的项目
        </Link>
        {recentProjects && recentProjects.length > 0 && (
          <div className="max-w-[200px] rounded-lg border border-slate-200/80 bg-white/95 p-2 shadow-sm backdrop-blur">
            <p className="mb-1 text-[10px] font-medium text-slate-400">继续编辑</p>
            <ul className="space-y-0.5">
              {recentProjects.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.href}
                    className="block truncate text-[11px] text-slate-700 hover:text-blue-600"
                  >
                    {p.title}
                    <span className="ml-1 text-slate-400">{p.progress}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}

export function CanvasGridBackground() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: "#ececec",
        backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    />
  );
}
