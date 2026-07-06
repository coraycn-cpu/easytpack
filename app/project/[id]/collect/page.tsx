"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { getProject, saveProject } from "@/lib/project/storage";
import type { Hotspot } from "@/types/process";
import type { AiQuestion, TechPackProject } from "@/types/project";

export default function CollectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraNote, setExtraNote] = useState("");

  useEffect(() => {
    async function init() {
      const p = getProject(id);
      if (!p) {
        router.replace("/");
        return;
      }

      if (p.questionnaire.questions.length === 0) {
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

      setProject(p);
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

  const handleSubmit = async () => {
    if (!project) return;

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

    try {
      const answers = { ...project.questionnaire.answers };
      if (extraNote.trim()) {
        answers.extra_note = extraNote.trim();
      }

      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: project.intake.description,
          imageDataUrl: project.intake.imageDataUrl,
          intentSummary: project.intake.aiIntentAnalysis,
          detectedCategory: project.intake.detectedCategory,
          answers,
          questions: [
            ...project.questionnaire.questions,
            ...(extraNote.trim()
              ? [{ id: "extra_note", question: "补充说明" }]
              : []),
          ],
        }),
      });

      const draft = await res.json();
      if (!res.ok) throw new Error(draft.error);

      const hotspots: Hotspot[] = (draft.suggestedHotspots ?? []).map(
        (hs: { label: string; x: number; y: number; width: number; height: number }, i: number) => ({
          id: `hs_ai_${i}_${Date.now()}`,
          label: hs.label,
          x: hs.x,
          y: hs.y,
          width: hs.width,
          height: hs.height,
        }),
      );

      const hotspotIdByLabel = new Map(hotspots.map((h) => [h.label, h.id]));
      const processItems = (draft.process_items ?? []).map(
        (item: { part: string; process: string; stitch?: string; seam_allowance?: string }) => ({
          ...item,
          hotspotId: hotspotIdByLabel.get(item.part),
        }),
      );

      const updated: TechPackProject = {
        ...project,
        status: "studio",
        title: project.intake.suggestedTitle ?? project.title,
        process_items: processItems,
        bom_items: draft.bom_items ?? [],
        size_chart: draft.size_chart ?? { sizes: [], rows: [] },
        canvas_data: { hotspots },
        questionnaire: {
          ...project.questionnaire,
          answers,
          isComplete: true,
        },
        intake: {
          ...project.intake,
          aiIntentAnalysis: draft.aiSummary
            ? `${project.intake.aiIntentAnalysis}\n\n初稿说明：${draft.aiSummary}`
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载问卷中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
            信息收集
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            {project.title}
          </h1>
          {project.intake.aiIntentAnalysis && (
            <p className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
              {project.intake.aiIntentAnalysis}
            </p>
          )}
        </div>

        <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6">
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
            {submitting ? "AI 生成初稿中..." : "确认，进入画板工作台 →"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}
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
