"use client";

import { useState } from "react";
import AnnotationActionBar from "@/components/studio/AnnotationActionBar";
import BomExpandDialog from "@/components/studio/BomExpandDialog";
import ProcessExpandDialog from "@/components/studio/ProcessExpandDialog";
import ReviewExpandDialog from "@/components/studio/ReviewExpandDialog";
import SizeChartEditor from "@/components/studio/SizeChartEditor";
import SizeChartExpandDialog from "@/components/studio/SizeChartExpandDialog";
import { resolveSelectionMode } from "@/lib/studio/annotation-ux";
import { COMM_PACK_COPY } from "@/lib/studio/region-edit-ux";
import {
  clearProcessIdFromAnnotations,
  countShapesLinkedToProcess,
  formatAnnotationLayerLabel,
  getMarkerLabel,
  isLinkableShape,
} from "@/lib/canvas/part-annotations";
import {
  countDimensionsLinkedToSizePart,
  isDimensionAnnotation,
  removeDimensionAnnotationsForPart,
  syncDimensionTextsFromSizeChart,
} from "@/lib/canvas/size-annotations";
import { generateProcessId } from "@/lib/process/ids";
import { STYLE_REVIEW_MAX } from "@/types/process";
import type { BomItem, ProcessItem } from "@/types/process";
import type { Annotation, SizeChart, TechPackProject } from "@/types/project";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Tab = "process" | "bom" | "size" | "review";

const REVIEW_MAX = STYLE_REVIEW_MAX;

type StudioDataPanelProps = {
  project: TechPackProject;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onPersist: (project: TechPackProject) => void;
  highlightedProcessIds?: string[];
  onProcessRowSelect?: (processId: string, index: number) => void;
  selectedAnnIds?: string[];
  selectedAnns?: Annotation[];
  linkedProcessIdsForSelection?: string[];
  onToggleProcessLink?: (processId: string, linked: boolean) => void;
  onRegionAiFill?: () => void;
  regionAiLoading?: boolean;
  onDimensionAiFill?: () => void;
  dimensionAiLoading?: boolean;
  onMarkManual?: () => void;
  onToggleLock?: () => void;
  onDeleteSelected?: () => void;
  linkedSizePartForSelection?: string;
  onToggleSizeLink?: (part: string, linked: boolean) => void;
  highlightedSizePart?: string;
  onSizeRowSelect?: (part: string, index: number) => void;
  highlightTab?: Tab | null;
  /** AI 处理中锁定面板编辑 */
  interactionLocked?: boolean;
};

const BOM_CATEGORIES: Array<{ value: BomItem["category"]; label: string }> = [
  { value: "fabric", label: "面料" },
  { value: "trim", label: "辅料" },
  { value: "accessory", label: "配件" },
  { value: "packaging", label: "包装" },
];

const EMPTY_PROCESS: ProcessItem = {
  part: "",
  process: "",
  stitch: "",
  seam_allowance: "",
};

const EMPTY_BOM: BomItem = {
  name: "",
  category: "fabric",
  garmentPart: "",
  spec: "",
  color: "",
  usage: "",
  supplier: "",
  code: "",
};

export default function StudioDataPanel({
  project,
  activeTab,
  onTabChange,
  onPersist,
  highlightedProcessIds = [],
  onProcessRowSelect,
  selectedAnnIds = [],
  selectedAnns = [],
  linkedProcessIdsForSelection = [],
  onToggleProcessLink,
  onRegionAiFill,
  regionAiLoading,
  onDimensionAiFill,
  dimensionAiLoading,
  onMarkManual,
  onToggleLock,
  onDeleteSelected,
  linkedSizePartForSelection,
  onToggleSizeLink,
  highlightedSizePart,
  onSizeRowSelect,
  highlightTab,
  interactionLocked,
}: StudioDataPanelProps) {
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [processExpandOpen, setProcessExpandOpen] = useState(false);
  const [bomExpandOpen, setBomExpandOpen] = useState(false);
  const [sizeExpandOpen, setSizeExpandOpen] = useState(false);
  const [reviewExpandOpen, setReviewExpandOpen] = useState(false);
  const primaryAnn = selectedAnns.length === 1 ? selectedAnns[0] : null;
  const selectionMode = resolveSelectionMode(selectedAnns);
  const shapeLinkable = primaryAnn ? isLinkableShape(primaryAnn.type) : false;
  const dimensionLinkable = primaryAnn ? isDimensionAnnotation(primaryAnn) : false;

  const dimensionCounts = Object.fromEntries(
    project.size_chart.rows.map((row) => [
      row.part.trim(),
      countDimensionsLinkedToSizePart(project, row.part),
    ]),
  );

  const updateProcess = (index: number, patch: Partial<ProcessItem>) => {
    const items = [...project.process_items];
    items[index] = { ...items[index], ...patch };
    onPersist({ ...project, process_items: items });
  };

  const addProcess = () => {
    onPersist({
      ...project,
      process_items: [...project.process_items, { ...EMPTY_PROCESS, id: generateProcessId() }],
    });
  };

  const removeProcess = (index: number) => {
    const item = project.process_items[index];
    if (!item?.id) {
      onPersist({
        ...project,
        process_items: project.process_items.filter((_, i) => i !== index),
      });
      return;
    }
    const artboards = project.canvas_data.artboards.map((ab) => ({
      ...ab,
      annotations: clearProcessIdFromAnnotations(ab.annotations, item.id!),
    }));
    onPersist({
      ...project,
      process_items: project.process_items.filter((_, i) => i !== index),
      canvas_data: { ...project.canvas_data, artboards },
    });
  };

  const persistProcessItems = (items: ProcessItem[]) => {
    const keptIds = new Set(
      items.map((p) => p.id).filter((id): id is string => Boolean(id)),
    );
    let artboards = project.canvas_data.artboards;
    for (const prev of project.process_items) {
      if (prev.id && !keptIds.has(prev.id)) {
        artboards = artboards.map((ab) => ({
          ...ab,
          annotations: clearProcessIdFromAnnotations(ab.annotations, prev.id!),
        }));
      }
    }
    onPersist({
      ...project,
      process_items: items,
      canvas_data: { ...project.canvas_data, artboards },
    });
  };

  const updateBom = (index: number, patch: Partial<BomItem>) => {
    const items = [...project.bom_items];
    items[index] = { ...items[index], ...patch };
    onPersist({ ...project, bom_items: items });
  };

  const addBom = () => {
    onPersist({
      ...project,
      bom_items: [...project.bom_items, { ...EMPTY_BOM }],
    });
  };

  const removeBom = (index: number) => {
    onPersist({
      ...project,
      bom_items: project.bom_items.filter((_, i) => i !== index),
    });
  };

  /** 尺码表一次写入：可删部位对应尺寸线，并把基准码数字同步到标注文字 */
  const persistSizeChart = (
    size_chart: SizeChart,
    opts?: { removedParts?: string[] },
  ) => {
    let artboards = project.canvas_data.artboards;
    for (const part of opts?.removedParts ?? []) {
      artboards = artboards.map((ab) => ({
        ...ab,
        annotations: removeDimensionAnnotationsForPart(ab.annotations, part),
      }));
    }
    artboards = artboards.map((ab) => ({
      ...ab,
      annotations: syncDimensionTextsFromSizeChart(ab.annotations, size_chart),
    }));
    onPersist({
      ...project,
      size_chart,
      canvas_data: { ...project.canvas_data, artboards },
    });
  };

  return (
    <div
      className={`flex max-h-[calc(100vh-6rem)] flex-col ${
        interactionLocked ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="flex shrink-0 items-center gap-0.5 border-b border-slate-100 px-2 py-1.5">
        {(["process", "bom", "size", "review"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`rounded px-2 py-1 text-[11px] font-medium transition ${
              activeTab === tab
                ? "bg-brand text-white"
                : highlightTab === tab
                  ? "bg-brand-soft text-brand-dark ring-1 ring-brand-light"
                  : "bg-background text-muted hover:bg-brand-soft"
            }`}
          >
            {tab === "process"
              ? t("studio.process")
              : tab === "bom"
                ? t("studio.bom")
                : tab === "size"
                  ? t("studio.size")
                  : t("studio.review")}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          title={collapsed ? "展开面板" : "折叠面板"}
          aria-expanded={!collapsed}
        >
          {collapsed ? "◀" : "▼"}
        </button>
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
          <p className="mb-2 rounded-md bg-slate-50 px-2 py-1.5 text-[10px] leading-relaxed text-slate-500">
            {COMM_PACK_COPY.annotateAfterAi}
          </p>
          {(() => {
            const ab = project.canvas_data.artboards.find(
              (a) => a.id === project.canvas_data.activeArtboardId,
            );
            const layers = ab?.annotations ?? [];
            if (layers.length === 0) return null;
            return (
              <div className="mb-2 rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  图层 · 当前图 {layers.length}
                </p>
                <ul className="max-h-28 space-y-0.5 overflow-y-auto">
                  {layers.map((ann, idx) => {
                    const selected = selectedAnnIds?.includes(ann.id);
                    const label = formatAnnotationLayerLabel(
                      ann,
                      project.process_items,
                      idx + 1,
                    );
                    return (
                      <li
                        key={ann.id}
                        className={`truncate rounded px-1.5 py-0.5 text-[10px] ${
                          selected
                            ? "bg-brand-soft font-medium text-brand-dark"
                            : "text-muted"
                        }`}
                        title={label}
                      >
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}
          <AnnotationActionBar
            selected={selectedAnns}
            mode={selectionMode}
            interactionLocked={interactionLocked}
            regionAiLoading={regionAiLoading}
            dimensionAiLoading={dimensionAiLoading}
            onRegionAi={onRegionAiFill}
            onDimensionAi={onDimensionAiFill}
            onMarkManual={onMarkManual}
            onToggleLock={onToggleLock}
            onDeleteSelected={onDeleteSelected}
            onOpenProcessTab={() => onTabChange("process")}
            onOpenSizeTab={() => onTabChange("size")}
            activeTab={activeTab}
          />
          {selectedAnnIds.length === 1 && !shapeLinkable && !dimensionLinkable && selectionMode === "other" && (
            <p className="mb-2 text-[10px] text-slate-400">装饰标注不可关联工艺/尺寸</p>
          )}
          {selectedAnnIds.length === 1 && shapeLinkable && activeTab === "process" && (
            <p className="mb-2 text-[10px] text-brand">勾选工艺行以关联当前区域</p>
          )}
          {selectedAnnIds.length === 1 && dimensionLinkable && activeTab === "size" && (
            <p className="mb-2 text-[10px] text-emerald-600">勾选尺寸行以关联当前尺寸线</p>
          )}

          {activeTab === "process" && (
            <div className="space-y-1.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400">
                  侧栏可快速改；大面板便于通览编辑
                </p>
                <button
                  type="button"
                  onClick={() => setProcessExpandOpen(true)}
                  className="shrink-0 rounded bg-brand px-2 py-0.5 text-[10px] font-medium text-white hover:bg-brand-dark"
                  title="打开大面板编辑工艺"
                >
                  展开编辑
                </button>
              </div>
              {project.process_items.map((item, i) => {
                const processId = item.id;
                const isHighlighted = processId
                  ? highlightedProcessIds.includes(processId)
                  : false;
                const shapeCount = processId
                  ? countShapesLinkedToProcess(project, processId)
                  : 0;
                const isLinkedToSelection = processId
                  ? linkedProcessIdsForSelection.includes(processId)
                  : false;

                return (
                  <div
                    key={item.id ?? i}
                    role="button"
                    tabIndex={0}
                    onClick={() => processId && onProcessRowSelect?.(processId, i)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && processId) {
                        onProcessRowSelect?.(processId, i);
                      }
                    }}
                    className={`rounded border px-2 py-1.5 transition ${
                      isHighlighted
                        ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                        : shapeCount > 0
                          ? "border-blue-200 bg-brand-soft/50 hover:border-brand-light"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      {selectedAnnIds.length === 1 && shapeLinkable && processId && onToggleProcessLink && (
                        <input
                          type="checkbox"
                          checked={isLinkedToSelection}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onToggleProcessLink(processId, e.target.checked)}
                          className="shrink-0"
                          title="关联当前选中区域"
                        />
                      )}
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          shapeCount > 0 ? "bg-brand text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {getMarkerLabel(i + 1)}
                      </span>
                      <input
                        value={item.part}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateProcess(i, { part: e.target.value })}
                        placeholder="部位名称"
                        className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none"
                      />
                      {shapeCount > 0 && (
                        <span className="shrink-0 text-[9px] text-blue-500">{shapeCount} 区</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProcess(i);
                        }}
                        className="shrink-0 text-slate-300 hover:text-red-500"
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                    <textarea
                      value={item.process}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateProcess(i, { process: e.target.value })}
                      placeholder="工艺描述"
                      rows={2}
                      className="w-full resize-none bg-transparent text-[11px] leading-snug text-slate-600 outline-none"
                    />
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      <input
                        value={item.stitch ?? ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateProcess(i, { stitch: e.target.value })}
                        placeholder="针法/线迹"
                        className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                      />
                      <input
                        value={item.seam_allowance ?? ""}
                        onChange={(e) => updateProcess(i, { seam_allowance: e.target.value })}
                        placeholder="缝份"
                        className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                      />
                    </div>
                  </div>
                );
              })}
              {project.process_items.length === 0 && (
                <p className="text-[11px] leading-relaxed text-slate-400">
                  {COMM_PACK_COPY.processEmpty}
                </p>
              )}
              <button
                type="button"
                onClick={addProcess}
                className="w-full rounded border border-dashed border-slate-300 py-1.5 text-[11px] text-slate-500 hover:border-slate-400 hover:text-slate-700"
              >
                + 添加工艺行
              </button>
            </div>
          )}

          {activeTab === "bom" && (
            <div className="space-y-1.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400">
                  侧栏可快速改；大面板表格更易填写
                </p>
                <button
                  type="button"
                  onClick={() => setBomExpandOpen(true)}
                  className="shrink-0 rounded bg-brand px-2 py-0.5 text-[10px] font-medium text-white hover:bg-brand-dark"
                  title="打开大面板编辑物料"
                >
                  展开编辑
                </button>
              </div>
              {project.bom_items.map((item, i) => (
                <div
                  key={i}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5"
                >
                  <div className="mb-1 flex items-center gap-1">
                    <input
                      value={item.name}
                      onChange={(e) => updateBom(i, { name: e.target.value })}
                      placeholder="物料名称"
                      className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeBom(i)}
                      className="shrink-0 text-slate-300 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={item.category ?? "fabric"}
                      onChange={(e) =>
                        updateBom(i, { category: e.target.value as BomItem["category"] })
                      }
                      className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                    >
                      {BOM_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.garmentPart ?? ""}
                      onChange={(e) => updateBom(i, { garmentPart: e.target.value })}
                      placeholder="上装/下装"
                      className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                    />
                    <input
                      value={item.spec ?? ""}
                      onChange={(e) => updateBom(i, { spec: e.target.value })}
                      placeholder="规格"
                      className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                    />
                    <input
                      value={item.color ?? ""}
                      onChange={(e) => updateBom(i, { color: e.target.value })}
                      placeholder="颜色"
                      className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                    />
                    <input
                      value={item.usage ?? ""}
                      onChange={(e) => updateBom(i, { usage: e.target.value })}
                      placeholder="用量"
                      className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                    />
                    <input
                      value={item.supplier ?? ""}
                      onChange={(e) => updateBom(i, { supplier: e.target.value })}
                      placeholder="供应商"
                      className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                    />
                    <input
                      value={item.code ?? ""}
                      onChange={(e) => updateBom(i, { code: e.target.value })}
                      placeholder="物料编码"
                      className="col-span-2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600 outline-none ring-1 ring-slate-200"
                    />
                  </div>
                </div>
              ))}
              {project.bom_items.length === 0 && (
                <p className="text-[11px] text-slate-400">{COMM_PACK_COPY.bomEmpty}</p>
              )}
              <button
                type="button"
                onClick={addBom}
                className="w-full rounded border border-dashed border-slate-300 py-1.5 text-[11px] text-slate-500"
              >
                + 添加物料行
              </button>
            </div>
          )}

          {activeTab === "size" && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] leading-relaxed text-slate-500">
                  改数字会同步到画布尺寸线；删除部位会去掉对应标注线。跳码与大表编辑在同一窗口。
                </p>
                <button
                  type="button"
                  onClick={() => setSizeExpandOpen(true)}
                  className="shrink-0 rounded bg-brand px-2 py-0.5 text-[10px] font-medium text-white hover:bg-brand-dark"
                  title="打开大面板：改数字、删行、跳码放码"
                >
                  编辑 / 跳码
                </button>
              </div>
              <SizeChartEditor
                chart={project.size_chart}
                onChange={(size_chart) => persistSizeChart(size_chart)}
                compact
                flat
                selectedAnnId={selectedAnnIds[0] ?? null}
                dimensionLinkable={dimensionLinkable}
                linkedSizePartForSelection={linkedSizePartForSelection}
                onToggleSizeLink={onToggleSizeLink}
                highlightedSizePart={highlightedSizePart}
                onSizeRowSelect={onSizeRowSelect}
                dimensionCounts={dimensionCounts}
                onRemoveRowPart={(part, nextChart) =>
                  persistSizeChart(nextChart, { removedParts: [part] })
                }
              />
            </div>
          )}

          {activeTab === "review" && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] leading-relaxed text-slate-500">
                  面向版师/车版/设计师。图不准处可点下方芯片写入说明，或直接在画布标注。
                </p>
                <button
                  type="button"
                  onClick={() => setReviewExpandOpen(true)}
                  className="shrink-0 rounded bg-brand px-2 py-0.5 text-[10px] font-medium text-white hover:bg-brand-dark"
                  title="打开大面板编辑评语"
                >
                  展开编辑
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {COMM_PACK_COPY.reviewGuideChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:border-brand-light hover:bg-brand-soft"
                    onClick={() => {
                      const cur = (project.style_review ?? "").trim();
                      const next = cur.includes(chip)
                        ? cur
                        : cur
                          ? `${cur}\n· ${chip}`
                          : `· ${chip}`;
                      onPersist({
                        ...project,
                        style_review: next.slice(0, REVIEW_MAX),
                      });
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <textarea
                value={project.style_review ?? ""}
                onChange={(e) =>
                  onPersist({
                    ...project,
                    style_review: e.target.value.slice(0, REVIEW_MAX),
                  })
                }
                rows={10}
                maxLength={REVIEW_MAX}
                placeholder={`【款式特点】连帽卫衣，落肩廓形，罗纹收口\n【面料建议】…\n【工艺建议】…\n【注意事项】…`}
                className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] leading-relaxed text-slate-700 outline-none focus:border-brand"
              />
              <p className="text-right text-[10px] text-slate-400">
                {(project.style_review ?? "").length}/{REVIEW_MAX} 字
              </p>
            </div>
          )}
        </div>
      )}

      <ProcessExpandDialog
        open={processExpandOpen}
        onClose={() => setProcessExpandOpen(false)}
        items={project.process_items}
        onChange={persistProcessItems}
      />
      <BomExpandDialog
        open={bomExpandOpen}
        onClose={() => setBomExpandOpen(false)}
        items={project.bom_items}
        onChange={(bom_items) => onPersist({ ...project, bom_items })}
      />
      <SizeChartExpandDialog
        open={sizeExpandOpen}
        onClose={() => setSizeExpandOpen(false)}
        chart={project.size_chart}
        onChange={(size_chart) => persistSizeChart(size_chart)}
        onRemoveRowPart={(part, nextChart) =>
          persistSizeChart(nextChart, { removedParts: [part] })
        }
        dimensionCounts={dimensionCounts}
      />
      <ReviewExpandDialog
        open={reviewExpandOpen}
        onClose={() => setReviewExpandOpen(false)}
        value={project.style_review ?? ""}
        onChange={(style_review) => onPersist({ ...project, style_review })}
      />
    </div>
  );
}

export type { Tab as StudioDataTab };
