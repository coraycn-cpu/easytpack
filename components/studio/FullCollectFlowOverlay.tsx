"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FULL_COLLECT_SOURCE_HINT } from "@/lib/ai/image-source-hints";
import {
  fetchFullCollectQuestionnaire,
  FULL_COLLECT_MAX_QUESTIONS,
  resolveFullCollectQuestionImage,
} from "@/lib/studio/full-collect-questions";
import { runFullTechPackAnnotation } from "@/lib/studio/run-full-annotation";
import {
  defaultSizeStandard,
  type SizeStandardInput,
} from "@/components/studio/SizeStandardFields";
import SizeStandardFields from "@/components/studio/SizeStandardFields";
import type { AiQuestion, TechPackProject } from "@/types/project";
import {
  AI_LOGIN_REQUIRED_MESSAGE,
  gateAiLogin,
} from "@/lib/ai/client-login-gate";

type Phase = "preparing" | "asking" | "size" | "drafting";

type FullCollectFlowOverlayProps = {
  project: TechPackProject;
  onProjectPatch: (project: TechPackProject) => void;
  onComplete: (project: TechPackProject, summary: string) => void;
  onError?: (message: string) => void;
};

function Shell({
  title,
  subtitle,
  imagePreview,
  imageSourceHint,
  children,
  footerTip,
  lockedTip = true,
}: {
  title: string;
  subtitle: string;
  imagePreview?: string | null;
  imageSourceHint?: string | null;
  children: React.ReactNode;
  footerTip?: string;
  lockedTip?: boolean;
}) {
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
        aria-label={title}
      >
        <div className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl">
                🤖
                <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-sm text-blue-100">{subtitle}</p>
                {imageSourceHint ? (
                  <p className="mt-1 text-xs text-blue-200/90">{imageSourceHint}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-6">
            {imagePreview ? (
              <div className="mb-5 flex justify-center">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="本次参考图"
                    className="h-28 w-28 rounded-xl object-cover shadow-lg ring-2 ring-blue-100"
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-medium text-white">
                    参考图
                  </div>
                </div>
              </div>
            ) : null}
            {children}
            {footerTip ? (
              <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
                {footerTip}
              </p>
            ) : null}
            {lockedTip ? (
              <p className="mt-2 text-center text-[10px] font-medium text-amber-600/90">
                ⚠ AI 处理中，界面已锁定，请勿重复点击
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function LoadingBody({
  icon,
  title,
  desc,
  progress,
}: {
  icon: string;
  title: string;
  desc: string;
  progress: number;
}) {
  return (
    <>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/80 p-4">
        <span className="text-2xl">{icon}</span>
        <div className="min-h-[3rem]">
          <p className="font-medium text-slate-800">{title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
        </div>
      </div>
    </>
  );
}

export default function FullCollectFlowOverlay({
  project,
  onProjectPatch,
  onComplete,
  onError,
}: FullCollectFlowOverlayProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("preparing");
  const [intro, setIntro] = useState("");
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [sizeStandard, setSizeStandard] = useState<SizeStandardInput>(() =>
    defaultSizeStandard(project.size_chart.regionStandard ?? "cn"),
  );
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    project.intake.imageDataUrl,
  );
  const [progress, setProgress] = useState(12);
  const [localError, setLocalError] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    setSizeStandard({
      regionStandard: project.size_chart.regionStandard ?? "cn",
      sampleSize:
        project.size_chart.sampleSize?.trim() ||
        defaultSizeStandard(project.size_chart.regionStandard ?? "cn").sampleSize,
    });
  }, [project.id]);

  useEffect(() => {
    if (phase !== "preparing" && phase !== "drafting") return;
    const t = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 5));
    }, 900);
    return () => clearInterval(t);
  }, [phase]);

  const fail = useCallback(
    (message: string) => {
      setLocalError(message);
      onError?.(message);
    },
    [onError],
  );

  const startDraft = useCallback(
    async (finalAnswers: Record<string, string | string[]>) => {
      if (!sizeStandard.sampleSize.trim()) {
        setPhase("size");
        setLocalError("请填写样衣基准码");
        return;
      }
      setPhase("drafting");
      setProgress(18);
      setLocalError(null);
      try {
        const sampleSize = sizeStandard.sampleSize.trim();
        const regionStandard = sizeStandard.regionStandard;
        const answersWithSize = {
          ...finalAnswers,
          size_region: regionStandard,
          sample_size: sampleSize,
        };
        const { project: annotated, summary } = await runFullTechPackAnnotation({
          project,
          answers: answersWithSize,
          regionStandard,
          sampleSize,
        });
        const updated: TechPackProject = {
          ...annotated,
          status: "studio",
          questionnaire: {
            ...annotated.questionnaire,
            answers: answersWithSize,
            isComplete: true,
          },
          ...(summary && !annotated.style_review?.trim()
            ? { style_review: `初稿说明：${summary}`.slice(0, 280) }
            : {}),
        };
        onProjectPatch(updated);
        onComplete(updated, summary);
      } catch (e) {
        fail(e instanceof Error ? e.message : "生成初稿失败");
        setPhase("asking");
      }
    },
    [fail, onComplete, onProjectPatch, project, sizeStandard],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const gate = await gateAiLogin({
          next: `/project/${project.id}/studio`,
        });
        if (!gate.ok) {
          fail(gate.message || AI_LOGIN_REQUIRED_MESSAGE);
          router.push(gate.href);
          return;
        }

        const preview = await resolveFullCollectQuestionImage(project);
        if (preview) setPreviewUrl(preview);

        let nextProject = project;
        if (
          !project.intake.aiIntentAnalysis &&
          project.intake.imageDataUrl
        ) {
          const res = await fetch("/api/ai/intake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: project.intake.description,
              imageDataUrl: project.intake.imageDataUrl,
            }),
          });
          const intent = await res.json();
          if (res.ok) {
            const { applyIntentToIntake } = await import(
              "@/lib/intake/apply-intent"
            );
            nextProject = {
              ...project,
              intake: applyIntentToIntake(project.intake, intent),
            };
            onProjectPatch(nextProject);
          }
        }

        const existing = nextProject.questionnaire.questions ?? [];
        let qs = existing.slice(0, FULL_COLLECT_MAX_QUESTIONS);
        let nextIntro = nextProject.questionnaire.intro ?? "";
        const refreshQuestions =
          qs.length === 0 || Boolean(nextProject.questionnaire.isComplete);

        if (refreshQuestions) {
          if (!nextProject.intake.aiIntentAnalysis || !nextProject.intake.detectedCategory) {
            throw new Error("缺少款式分析结果，请先完成识图");
          }
          const data = await fetchFullCollectQuestionnaire(nextProject);
          qs = data.questions;
          nextIntro = data.intro;
          nextProject = {
            ...nextProject,
            questionnaire: {
              intro: nextIntro,
              questions: qs,
              answers: {},
              isComplete: false,
            },
          };
          onProjectPatch(nextProject);
        }

        setIntro(nextIntro);
        setQuestions(qs);
        setAnswers(nextProject.questionnaire.answers ?? {});
        setProgress(100);

        if (qs.length === 0) {
          setPhase("size");
        } else {
          setPhase("asking");
          setIndex(0);
          const first = qs[0];
          const v = nextProject.questionnaire.answers?.[first.id];
          setTextDraft(typeof v === "string" ? v : "");
        }
      } catch (e) {
        fail(e instanceof Error ? e.message : "准备问题失败");
      }
    })();
  }, [fail, onProjectPatch, project, router]);

  const current = questions[index];
  const total = questions.length;

  const persistAnswer = (
    questionId: string,
    value: string | string[],
    baseAnswers = answers,
  ) => {
    const next = { ...baseAnswers, [questionId]: value };
    setAnswers(next);
    onProjectPatch({
      ...project,
      questionnaire: {
        ...project.questionnaire,
        questions,
        intro,
        answers: next,
        isComplete: false,
      },
    });
    return next;
  };

  const commitCurrentAnswer = (): Record<string, string | string[]> | null => {
    if (!current) return answers;
    if (current.type === "text") {
      const t = textDraft.trim();
      if (current.required && !t) {
        setLocalError("请填写后再继续");
        return null;
      }
      if (t) return persistAnswer(current.id, t);
      return answers;
    }
    if (current.required) {
      const ans = answers[current.id];
      if (current.type === "multi") {
        if (!ans || (ans as string[]).length === 0) {
          setLocalError("请选择后再继续");
          return null;
        }
      } else if (!ans || String(ans).trim() === "") {
        setLocalError("请选择后再继续");
        return null;
      }
    }
    return answers;
  };

  const goNext = () => {
    const nextAnswers = commitCurrentAnswer();
    if (!nextAnswers) return;
    setLocalError(null);
    if (!current || index + 1 >= total) {
      setPhase("size");
      return;
    }
    const nextIdx = index + 1;
    setIndex(nextIdx);
    const nextQ = questions[nextIdx];
    const v = nextAnswers[nextQ.id];
    setTextDraft(typeof v === "string" ? v : "");
  };

  const goPrev = () => {
    setLocalError(null);
    if (phase === "size") {
      if (total === 0) return;
      setPhase("asking");
      setIndex(total - 1);
      const q = questions[total - 1];
      const v = answers[q.id];
      setTextDraft(typeof v === "string" ? v : "");
      return;
    }
    if (index <= 0) return;
    const prevIdx = index - 1;
    setIndex(prevIdx);
    const q = questions[prevIdx];
    const v = answers[q.id];
    setTextDraft(typeof v === "string" ? v : "");
  };

  if (localError && phase === "preparing") {
    return (
      <Shell
        title="准备补充问题失败"
        subtitle="可关闭后重试「AI 一键标注」"
        imagePreview={previewUrl}
        lockedTip={false}
      >
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {localError}
        </p>
      </Shell>
    );
  }

  if (phase === "preparing") {
    return (
      <Shell
        title="AI 正在准备补充问题"
        subtitle="约 10–20 秒，请稍候"
        imagePreview={previewUrl}
        imageSourceHint={FULL_COLLECT_SOURCE_HINT}
        footerTip="问题尽量简短，方便你快速回答"
      >
        <LoadingBody
          icon="💬"
          title="梳理信息"
          desc="对照主款画板与已知描述，生成补充问题"
          progress={progress}
        />
        <div className="flex justify-center gap-2">
          <div className="h-1.5 w-8 rounded-full bg-blue-600" />
          <div className="h-1.5 w-8 rounded-full bg-slate-200" />
        </div>
      </Shell>
    );
  }

  if (phase === "drafting") {
    return (
      <Shell
        title="AI 正在生成工艺包初稿"
        subtitle="通常需要 30–60 秒，请勿关闭"
        imagePreview={previewUrl}
        imageSourceHint={FULL_COLLECT_SOURCE_HINT}
        footerTip="工艺/尺寸用主款；物料用原参考图"
      >
        <LoadingBody
          icon="⚙️"
          title="全量标注中"
          desc="工艺 · 物料 · 尺寸 · 评语"
          progress={progress}
        />
      </Shell>
    );
  }

  if (phase === "size") {
    return (
      <Shell
        title="确认尺码标准"
        subtitle="用于 AI 估算尺寸与尺寸线"
        imagePreview={previewUrl}
        imageSourceHint={FULL_COLLECT_SOURCE_HINT}
        lockedTip={false}
        footerTip={`补充问题已完成（${Math.min(total, FULL_COLLECT_MAX_QUESTIONS)}/${FULL_COLLECT_MAX_QUESTIONS}）`}
      >
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <SizeStandardFields
            compact
            value={sizeStandard}
            onChange={setSizeStandard}
          />
        </div>
        {localError ? (
          <p className="mb-3 text-center text-xs text-red-600">{localError}</p>
        ) : null}
        <div className="flex gap-2">
          {total > 0 ? (
            <button
              type="button"
              onClick={goPrev}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              上一题
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void startDraft(answers)}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            开始生成初稿
          </button>
        </div>
      </Shell>
    );
  }

  // asking
  if (!current) {
    return null;
  }

  const selected = answers[current.id];

  return (
    <Shell
      title="补充确认"
      subtitle={`第 ${index + 1} / ${total} 题（最多 ${FULL_COLLECT_MAX_QUESTIONS} 题）`}
      imagePreview={previewUrl}
      imageSourceHint={FULL_COLLECT_SOURCE_HINT}
      lockedTip={false}
      footerTip={intro || "快速点选即可，答完后生成工艺包初稿"}
    >
      <div className="mb-3 flex justify-center gap-1.5">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`h-1.5 flex-1 max-w-[2.5rem] rounded-full transition-colors ${
              i < index
                ? "bg-blue-300"
                : i === index
                  ? "bg-blue-600"
                  : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/80 p-4">
        <p className="text-sm font-medium text-slate-800">
          {current.question}
          {current.required ? <span className="text-red-500"> *</span> : null}
        </p>

        {current.type === "single" && current.options ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {current.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  persistAnswer(current.id, opt.id);
                  setLocalError(null);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  selected === opt.id
                    ? "border-blue-500 bg-white text-blue-700 shadow-sm"
                    : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}

        {current.type === "multi" && current.options ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {current.options.map((opt) => {
              const on = ((selected as string[]) ?? []).includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const cur = ((answers[current.id] as string[]) ?? []).slice();
                    const next = on
                      ? cur.filter((x) => x !== opt.id)
                      : [...cur, opt.id];
                    persistAnswer(current.id, next);
                    setLocalError(null);
                  }}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                    on
                      ? "border-blue-500 bg-white text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {current.type === "text" ? (
          <input
            value={textDraft}
            onChange={(e) => {
              setTextDraft(e.target.value);
              setLocalError(null);
            }}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            placeholder="简短回答即可"
          />
        ) : null}
      </div>

      {localError ? (
        <p className="mb-3 text-center text-xs text-red-600">{localError}</p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={goPrev}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          上一题
        </button>
        <button
          type="button"
          onClick={goNext}
          className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {index + 1 >= total ? "下一步" : "下一题"}
        </button>
      </div>
    </Shell>
  );
}
