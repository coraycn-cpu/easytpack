"use client";

import { useMemo, useState } from "react";
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

type SizeGradeDialogProps = {
  chart: SizeChart;
  open: boolean;
  onClose: () => void;
  onChange: (chart: SizeChart) => void;
};

export default function SizeGradeDialog({
  chart,
  open,
  onClose,
  onChange,
}: SizeGradeDialogProps) {
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
      setStatus("请先设置基准码，再进行跳码");
      return;
    }
    if (mode === "overwriteNonSample") {
      const ok = window.confirm(
        "将按档差重写所有非基准码列，已手改的数值会被覆盖。确定继续？",
      );
      if (!ok) return;
    }
    const result = applySizeGrading(chart, {
      mode,
      defaultStepCm: defaultStep,
      rowSteps,
    });
    onChange(result.chart);
    setStatus(
      `已填充 ${result.filled} 格` +
        (result.skipped ? `，跳过 ${result.skipped} 个已有值` : "") +
        "；可直接点单元格微调",
    );
  };

  const expandHigh = () => {
    const name = window.prompt("扩大码段 · 增加更大码", suggestNextSizeLabel(chart.sizes));
    if (!name?.trim()) return;
    onChange(addSizeColumn(chart, name.trim()));
    setStatus(`已增加码列「${name.trim()}」`);
  };

  const expandLow = () => {
    const name = window.prompt("扩大码段 · 增加更小码", suggestPrevSizeLabel(chart.sizes));
    if (!name?.trim()) return;
    onChange(prependSizeColumn(chart, name.trim()));
    setStatus(`已在左侧增加码列「${name.trim()}」`);
  };

  const removeSize = (size: string) => {
    if (size === sampleSize) {
      setStatus("不能删除基准码列；请先更换基准码");
      return;
    }
    if (!window.confirm(`删除码列「${size}」？该列数值会一并清除。`)) return;
    onChange(removeSizeColumn(chart, size));
    setStatus(`已删除码列「${size}」`);
  };

  const clearOthers = () => {
    if (!window.confirm("清除所有非基准码列的数值？（码列保留）")) return;
    onChange(clearNonSampleSizes(chart));
    setStatus("已清除非基准码数值，可重新跳码");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="flex max-h-[min(92vh,900px)] w-full max-w-[min(960px,96vw)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">跳码 / 放码</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              以蓝色<strong>基准码</strong>为锚自动推算其它码。默认「只填空格」，已手改数字不会被改掉。
              可随时点单元格手动编辑；码段（如 S–XL）可左右增减。
            </p>
            {(regionLabel || sampleSize) && (
              <p className="mt-1 text-[10px] text-slate-400">
                {regionLabel}
                {regionLabel && sampleSize ? " · " : ""}
                {sampleSize ? (
                  <>
                    基准码 <span className="font-medium text-blue-600">{sampleSize}</span>
                  </>
                ) : (
                  "未设置基准码"
                )}
                {missingBaseline > 0 && (
                  <span className="ml-2 text-amber-600">
                    · {missingBaseline} 行基准码为空，这些行无法跳码
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-50 bg-slate-50/80 px-4 py-2.5">
          <span className="text-[11px] text-slate-500">码段</span>
          <button
            type="button"
            onClick={expandLow}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
          >
            + 更小码
          </button>
          <button
            type="button"
            onClick={expandHigh}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
          >
            + 更大码
          </button>
          <span className="mx-1 text-slate-300">|</span>
          <label className="flex items-center gap-1 text-[11px] text-slate-600">
            默认档差
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
              name="gradeMode"
              checked={mode === "fillEmpty"}
              onChange={() => setMode("fillEmpty")}
            />
            只填空格
          </label>
          <label className="flex items-center gap-1 text-[11px] text-slate-600">
            <input
              type="radio"
              name="gradeMode"
              checked={mode === "overwriteNonSample"}
              onChange={() => setMode("overwriteNonSample")}
            />
            重写非基准列
          </label>
          <button
            type="button"
            onClick={applyGrade}
            className="rounded bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700"
          >
            按档差跳码
          </button>
          <button
            type="button"
            onClick={clearOthers}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
          >
            清除非基准值
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
                <th className="sticky left-0 z-10 bg-white py-2 pr-2">部位</th>
                <th className="py-2 pr-2">量法</th>
                <th className="py-2 pr-2 text-center" title="该行档差 cm">
                  档差
                </th>
                {chart.sizes.map((s) => (
                  <th
                    key={s}
                    className={`px-1 py-2 text-center ${
                      s === sampleSize ? "bg-blue-50 text-blue-700" : ""
                    }`}
                  >
                    <div className="inline-flex flex-col items-center gap-0.5">
                      <span>
                        {s}
                        {s === sampleSize && (
                          <span className="ml-0.5 text-[9px] font-normal">基准</span>
                        )}
                      </span>
                      {s !== sampleSize && (
                        <button
                          type="button"
                          onClick={() => removeSize(s)}
                          className="text-[10px] text-slate-300 hover:text-red-500"
                          title="缩小码段：删除此码"
                        >
                          删列
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, i) => {
                const partKey = row.part.trim();
                const step =
                  rowSteps[partKey] ?? inferGradeStepCm(row.part, row.method);
                return (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="sticky left-0 z-10 bg-white py-1.5 pr-2">
                      <input
                        value={row.part}
                        onChange={(e) => {
                          const rows = [...chart.rows];
                          rows[i] = { ...rows[i], part: e.target.value };
                          onChange({ ...chart, rows });
                        }}
                        className="w-20 rounded border border-transparent px-1 py-1 outline-none hover:border-slate-200 focus:border-blue-300"
                      />
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
                        title="本行相邻码档差（cm）"
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
                          className={`px-1 py-1.5 ${isSample ? "bg-blue-50/50" : ""}`}
                        >
                          <input
                            value={val}
                            onChange={(e) => {
                              const rows = [...chart.rows];
                              rows[i] = {
                                ...rows[i],
                                values: { ...rows[i].values, [s]: e.target.value },
                              };
                              onChange({ ...chart, rows });
                            }}
                            className={`w-14 rounded border px-1 py-1.5 text-center outline-none focus:border-blue-400 ${
                              isSample
                                ? "border-blue-200 font-medium text-slate-800"
                                : isManual
                                  ? "border-amber-200 bg-amber-50/40 text-slate-700"
                                  : "border-slate-100 text-slate-600"
                            }`}
                            title={
                              isSample
                                ? "基准码"
                                : isManual
                                  ? "已有值（手改或上次填充）；「只填空格」模式下不会覆盖"
                                  : "可手改"
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {chart.rows.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">
              暂无尺寸行，请先用 AI 填尺寸或添加部位
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
