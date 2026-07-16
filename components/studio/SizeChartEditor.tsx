"use client";

import { useState } from "react";
import { regionStandardLabel } from "@/lib/size-chart/standards";
import SizeGradeDialog from "@/components/studio/SizeGradeDialog";
import type { SizeChart } from "@/types/project";

type SizeChartEditorProps = {
  chart: SizeChart;
  onChange: (chart: SizeChart) => void;
  compact?: boolean;
  flat?: boolean;
  selectedAnnId?: string | null;
  dimensionLinkable?: boolean;
  linkedSizePartForSelection?: string;
  onToggleSizeLink?: (part: string, linked: boolean) => void;
  highlightedSizePart?: string;
  onSizeRowSelect?: (part: string, index: number) => void;
  dimensionCounts?: Record<string, number>;
  onRemoveRowPart?: (part: string) => void;
};

export default function SizeChartEditor({
  chart,
  onChange,
  compact,
  flat,
  selectedAnnId,
  dimensionLinkable,
  linkedSizePartForSelection,
  onToggleSizeLink,
  highlightedSizePart,
  onSizeRowSelect,
  dimensionCounts,
  onRemoveRowPart,
}: SizeChartEditorProps) {
  const [gradeOpen, setGradeOpen] = useState(false);
  const sampleSize = chart.sampleSize;
  const regionLabel = regionStandardLabel(chart.regionStandard);

  const addSize = () => {
    const name = window.prompt("新尺码名称", "XL");
    if (!name?.trim() || chart.sizes.includes(name.trim())) return;
    const sizes = [...chart.sizes, name.trim()];
    const rows = chart.rows.map((r) => ({
      ...r,
      values: { ...r.values, [name.trim()]: "" },
    }));
    onChange({ ...chart, sizes, rows });
  };

  const removeSize = (size: string) => {
    if (size === sampleSize) {
      window.alert("不能删除基准码列；请先在跳码面板中调整");
      return;
    }
    const sizes = chart.sizes.filter((s) => s !== size);
    const rows = chart.rows.map((r) => {
      const values = { ...r.values };
      delete values[size];
      return { ...r, values };
    });
    onChange({ ...chart, sizes, rows });
  };

  const addRow = () => {
    const values = Object.fromEntries(chart.sizes.map((s) => [s, ""]));
    onChange({
      ...chart,
      rows: [...chart.rows, { part: "新部位", method: "平量", values }],
    });
  };

  const updateRow = (index: number, field: "part" | "method", value: string) => {
    const rows = [...chart.rows];
    rows[index] = { ...rows[index], [field]: value };
    onChange({ ...chart, rows });
  };

  const updateCell = (rowIndex: number, size: string, value: string) => {
    const rows = [...chart.rows];
    rows[rowIndex] = {
      ...rows[rowIndex],
      values: { ...rows[rowIndex].values, [size]: value },
    };
    onChange({ ...chart, rows });
  };

  const removeRow = (index: number) => {
    const part = chart.rows[index]?.part?.trim();
    onChange({ ...chart, rows: chart.rows.filter((_, i) => i !== index) });
    if (part) onRemoveRowPart?.(part);
  };

  if (chart.sizes.length === 0 && chart.rows.length === 0) {
    return (
      <div className="text-xs">
        <p className="text-zinc-400">暂无尺寸表，可用 AI 填尺寸表或从模板创建</p>
        <button
          type="button"
          onClick={() =>
            onChange({
              sizes: ["S", "M", "L", "XL"],
              sampleSize: "M",
              rows: [
                { part: "胸宽", method: "夹下1cm", values: { S: "", M: "", L: "", XL: "" } },
                { part: "衣长", method: "后中直量", values: { S: "", M: "", L: "", XL: "" } },
              ],
            })
          }
          className="mt-2 text-blue-600 hover:underline"
        >
          + 从模板创建
        </button>
      </div>
    );
  }

  return (
    <div className={`text-xs ${compact ? "overflow-hidden" : flat ? "" : "max-h-80 overflow-auto"}`}>
      {(regionLabel || sampleSize) && (
        <p className="mb-2 text-[10px] text-slate-500">
          {regionLabel && <span>{regionLabel}</span>}
          {regionLabel && sampleSize && " · "}
          {sampleSize && (
            <span>
              基准码 <span className="font-medium text-blue-600">{sampleSize}</span>
            </span>
          )}
        </p>
      )}
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" onClick={addSize} className="text-blue-600 hover:underline">
          + 尺码
        </button>
        <button type="button" onClick={addRow} className="text-blue-600 hover:underline">
          + 部位
        </button>
        <button
          type="button"
          onClick={() => setGradeOpen(true)}
          className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-700"
          title="打开大面板：跳码、增减码段、手改"
        >
          跳码 / 放码
        </button>
      </div>
      <p className="mb-2 text-[10px] leading-snug text-slate-400">
        码段可增减；跳码在大面板操作，默认只填空格、不覆盖手改。
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-zinc-400">
            <th className="py-1 text-left">部位</th>
            <th className="max-w-[3.5rem] py-1 text-left">量法</th>
            {chart.sizes.map((s) => (
              <th
                key={s}
                className={`px-0.5 py-1 ${s === sampleSize ? "bg-blue-50 text-blue-600" : ""}`}
              >
                <span className="inline-flex items-center gap-0.5">
                  {s}
                  {s === sampleSize && (
                    <span className="text-[8px] font-normal text-blue-400">基准</span>
                  )}
                  {s !== sampleSize && (
                    <button
                      type="button"
                      onClick={() => removeSize(s)}
                      className="text-zinc-300 hover:text-red-400"
                    >
                      ×
                    </button>
                  )}
                </span>
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row, i) => {
            const partKey = row.part.trim();
            const dimCount = partKey ? dimensionCounts?.[partKey] ?? 0 : 0;
            const isHighlighted = partKey && highlightedSizePart === partKey;
            const isLinkedToSelection =
              partKey && linkedSizePartForSelection === partKey;

            return (
              <tr
                key={i}
                role={onSizeRowSelect && partKey ? "button" : undefined}
                tabIndex={onSizeRowSelect && partKey ? 0 : undefined}
                onClick={() => partKey && onSizeRowSelect?.(partKey, i)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && partKey) {
                    onSizeRowSelect?.(partKey, i);
                  }
                }}
                className={`border-t border-zinc-50 ${
                  isHighlighted ? "bg-amber-50 ring-1 ring-amber-200" : ""
                } ${dimCount > 0 ? "bg-emerald-50/40" : ""}`}
              >
                <td className="py-1 pr-1">
                  <div className="flex items-center gap-0.5">
                    {selectedAnnId && dimensionLinkable && partKey && onToggleSizeLink && (
                      <input
                        type="checkbox"
                        checked={Boolean(isLinkedToSelection)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onToggleSizeLink(partKey, e.target.checked)}
                        className="shrink-0"
                        title="关联当前选中尺寸线"
                      />
                    )}
                    <input
                      value={row.part}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateRow(i, "part", e.target.value)}
                      className="w-14 bg-transparent outline-none"
                    />
                    {dimCount > 0 && (
                      <span className="text-[8px] text-emerald-600">{dimCount}线</span>
                    )}
                  </div>
                </td>
                <td className="max-w-[3.5rem] py-1 pr-0.5">
                  <input
                    value={row.method}
                    onChange={(e) => updateRow(i, "method", e.target.value)}
                    maxLength={12}
                    title={row.method}
                    className="w-full min-w-0 bg-transparent text-[10px] text-zinc-500 outline-none"
                  />
                </td>
                {chart.sizes.map((s) => (
                  <td
                    key={s}
                    className={`px-0.5 py-1 ${s === sampleSize ? "bg-blue-50/60" : ""}`}
                  >
                    <input
                      value={row.values[s] ?? ""}
                      onChange={(e) => updateCell(i, s, e.target.value)}
                      placeholder={s === sampleSize ? "—" : ""}
                      className={`w-9 bg-transparent text-center outline-none ${
                        s === sampleSize ? "font-medium text-slate-800" : "text-zinc-400"
                      }`}
                    />
                  </td>
                ))}
                <td className="py-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRow(i);
                    }}
                    className="text-zinc-300 hover:text-red-400"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <SizeGradeDialog
        chart={chart}
        open={gradeOpen}
        onClose={() => setGradeOpen(false)}
        onChange={onChange}
      />
    </div>
  );
}
