import { NextRequest } from "next/server";
import { generateTechPackEnTranslation } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
import type { TechPackEnOverlay } from "@/lib/export/en-overlay";
import { slimProjectForTranslate } from "@/lib/export/en-overlay";
import type { TechPackProject } from "@/types/project";

function asOverlay(raw: unknown): TechPackEnOverlay {
  const o = raw as TechPackEnOverlay;
  return {
    title: String(o.title ?? ""),
    description: String(o.description ?? ""),
    category: String(o.category ?? ""),
    targetLabel: String(o.targetLabel ?? ""),
    style_review: String(o.style_review ?? ""),
    process_items: Array.isArray(o.process_items) ? o.process_items : [],
    bom_items: Array.isArray(o.bom_items) ? o.bom_items : [],
    size_rows: Array.isArray(o.size_rows) ? o.size_rows : [],
    artboard_names:
      o.artboard_names && typeof o.artboard_names === "object"
        ? o.artboard_names
        : undefined,
    correction_notes: o.correction_notes
      ? String(o.correction_notes)
      : undefined,
  };
}

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "translate-techpack",
    units: 1,
    run: async (body) => {
      const project = body.project as TechPackProject | undefined;
      if (!project || typeof project !== "object") {
        throw new Error("缺少项目数据");
      }
      const payload = slimProjectForTranslate(project);
      const existingOverlay = body.existingOverlay
        ? asOverlay(body.existingOverlay)
        : null;
      const correctionHints =
        typeof body.correctionHints === "string"
          ? body.correctionHints
          : undefined;

      const result = await generateTechPackEnTranslation({
        payload,
        existingOverlay,
        correctionHints,
      });

      const overlay = asOverlay(result);

      // 长度对齐：不足则用原文占位，避免导出错位
      while (overlay.process_items.length < payload.process_items.length) {
        const i = overlay.process_items.length;
        overlay.process_items.push({ ...payload.process_items[i] });
      }
      while (overlay.bom_items.length < payload.bom_items.length) {
        const i = overlay.bom_items.length;
        overlay.bom_items.push({ ...payload.bom_items[i] });
      }
      while (overlay.size_rows.length < payload.size_rows.length) {
        const i = overlay.size_rows.length;
        overlay.size_rows.push({ ...payload.size_rows[i] });
      }

      return { overlay };
    },
  });
}
