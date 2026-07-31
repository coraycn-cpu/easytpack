"use client";

import { useEffect, useRef, useState } from "react";
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
  FREE_MONTHLY_AI_GIFT,
  LOGIN_CTA_LABEL,
  REGISTER_CTA_LABEL,
  buildLoginHref,
  messageFromAiResponse,
} from "@/lib/ai/client-login-gate";
import GuestRegisterNudge from "@/components/auth/GuestRegisterNudge";
import BrandMark from "@/components/brand/BrandMark";

/** @deprecated 新建款不再区分 full；保留类型以免旧引用报错 */
export type NewStyleMode = "quick" | "full";

type NewStyleEntryCardProps = {
  variant?: "home" | "overlay";
  /** 建款完成进入画布（本卡片只做基础建款，不会带全量标注） */
  onCreated?: (projectId: string) => void;
  /** 建款后先去登录/注册（草稿已保存，登录后跑基础 AI 分析） */
  onCreatedNeedLogin?: (
    projectId: string,
    authMode: "login" | "register",
  ) => void;
};

export default function NewStyleEntryCard({
  variant = "home",
  onCreated,
  onCreatedNeedLogin,
}: NewStyleEntryCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [sizeStandard, setSizeStandard] = useState<SizeStandardInput>(
    defaultSizeStandard(),
  );
  const [loading, setLoading] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<"intake" | "default">(
    "default",
  );
  const [error, setError] = useState<string | null>(null);
  const [loginHint, setLoginHint] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  const canSubmit =
    Boolean(imageDataUrl) && sizeStandard.sampleSize.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    void isLoggedInForCloud().then((ok) => {
      if (!cancelled) setLoggedIn(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  /**
   * 建款业务规则：
   * - 已登录：必须调用 AI 基础分析（intake，非全量标注）→ 再进画布
   * - 未登录「暂不登录」：不调用 AI，带图直接进画布
   * - 未登录「先登录/注册」：先存草稿，登录后再跑基础 AI 分析
   */
  const createProject = async (opts?: {
    preferLogin?: "login" | "register";
  }) => {
    if (!canSubmit || !imageDataUrl) return;
    setLoading(true);
    setLoadingPreset("intake");
    setError(null);
    setLoginHint(null);

    try {
      const sampleSize = sizeStandard.sampleSize.trim();
      const preferLogin = opts?.preferLogin;
      const isLogged = await isLoggedInForCloud();
      setLoggedIn(isLogged);

      let intake: IntakeData = {
        description,
        imageDataUrl,
        detectedCategory: "未分类",
      };

      if (isLogged) {
        // 登录用户：基础建款分析（款式理解 / 选款引导），绝不是全量标注
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
      } else if (preferLogin) {
        // 即将去登录：草稿带标记，登录进画布后再跑同一套基础分析
        intake = { ...intake, pendingAiAnalysis: true };
      } else {
        // 未登录直接进画布：不调用 AI
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
        // 新建款一律普通画布；全量标注只由画布内「AI 一键标注」触发
        status: "studio",
      });

      if (!isLogged && preferLogin) {
        if (onCreatedNeedLogin) {
          onCreatedNeedLogin(project.id, preferLogin);
          return project;
        }
      }

      onCreated?.(project.id);
      return project;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建失败";
      const isQuota = /quota|QuotaExceeded|存储空间已满/i.test(msg);
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
  const showGuestLoginPush = Boolean(imagePreview) && !loggedIn;

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
            className="flex w-full flex-col items-center border-b border-dashed border-slate-200 bg-slate-50/80 py-10 text-slate-400 transition hover:bg-brand-soft/50 hover:text-brand"
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
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand"
            />
          </div>

          <SizeStandardFields
            value={sizeStandard}
            onChange={setSizeStandard}
            compact={isOverlay}
          />

          {showGuestLoginPush ? (
            <div className="rounded-xl border border-blue-200 bg-brand-soft/70 px-3 py-3 text-left">
              <p className="text-xs font-semibold text-blue-950">
                登录后可用 AI 基础分析
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-blue-950/80">
                已有账号可先登录，再用同一张图做基础款式分析（不是全量标注）。
                还没有账号请回首页注册。未登录也可先带图进画布手动标注。
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-1">
            {showGuestLoginPush ? (
              <>
                <button
                  type="button"
                  disabled={!canSubmit || loading}
                  onClick={() => void createProject({ preferLogin: "login" })}
                  className="pf-btn-secondary flex min-h-11 items-center justify-center py-2.5 text-sm disabled:opacity-40"
                >
                  {LOGIN_CTA_LABEL}
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || loading}
                  onClick={() => void createProject()}
                  className="pf-btn-primary py-2.5 text-sm disabled:opacity-40"
                >
                  暂不登录，带图进入画布（不调用 AI）
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!canSubmit || loading}
                onClick={() => void createProject()}
                className="pf-btn-primary py-2.5 text-sm disabled:opacity-40"
              >
                {loggedIn
                  ? "AI 理解款式并进入画布"
                  : "进入画布（可手动标注）"}
              </button>
            )}
            {!loggedIn && !showGuestLoginPush ? (
              <GuestRegisterNudge
                variant="inline"
                next="/"
                className="text-center"
              />
            ) : null}
            {loggedIn ? (
              <p className="text-center text-[10px] leading-relaxed text-slate-500">
                会先做基础款式分析（选款引导等），不会自动开全量一键标注。
              </p>
            ) : null}
          </div>

          {loginHint ? (
            <div className="space-y-2">
              <GuestRegisterNudge next="/" />
              <p className="text-center text-[10px] text-zinc-400">
                刚才已用手动方式建款进画布；注册后即可用 AI（每月{" "}
                {FREE_MONTHLY_AI_GIFT} 点）。
              </p>
            </div>
          ) : null}

          {error && (
            <div className="space-y-1.5 text-center">
              <p className="text-xs text-red-600">{error}</p>
              {/存储空间已满/.test(error) && (
                <Link
                  href="/projects"
                  className="inline-block text-[11px] font-medium text-brand hover:underline"
                >
                  打开我的项目 · 删除或清理空间 →
                </Link>
              )}
              {/注册|使用 AI|AI 额度/.test(error) && (
                <Link
                  href={buildLoginHref({ mode: "register", next: "/" })}
                  className="inline-block text-[11px] font-medium text-brand hover:underline"
                >
                  {REGISTER_CTA_LABEL} →
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
  recentProjects?: Array<{
    id: string;
    title: string;
    href: string;
    progress: number;
  }>;
}) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4">
      <div className="pointer-events-auto rounded-lg bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur">
        <BrandMark nameClassName="text-sm text-slate-800" />
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <Link
          href="/projects"
          className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur hover:text-brand"
        >
          我的项目
        </Link>
        {recentProjects && recentProjects.length > 0 && (
          <div className="max-w-[200px] rounded-lg border border-slate-200/80 bg-white/95 p-2 shadow-sm backdrop-blur">
            <p className="mb-1 text-[10px] font-medium text-slate-400">
              继续编辑
            </p>
            <ul className="space-y-0.5">
              {recentProjects.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.href}
                    className="block truncate text-[11px] text-slate-700 hover:text-brand"
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
        backgroundColor: "#f9fafb",
        backgroundImage:
          "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    />
  );
}
