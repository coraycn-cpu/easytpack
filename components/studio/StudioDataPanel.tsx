"use client";

import type { ComplianceIssue } from "@/lib/project/compliance";
import CompliancePanel from "@/components/studio/CompliancePanel";
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
    <div className="flex flex-col bg-white">
      <div className="mb-3 flex gap-1 border-b border-slate-200 pb-2">
        {(["process", "bom", "size"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
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
        <div className="space-y-2">
          {project.process_items.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                value={item.part}
                onChange={(e) => {
                  const items = [...project.process_items];
                  items[i] = { ...items[i], part: e.target.value };
                  onPersist({ ...project, process_items: items });
                }}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
              />
              <textarea
                value={item.process}
                onChange={(e) => {
                  const items = [...project.process_items];
                  items[i] = { ...items[i], process: e.target.value };
                  onPersist({ ...project, process_items: items });
                }}
                rows={3}
                className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-slate-600 outline-none"
              />
            </div>
          ))}
          {project.process_items.length === 0 && (
            <p className="text-sm text-slate-400">点击顶部「一键补全」生成工艺条目</p>
          )}
        </div>
      )}

      {activeTab === "bom" && (
        <div className="space-y-2">
          {project.bom_items.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                value={item.name}
                onChange={(e) => {
                  const items = [...project.bom_items];
                  items[i] = { ...items[i], name: e.target.value };
                  onPersist({ ...project, bom_items: items });
                }}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
              />
              <input
                value={item.garmentPart ?? ""}
                onChange={(e) => {
                  const items = [...project.bom_items];
                  items[i] = { ...items[i], garmentPart: e.target.value };
                  onPersist({ ...project, bom_items: items });
                }}
                placeholder="上装/下装"
                className="mt-2 w-full bg-transparent text-sm text-slate-600 outline-none"
              />
            </div>
          ))}
          {project.bom_items.length === 0 && (
            <p className="text-sm text-slate-400">点击顶部「一键补全」生成物料清单</p>
          )}
        </div>
      )}

      {activeTab === "size" && (
        <SizeChartEditor
          chart={project.size_chart}
          onChange={(size_chart) => onPersist({ ...project, size_chart })}
          flat
        />
      )}
    </div>
  );
}

export type { Tab as StudioDataTab };
