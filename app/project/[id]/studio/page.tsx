"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProject, saveProject } from "@/lib/project/storage";
import type { ProcessItem } from "@/types/process";
import type { TechPackProject } from "@/types/project";
import type { Hotspot } from "@/types/process";

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
    if (p.status !== "studio") {
      router.replace(`/project/${id}/collect`);
      return;
    }
    setProject(p);
  }, [id, router]);

  const persist = useCallback(
    (updated: TechPackProject) => {
      setProject(updated);
      saveProject(updated);
    },
    [],
  );

  const handleHotspotsChange = (hotspots: Hotspot[]) => {
    if (!project) return;
    persist({ ...project, canvas_data: { hotspots } });
  };

  const handleProcessChange = (index: number, field: keyof ProcessItem, value: string) => {
    if (!project) return;
    const items = [...project.process_items];
    items[index] = { ...items[index], [field]: value };
    persist({ ...project, process_items: items });
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

      const newItem = {
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

  const progress = Math.min(
    100,
    Math.round(
      ((project.process_items.length > 0 ? 40 : 0) +
        (project.canvas_data.hotspots.length > 0 ? 30 : 0) +
        (project.bom_items.length > 0 ? 15 : 0) +
        (project.size_chart.rows.length > 0 ? 15 : 0)),
    ),
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-600">
              ← 新建款式
            </Link>
            <h1 className="text-lg font-semibold text-zinc-900">{project.title}</h1>
            <p className="text-xs text-zinc-500">
              {project.intake.detectedCategory} · 进度 {progress}%
            </p>
          </div>
          <div className="text-right text-xs text-zinc-400">
            画板工作台
          </div>
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
                  已选热区：{project.canvas_data.hotspots.find((h) => h.id === selectedHotspotId)?.label}
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
                    {linkedProcess.stitch && <p className="mt-1 text-zinc-500">针法：{linkedProcess.stitch}</p>}
                    {linkedProcess.seam_allowance && (
                      <p className="text-zinc-500">缝份：{linkedProcess.seam_allowance}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-400">点击画板热区，AI 可辅助生成该部位工艺</p>
            )}
            {aiNote && <p className="mt-2 text-xs text-blue-600">{aiNote}</p>}
          </div>

          <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex gap-1 border-b border-zinc-100 pb-2">
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
              <div className="space-y-3 max-h-80 overflow-y-auto">
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
                      onClick={() => item.hotspotId && setSelectedHotspotId(item.hotspotId)}
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
                        className="mt-1 w-full resize-none bg-transparent text-zinc-600 outline-none"
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "bom" && (
              <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
                {project.bom_items.length === 0 ? (
                  <p className="text-zinc-400">暂无 BOM</p>
                ) : (
                  project.bom_items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-zinc-100 p-2">
                      <p className="font-medium">{item.name}</p>
                      {item.spec && <p className="text-zinc-500">{item.spec}</p>}
                      {item.usage && <p className="text-zinc-400">用量：{item.usage}</p>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "size" && (
              <div className="max-h-80 overflow-auto text-xs">
                {project.size_chart.rows.length === 0 ? (
                  <p className="text-zinc-400">暂无尺寸表</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-zinc-400">
                        <th className="py-1 text-left">部位</th>
                        {project.size_chart.sizes.map((s) => (
                          <th key={s} className="py-1 px-1">{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {project.size_chart.rows.map((row, i) => (
                        <tr key={i} className="border-t border-zinc-50">
                          <td className="py-1">{row.part}</td>
                          {project.size_chart.sizes.map((s) => (
                            <td key={s} className="px-1 py-1">{row.values[s] ?? "—"}</td>
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
