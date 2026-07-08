"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProject, saveProject } from "@/lib/project/storage";
import { calcProgress } from "@/lib/project/progress";
import type { BomItem, Hotspot, ProcessItem } from "@/types/process";
import type { TechPackProject } from "@/types/project";

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
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("process");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

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
  }, [id, router]);

  const persist = useCallback((updated: TechPackProject) => {
    setProject(updated);
    saveProject(updated);
  }, []);

  const handleHotspotsChange = (hotspots: Hotspot[]) => {
    if (!project) return;
    persist({ ...project, canvas_data: { hotspots } });
  };

  const handleProcessChange = (
    index: number,
    field: keyof ProcessItem,
    value: string,
  ) => {
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

  const addProcessItem = () => {
    if (!project) return;
    persist({
      ...project,
      process_items: [
        ...project.process_items,
        { part: "新部位", process: "", hotspotId: selectedHotspotId ?? undefined },
      ],
    });
  };

  const addBomItem = () => {
    if (!project) return;
    persist({
      ...project,
      bom_items: [...project.bom_items, { name: "新物料" }],
    });
  };

  const removeProcessItem = (index: number) => {
    if (!project) return;
    persist({
      ...project,
      process_items: project.process_items.filter((_, i) => i !== index),
    });
  };

  const removeBomItem = (index: number) => {
    if (!project) return;
    persist({
      ...project,
      bom_items: project.bom_items.filter((_, i) => i !== index),
    });
  };

  const handleAiAssistHotspot = async () => {
    if (!project || !selectedHotspotId) return;
    const hotspot = project.canvas_data.hotspots.find((h) => h.id === selectedHotspotId);
    if (!hotspot) return;

    setAiLoading(true);
    setAiNote(null);

    try {
      const prompt = `为「${hotspot.label}」部位生成详细工艺说明，品类：${project.intake.detectedCategory}。包含针法、缝份、工序要点。`;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageDataUrl: project.intake.imageDataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const item = data.items?.[0];
      if (!item) throw new Error("AI 未返回工艺条目");

      const existingIdx = project.process_items.findIndex(
        (p) => p.hotspotId === selectedHotspotId,
      );

      const newItem: ProcessItem = {
        part: hotspot.label,
        process: item.process,
        stitch: item.stitch,
        seam_allowance: item.seam_allowance,
        hotspotId: selectedHotspotId,
      };

      const process_items = [...project.process_items];
      if (existingIdx >= 0) {
        process_items[existingIdx] = newItem;
      } else {
        process_items.push(newItem);
      }

      persist({ ...project, process_items });
      setAiNote(`已为「${hotspot.label}」生成/更新工艺`);
    } catch (err) {
      setAiNote(err instanceof Error ? err.message : "AI 辅助失败");
    } finally {
      setAiLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        加载工作台...
      </div>
    );
  }

  const linkedProcess = selectedHotspotId
    ? project.process_items.find((p) => p.hotspotId === selectedHotspotId)
    : null;

  const progress = calcProgress(project);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-600">
              ← 新建款式
            </Link>
            <h1 className="text-lg font-semibold text-zinc-900">{project.title}</h1>
            <p className="text-xs text-zinc-500">
              {project.intake.detectedCategory} · 进度 {progress}%
            </p>
          </div>
          <Link
            href={`/project/${id}/export`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            预览 Tech Pack →
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <StyleCanvas
            hotspots={project.canvas_data.hotspots}
            onHotspotsChange={handleHotspotsChange}
            initialImageUrl={project.intake.imageDataUrl}
            selectedHotspotId={selectedHotspotId}
            onHotspotSelect={setSelectedHotspotId}
            showImport={!project.intake.imageDataUrl}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">AI 版房助手</h2>
            {selectedHotspotId ? (
              <div className="mt-3">
                <p className="text-xs text-zinc-500">
                  已选热区：
                  {project.canvas_data.hotspots.find((h) => h.id === selectedHotspotId)?.label}
                </p>
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleAiAssistHotspot}
                  className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {aiLoading ? "生成中..." : "AI 生成该部位工艺"}
                </button>
                {linkedProcess && (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700">
                    <p className="font-medium">{linkedProcess.part}</p>
                    <p className="mt-1">{linkedProcess.process}</p>
                    {linkedProcess.stitch && (
                      <p className="mt-1 text-zinc-500">针法：{linkedProcess.stitch}</p>
                    )}
                    {linkedProcess.seam_allowance && (
                      <p className="text-zinc-500">缝份：{linkedProcess.seam_allowance}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-400">
                点击画板热区，AI 可辅助生成该部位工艺
              </p>
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
                      activeTab === tab
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:bg-zinc-100"
                    }`}
                  >
                    {tab === "process" ? "工艺" : tab === "bom" ? "BOM" : "尺寸"}
                  </button>
                ))}
              </div>
              {activeTab === "process" && (
                <button
                  type="button"
                  onClick={addProcessItem}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + 添加
                </button>
              )}
              {activeTab === "bom" && (
                <button
                  type="button"
                  onClick={addBomItem}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + 添加
                </button>
              )}
            </div>

            {activeTab === "process" && (
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {project.process_items.length === 0 ? (
                  <p className="text-xs text-zinc-400">暂无工艺条目</p>
                ) : (
                  project.process_items.map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-2 text-xs ${
                        item.hotspotId === selectedHotspotId
                          ? "border-blue-300 bg-blue-50"
                          : "border-zinc-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <input
                          value={item.part}
                          onChange={(e) => handleProcessChange(i, "part", e.target.value)}
                          onClick={() => item.hotspotId && setSelectedHotspotId(item.hotspotId)}
                          className="flex-1 bg-transparent font-medium outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeProcessItem(i)}
                          className="text-zinc-300 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                      <textarea
                        value={item.process}
                        onChange={(e) => handleProcessChange(i, "process", e.target.value)}
                        rows={2}
                        placeholder="工艺描述"
                        className="mt-1 w-full resize-none bg-transparent text-zinc-600 outline-none"
                      />
                      <div className="mt-1 flex gap-2">
                        <input
                          value={item.stitch ?? ""}
                          onChange={(e) => handleProcessChange(i, "stitch", e.target.value)}
                          placeholder="针法"
                          className="flex-1 rounded border border-zinc-100 px-1.5 py-0.5 outline-none"
                        />
                        <input
                          value={item.seam_allowance ?? ""}
                          onChange={(e) =>
                            handleProcessChange(i, "seam_allowance", e.target.value)
                          }
                          placeholder="缝份"
                          className="flex-1 rounded border border-zinc-100 px-1.5 py-0.5 outline-none"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "bom" && (
              <div className="max-h-80 space-y-2 overflow-y-auto text-xs">
                {project.bom_items.length === 0 ? (
                  <p className="text-zinc-400">暂无 BOM</p>
                ) : (
                  project.bom_items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-zinc-100 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          value={item.name}
                          onChange={(e) => handleBomChange(i, "name", e.target.value)}
                          className="flex-1 bg-transparent font-medium outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeBomItem(i)}
                          className="text-zinc-300 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                      <input
                        value={item.spec ?? ""}
                        onChange={(e) => handleBomChange(i, "spec", e.target.value)}
                        placeholder="规格"
                        className="mt-1 w-full bg-transparent text-zinc-500 outline-none"
                      />
                      <div className="mt-1 flex gap-2">
                        <input
                          value={item.color ?? ""}
                          onChange={(e) => handleBomChange(i, "color", e.target.value)}
                          placeholder="颜色"
                          className="flex-1 rounded border border-zinc-100 px-1.5 py-0.5 outline-none"
                        />
                        <input
                          value={item.usage ?? ""}
                          onChange={(e) => handleBomChange(i, "usage", e.target.value)}
                          placeholder="用量"
                          className="flex-1 rounded border border-zinc-100 px-1.5 py-0.5 outline-none"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "size" && (
              <div className="max-h-80 overflow-auto text-xs">
                {project.size_chart.rows.length === 0 ? (
                  <p className="text-zinc-400">暂无尺寸表（AI 初稿未包含时可手动补充）</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-zinc-400">
                        <th className="py-1 text-left">部位</th>
                        {project.size_chart.sizes.map((s) => (
                          <th key={s} className="px-1 py-1">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {project.size_chart.rows.map((row, i) => (
                        <tr key={i} className="border-t border-zinc-50">
                          <td className="py-1">{row.part}</td>
                          {project.size_chart.sizes.map((s) => (
                            <td key={s} className="px-1 py-1">
                              {row.values[s] ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
