"use client";

import {
  SIZE_REGION_OPTIONS,
  type SizeRegionStandard,
} from "@/lib/size-chart/standards";

export type SizeStandardInput = {
  regionStandard: SizeRegionStandard;
  sampleSize: string;
};

type SizeStandardFieldsProps = {
  value: SizeStandardInput;
  onChange: (value: SizeStandardInput) => void;
  compact?: boolean;
};

export function defaultSizeStandard(
  regionStandard: SizeRegionStandard = "cn",
): SizeStandardInput {
  const opt = SIZE_REGION_OPTIONS.find((o) => o.id === regionStandard)!;
  return { regionStandard, sampleSize: opt.sampleDefault };
}

export default function SizeStandardFields({
  value,
  onChange,
  compact,
}: SizeStandardFieldsProps) {
  const region = SIZE_REGION_OPTIONS.find((o) => o.id === value.regionStandard)!;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <label className="block text-[11px] font-medium text-slate-600">
        区域标准
        <select
          value={value.regionStandard}
          onChange={(e) => {
            const next = e.target.value as SizeRegionStandard;
            const opt = SIZE_REGION_OPTIONS.find((o) => o.id === next)!;
            onChange({ regionStandard: next, sampleSize: opt.sampleDefault });
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-400"
        >
          {SIZE_REGION_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {!compact && (
          <span className="mt-0.5 block text-[10px] text-slate-400">{region.hint}</span>
        )}
      </label>

      <label className="block text-[11px] font-medium text-slate-600">
        样衣基准码
        <input
          value={value.sampleSize}
          onChange={(e) => onChange({ ...value, sampleSize: e.target.value })}
          placeholder={region.sampleDefault}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-400"
        />
        {!compact && (
          <span className="mt-0.5 block text-[10px] text-slate-400">
            图片中样衣的实际尺码，用于 AI 估算测量点数值
          </span>
        )}
      </label>
    </div>
  );
}
