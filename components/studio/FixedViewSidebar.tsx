"use client";

import Link from "next/link";
import CompliancePanel from "@/components/studio/CompliancePanel";
import type { ComplianceIssue } from "@/lib/project/compliance";
import { VIEW_IMAGE_PRESETS, type ViewImageKind } from "@/lib/studio/view-types";
import type { WorkflowStatus } from "@/types/project";

type FixedViewSidebarProps = {
  onApplyHotspotTemplate: () => void;
  onReplaceImage: (dataUrl: string) => void;
  onGenerateView: (kind: ViewImageKind, customPrompt?: string) => void;
  viewGenerating: boolean;
  compliance: ComplianceIssue[];
  projectTitle: string;
  category?: string;
  workflowLabel: string;
  progress: number;
  workflowStatus: WorkflowStatus;
  onWorkflowChange: (status: WorkflowStatus) => void;
  exportHref: string;
};

const VIEW_BUTTONS: Array<{
  kind: ViewImageKind;
  label: string;
  icon: string;
  custom?: boolean;
}> = [
  { kind: "back", label: VIEW_IMAGE_PRESETS.back.label, icon: "↩" },
  { kind: "side", label: VIEW_IMAGE_PRESETS.side.label, icon: "↔" },
  { kind: "collar_cuff", label: VIEW_IMAGE_PRESETS.collar_cuff.label, icon: "◎" },
  { kind: "custom", label: "自定义视角", icon: "✦", custom: true },
];

export default function FixedViewSidebar({
  onApplyHotspotTemplate,
  onReplaceImage,
  onGenerateView,
  viewGenerating,
  compliance,
  projectTitle,
  category,
  workflowLabel,
  progress,
  workflowStatus,
  onWorkflowChange,
  exportHref,
}: FixedViewSidebarProps) {
  const handleViewClick = (kind: ViewImageKind, custom?: boolean) => {
    if (custom) {
      const prompt = window.prompt("描述您需要的视角（如：45°斜侧、下摆细节）");
      if (!prompt?.trim()) return;
      onGenerateView(kind, prompt.trim());
      return;
    }
    onGenerateView(kind);
  };

  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2.5">
        <p className="text-xs font-semibold text-slate-700">AI 生成款式图</p>
        <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
          生成后自动排列在画布上
        </p>
      </div>

      <div className="space-y-1.5 p-2.5">
        {VIEW_BUTTONS.map((btn) => (
          <button
            key={btn.kind}
            type="button"
            disabled={viewGenerating}
            onClick={() => handleViewClick(btn.kind, btn.custom)}
            className="flex w-full items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2 text-left text-xs font-medium text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-sm">{btn.icon}</span>
            {viewGenerating ? "生成中…" : btn.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 border-t border-slate-100 p-2.5">
        <button
          type="button"
          onClick={onApplyHotspotTemplate}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
        >
          <span>⊞</span>
          热区模板
        </button>
        <label className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
          <span>🖼</span>
          更换主图
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onReplaceImage(reader.result as string);
              reader.readAsDataURL(file);
            }}
          />
        </label>
      </div>

      <div className="mt-auto border-t border-slate-200">
        <div className="border-b border-slate-100 bg-slate-50 p-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            质量检验
          </p>
          <CompliancePanel issues={compliance} flat />
        </div>

        <div className="p-2.5">
          <Link
            href="/projects"
            className="text-[10px] text-slate-400 transition hover:text-slate-600"
          >
            ← 我的项目
          </Link>
          <h1 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
            {projectTitle}
          </h1>
          <p className="mt-1 text-[10px] text-slate-500">
            {category ?? "未分类"} · {workflowLabel} · {progress}%
          </p>

          <div className="mt-2 space-y-1.5">
            <select
              value={workflowStatus}
              onChange={(e) => onWorkflowChange(e.target.value as WorkflowStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="draft">草稿</option>
              <option value="in_review">待版师审核</option>
              <option value="finalized">已定稿</option>
            </select>
            <Link
              href={exportHref}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              导出给版师 →
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
