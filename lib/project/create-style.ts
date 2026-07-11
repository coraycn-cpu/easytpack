import { getRegionOption, type SizeRegionStandard } from "@/lib/size-chart/standards";
import { createEmptyProject, saveProject } from "@/lib/project/storage";
import type { IntakeData, SizeChart, TechPackProject } from "@/types/project";

export function buildInitialSizeChart(
  regionStandard: SizeRegionStandard,
  sampleSize: string,
): SizeChart {
  const region = getRegionOption(regionStandard);
  const sizes = [...region.defaultSizes];
  if (!sizes.includes(sampleSize)) {
    sizes.push(sampleSize);
  }
  return {
    regionStandard,
    sampleSize,
    sizes,
    rows: [],
  };
}

export function createStyleProject(input: {
  title?: string;
  intake: IntakeData;
  regionStandard: SizeRegionStandard;
  sampleSize: string;
  status: "studio" | "collecting";
}): TechPackProject {
  const project = createEmptyProject({
    title: input.title ?? "未命名款式",
    intake: input.intake,
  });
  project.status = input.status;
  project.size_chart = buildInitialSizeChart(input.regionStandard, input.sampleSize);
  saveProject(project);
  return project;
}
