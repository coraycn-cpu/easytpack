import { getRegionOption, type SizeRegionStandard } from "@/lib/size-chart/standards";
import type { SizeChart } from "@/types/project";

const METHOD_MAX_LEN = 12;

export function abbreviateMethod(method: string): string {
  const trimmed = method.trim();
  if (trimmed.length <= METHOD_MAX_LEN) return trimmed;
  return trimmed.slice(0, METHOD_MAX_LEN);
}

function pickSampleValue(
  values: Record<string, string> | undefined,
  sampleSize: string,
): string {
  if (!values) return "";
  const direct = values[sampleSize];
  if (direct?.trim()) return direct.trim();

  const lower = sampleSize.toLowerCase();
  for (const [key, val] of Object.entries(values)) {
    if (key.toLowerCase() === lower && val?.trim()) return val.trim();
    if (key.replace(/码$/u, "") === sampleSize && val?.trim()) return val.trim();
  }

  const filled = Object.values(values).find((v) => v?.trim());
  return filled?.trim() ?? "";
}

export function applySizeChartAssist(
  ai: {
    sizes: string[];
    rows: Array<{ part: string; method: string; values: Record<string, string> }>;
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

  const rows = ai.rows.map((row) => {
    const values: Record<string, string> = {};
    const sampleVal = pickSampleValue(row.values, sampleSize);
    for (const s of sizes) {
      values[s] = s === sampleSize ? sampleVal : row.values[s]?.trim() ?? "";
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
