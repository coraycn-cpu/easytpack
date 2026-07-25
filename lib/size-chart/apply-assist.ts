import { canonicalPartKey } from "@/lib/ai/merge-identity";
import { getRegionOption, type SizeRegionStandard } from "@/lib/size-chart/standards";
import type { SizeChart } from "@/types/project";

const METHOD_MAX_LEN = 12;

export type AiSizeChartRow = {
  part: string;
  method: string;
  baseline_cm?: string | number;
  values?: Record<string, string | number>;
};

function toCmString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" && !Number.isNaN(val) && val > 0) {
    return val.toFixed(1);
  }
  const s = String(val).trim();
  if (!s) return "";
  const num = parseFloat(s.replace(/[^\d.+-]/g, ""));
  if (!Number.isNaN(num) && num > 0) {
    return num.toFixed(1);
  }
  return "";
}

function normalizeSizeKey(key: string): string {
  return key.replace(/\s/g, "").replace(/基准/g, "").replace(/码$/u, "").toLowerCase();
}

export function pickSampleValue(
  values: Record<string, string | number> | undefined,
  sampleSize: string,
): string {
  if (!values) return "";
  const target = normalizeSizeKey(sampleSize);

  for (const [key, val] of Object.entries(values)) {
    const cm = toCmString(val);
    if (!cm) continue;
    if (key === sampleSize || normalizeSizeKey(key) === target) return cm;
  }

  for (const val of Object.values(values)) {
    const cm = toCmString(val);
    if (cm) return cm;
  }
  return "";
}

export function extractBaselineCm(row: AiSizeChartRow, sampleSize: string): string {
  return toCmString(row.baseline_cm) || pickSampleValue(row.values, sampleSize);
}

export function abbreviateMethod(method: string): string {
  const trimmed = method.trim();
  if (trimmed.length <= METHOD_MAX_LEN) return trimmed;
  return trimmed.slice(0, METHOD_MAX_LEN);
}

function mergeRows(
  aiRows: AiSizeChartRow[] | undefined,
  existingRows: SizeChart["rows"] | undefined,
  sampleSize: string,
): AiSizeChartRow[] {
  const rows = aiRows ?? [];
  if (rows.length === 0) {
    return (existingRows ?? []).map((r) => ({
      part: r.part,
      method: r.method,
      baseline_cm: r.values[sampleSize],
      values: r.values,
    }));
  }

  if (!existingRows?.length) return rows;

  const aiMap = new Map(rows.map((r) => [canonicalPartKey(r.part), r]));
  const merged: AiSizeChartRow[] = [];
  const seen = new Set<string>();

  for (const ex of existingRows) {
    const pk = canonicalPartKey(ex.part);
    const aiRow = aiMap.get(pk);
    seen.add(pk);
    // 已有数值优先：只补空号型，不覆盖用户手改
    const mergedValues = { ...(aiRow?.values ?? {}), ...ex.values };
    if (aiRow?.values) {
      for (const [size, val] of Object.entries(aiRow.values)) {
        const cur = String(ex.values[size] ?? "").trim();
        if (!cur) mergedValues[size] = val;
      }
    }
    merged.push(
      aiRow
        ? {
            part: ex.part,
            method: aiRow.method || ex.method,
            baseline_cm:
              String(ex.values[sampleSize] ?? "").trim() ||
              extractBaselineCm(aiRow, sampleSize) ||
              ex.values[sampleSize],
            values: mergedValues,
          }
        : {
            part: ex.part,
            method: ex.method,
            baseline_cm: ex.values[sampleSize],
            values: ex.values,
          },
    );
  }

  for (const aiRow of rows) {
    const pk = canonicalPartKey(aiRow.part);
    if (!seen.has(pk)) {
      seen.add(pk);
      merged.push(aiRow);
    }
  }

  return merged.length > 0 ? merged : rows;
}

export function applySizeChartAssist(
  ai: {
    sizes: string[];
    rows: AiSizeChartRow[];
  },
  meta: { regionStandard: SizeRegionStandard; sampleSize: string },
  existing?: SizeChart,
): SizeChart {
  const sampleSize = meta.sampleSize.trim();
  const region = getRegionOption(meta.regionStandard);

  let sizes =
    ai.sizes.length > 0
      ? [...ai.sizes]
      : existing?.sizes?.length
        ? [...existing.sizes]
        : [...region.defaultSizes];

  if (!sizes.includes(sampleSize)) {
    sizes = [...sizes, sampleSize];
  }

  const merged = mergeRows(ai.rows, existing?.rows, sampleSize);

  const rows = merged.map((row) => {
    const sampleVal = extractBaselineCm(row, sampleSize);
    const values: Record<string, string> = {};
    for (const s of sizes) {
      values[s] = s === sampleSize ? sampleVal : toCmString(row.values?.[s]) || "";
    }
    return {
      part: row.part.trim(),
      method: abbreviateMethod(row.method),
      values,
    };
  });

  return {
    regionStandard: meta.regionStandard,
    sampleSize,
    sizes,
    rows,
  };
}

export function countFilledBaselineValues(chart: SizeChart): number {
  if (!chart.sampleSize) return 0;
  return chart.rows.filter((r) => r.values[chart.sampleSize!]?.trim()).length;
}
