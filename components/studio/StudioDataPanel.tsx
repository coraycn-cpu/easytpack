"use client";

import SizeChartEditor from "@/components/studio/SizeChartEditor";
import type { TechPackProject } from "@/types/project";

type Tab = "process" | "bom" | "size";

type StudioDataPanelProps = {
  project: TechPackProject;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onPersist: (project: TechPackProject) => void;
};

export default function StudioDataPanel({
  project,
  activeTab,
  onTabChange,
  onPersist,
}: StudioDataPanelProps) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex shrink-0 gap-0.5">
        {(["process", "bom", "size"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`rounded px-2 py-1 text-[11px] font-medium transition ${
              activeTab === tab
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab === "process" ? "工艺" : tab === "bom" ? "物料" : "尺寸"}
          </button>
        ))}
      </div>

      {activeTab === "process" && (
        <div className="space-y-1">
          {project.process_items.map((item, i) => (
            <div key={i} className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
              <input
                value={item.part}
                onChange={(e) => {
                  const items = [...project.process_items];
                  items[i] = { ...items[i], part: e.target.value };
                  onPersist({ ...project, process_items: items });
                }}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none"
              />
              <textarea
                value={item.process}
                onChange={(e) => {
                  const items = [...project.process_items];
                  items[i] = { ...items[i], process: e.target.value };
                  onPersist({ ...project, process_items: items });
                }}
                rows={2}
                className="mt-0.5 w-full resize-none bg-transparent text-[11px] leading-snug text-slate-600 outline-none"
              />
            </div>
          ))}
          {project.process_items.length === 0 && (
            <p className="text-[11px] text-slate-400">点击顶部「一键补全」生成工艺条目</p>
          )}
        </div>
      )}

      {activeTab === "bom" && (
        <div className="space-y-1">
          {project.bom_items.map((item, i) => (
            <div key={i} className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
              <input
                value={item.name}
                onChange={(e) => {
                  const items = [...project.bom_items];
                  items[i] = { ...items[i], name: e.target.value };
                  onPersist({ ...project, bom_items: items });
                }}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none"
              />
              <input
                value={item.garmentPart ?? ""}
                onChange={(e) => {
                  const items = [...project.bom_items];
                  items[i] = { ...items[i], garmentPart: e.target.value };
                  onPersist({ ...project, bom_items: items });
                }}
                placeholder="上装/下装"
                className="mt-0.5 w-full bg-transparent text-[11px] text-slate-600 outline-none"
              />
            </div>
          ))}
          {project.bom_items.length === 0 && (
            <p className="text-[11px] text-slate-400">点击顶部「一键补全」生成物料清单</p>
          )}
        </div>
      )}

      {activeTab === "size" && (
        <SizeChartEditor
          chart={project.size_chart}
          onChange={(size_chart) => onPersist({ ...project, size_chart })}
          compact
          flat
        />
      )}
    </div>
  );
}

export type { Tab as StudioDataTab };
