"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AiAssistantPanel from "@/components/studio/AiAssistantPanel";
import CompliancePanel from "@/components/studio/CompliancePanel";
import GuidedSteps, { inferGuidedStep } from "@/components/studio/GuidedSteps";
import SizeChartEditor from "@/components/studio/SizeChartEditor";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import { checkCompliance, canFinalize } from "@/lib/project/compliance";
import { applyHotspotTemplate } from "@/lib/project/hotspots";
import { calcProgress, WORKFLOW_LABELS } from "@/lib/project/progress";
import { getProject, saveProject } from "@/lib/project/storage";
import type { BomItem, ProcessItem } from "@/types/process";
import type { Annotation, Artboard, TechPackProject, WorkflowStatus } from "@/types/project";

const AnnotationCanvas = dynamic(
  () => import("@/components/canvas/AnnotationCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[65vh] items-center justify-center bg-zinc-900 text-sm text-zinc-400">
        画板加载中...
      </div>
    ),
  },
);

type Tab = "process" | "bom" | "size";

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [activeArtboardId, setActiveArtboardId] = useState("");
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("process");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiTip, setAiTip] = useState<string | null>(null);

  useEffect(() => {
    const p = getProject(id);
    if (!p) {
      router.replace("/");
      return;
    }
    if (p.status !== "studio" && p.status !== "completed") {
      router.replace(`/project/${id}/collect`);
      return;
    }
    setProject(p);
    setActiveArtboardId(p.canvas_data.activeArtboardId);
    const hasAnnotations = p.canvas_data.artboards.some(
      (a) => a.annotations.length > 0,
    );
    if (!hasAnnotations) {
      setAiTip(
        "第一步：点击右侧「智能标注款式图」，AI 会在图上标出领口、袖长等关键位置；也可用工具栏手动标注",
      );
    }
  }, [id, router]);

  const activeArtboard = useMemo(
    () => project?.canvas_data.artboards.find((a) => a.id === activeArtboardId),
    [project, activeArtboardId],
  );

  const guidedStep = project ? inferGuidedStep(project) : 1;

  const persist = useCallback((updated: TechPackProject) => {
    setProject(updated);
    saveProject(updated);
  }, []);

  const updateArtboard = (artboardId: string, patch: Partial<Artboard>) => {
    if (!project) return;
    const artboards = project.canvas_data.artboards.map((a) =>
      a.id === artboardId ? { ...a, ...patch } : a,
    );
    persist({
      ...project,
      canvas_data: { ...project.canvas_data, artboards, activeArtboardId },
    });
  };

  const switchArtboard = (artboardId: string) => {
    if (!project) return;
    setActiveArtboardId(artboardId);
    setSelectedHotspotId(null);
    persist({
      ...project,
      canvas_data: { ...project.canvas_data, activeArtboardId: artboardId },
    });
  };

  const handleSmartAnnotate = async () => {
    if (!project || !activeArtboard) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/smart-annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl: activeArtboard.imageDataUrl ?? project.intake.imageDataUrl,
          processItems: project.process_items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newAnnotations: Annotation[] = (data.annotations ?? []).map(
        (a: Annotation & { label?: string }, i: number) => ({
          id: `ann_ai_${i}_${Date.now()}`,
          type: a.type,
          color: a.color ?? "#ef4444",
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          x2: a.x2,
          y2: a.y2,
          text: a.text ?? a.label,
          markerIndex: a.markerIndex,
          linkedPart: a.linkedPart,
          strokeWidth: 3,
        }),
      );

      updateArtboard(activeArtboard.id, {
        annotations: [...activeArtboard.annotations, ...newAnnotations],
      });
      setAiTip(data.userTips ?? "已在图上添加智能标注");
      setAiMessage("智能标注完成，可继续手动调整");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "标注失败");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateSize = async () => {
    if (!project) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/size-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl: project.intake.imageDataUrl,
          answers: project.questionnaire.answers,
          existingChart: project.size_chart,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      persist({
        ...project,
        size_chart: { sizes: data.sizes, rows: data.rows },
      });
      setActiveTab("size");
      setAiTip(data.plainExplanation ?? "尺码表已生成，请核对数值");
      setAiMessage("尺码表已填入，可在右侧「尺寸」标签修改");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "尺码生成失败");
    } finally {
      setAiLoading(false);
    }
  };

  const handleEnhanceAll = async () => {
    if (!project) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updated = { ...project };
      if (data.process_items?.length) {
        const existing = new Set(updated.process_items.map((p) => p.part));
        const merged = [
          ...updated.process_items,
          ...data.process_items.filter((p: ProcessItem) => !existing.has(p.part)),
        ];
        updated.process_items = merged;
      }
      if (data.bom_items?.length) {
        updated.bom_items = [...updated.bom_items, ...data.bom_items];
      }
      if (data.size_chart?.rows?.length) {
        updated.size_chart = data.size_chart;
      }
      persist(updated);
      setAiTip(data.summary);
      setAiMessage("工艺包已补全，请检查各项内容");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "补全失败");
    } finally {
      setAiLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!project) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `请用非专业人士能听懂的大白话，解释这款「${project.title}」的工艺包包含什么、版师会怎么用。3-5句话。工艺条目：${project.process_items.map((p) => p.part).join("、")}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const text = data.items?.[0]?.process ?? data.text;
      setAiTip(
        typeof text === "string"
          ? text
          : project.process_items.map((p) => `${p.part}：${p.process}`).join("\n"),
      );
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "解释失败");
    } finally {
      setAiLoading(false);
    }
  };

  if (!project || !activeArtboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载工作台...
      </div>
    );
  }

  const compliance = checkCompliance(project);
  const progress = calcProgress(project);

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/projects" className="text-xs text-zinc-400 hover:text-zinc-600">
              ← 我的项目
            </Link>
            <h1 className="text-lg font-semibold text-zinc-900">{project.title}</h1>
            <p className="text-xs text-zinc-500">
              {project.intake.detectedCategory} · {WORKFLOW_LABELS[project.workflowStatus]} ·{" "}
              {progress}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={project.workflowStatus}
              onChange={(e) => {
                const ws = e.target.value as WorkflowStatus;
                if (ws === "finalized" && !canFinalize(project)) {
                  setAiMessage("请先完善必填项（见质量检查）");
                  return;
                }
                persist({ ...project, workflowStatus: ws });
              }}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            >
              <option value="draft">草稿</option>
              <option value="in_review">待版师审核</option>
              <option value="finalized">已定稿</option>
            </select>
            <Link
              href={`/project/${id}/export`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              导出给版师 →
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-[1600px]">
          <GuidedSteps currentStep={guidedStep} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 overflow-hidden p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex gap-1">
            {project.canvas_data.artboards.map((ab) => (
              <button
                key={ab.id}
                type="button"
                onClick={() => switchArtboard(ab.id)}
                className={`rounded-t-lg px-4 py-2 text-xs font-medium ${
                  ab.id === activeArtboardId
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                }`}
              >
                {ab.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const tpl = applyHotspotTemplate(project.intake.detectedCategory);
                updateArtboard(activeArtboard.id, { hotspots: tpl });
                setAiMessage("已应用品类热区模板");
              }}
              className="ml-auto self-center text-xs text-blue-600 hover:underline"
            >
              应用热区模板
            </button>
          </div>

          <AnnotationCanvas
            imageUrl={activeArtboard.imageDataUrl ?? project.intake.imageDataUrl}
            hotspots={activeArtboard.hotspots}
            annotations={normalizeAnnotations(activeArtboard.annotations)}
            onHotspotsChange={(hotspots) => updateArtboard(activeArtboard.id, { hotspots })}
            onAnnotationsChange={(annotations) =>
              updateArtboard(activeArtboard.id, { annotations })
            }
            selectedHotspotId={selectedHotspotId}
            onHotspotSelect={setSelectedHotspotId}
            showImport
            onImageChange={(url) => updateArtboard(activeArtboard.id, { imageDataUrl: url })}
            nextMarkerIndex={activeArtboard.annotations.filter((a) => a.type === "marker").length + 1}
          />
        </div>

        <aside className="flex w-[360px] shrink-0 flex-col gap-3 overflow-y-auto">
          <AiAssistantPanel
            loading={aiLoading}
            message={aiMessage}
            tip={aiTip}
            onSmartAnnotate={handleSmartAnnotate}
            onGenerateSize={handleGenerateSize}
            onEnhanceAll={handleEnhanceAll}
            onExplain={handleExplain}
          />

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <h3 className="text-xs font-semibold text-zinc-700">质量检查</h3>
            <div className="mt-2">
              <CompliancePanel issues={compliance} />
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-3">
            <div className="mb-2 flex gap-1 border-b border-zinc-100 pb-2">
              {(["process", "bom", "size"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    activeTab === tab ? "bg-zinc-900 text-white" : "text-zinc-500"
                  }`}
                >
                  {tab === "process" ? "工艺" : tab === "bom" ? "物料" : "尺寸"}
                </button>
              ))}
            </div>

            {activeTab === "process" && (
              <div className="max-h-56 space-y-2 overflow-y-auto text-xs">
                {project.process_items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-zinc-100 p-2">
                    <input
                      value={item.part}
                      onChange={(e) => {
                        const items = [...project.process_items];
                        items[i] = { ...items[i], part: e.target.value };
                        persist({ ...project, process_items: items });
                      }}
                      className="w-full font-medium outline-none"
                    />
                    <textarea
                      value={item.process}
                      onChange={(e) => {
                        const items = [...project.process_items];
                        items[i] = { ...items[i], process: e.target.value };
                        persist({ ...project, process_items: items });
                      }}
                      rows={2}
                      className="mt-1 w-full resize-none text-zinc-600 outline-none"
                    />
                  </div>
                ))}
                {project.process_items.length === 0 && (
                  <p className="text-zinc-400">点击「一键补全」或「智能标注」开始</p>
                )}
              </div>
            )}

            {activeTab === "bom" && (
              <div className="max-h-56 space-y-2 overflow-y-auto text-xs">
                {project.bom_items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-zinc-100 p-2">
                    <input
                      value={item.name}
                      onChange={(e) => {
                        const items = [...project.bom_items];
                        items[i] = { ...items[i], name: e.target.value };
                        persist({ ...project, bom_items: items });
                      }}
                      className="w-full font-medium outline-none"
                    />
                    <input
                      value={item.garmentPart ?? ""}
                      onChange={(e) => {
                        const items = [...project.bom_items];
                        items[i] = { ...items[i], garmentPart: e.target.value };
                        persist({ ...project, bom_items: items });
                      }}
                      placeholder="上装/下装"
                      className="mt-1 w-full text-zinc-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "size" && (
              <SizeChartEditor
                chart={project.size_chart}
                onChange={(size_chart) => persist({ ...project, size_chart })}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
