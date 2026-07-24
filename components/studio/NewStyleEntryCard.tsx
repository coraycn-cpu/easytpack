"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import AiAnalysisOverlay from "@/components/ui/AiAnalysisOverlay";
import SizeStandardFields, {
  defaultSizeStandard,
  type SizeStandardInput,
} from "@/components/studio/SizeStandardFields";
import { createStyleProject } from "@/lib/project/create-style";
import { applyIntentToIntake } from "@/lib/intake/apply-intent";
import { fileToDataUrl } from "@/lib/project/storage";
import { prepareImageDataUrlForStorage } from "@/lib/canvas/paste-image";
import type { IntakeData } from "@/types/project";
import { isLoggedInForCloud } from "@/lib/project/cloud-sync";
import {
  AI_LOGIN_REQUIRED_MESSAGE,
  buildLoginHref,
  messageFromAiResponse,
} from "@/lib/ai/client-login-gate";

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
  const [loginHint, setLoginHint] = useState<string | null>(null);

  const canSubmit = Boolean(imageDataUrl) && sizeStandard.sampleSize.trim().length > 0;

  const clearImage = () => {
    setImagePreview(null);
    setImageDataUrl(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openFilePicker = () => {
    if (loading) return;
    fileRef.current?.click();
  };

  const handleImage = async (file: File) => {
    setError(null);
    const raw = await fileToDataUrl(file);
    const dataUrl = await prepareImageDataUrlForStorage(raw);
    setImageDataUrl(dataUrl);
    setImagePreview(dataUrl);
  };

  const createProject = async (mode: NewStyleMode) => {
    if (!canSubmit || !imageDataUrl) return;
    setLoading(true);
    setLoadingPreset("intake");
    setError(null);
    setLoginHint(null);

    try {
      const sampleSize = sizeStandard.sampleSize.trim();
      let intake: IntakeData = {
        description,
        imageDataUrl,
        detectedCategory: "未分类",
      };

      const loggedIn = await isLoggedInForCloud();
      if (loggedIn) {
        const res = await fetch("/api/ai/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, imageDataUrl }),
        });
        const intent = await res.json();
        if (!res.ok) {
          throw new Error(messageFromAiResponse(intent, "分析失败"));
        }
        intake = applyIntentToIntake(intake, intent);
      } else {
        setLoginHint(AI_LOGIN_REQUIRED_MESSAGE);
      }

      const project = await createStyleProject({
        title:
          intake.suggestedTitle ||
          description.trim().slice(0, 40) ||
          "我的款式",
        intake,
        regionStandard: sizeStandard.regionStandard,
        sampleSize,
        // 未登录不做 AI 全量采集，直接进画布手动画
        status: mode === "full" && loggedIn ? "collecting" : "studio",
      });

      onCreated?.(project.id, loggedIn ? mode : "quick");
      return project;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建失败";
      const isQuota =
        /quota|QuotaExceeded|存储空间已满/i.test(msg);
      setError(
        isQuota
          ? "本地存储空间已满。可先到「我的项目」删除旧款，或清理缓存后重试；大图会自动压缩。"
          : msg,
      );
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
          <div className="group relative border-b border-slate-100 bg-slate-50 p-3">
            <div className="relative mx-auto max-w-full overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
              <img
                src={imagePreview}
                alt="款式预览"
                className="mx-auto max-h-44 w-full object-contain"
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/50 to-transparent px-3 pb-2.5 pt-8">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="rounded-md bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-white"
                >
                  重传
                </button>
                <button
                  type="button"
                  onClick={clearImage}
                  className="rounded-md bg-white/95 px-3 py-1 text-[11px] font-medium text-red-600 shadow-sm hover:bg-white"
                >
                  删除
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              点击「重传」更换图片，「删除」后可重新上传
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={openFilePicker}
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

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              disabled={!canSubmit || loading}
              onClick={() => createProject("quick")}
              className="rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              进入画布（可手动标注）
            </button>
            <p className="text-center text-[10px] leading-relaxed text-slate-400">
              未登录也可进画布用手动画框、写工艺/尺寸。AI
              识图、一键标注、生图，以及把稿存到云端，需要先
              <Link
                href={buildLoginHref({ mode: "register", next: "/" })}
                className="mx-0.5 text-blue-600 hover:underline"
              >
                注册/登录
              </Link>
              。
            </p>
          </div>

          {loginHint ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-[11px] leading-relaxed text-amber-800">
              {loginHint}{" "}
              <Link
                href={buildLoginHref({ mode: "register", next: "/" })}
                className="font-medium text-blue-700 underline"
              >
                去注册
              </Link>
            </p>
          ) : null}

          {error && (
            <div className="space-y-1.5 text-center">
              <p className="text-xs text-red-600">{error}</p>
              {/存储空间已满/.test(error) && (
                <Link
                  href="/projects"
                  className="inline-block text-[11px] font-medium text-blue-600 hover:underline"
                >
                  打开我的项目 · 删除或清理空间 →
                </Link>
              )}
              {/注册或登录|使用 AI/.test(error) && (
                <Link
                  href={buildLoginHref({ mode: "register", next: "/" })}
                  className="inline-block text-[11px] font-medium text-blue-600 hover:underline"
                >
                  去注册 / 登录 →
                </Link>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImage(file);
            e.target.value = "";
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
