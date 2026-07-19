import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";
import { buildGarmentScopeContext } from "@/lib/ai/garment-scope";
import { photoTypeLabel } from "@/lib/intake/apply-intent";
import type { TechPackProject } from "@/types/project";

/** 对话用瘦上下文：不含 imageDataUrl，避免上传大图 */
export type ChatProjectContext = {
  title: string;
  intake: {
    description?: string;
    detectedCategory?: string;
    photoType?: TechPackProject["intake"]["photoType"];
    targetGarment?: TechPackProject["intake"]["targetGarment"];
    visibleGarments?: TechPackProject["intake"]["visibleGarments"];
    garmentConfirmed?: boolean;
    aiIntentAnalysis?: string;
    detectedFeatures?: string[];
    suggestedTitle?: string;
  };
  process_items: TechPackProject["process_items"];
  bom_items: TechPackProject["bom_items"];
  size_chart: {
    regionStandard?: string;
    sampleSize?: string;
    sizes: string[];
    rows: Array<{
      part: string;
      method: string;
      values: Record<string, string>;
    }>;
  };
  questionnaireAnswers?: Record<string, unknown>;
  style_review?: string;
  activeArtboardName?: string;
  primaryArtboardName?: string;
  artboardNames?: string[];
};

/** 去掉后来拼进字段的「初稿说明」，只保留建款识图原始 summary */
export function originalIntentAnalysis(raw?: string): string {
  if (!raw?.trim()) return "";
  return raw.split(/\n\n初稿说明[：:]/)[0]?.trim() ?? "";
}

export function buildChatProjectContext(
  project: TechPackProject,
  options?: { activeArtboardId?: string },
): ChatProjectContext {
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const primary = primaryId
    ? project.canvas_data.artboards.find((a) => a.id === primaryId)
    : undefined;
  const activeId =
    options?.activeArtboardId ?? project.canvas_data.activeArtboardId;
  const active = activeId
    ? project.canvas_data.artboards.find((a) => a.id === activeId)
    : undefined;

  return {
    title: project.title,
    intake: {
      description: project.intake.description,
      detectedCategory: project.intake.detectedCategory,
      photoType: project.intake.photoType,
      targetGarment: project.intake.targetGarment,
      visibleGarments: project.intake.visibleGarments,
      garmentConfirmed: project.intake.garmentConfirmed,
      aiIntentAnalysis: originalIntentAnalysis(project.intake.aiIntentAnalysis),
      detectedFeatures: project.intake.detectedFeatures,
      suggestedTitle: project.intake.suggestedTitle,
    },
    process_items: project.process_items.map((p) => ({
      id: p.id,
      part: p.part,
      process: p.process,
      stitch: p.stitch,
      seam_allowance: p.seam_allowance,
    })),
    bom_items: project.bom_items.map((b) => ({
      name: b.name,
      category: b.category,
      garmentPart: b.garmentPart,
      spec: b.spec,
      color: b.color,
      usage: b.usage,
    })),
    size_chart: {
      regionStandard: project.size_chart.regionStandard,
      sampleSize: project.size_chart.sampleSize,
      sizes: project.size_chart.sizes ?? [],
      rows: (project.size_chart.rows ?? []).map((r) => ({
        part: r.part,
        method: r.method,
        values: r.values ?? {},
      })),
    },
    questionnaireAnswers: project.questionnaire?.answers,
    style_review: project.style_review,
    activeArtboardName: active?.name,
    primaryArtboardName: primary?.name,
    artboardNames: project.canvas_data.artboards.map((a) => a.name),
  };
}

export function summarizeChatContext(ctx: ChatProjectContext): string {
  const scope = buildGarmentScopeContext({
    ...ctx.intake,
    description: ctx.intake.description ?? "",
  });
  const sample = ctx.size_chart.sampleSize ?? "M";
  const photo = photoTypeLabel(ctx.intake.photoType);
  const analysis = originalIntentAnalysis(ctx.intake.aiIntentAnalysis);
  const targetLabel =
    ctx.intake.targetGarment?.label ||
    ctx.intake.suggestedTitle ||
    ctx.title;
  const targetCat =
    ctx.intake.targetGarment?.category ||
    ctx.intake.detectedCategory ||
    "服装";

  const processLines =
    ctx.process_items
      .map((p) => {
        const bits = [
          p.id ? `id=${p.id}` : null,
          `${p.part}=${p.process}`,
          p.stitch ? `针法:${p.stitch}` : null,
          p.seam_allowance ? `缝份:${p.seam_allowance}` : null,
        ].filter(Boolean);
        return bits.join(" ");
      })
      .join("；") || "无";

  const bomLines =
    ctx.bom_items
      .map((b) => {
        const bits = [
          b.name,
          b.category,
          b.spec,
          b.color,
          b.usage ? `用量${b.usage}` : null,
        ].filter(Boolean);
        return bits.join("/");
      })
      .join("；") || "无";

  const sizeRows =
    ctx.size_chart.rows
      .slice(0, 24)
      .map((r) => {
        const base =
          r.values?.[sample] ?? Object.values(r.values ?? {})[0] ?? "";
        return `${r.part}(${r.method})${base ? `=${base}` : ""}`;
      })
      .join("；") || "无测量点";

  const answers = ctx.questionnaireAnswers
    ? JSON.stringify(ctx.questionnaireAnswers).slice(0, 400)
    : "无";

  return `
【数据源规则 — 必须遵守】
1. 款式本体（品类、结构、面料、领口袖长等）：只依据「原始建款信息」+ 上传原参考图；不要用背面/线稿/裁切图重新定义本款。
2. 工艺包文字（标题/工艺说明/BOM/尺码/评语）：只依据下方「工艺包现状」，与画板选中无关。
3. 标工艺、生图、评当前板画面：依据「当前选中画板」（名称 + 若有附图）。

【原始建款信息】（唯一款式分析来源）
参考图类型：${photo}
用户描述：${ctx.intake.description || "无"}
目标款：${targetLabel}（${targetCat}）${ctx.intake.garmentConfirmed ? " · 已确认" : " · 未确认"}
建款识图摘要：${analysis || "无"}
识别特征：${(ctx.intake.detectedFeatures ?? []).join("、") || "无"}
可见服装列表：${
    (ctx.intake.visibleGarments ?? [])
      .map((g) => `${g.label}(${g.category})`)
      .join("、") || "无"
  }

${scope}

【工艺包现状】（可改文字字段；与画板选中无关）
款式标题：${ctx.title}
工艺条目：${processLines}
物料：${bomLines}
尺码列：${ctx.size_chart.sizes.join("/") || "未设置"}（基准码 ${sample}，标准 ${ctx.size_chart.regionStandard ?? "cn"}）
测量点：${sizeRows}
问卷答案：${answers}
款式评语：${ctx.style_review?.trim() ? ctx.style_review.trim().slice(0, 120) : "无"}

【画布选中】（仅标注/生图/评当前板；不作为款式本体定义）
当前选中画板：${ctx.activeArtboardName ?? "无"}
主款画板：${ctx.primaryArtboardName ?? "无"}
全部画板：${(ctx.artboardNames ?? []).join("、") || "无"}
`.trim();
}

const FALLBACK_WELCOME =
  "你好！我是本款的版房 AI 助手。问款式（面料/领口等）以你上传的原始参考图为准；改工艺说明/物料/尺码看工艺包文字；点「标工艺/生图」等建议时按当前选中画板执行。";

/**
 * 用原始建款识图结果生成开场白（不含初稿说明等后加内容）。
 */
export function buildChatWelcomeMessage(
  project: Pick<TechPackProject, "title" | "intake">,
): string {
  const { intake, title } = project;
  const analysis = originalIntentAnalysis(intake.aiIntentAnalysis);
  const category =
    intake.targetGarment?.category ||
    intake.detectedCategory ||
    "服装";
  const label =
    intake.targetGarment?.label ||
    intake.suggestedTitle ||
    title ||
    "当前款式";
  const features = (intake.detectedFeatures ?? [])
    .map((f) => f.trim())
    .filter(Boolean)
    .slice(0, 6);
  const photo = photoTypeLabel(intake.photoType);

  if (!analysis && features.length === 0 && !intake.detectedCategory) {
    return FALLBACK_WELCOME;
  }

  const lines: string[] = [
    `你好！我是「${label}」的版房 AI 助手。`,
    `问款式用你上传的原始${photo}（建款识图），不以后续背面/线稿为准；改工艺说明/物料/尺码看工艺包文字；标工艺或生图则按当前选中画板。`,
  ];

  if (intake.garmentConfirmed && intake.targetGarment) {
    lines.push(
      `当前 Tech Pack 目标款：${intake.targetGarment.label}（${intake.targetGarment.category}）。`,
    );
  }

  if (analysis) {
    lines.push(`建款识图摘要：${analysis}`);
  }
  if (features.length > 0) {
    lines.push(`识别特征：${features.join("、")}。`);
  }
  lines.push(
    "可问面料、工艺、袖长、领口等本款问题；也可改工艺包。与本款无关的问题我会婉拒。",
  );
  return lines.join("\n\n");
}
