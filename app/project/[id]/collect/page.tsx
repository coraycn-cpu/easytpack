"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import AiAnalysisOverlay from "@/components/ui/AiAnalysisOverlay";
import SizeStandardFields, {
  defaultSizeStandard,
  type SizeStandardInput,
} from "@/components/studio/SizeStandardFields";
import { getProject, saveProject } from "@/lib/project/storage";
import GarmentPickerStep from "@/components/studio/GarmentPickerStep";
import {
  applyIntentToIntake,
  confirmTargetGarment,
  needsGarmentConfirmation,
  needsFlatFrontAfterGarmentPick,
  skipFlatFrontGeneration,
} from "@/lib/intake/apply-intent";
import { generateFlatFrontForPrimary } from "@/lib/studio/generate-flat-front";
import { runFullTechPackAnnotation } from "@/lib/studio/run-full-annotation";
import type { AiQuestion, TechPackProject } from "@/types/project";

export default function CollectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [initPhase, setInitPhase] = useState<"questionnaire" | "intake" | null>("questionnaire");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraNote, setExtraNote] = useState("");
  const [sizeStandard, setSizeStandard] = useState<SizeStandardInput>(defaultSizeStandard());

  useEffect(() => {
    async function init() {
      const p = getProject(id);
      if (!p) {
        router.replace("/");
        return;
      }

      if (!p.intake.aiIntentAnalysis && p.intake.imageDataUrl) {
        setInitPhase("intake");
        try {
          const res = await fetch("/api/ai/intake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: p.intake.description,
              imageDataUrl: p.intake.imageDataUrl,
            }),
          });
          const intent = await res.json();
          if (res.ok) {
            p.intake = applyIntentToIntake(p.intake, intent);
            saveProject(p);
          }
        } catch {
          /* 非阻断 */
        }
        setInitPhase("questionnaire");
      }

      if (
        p.questionnaire.questions.length === 0 &&
        !needsGarmentConfirmation(p.intake)
      ) {
        setInitPhase("questionnaire");
        try {
          const res = await fetch("/api/ai/questionnaire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: p.intake.description,
              imageDataUrl: p.intake.imageDataUrl,
              intentSummary: p.intake.aiIntentAnalysis,
              detectedCategory: p.intake.detectedCategory,
              detectedFeatures: p.intake.detectedFeatures,
              intake: p.intake,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          p.questionnaire = {
            intro: data.intro,
            questions: data.questions,
            answers: {},
            isComplete: false,
          };
          saveProject(p);
        } catch (err) {
          setError(err instanceof Error ? err.message : "问卷加载失败");
        }
      }

      setSizeStandard({
        regionStandard: p.size_chart.regionStandard ?? "cn",
        sampleSize: p.size_chart.sampleSize ?? defaultSizeStandard().sampleSize,
      });
      setProject(p);
      setInitPhase(null);
      setLoading(false);
    }

    init();
  }, [id, router]);

  const setAnswer = (questionId: string, value: string | string[]) => {
    if (!project) return;
    const updated = {
      ...project,
      questionnaire: {
        ...project.questionnaire,
        answers: { ...project.questionnaire.answers, [questionId]: value },
      },
    };
    setProject(updated);
    saveProject(updated);
  };

  const toggleMulti = (questionId: string, optionId: string) => {
    if (!project) return;
    const current = (project.questionnaire.answers[questionId] as string[]) ?? [];
    const next = current.includes(optionId)
      ? current.filter((v) => v !== optionId)
      : [...current, optionId];
    setAnswer(questionId, next);
  };

  const handleGarmentConfirm = async (
    garment: Parameters<typeof confirmTargetGarment>[1],
    options?: { skipFlatFront?: boolean },
  ) => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      let updated: TechPackProject = {
        ...project,
        title: garment.label,
        intake: confirmTargetGarment(project.intake, garment),
      };
      saveProject(updated);
      setProject(updated);

      if (options?.skipFlatFront) {
        updated = {
          ...updated,
          intake: skipFlatFrontGeneration(updated.intake),
        };
        saveProject(updated);
        setProject(updated);
      } else if (needsFlatFrontAfterGarmentPick(updated.intake)) {
        setInitPhase("intake");
        const flatResult = await generateFlatFrontForPrimary(updated);
        updated = flatResult.project;
        saveProject(updated);
        setProject(updated);
      }

      if (updated.questionnaire.questions.length === 0) {
        setInitPhase("questionnaire");
        const res = await fetch("/api/ai/questionnaire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: updated.intake.description,
            imageDataUrl: updated.intake.imageDataUrl,
            intentSummary: updated.intake.aiIntentAnalysis,
            detectedCategory: updated.intake.detectedCategory,
            detectedFeatures: updated.intake.detectedFeatures,
            intake: updated.intake,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        updated.questionnaire = {
          intro: data.intro,
          questions: data.questions,
          answers: {},
          isComplete: false,
        };
        saveProject(updated);
        setProject({ ...updated });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载问卷失败");
    } finally {
      setLoading(false);
      setInitPhase(null);
    }
  };

  const handleSubmit = async () => {
    if (!project) return;

    if (!sizeStandard.sampleSize.trim()) {
      setError("请填写样衣基准码");
      return;
    }

    const missing = project.questionnaire.questions.filter((q) => {
      if (!q.required) return false;
      const ans = project.questionnaire.answers[q.id];
      if (q.type === "multi") return !ans || (ans as string[]).length === 0;
      return !ans || (ans as string).trim() === "";
    });

    if (missing.length > 0) {
      setError(`请完成必填项：${missing.map((q) => q.question).join("、")}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    const sampleSize = sizeStandard.sampleSize.trim();
    const regionStandard = sizeStandard.regionStandard;

    try {
      const answers = { ...project.questionnaire.answers };
      if (extraNote.trim()) {
        answers.extra_note = extraNote.trim();
      }
      answers.size_region = regionStandard;
      answers.sample_size = sampleSize;

      const { project: annotated, summary } = await runFullTechPackAnnotation({
        project,
        answers,
        regionStandard,
        sampleSize,
      });

      const updated: TechPackProject = {
        ...annotated,
        status: "studio",
        title: project.intake.suggestedTitle ?? project.title,
        questionnaire: {
          ...project.questionnaire,
          answers,
          isComplete: true,
        },
        intake: {
          ...annotated.intake,
          aiIntentAnalysis: summary
            ? `${project.intake.aiIntentAnalysis ?? ""}\n\n初稿说明：${summary}`.trim()
            : project.intake.aiIntentAnalysis,
        },
      };

      saveProject(updated);
      router.push(`/project/${id}/studio`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成初稿失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !project) {
    return (
      <>
        <AiAnalysisOverlay
          preset={initPhase === "intake" ? "intake" : "questionnaire"}
          imagePreview={undefined}
        />
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          加载中…
        </div>
      </>
    );
  }

  const formLocked = submitting;
  const awaitingGarment = needsGarmentConfirmation(project.intake);

  return (
    <div className="min-h-screen bg-zinc-50">
      {submitting && (
        <AiAnalysisOverlay
          preset="draft"
          imagePreview={project.intake.imageDataUrl}
        />
      )}
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium text-blue-600">全功能 AI 标注 · 补充信息</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{project.title}</h1>
          {project.intake.aiIntentAnalysis && !awaitingGarment && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs font-medium text-blue-800">AI 理解你的创意：</p>
              <p className="mt-1 text-sm leading-relaxed text-blue-900">
                {project.intake.aiIntentAnalysis}
              </p>
            </div>
          )}
        </div>

        {awaitingGarment ? (
          <GarmentPickerStep
            intake={project.intake}
            imagePreview={project.intake.imageDataUrl}
            onConfirm={handleGarmentConfirm}
            flatFrontLoading={loading && initPhase === "intake"}
          />
        ) : (
        <div
          className={`space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 ${
            formLocked ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <fieldset className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <legend className="px-1 text-sm font-medium text-zinc-800">
              尺码标准 <span className="text-red-500">*</span>
            </legend>
            <p className="mb-3 text-[11px] text-slate-500">
              用于 AI 解析测量点并按基准码估算尺寸，跳码功能后续完善
            </p>
            <SizeStandardFields value={sizeStandard} onChange={setSizeStandard} />
          </fieldset>

          {project.questionnaire.intro && (
            <p className="text-sm text-zinc-600">{project.questionnaire.intro}</p>
          )}

          {project.questionnaire.questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={project.questionnaire.answers[q.id]}
              onSingle={(v) => setAnswer(q.id, v)}
              onMultiToggle={(optId) => toggleMulti(q.id, optId)}
              onText={(v) => setAnswer(q.id, v)}
            />
          ))}

          <label className="block text-sm">
            <span className="mb-2 block font-medium text-zinc-700">
              还有什么要补充？（可选）
            </span>
            <textarea
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              rows={3}
              placeholder="例如：客户要求用进口线、侧缝做包缝..."
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {submitting ? "AI 正在生成工艺包初稿..." : "确认，进入画板 →"}
          </button>
        </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
      </main>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onSingle,
  onMultiToggle,
  onText,
}: {
  question: AiQuestion;
  value?: string | string[];
  onSingle: (v: string) => void;
  onMultiToggle: (optId: string) => void;
  onText: (v: string) => void;
}) {
  return (
    <fieldset className="text-sm">
      <legend className="mb-2 font-medium text-zinc-800">
        {question.question}
        {question.required && <span className="text-red-500"> *</span>}
      </legend>

      {question.type === "single" && question.options && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSingle(opt.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                value === opt.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {question.type === "multi" && question.options && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => {
            const selected = ((value as string[]) ?? []).includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onMultiToggle(opt.id)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "text" && (
        <input
          value={(value as string) ?? ""}
          onChange={(e) => onText(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2"
        />
      )}
    </fieldset>
  );
}
