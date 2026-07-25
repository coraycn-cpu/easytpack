import { generateProcessId } from "@/lib/process/ids";
import {
  upsertBomItems,
  upsertProcessItems,
} from "@/lib/ai/merge-identity";
import { applySizeChartAssist } from "@/lib/size-chart/apply-assist";
import type { AiChatResponse, BomItem, ProcessItem } from "@/types/process";
import type { TechPackProject } from "@/types/project";

export type ChatApplyResult = {
  project: TechPackProject;
  /** 人类可读变更摘要，用于气泡回执 */
  changeSummary: string[];
};

/** 将对话结构化补丁合并进项目（工艺 upsert、BOM upsert、显式删除） */
export function applyChatResponseToProject(
  project: TechPackProject,
  data: AiChatResponse,
): ChatApplyResult {
  const updated: TechPackProject = { ...project };
  const changeSummary: string[] = [];

  if (data.title?.trim() && data.title.trim() !== project.title) {
    updated.title = data.title.trim();
    changeSummary.push(`标题 → ${updated.title}`);
  }

  const removeParts = new Set(
    (data.remove_process_parts ?? []).map((p) => p.trim()).filter(Boolean),
  );
  if (removeParts.size > 0) {
    const before = updated.process_items.length;
    updated.process_items = updated.process_items.filter(
      (p) => !removeParts.has(p.part),
    );
    const n = before - updated.process_items.length;
    if (n > 0) changeSummary.push(`删除工艺 ${n} 项`);
  }

  if (data.process_items?.length) {
    const { items, added, merged } = upsertProcessItems(
      updated.process_items,
      data.process_items as ProcessItem[],
      generateProcessId,
    );
    updated.process_items = items;
    if (added || merged) {
      changeSummary.push(
        `工艺${added ? ` +${added}` : ""}${merged ? ` 合并${merged}` : ""}`,
      );
    }
  }

  const removeBom = new Set(
    (data.remove_bom_names ?? []).map((n) => n.trim()).filter(Boolean),
  );
  if (removeBom.size > 0) {
    const before = updated.bom_items.length;
    updated.bom_items = updated.bom_items.filter((b) => !removeBom.has(b.name));
    const n = before - updated.bom_items.length;
    if (n > 0) changeSummary.push(`删除物料 ${n} 项`);
  }

  if (data.bom_items?.length) {
    const { items, added, merged } = upsertBomItems(
      updated.bom_items,
      data.bom_items as BomItem[],
    );
    updated.bom_items = items;
    if (added || merged) {
      changeSummary.push(
        `物料${added ? ` +${added}` : ""}${merged ? ` 合并${merged}` : ""}`,
      );
    }
  }

  if (data.size_chart?.rows?.length) {
    updated.size_chart = applySizeChartAssist(
      {
        sizes: data.size_chart.sizes ?? updated.size_chart.sizes,
        rows: data.size_chart.rows,
      },
      {
        regionStandard: updated.size_chart.regionStandard ?? "cn",
        sampleSize: updated.size_chart.sampleSize ?? "M",
      },
      updated.size_chart,
    );
    changeSummary.push(`尺码表更新 ${data.size_chart.rows.length} 行`);
  }

  return { project: updated, changeSummary };
}
