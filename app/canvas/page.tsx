"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import type { Hotspot } from "@/types/process";

const StyleCanvas = dynamic(() => import("@/components/canvas/StyleCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
      画板加载中...
    </div>
  ),
});

export default function CanvasPage() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  const handleHotspotsChange = (next: Hotspot[]) => {
    setHotspots(next);
    if (selectedHotspot) {
      const updated = next.find((h) => h.id === selectedHotspot.id);
      setSelectedHotspot(updated ?? null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">工艺画板</h1>
          <p className="mt-1 text-sm text-zinc-500">
            导入款式图，框选部位热区，后续可关联 AI 工艺条目
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <StyleCanvas hotspots={hotspots} onHotspotsChange={handleHotspotsChange} />

          <aside className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">热区列表</h2>
            {hotspots.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-400">暂无热区</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {hotspots.map((hs) => (
                  <li key={hs.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedHotspot(hs)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selectedHotspot?.id === hs.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <input
                        value={hs.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          handleHotspotsChange(
                            hotspots.map((h) =>
                              h.id === hs.id ? { ...h, label } : h,
                            ),
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent font-medium text-zinc-800 outline-none"
                      />
                      <span className="text-xs text-zinc-400">
                        {Math.round(hs.width)} × {Math.round(hs.height)} px
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
