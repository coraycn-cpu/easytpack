import { generateProcessId } from "@/lib/process/ids";
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
    const byPart = new Map(
      updated.process_items.map((p) => [p.part, p] as const),
    );
    let added = 0;
    let edited = 0;
    for (const raw of data.process_items as ProcessItem[]) {
      const part = raw.part?.trim();
      if (!part) continue;
      const prev = byPart.get(part);
      if (prev) {
        byPart.set(part, {
          ...prev,
          ...raw,
          id: prev.id || raw.id || generateProcessId(),
          part,
        });
        edited += 1;
      } else {
        byPart.set(part, {
          ...raw,
          id: raw.id || generateProcessId(),
          part,
        });
        added += 1;
      }
    }
    updated.process_items = Array.from(byPart.values());
    if (added || edited) {
      changeSummary.push(
        `工艺${added ? ` +${added}` : ""}${edited ? ` 改${edited}` : ""}`,
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
    const byName = new Map(
      updated.bom_items.map((b) => [b.name, b] as const),
    );
    let added = 0;
    let edited = 0;
    for (const raw of data.bom_items as BomItem[]) {
      const name = raw.name?.trim();
      if (!name) continue;
      const prev = byName.get(name);
      if (prev) {
        byName.set(name, { ...prev, ...raw, name });
        edited += 1;
      } else {
        byName.set(name, { ...raw, name });
        added += 1;
      }
    }
    updated.bom_items = Array.from(byName.values());
    if (added || edited) {
      changeSummary.push(
        `物料${added ? ` +${added}` : ""}${edited ? ` 改${edited}` : ""}`,
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
