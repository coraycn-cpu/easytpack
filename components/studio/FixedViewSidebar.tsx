"use client";

import { useState } from "react";
import Link from "next/link";
import CompliancePanel from "@/components/studio/CompliancePanel";
import type { ComplianceIssue } from "@/lib/project/compliance";
import {
  VIEW_IMAGE_PRESETS,
  VIEW_IMAGE_AI_GUIDE,
  SIDEBAR_AI_SOURCE_HINT,
  LINE_ART_USE_OVERLAY_HINT,
  type ViewImageKind,
} from "@/lib/studio/view-types";
import { resolveViewKindFromCustomPrompt } from "@/lib/studio/resolve-view-kind";
import type { PhotoType } from "@/types/project";
import type { WorkflowStatus } from "@/types/project";

type FixedViewSidebarProps = {
  onNewStyle?: () => void;
  onReplaceImage: (dataUrl: string) => void;
  onGenerateView: (kind: ViewImageKind, customPrompt?: string) => void;
  /** 自定义里写「线稿」时的提示（引导到彩图下方按钮） */
  onLineArtHint?: (message: string) => void;
  viewGenerating: boolean;
  /** AI 处理中锁定侧栏操作 */
  aiBusy?: boolean;
  compliance: ComplianceIssue[];
  projectTitle: string;
  category?: string;
  targetGarmentLabel?: string;
  photoType?: PhotoType;
  flatFrontGenerated?: boolean;
  workflowLabel: string;
  progress: number;
  workflowStatus: WorkflowStatus;
  onWorkflowChange: (status: WorkflowStatus) => void;
  exportHref: string;
};

export default function FixedViewSidebar({
  onNewStyle,
  onReplaceImage,
  onGenerateView,
  onLineArtHint,
  viewGenerating,
  aiBusy = false,
  compliance,
  projectTitle,
  category,
  targetGarmentLabel,
  photoType: _photoType,
  flatFrontGenerated: _flatFrontGenerated,
  workflowLabel,
  progress,
  workflowStatus,
  onWorkflowChange,
  exportHref,
}: FixedViewSidebarProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [complianceExpanded, setComplianceExpanded] = useState(false);

  const locked = aiBusy || viewGenerating;
  const issueCount = compliance.length;
  const showComplianceToggle = issueCount > 2;

  const handleCustomGenerate = () => {
    const prompt = customPrompt.trim();
    if (!prompt) return;
    const mapped = resolveViewKindFromCustomPrompt(prompt);
    if (mapped && "blocked" in mapped) {
      onLineArtHint?.(LINE_ART_USE_OVERLAY_HINT);
      return;
    }
    // 「生成正面平铺图」等映射到正式 kind，避免 custom 走偏
    onGenerateView(mapped?.kind ?? "custom", prompt);
  };

  return (
    <aside
      className={`flex h-full min-h-0 w-44 shrink-0 flex-col border-r border-slate-200 bg-white ${
        locked ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {onNewStyle && (
          <div className="border-b border-slate-100 p-2.5">
            <button
              type="button"
              onClick={onNewStyle}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              <span className="text-sm leading-none">+</span>
              新建款式
            </button>
          </div>
        )}

        <div className="border-b border-violet-50 bg-violet-50/40 px-3 py-2">
          <p className="text-xs font-semibold text-slate-700">AI 生成款式图</p>
          <p className="mt-0.5 text-[9px] leading-snug text-violet-700/80">
            {VIEW_IMAGE_AI_GUIDE}
          </p>
          <p className="mt-1 text-[9px] leading-snug text-slate-500">
            {SIDEBAR_AI_SOURCE_HINT}
          </p>
        </div>

        <div className="space-y-1.5 p-2.5">
          {VIEW_IMAGE_PRESETS.map((preset) => (
            <button
              key={preset.kind}
              type="button"
              disabled={viewGenerating}
              onClick={() => onGenerateView(preset.kind)}
              className="flex w-full items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2 text-left text-xs font-medium text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-sm">{preset.icon}</span>
              {viewGenerating ? "生成中…" : preset.label}
            </button>
          ))}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <label className="mb-1 flex items-center gap-1 text-[10px] font-medium text-slate-600">
              <span className="text-sm leading-none text-violet-600">✦</span>
              自定义视角（提示词）
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="如：45°斜侧、口袋细节（线稿请用彩图右侧按钮）"
              rows={2}
              disabled={viewGenerating}
              className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-violet-400"
            />
            <button
              type="button"
              disabled={viewGenerating || !customPrompt.trim()}
              onClick={handleCustomGenerate}
              className="mt-1.5 w-full rounded-md bg-violet-600 px-2 py-1.5 text-[11px] font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {viewGenerating ? "生成中…" : "生成自定义视角"}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 p-2.5">
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
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1">
            <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              质量检验
            </p>
            {issueCount > 0 && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800">
                {issueCount} 项
              </span>
            )}
            {showComplianceToggle && (
              <button
                type="button"
                onClick={() => setComplianceExpanded((v) => !v)}
                className="shrink-0 text-[9px] text-slate-500 hover:text-slate-700"
              >
                {complianceExpanded ? "收起" : "展开"}
              </button>
            )}
          </div>
          <div
            className={`overflow-y-auto overscroll-contain ${
              complianceExpanded ? "max-h-40" : "max-h-[4.5rem]"
            }`}
          >
            <CompliancePanel issues={compliance} flat compact />
          </div>
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
          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500">
            {category ?? "未分类"}
            {targetGarmentLabel ? ` · 目标款：${targetGarmentLabel}` : ""} · {workflowLabel} ·{" "}
            {progress}%
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
