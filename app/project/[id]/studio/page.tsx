"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { CanvasTool } from "@/components/canvas/StyleCanvas";
import CompliancePanel from "@/components/studio/CompliancePanel";
import SizeChartEditor from "@/components/studio/SizeChartEditor";
import { checkCompliance, canFinalize } from "@/lib/project/compliance";
import { applyHotspotTemplate } from "@/lib/project/hotspots";
import { calcProgress, WORKFLOW_LABELS } from "@/lib/project/progress";
import { getProject, saveProject } from "@/lib/project/storage";
import type { BomItem, Hotspot, ProcessItem } from "@/types/process";
import type { Artboard, TechPackProject, WorkflowStatus } from "@/types/project";

const StyleCanvas = dynamic(() => import("@/components/canvas/StyleCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-xl border bg-zinc-50 text-sm text-zinc-400">
      画板加载中...
    </div>
  ),
});

type Tab = "process" | "bom" | "size";

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [activeArtboardId, setActiveArtboardId] = useState<string>("");
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("process");
  const [tool, setTool] = useState<CanvasTool>("select");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [pendingAiItem, setPendingAiItem] = useState<ProcessItem | null>(null);

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
  }, [id, router]);

  const activeArtboard = useMemo(
    () => project?.canvas_data.artboards.find((a) => a.id === activeArtboardId),
    [project, activeArtboardId],
  );

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

  const handleProcessChange = (index: number, field: keyof ProcessItem, value: string) => {
    if (!project) return;
    const items = [...project.process_items];
    items[index] = { ...items[index], [field]: value };
    persist({ ...project, process_items: items });
  };

  const handleBomChange = (index: number, field: keyof BomItem, value: string) => {
    if (!project) return;
    const items = [...project.bom_items];
    items[index] = { ...items[index], [field]: value };
    persist({ ...project, bom_items: items });
  };

  const applyTemplate = () => {
    if (!project || !activeArtboard) return;
    const tpl = applyHotspotTemplate(project.intake.detectedCategory);
    updateArtboard(activeArtboard.id, { hotspots: tpl });
    setAiNote(`已应用「${project.intake.detectedCategory}」热区模板`);
  };

  const handleAiAssistHotspot = async () => {
    if (!project || !selectedHotspotId || !activeArtboard) return;
    const hotspot = activeArtboard.hotspots.find((h) => h.id === selectedHotspotId);
    if (!hotspot) return;

    setAiLoading(true);
    setAiNote(null);
    setPendingAiItem(null);

    try {
      const prompt = `为「${hotspot.label}」部位生成详细工艺说明，品类：${project.intake.detectedCategory}，画板：${activeArtboard.name}。包含针法、缝份、工序要点。`;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageDataUrl: activeArtboard.imageDataUrl ?? project.intake.imageDataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const item = data.items?.[0];
      if (!item) throw new Error("AI 未返回工艺条目");

      setPendingAiItem({
        part: hotspot.label,
        process: item.process,
        stitch: item.stitch,
        seam_allowance: item.seam_allowance,
        hotspotId: selectedHotspotId,
      });
      setAiNote("AI 建议已生成，请采纳或拒绝");
    } catch (err) {
      setAiNote(err instanceof Error ? err.message : "AI 辅助失败");
    } finally {
      setAiLoading(false);
    }
  };

  const acceptPendingAi = () => {
    if (!project || !pendingAiItem) return;
    const existingIdx = project.process_items.findIndex(
      (p) => p.hotspotId === pendingAiItem.hotspotId,
    );
    const process_items = [...project.process_items];
    if (existingIdx >= 0) process_items[existingIdx] = pendingAiItem;
    else process_items.push(pendingAiItem);
    persist({ ...project, process_items });
    setPendingAiItem(null);
    setAiNote("已采纳 AI 工艺建议");
  };

  const setWorkflow = (workflowStatus: WorkflowStatus) => {
    if (!project) return;
    if (workflowStatus === "finalized" && !canFinalize(project)) {
      setAiNote("存在必填项未通过检查，请先完善工艺包");
      return;
    }
    persist({ ...project, workflowStatus, status: "completed" });
    setAiNote(workflowStatus === "finalized" ? "已定稿" : `状态：${WORKFLOW_LABELS[workflowStatus]}`);
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
  const linkedProcess = selectedHotspotId
    ? project.process_items.find((p) => p.hotspotId === selectedHotspotId)
    : null;

  const tools: { id: CanvasTool; label: string }[] = [
    { id: "select", label: "选择" },
    { id: "hotspot", label: "热区" },
    { id: "arrow", label: "引线" },
    { id: "label", label: "标注" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/projects" className="text-xs text-zinc-400 hover:text-zinc-600">
              ← 项目列表
            </Link>
            <h1 className="text-lg font-semibold text-zinc-900">{project.title}</h1>
            <p className="text-xs text-zinc-500">
              {project.intake.detectedCategory} · {WORKFLOW_LABELS[project.workflowStatus]} · 进度{" "}
              {progress}%
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={project.workflowStatus}
              onChange={(e) => setWorkflow(e.target.value as WorkflowStatus)}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            >
              <option value="draft">草稿</option>
              <option value="in_review">审核中</option>
              <option value="finalized">已定稿</option>
            </select>
            <Link
              href={`/project/${id}/export`}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              预览 Tech Pack →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3">
            {project.canvas_data.artboards.map((ab) => (
              <button
                key={ab.id}
                type="button"
                onClick={() => switchArtboard(ab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  ab.id === activeArtboardId
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {ab.name}
                {ab.hotspots.length > 0 && (
                  <span className="ml-1 opacity-60">({ab.hotspots.length})</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  tool === t.id ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={applyTemplate}
              className="ml-2 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
            >
              应用品类模板
            </button>
          </div>

          <StyleCanvas
            imageUrl={activeArtboard.imageDataUrl ?? project.intake.imageDataUrl}
            hotspots={activeArtboard.hotspots}
            annotations={activeArtboard.annotations}
            onHotspotsChange={(hotspots) => updateArtboard(activeArtboard.id, { hotspots })}
            onAnnotationsChange={(annotations) =>
              updateArtboard(activeArtboard.id, { annotations })
            }
            selectedHotspotId={selectedHotspotId}
            onHotspotSelect={setSelectedHotspotId}
            tool={tool}
            showImport
            onImageChange={(url) => updateArtboard(activeArtboard.id, { imageDataUrl: url })}
          />
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">质量检查</h2>
            <div className="mt-2">
              <CompliancePanel issues={compliance} />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">AI 版房助手</h2>
            {selectedHotspotId ? (
              <div className="mt-2">
                <p className="text-xs text-zinc-500">
                  {activeArtboard.hotspots.find((h) => h.id === selectedHotspotId)?.label}
                </p>
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleAiAssistHotspot}
                  className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {aiLoading ? "生成中..." : "AI 生成该部位工艺"}
                </button>
                {pendingAiItem && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs">
                    <p className="font-medium">{pendingAiItem.part}</p>
                    <p className="mt-1">{pendingAiItem.process}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={acceptPendingAi}
                        className="rounded bg-blue-600 px-2 py-1 text-white"
                      >
                        采纳
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingAiItem(null)}
                        className="rounded border px-2 py-1"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                )}
                {linkedProcess && !pendingAiItem && (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
                    <p className="font-medium">{linkedProcess.part}</p>
                    <p className="mt-1">{linkedProcess.process}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-400">选中热区后可 AI 辅助生成工艺</p>
            )}
            {aiNote && <p className="mt-2 text-xs text-blue-600">{aiNote}</p>}
          </div>

          <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex gap-1">
                {(["process", "bom", "size"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      activeTab === tab ? "bg-zinc-900 text-white" : "text-zinc-500"
                    }`}
                  >
                    {tab === "process" ? "工艺" : tab === "bom" ? "BOM" : "尺寸"}
                  </button>
                ))}
              </div>
              {activeTab === "process" && (
                <button
                  type="button"
                  onClick={() =>
                    persist({
                      ...project,
                      process_items: [
                        ...project.process_items,
                        { part: "新部位", process: "", hotspotId: selectedHotspotId ?? undefined },
                      ],
                    })
                  }
                  className="text-xs text-blue-600 hover:underline"
                >
                  + 添加
                </button>
              )}
              {activeTab === "bom" && (
                <button
                  type="button"
                  onClick={() =>
                    persist({
                      ...project,
                      bom_items: [...project.bom_items, { name: "新物料" }],
                    })
                  }
                  className="text-xs text-blue-600 hover:underline"
                >
                  + 添加
                </button>
              )}
            </div>

            {activeTab === "process" && (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {project.process_items.map((item, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-2 text-xs ${
                      item.hotspotId === selectedHotspotId ? "border-blue-300 bg-blue-50" : ""
                    }`}
                  >
                    <input
                      value={item.part}
                      onChange={(e) => handleProcessChange(i, "part", e.target.value)}
                      className="w-full bg-transparent font-medium outline-none"
                    />
                    <textarea
                      value={item.process}
                      onChange={(e) => handleProcessChange(i, "process", e.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none bg-transparent outline-none"
                    />
                    <div className="mt-1 flex gap-1">
                      <input
                        value={item.stitch ?? ""}
                        onChange={(e) => handleProcessChange(i, "stitch", e.target.value)}
                        placeholder="针法"
                        className="flex-1 rounded border border-zinc-100 px-1 py-0.5 outline-none"
                      />
                      <input
                        value={item.seam_allowance ?? ""}
                        onChange={(e) =>
                          handleProcessChange(i, "seam_allowance", e.target.value)
                        }
                        placeholder="缝份"
                        className="flex-1 rounded border border-zinc-100 px-1 py-0.5 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          persist({
                            ...project,
                            process_items: project.process_items.filter((_, j) => j !== i),
                          })
                        }
                        className="text-zinc-300 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "bom" && (
              <div className="max-h-64 space-y-2 overflow-y-auto text-xs">
                {project.bom_items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-zinc-100 p-2">
                    <input
                      value={item.name}
                      onChange={(e) => handleBomChange(i, "name", e.target.value)}
                      className="w-full bg-transparent font-medium outline-none"
                    />
                    <input
                      value={item.garmentPart ?? ""}
                      onChange={(e) => handleBomChange(i, "garmentPart", e.target.value)}
                      placeholder="部件（上装/下装）"
                      className="mt-1 w-full text-zinc-500 outline-none"
                    />
                    <div className="mt-1 flex gap-1">
                      <input
                        value={item.spec ?? ""}
                        onChange={(e) => handleBomChange(i, "spec", e.target.value)}
                        placeholder="规格"
                        className="flex-1 outline-none"
                      />
                      <input
                        value={item.usage ?? ""}
                        onChange={(e) => handleBomChange(i, "usage", e.target.value)}
                        placeholder="用量"
                        className="w-16 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          persist({
                            ...project,
                            bom_items: project.bom_items.filter((_, j) => j !== i),
                          })
                        }
                        className="text-zinc-300 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
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
