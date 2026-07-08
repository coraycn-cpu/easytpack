"use client";

import CompliancePanel from "@/components/studio/CompliancePanel";
import SizeChartEditor from "@/components/studio/SizeChartEditor";
import type { ComplianceIssue } from "@/lib/project/compliance";
import type { TechPackProject } from "@/types/project";

type Tab = "process" | "bom" | "size";

type StudioDataPanelProps = {
  project: TechPackProject;
  compliance: ComplianceIssue[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onPersist: (project: TechPackProject) => void;
};

export default function StudioDataPanel({
  project,
  compliance,
  activeTab,
  onTabChange,
  onPersist,
}: StudioDataPanelProps) {
  return (
    <div className="flex h-full flex-col bg-white p-2">
      <div className="mb-2 shrink-0 border-b border-[#cbd5e1] pb-2">
        <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
          质量检查
        </h3>
        <CompliancePanel issues={compliance} flat />
      </div>

      <div className="mb-1 flex shrink-0 gap-0 border border-[#cbd5e1]">
        {(["process", "bom", "size"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`flex-1 px-2 py-1 text-[10px] font-medium ${
              activeTab === tab
                ? "bg-[#475569] text-white"
                : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
            }`}
          >
            {tab === "process" ? "工艺" : tab === "bom" ? "物料" : "尺寸"}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "process" && (
          <div className="space-y-1">
            {project.process_items.map((item, i) => (
              <div key={i} className="border border-[#e2e8f0] bg-[#f8fafc] p-2 text-[10px]">
                <input
                  value={item.part}
                  onChange={(e) => {
                    const items = [...project.process_items];
                    items[i] = { ...items[i], part: e.target.value };
                    onPersist({ ...project, process_items: items });
                  }}
                  className="w-full bg-transparent font-medium outline-none"
                />
                <textarea
                  value={item.process}
                  onChange={(e) => {
                    const items = [...project.process_items];
                    items[i] = { ...items[i], process: e.target.value };
                    onPersist({ ...project, process_items: items });
                  }}
                  rows={2}
                  className="mt-1 w-full resize-none bg-transparent text-[#64748b] outline-none"
                />
              </div>
            ))}
            {project.process_items.length === 0 && (
              <p className="p-2 text-[10px] text-[#94a3b8]">点击 AI 面板「一键补全」</p>
            )}
          </div>
        )}

        {activeTab === "bom" && (
          <div className="space-y-1">
            {project.bom_items.map((item, i) => (
              <div key={i} className="border border-[#e2e8f0] bg-[#f8fafc] p-2 text-[10px]">
                <input
                  value={item.name}
                  onChange={(e) => {
                    const items = [...project.bom_items];
                    items[i] = { ...items[i], name: e.target.value };
                    onPersist({ ...project, bom_items: items });
                  }}
                  className="w-full bg-transparent font-medium outline-none"
                />
                <input
                  value={item.garmentPart ?? ""}
                  onChange={(e) => {
                    const items = [...project.bom_items];
                    items[i] = { ...items[i], garmentPart: e.target.value };
                    onPersist({ ...project, bom_items: items });
                  }}
                  placeholder="上装/下装"
                  className="mt-1 w-full bg-transparent text-[#64748b] outline-none"
                />
              </div>
            ))}
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
    </div>
  );
}
