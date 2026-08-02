"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { regionStandardLabel } from "@/lib/size-chart/standards";
import {
  addSizeColumn,
  applySizeGrading,
  clearNonSampleSizes,
  inferGradeStepCm,
  prependSizeColumn,
  removeSizeColumn,
  suggestNextSizeLabel,
  suggestPrevSizeLabel,
  type GradeMode,
} from "@/lib/size-chart/grade";
import type { SizeChart } from "@/types/project";

type SizeChartExpandDialogProps = {
  chart: SizeChart;
  open: boolean;
  onClose: () => void;
  onChange: (chart: SizeChart) => void;
  /** 删除部位行：传入部位名与删后尺码表（父级一次保存并去尺寸线） */
  onRemoveRowPart?: (part: string, nextChart: SizeChart) => void;
  dimensionCounts?: Record<string, number>;
};

/**
 * 尺码表统一大面板：编辑部位/数字、删行、跳码放码同一窗口，避免「展开」再套「跳码」。
 */
export default function SizeChartExpandDialog({
  chart,
  open,
  onClose,
  onChange,
  onRemoveRowPart,
  dimensionCounts,
}: SizeChartExpandDialogProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<GradeMode>("fillEmpty");
  const [defaultStep, setDefaultStep] = useState(2);
  const [status, setStatus] = useState<string | null>(null);
  const [rowSteps, setRowSteps] = useState<Record<string, number>>({});

  const sampleSize = chart.sampleSize?.trim();
  const regionLabel = regionStandardLabel(chart.regionStandard);

  const missingBaseline = useMemo(
    () =>
      chart.rows.filter((r) => !r.values[sampleSize ?? ""]?.trim()).length,
    [chart.rows, sampleSize],
  );

  if (!open) return null;

  const applyGrade = () => {
    if (!sampleSize) {
      setStatus(t("panel.sizeNeedBaseline"));
      return;
    }
    if (mode === "overwriteNonSample") {
      const ok = window.confirm(t("panel.sizeConfirmOverwrite"));
      if (!ok) return;
    }
    const result = applySizeGrading(chart, {
      mode,
      defaultStepCm: defaultStep,
      rowSteps,
    });
    onChange(result.chart);
    setStatus(
      result.skipped
        ? t("panel.sizeFilledSkip", {
            filled: result.filled,
            skipped: result.skipped,
          })
        : t("panel.sizeFilled", { filled: result.filled }),
    );
  };

  const expandHigh = () => {
    const name = window.prompt(
      t("panel.sizePromptLarger"),
      suggestNextSizeLabel(chart.sizes),
    );
    if (!name?.trim()) return;
    onChange(addSizeColumn(chart, name.trim()));
    setStatus(t("panel.sizeAddedCol", { name: name.trim() }));
  };

  const expandLow = () => {
    const name = window.prompt(
      t("panel.sizePromptSmaller"),
      suggestPrevSizeLabel(chart.sizes),
    );
    if (!name?.trim()) return;
    onChange(prependSizeColumn(chart, name.trim()));
    setStatus(t("panel.sizeAddedColLeft", { name: name.trim() }));
  };

  const removeSize = (size: string) => {
    if (size === sampleSize) {
      setStatus(t("panel.sizeCantDeleteBaseline"));
      return;
    }
    if (!window.confirm(t("panel.sizeConfirmDeleteCol", { size }))) return;
    onChange(removeSizeColumn(chart, size));
    setStatus(t("panel.sizeDeletedCol", { size }));
  };

  const clearOthers = () => {
    if (!window.confirm(t("panel.sizeConfirmClear"))) return;
    onChange(clearNonSampleSizes(chart));
    setStatus(t("panel.sizeCleared"));
  };

  const addRow = () => {
    const values = Object.fromEntries(chart.sizes.map((s) => [s, ""]));
    onChange({
      ...chart,
      rows: [
        ...chart.rows,
        { part: t("panel.sizeNewPart"), method: t("panel.sizeNewMethod"), values },
      ],
    });
    setStatus(t("panel.sizeAddedRow"));
  };

  const removeRow = (index: number) => {
    const part = chart.rows[index]?.part?.trim();
    const next = { ...chart, rows: chart.rows.filter((_, i) => i !== index) };
    if (part && onRemoveRowPart) {
      onRemoveRowPart(part, next);
    } else {
      onChange(next);
    }
    setStatus(
      part
        ? t("panel.sizeDeletedPart", { part })
        : t("panel.sizeDeletedRow"),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="flex max-h-[min(92vh,900px)] w-full max-w-[min(960px,96vw)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t("panel.sizeTitle")}
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {t("panel.sizeSubtitle")}
            </p>
            {(regionLabel || sampleSize) && (
              <p className="mt-1 text-[10px] text-slate-400">
                {regionLabel}
                {regionLabel && sampleSize ? " · " : ""}
                {sampleSize ? (
                  <>
                    {t("panel.sizeBaseline")}{" "}
                    <span className="font-medium text-brand">{sampleSize}</span>
                  </>
                ) : (
                  t("panel.sizeNoBaseline")
                )}
                {missingBaseline > 0 && (
                  <span className="ml-2 text-amber-600">
                    · {t("panel.sizeMissingBaseline", { n: missingBaseline })}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-50 bg-slate-50/80 px-4 py-2.5">
          <span className="text-[11px] text-slate-500">{t("panel.sizeRange")}</span>
          <button
            type="button"
            onClick={expandLow}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
          >
            {t("panel.sizeAddSmaller")}
          </button>
          <button
            type="button"
            onClick={expandHigh}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
          >
            {t("panel.sizeAddLarger")}
          </button>
          <button
            type="button"
            onClick={addRow}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
          >
            {t("panel.sizeAddPart")}
          </button>
          <span className="mx-1 text-slate-300">|</span>
          <label className="flex items-center gap-1 text-[11px] text-slate-600">
            {t("panel.sizeDefaultStep")}
            <input
              type="number"
              min={0.5}
              max={8}
              step={0.5}
              value={defaultStep}
              onChange={(e) => setDefaultStep(Number(e.target.value) || 2)}
              className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-center"
            />
            cm
          </label>
          <label className="flex items-center gap-1 text-[11px] text-slate-600">
            <input
              type="radio"
              name="sizeWorkspaceGradeMode"
              checked={mode === "fillEmpty"}
              onChange={() => setMode("fillEmpty")}
            />
            {t("panel.sizeFillEmpty")}
          </label>
          <label className="flex items-center gap-1 text-[11px] text-slate-600">
            <input
              type="radio"
              name="sizeWorkspaceGradeMode"
              checked={mode === "overwriteNonSample"}
              onChange={() => setMode("overwriteNonSample")}
            />
            {t("panel.sizeOverwrite")}
          </label>
          <button
            type="button"
            onClick={applyGrade}
            className="rounded bg-brand px-3 py-1.5 text-[11px] font-medium text-white hover:bg-brand-dark"
          >
            {t("panel.sizeGrade")}
          </button>
          <button
            type="button"
            onClick={clearOthers}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
          >
            {t("panel.sizeClearNonSample")}
          </button>
        </div>

        {status && (
          <p className="shrink-0 border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-[11px] text-amber-800">
            {status}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="sticky left-0 z-10 bg-white py-2 pr-2">
                  {t("panel.sizeColPart")}
                </th>
                <th className="py-2 pr-2">{t("panel.sizeColMethod")}</th>
                <th
                  className="py-2 pr-2 text-center"
                  title={t("panel.sizeColGradeTitle")}
                >
                  {t("panel.sizeColGrade")}
                </th>
                {chart.sizes.map((s) => (
                  <th
                    key={s}
                    className={`px-1 py-2 text-center ${
                      s === sampleSize ? "bg-brand-soft text-brand-dark" : ""
                    }`}
                  >
                    <div className="inline-flex flex-col items-center gap-0.5">
                      <span>
                        {s}
                        {s === sampleSize && (
                          <span className="ml-0.5 text-[9px] font-normal">
                            {t("panel.sizeBaselineBadge")}
                          </span>
                        )}
                      </span>
                      {s !== sampleSize && (
                        <button
                          type="button"
                          onClick={() => removeSize(s)}
                          className="text-[10px] text-slate-300 hover:text-red-500"
                          title={t("panel.sizeDeleteColTitle")}
                        >
                          {t("panel.sizeDeleteCol")}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-10 py-2 text-center">
                  {t("panel.sizeDeleteRowCol")}
                </th>
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, i) => {
                const partKey = row.part.trim();
                const step =
                  rowSteps[partKey] ?? inferGradeStepCm(row.part, row.method);
                const dimCount = partKey
                  ? dimensionCounts?.[partKey] ?? 0
                  : 0;
                return (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="sticky left-0 z-10 bg-white py-1.5 pr-2">
                      <div className="flex items-center gap-1">
                        <input
                          value={row.part}
                          onChange={(e) => {
                            const rows = [...chart.rows];
                            rows[i] = { ...rows[i], part: e.target.value };
                            onChange({ ...chart, rows });
                          }}
                          className="w-20 rounded border border-transparent px-1 py-1 outline-none hover:border-slate-200 focus:border-blue-300"
                        />
                        {dimCount > 0 && (
                          <span className="shrink-0 text-[9px] text-emerald-600">
                            {t("panel.sizeLineCount", { n: dimCount })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={row.method}
                        onChange={(e) => {
                          const rows = [...chart.rows];
                          rows[i] = { ...rows[i], method: e.target.value };
                          onChange({ ...chart, rows });
                        }}
                        className="w-24 rounded border border-transparent px-1 py-1 text-xs text-slate-500 outline-none hover:border-slate-200 focus:border-blue-300"
                      />
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <input
                        type="number"
                        min={0.5}
                        max={8}
                        step={0.5}
                        value={step}
                        onChange={(e) =>
                          setRowSteps((prev) => ({
                            ...prev,
                            [partKey]: Number(e.target.value) || defaultStep,
                          }))
                        }
                        className="w-14 rounded border border-slate-200 px-1 py-1 text-center text-xs"
                        title={t("panel.sizeRowStepTitle")}
                      />
                    </td>
                    {chart.sizes.map((s) => {
                      const val = row.values[s] ?? "";
                      const isSample = s === sampleSize;
                      const isManual =
                        !isSample && Boolean(val.trim()) && mode === "fillEmpty";
                      return (
                        <td
                          key={s}
                          className={`px-1 py-1.5 ${isSample ? "bg-brand-soft/50" : ""}`}
                        >
                          <input
                            value={val}
                            onChange={(e) => {
                              const rows = [...chart.rows];
                              rows[i] = {
                                ...rows[i],
                                values: {
                                  ...rows[i].values,
                                  [s]: e.target.value,
                                },
                              };
                              onChange({ ...chart, rows });
                            }}
                            className={`w-14 rounded border px-1 py-1.5 text-center outline-none focus:border-brand ${
                              isSample
                                ? "border-blue-200 font-medium text-slate-800"
                                : isManual
                                  ? "border-amber-200 bg-amber-50/40 text-slate-700"
                                  : "border-slate-100 text-slate-600"
                            }`}
                            title={
                              isSample
                                ? t("panel.sizeCellBaseline")
                                : isManual
                                  ? t("panel.sizeCellManual")
                                  : t("panel.sizeCellEdit")
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="rounded px-1.5 py-0.5 text-xs text-slate-300 hover:bg-red-50 hover:text-red-500"
                        title={t("panel.sizeDeletePartTitle")}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {chart.rows.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">
              {t("panel.sizeEmpty")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            {t("panel.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
