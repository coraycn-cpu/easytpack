"use client";

import Link from "next/link";
import type { WorkflowStatus } from "@/types/project";

type FixedViewSidebarProps = {
  artboards: Array<{ id: string; name: string }>;
  activeArtboardId: string;
  onSwitchArtboard: (id: string) => void;
  onApplyHotspotTemplate: () => void;
  onReplaceImage: (dataUrl: string) => void;
  projectTitle: string;
  category?: string;
  workflowLabel: string;
  progress: number;
  workflowStatus: WorkflowStatus;
  onWorkflowChange: (status: WorkflowStatus) => void;
  exportHref: string;
};

export default function FixedViewSidebar({
  artboards,
  activeArtboardId,
  onSwitchArtboard,
  onApplyHotspotTemplate,
  onReplaceImage,
  projectTitle,
  category,
  workflowLabel,
  progress,
  workflowStatus,
  onWorkflowChange,
  exportHref,
}: FixedViewSidebarProps) {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">画板视图</p>
        <p className="mt-0.5 text-[10px] text-slate-400">切换正面 / 背面 / 细节</p>
      </div>

      <div className="space-y-1 p-3">
        {artboards.map((ab) => {
          const active = ab.id === activeArtboardId;
          return (
            <button
              key={ab.id}
              type="button"
              onClick={() => onSwitchArtboard(ab.id)}
              className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {ab.name}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onApplyHotspotTemplate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
        >
          <span>⊞</span>
          应用热区模板
        </button>
        <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
          <span>🖼</span>
          更换图片
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

      <div className="mt-auto border-t border-slate-200 bg-slate-50 p-3">
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

        <div className="mt-3 space-y-2">
          <select
            value={workflowStatus}
            onChange={(e) => onWorkflowChange(e.target.value as WorkflowStatus)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          >
            <option value="draft">草稿</option>
            <option value="in_review">待版师审核</option>
            <option value="finalized">已定稿</option>
          </select>
          <Link
            href={exportHref}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            导出给版师 →
          </Link>
        </div>
      </div>
    </aside>
  );
}
