"use client";

import { useEffect, useState } from "react";
import {
  getAiLoadingPreset,
  type AiLoadingPresetId,
  type AiLoadingStep,
} from "@/lib/ai/loading-presets";

type AiAnalysisOverlayProps = {
  imagePreview?: string | null;
  /** @deprecated 优先使用 preset */
  title?: string;
  preset?: AiLoadingPresetId;
  steps?: AiLoadingStep[];
  tips?: string[];
  subtitle?: string;
};

export default function AiAnalysisOverlay({
  imagePreview,
  title,
  preset = "default",
  steps: stepsOverride,
  tips: tipsOverride,
  subtitle: subtitleOverride,
}: AiAnalysisOverlayProps) {
  const config = getAiLoadingPreset(preset);
  const displayTitle = title ?? config.title;
  const displaySubtitle = subtitleOverride ?? config.subtitle;
  const steps = stepsOverride ?? config.steps;
  const tips = tipsOverride ?? config.tips;

  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length);
    }, 2800);
    const tipTimer = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 3500);
    const progressTimer = setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + Math.random() * 6));
    }, 1200);
    return () => {
      clearInterval(stepTimer);
      clearInterval(tipTimer);
      clearInterval(progressTimer);
    };
  }, [steps.length, tips.length]);

  const step = steps[stepIndex];

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-[2px]"
        aria-hidden
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.preventDefault()}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label={displayTitle}
      >
        <div className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
                🤖
                <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{displayTitle}</h2>
                <p className="text-sm text-blue-100">{displaySubtitle}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {imagePreview && (
              <div className="mb-5 flex justify-center">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="分析中"
                    className="h-32 w-32 rounded-xl object-cover shadow-lg ring-2 ring-blue-100"
                  />
                  <div className="absolute inset-0 animate-pulse rounded-xl bg-blue-400/20" />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-medium text-white">
                    分析中
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/80 p-4">
              <span className="text-2xl">{step.icon}</span>
              <div className="min-h-[3rem]">
                <p className="font-medium text-slate-800">{step.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{step.desc}</p>
              </div>
            </div>

            {steps.length > 1 && (
              <div className="flex justify-center gap-2">
                {steps.map((s, i) => (
                  <div
                    key={s.title}
                    className={`h-1.5 w-8 rounded-full transition-colors ${
                      i === stepIndex ? "bg-blue-600" : i < stepIndex ? "bg-blue-300" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            )}

            <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
              {tips[tipIndex]}
            </p>
            <p className="mt-2 text-center text-[10px] font-medium text-amber-600/90">
              ⚠ AI 处理中，界面已锁定，请勿重复点击
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
