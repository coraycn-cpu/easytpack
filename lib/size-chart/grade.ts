import type { SizeChart } from "@/types/project";

export type GradeMode = "fillEmpty" | "overwriteNonSample";

export type GradeOptions = {
  mode: GradeMode;
  /** Default cm step between adjacent sizes when row has no override */
  defaultStepCm?: number;
  /** Per-row step keyed by part name (trimmed) */
  rowSteps?: Record<string, number>;
};

const CIRCUMFERENCE_HINT =
  /胸|腰|臀|围|袖肥|袖宽|摆围|领围|袖笼|袖窿|大腿|小腿|臀围|胸围|腰围/i;
const LENGTH_HINT = /长|高|袖长|衣长|裤长|裙长|内长|外长|肩|背长/i;

/** Infer default grade step (cm) from part/method labels */
export function inferGradeStepCm(part: string, method?: string): number {
  const text = `${part} ${method ?? ""}`;
  if (CIRCUMFERENCE_HINT.test(text)) return 2;
  if (LENGTH_HINT.test(text)) return 1.5;
  return 2;
}

function parseCm(val: string | undefined): number | null {
  if (!val?.trim()) return null;
  const n = parseFloat(val.replace(/[^\d.+-]/g, ""));
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

function formatCm(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Apply grading from sampleSize across size columns.
 * - fillEmpty: only write blank cells
 * - overwriteNonSample: rewrite all non-sample columns from sample + step
 */
export function applySizeGrading(
  chart: SizeChart,
  options: GradeOptions,
): { chart: SizeChart; filled: number; skipped: number } {
  const sampleSize = chart.sampleSize?.trim();
  if (!sampleSize || !chart.sizes.includes(sampleSize)) {
    return { chart, filled: 0, skipped: 0 };
  }

  const sampleIdx = chart.sizes.indexOf(sampleSize);
  const defaultStep = options.defaultStepCm ?? 2;
  let filled = 0;
  let skipped = 0;

  const rows = chart.rows.map((row) => {
    const baseline = parseCm(row.values[sampleSize]);
    if (baseline == null) {
      skipped += chart.sizes.filter((s) => s !== sampleSize).length;
      return row;
    }

    const step =
      options.rowSteps?.[row.part.trim()] ??
      inferGradeStepCm(row.part, row.method) ??
      defaultStep;

    const values = { ...row.values };
    chart.sizes.forEach((size, idx) => {
      if (size === sampleSize) return;
      const existing = values[size]?.trim();
      if (options.mode === "fillEmpty" && existing) {
        skipped += 1;
        return;
      }
      const delta = (idx - sampleIdx) * step;
      values[size] = formatCm(baseline + delta);
      filled += 1;
    });

    return { ...row, values };
  });

  return {
    chart: { ...chart, rows },
    filled,
    skipped,
  };
}

/** Clear all non-sample size cells (keeps sample column). */
export function clearNonSampleSizes(chart: SizeChart): SizeChart {
  const sampleSize = chart.sampleSize?.trim();
  if (!sampleSize) return chart;
  return {
    ...chart,
    rows: chart.rows.map((row) => {
      const values = { ...row.values };
      for (const s of chart.sizes) {
        if (s !== sampleSize) values[s] = "";
      }
      return { ...row, values };
    }),
  };
}

/** Add a size column (empty values). No-op if exists. */
export function addSizeColumn(chart: SizeChart, sizeName: string): SizeChart {
  const name = sizeName.trim();
  if (!name || chart.sizes.includes(name)) return chart;
  return {
    ...chart,
    sizes: [...chart.sizes, name],
    rows: chart.rows.map((r) => ({
      ...r,
      values: { ...r.values, [name]: "" },
    })),
  };
}

/** Remove a size column. Refuses to remove the only size or sample size without reassignment. */
export function removeSizeColumn(chart: SizeChart, sizeName: string): SizeChart {
  if (!chart.sizes.includes(sizeName)) return chart;
  if (chart.sizes.length <= 1) return chart;
  if (sizeName === chart.sampleSize) return chart;

  const sizes = chart.sizes.filter((s) => s !== sizeName);
  return {
    ...chart,
    sizes,
    rows: chart.rows.map((r) => {
      const values = { ...r.values };
      delete values[sizeName];
      return { ...r, values };
    }),
  };
}

/** Suggest next size label after the last column (for quick expand). */
export function suggestNextSizeLabel(sizes: string[]): string {
  const last = sizes[sizes.length - 1]?.toUpperCase() ?? "L";
  const letterOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
  const idx = letterOrder.indexOf(last);
  if (idx >= 0 && idx < letterOrder.length - 1) return letterOrder[idx + 1];
  const num = parseInt(last, 10);
  if (!Number.isNaN(num)) return String(num + 2);
  return `${last}+`;
}

/** Suggest previous size label before the first column. */
export function suggestPrevSizeLabel(sizes: string[]): string {
  const first = sizes[0]?.toUpperCase() ?? "S";
  const letterOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
  const idx = letterOrder.indexOf(first);
  if (idx > 0) return letterOrder[idx - 1];
  const num = parseInt(first, 10);
  if (!Number.isNaN(num)) return String(num - 2);
  return `pre-${first}`;
}

/** Insert size at start of range. */
export function prependSizeColumn(chart: SizeChart, sizeName: string): SizeChart {
  const name = sizeName.trim();
  if (!name || chart.sizes.includes(name)) return chart;
  return {
    ...chart,
    sizes: [name, ...chart.sizes],
    rows: chart.rows.map((r) => ({
      ...r,
      values: { [name]: "", ...r.values },
    })),
  };
}
