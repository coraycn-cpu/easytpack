"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { icon: "📷", title: "读取图片", desc: "正在识别款式轮廓与结构" },
  { icon: "🔍", title: "分析品类", desc: "判断是上衣、裙装还是套装" },
  { icon: "✨", title: "提取特征", desc: "识别领口、袖型、工艺细节" },
  { icon: "📝", title: "准备问卷", desc: "生成适合你的补充问题" },
];

const TIPS = [
  "AI 正在像版师一样「看」你的图，请稍候…",
  "图片越清晰，分析越准确",
  "你可以用大白话描述，不需要专业术语",
  "分析完成后会引导你回答几个简单问题",
];

type AiAnalysisOverlayProps = {
  imagePreview?: string | null;
  title?: string;
};

export default function AiAnalysisOverlay({
  imagePreview,
  title = "AI 正在分析你的创意",
}: AiAnalysisOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 2800);
    const tipTimer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 3500);
    const progressTimer = setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + Math.random() * 6));
    }, 1200);
    return () => {
      clearInterval(stepTimer);
      clearInterval(tipTimer);
      clearInterval(progressTimer);
    };
  }, []);

  const step = STEPS[stepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
              🤖
            </div>
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-blue-100">通常需要 15–40 秒，请耐心等待</p>
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

          <div className="flex justify-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i === stepIndex ? "bg-blue-600" : i < stepIndex ? "bg-blue-300" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">{TIPS[tipIndex]}</p>
        </div>
      </div>
    </div>
  );
}
