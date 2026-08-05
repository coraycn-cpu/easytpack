"use client";

import { useState } from "react";
import Link from "next/link";
import CompliancePanel from "@/components/studio/CompliancePanel";
import type { ComplianceIssue } from "@/lib/project/compliance";
import {
  VIEW_IMAGE_PRESETS,
  LINE_ART_USE_OVERLAY_HINT,
  type ViewImageKind,
} from "@/lib/studio/view-types";
import { resolveViewKindFromCustomPrompt } from "@/lib/studio/resolve-view-kind";
import type { PhotoType } from "@/types/project";
import type { WorkflowStatus } from "@/types/project";
import { useLocale } from "@/components/i18n/LocaleProvider";

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
  onComplianceIssue?: (issue: ComplianceIssue) => void;
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

const VIEW_LABEL_KEYS: Record<string, string> = {
  back: "studio.viewBack",
  collar: "studio.viewCollar",
  cuff: "studio.viewCuff",
};

export default function FixedViewSidebar({
  onNewStyle,
  onReplaceImage,
  onGenerateView,
  onLineArtHint,
  viewGenerating,
  aiBusy = false,
  compliance,
  onComplianceIssue,
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
  const { t, locale } = useLocale();
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
      onLineArtHint?.(
        locale === "en"
          ? t("studio.lineArtOverlayHint")
          : LINE_ART_USE_OVERLAY_HINT,
      );
      return;
    }
    // 「生成正面平铺图」等映射到正式 kind，避免 custom 走偏
    onGenerateView(mapped?.kind ?? "custom", prompt);
  };

  return (
    <aside className="flex h-full min-h-0 w-44 shrink-0 flex-col border-r border-border bg-surface">
      <div
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
          locked ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {onNewStyle && (
          <div className="border-b border-border p-2.5">
            <button
              type="button"
              onClick={onNewStyle}
              className="pf-btn-primary w-full gap-1.5 px-2.5 py-2 text-xs"
            >
              <span className="text-sm leading-none">+</span>
              {t("studio.newStyle")}
            </button>
          </div>
        )}

        <div className="border-b border-brand-light bg-brand-soft/60 px-3 py-2">
          <p className="text-xs font-semibold text-foreground">
            {t("studio.aiGenViews")}
          </p>
          <p className="mt-0.5 text-[9px] leading-snug text-brand-dark/80">
            {t("studio.viewAiGuide")}
          </p>
          <p className="mt-0.5 text-[9px] font-medium text-brand-dark/90">
            {t("studio.aiCostHint")}
          </p>
          <p className="mt-1 text-[9px] leading-snug text-muted">
            {t("studio.sidebarSourceHint")}
          </p>
        </div>

        <div className="space-y-1.5 p-2.5">
          {VIEW_IMAGE_PRESETS.map((preset) => (
            <button
              key={preset.kind}
              type="button"
              disabled={viewGenerating}
              onClick={() => onGenerateView(preset.kind)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] border border-brand-light bg-brand-soft px-2.5 py-2 text-left text-xs font-medium text-brand-dark transition hover:bg-brand-soft/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-sm">{preset.icon}</span>
              {viewGenerating
                ? t("studio.generating")
                : t(VIEW_LABEL_KEYS[preset.kind] ?? "studio.viewBack")}
            </button>
          ))}

          <div className="rounded-[var(--radius-sm)] border border-border bg-background p-2">
            <label className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted">
              <span className="text-sm leading-none text-brand">✦</span>
              {t("studio.customView")}
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={t("studio.customViewPh")}
              rows={2}
              disabled={viewGenerating}
              className="pf-input resize-none px-2 py-1.5 text-[11px]"
            />
            <button
              type="button"
              disabled={viewGenerating || !customPrompt.trim()}
              onClick={handleCustomGenerate}
              className="pf-btn-primary mt-1.5 w-full px-2 py-1.5 text-[11px]"
            >
              {viewGenerating
                ? t("studio.generating")
                : t("studio.genCustomView")}
            </button>
          </div>
        </div>

        <div className="border-t border-border p-2.5">
          <label className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-2 text-xs font-medium text-muted transition hover:border-brand-light hover:bg-brand-soft hover:text-brand">
            <span>🖼</span>
            {t("studio.replaceMainImage")}
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

      <div className="shrink-0 border-t border-border bg-surface">
        <div className="border-b border-border bg-background px-2.5 py-2">
          <div className="mb-1 flex items-center gap-1">
            <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t("studio.qualityCheck")}
            </p>
            {issueCount > 0 && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800">
                {t("studio.issueCount", { n: issueCount })}
              </span>
            )}
            {showComplianceToggle && (
              <button
                type="button"
                onClick={() => setComplianceExpanded((v) => !v)}
                className="shrink-0 text-[9px] text-muted hover:text-foreground"
              >
                {complianceExpanded
                  ? t("studio.collapse")
                  : t("studio.expand")}
              </button>
            )}
          </div>
          <div
            className={`overflow-y-auto overscroll-contain ${
              complianceExpanded ? "max-h-40" : "max-h-[4.5rem]"
            }`}
          >
            <CompliancePanel
              issues={compliance}
              flat
              compact
              onIssueClick={onComplianceIssue}
            />
          </div>
        </div>

        <div className="p-2.5">
          <h1 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {projectTitle}
          </h1>
          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted">
            {category ?? t("studio.uncategorized")}
            {targetGarmentLabel
              ? ` · ${t("studio.targetGarment", { label: targetGarmentLabel })}`
              : ""}{" "}
            · {workflowLabel} · {progress}%
          </p>

          <div className="mt-2 space-y-1.5">
            <select
              value={workflowStatus}
              onChange={(e) =>
                onWorkflowChange(e.target.value as WorkflowStatus)
              }
              className="pf-input px-2 py-1.5 text-xs"
            >
              <option value="draft">{t("studio.statusDraft")}</option>
              <option value="in_review">{t("studio.statusReview")}</option>
              <option value="finalized">{t("studio.statusFinal")}</option>
            </select>
            <Link
              href={exportHref}
              className="pf-btn-primary w-full px-2 py-2 text-xs"
            >
              {t("studio.exportToPattern")}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
