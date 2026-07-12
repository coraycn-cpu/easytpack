export type ViewImageKind =
  | "flat_front"
  | "line_art"
  | "back"
  | "collar"
  | "cuff"
  | "custom";

/** 选款后自动生成的平铺正面（不在侧栏展示） */
export const FLAT_FRONT_VIEW_HINT =
  "从参考图中提取目标单款，生成完整正面平铺图，无模特、白底或中性背景，版型颜色面料与目标款一致，专业服装摄影平铺风格";

/** 套装选款时的平铺正面 */
export const FLAT_FRONT_SET_VIEW_HINT =
  "从参考图中提取目标套装（上装与下装一起），生成完整正面平铺图，上下装比例与穿着关系与参考一致，无模特、白底或中性背景，专业服装摄影平铺风格";

export type ViewImagePreset = {
  kind: Exclude<ViewImageKind, "custom" | "flat_front">;
  label: string;
  icon: string;
  promptHint: string;
};

/** B 区 AI 生图：线稿 / 背面 / 领口 / 袖口 + 自定义视角 */
export const VIEW_IMAGE_PRESETS: ViewImagePreset[] = [
  {
    kind: "line_art",
    label: "线稿图",
    icon: "✎",
    promptHint:
      "同一款式的干净线稿平铺图，仅保留轮廓与结构线，版型与正面完全一致，无填色无阴影，工艺单线稿风格",
  },
  {
    kind: "back",
    label: "背面图",
    icon: "↩",
    promptHint:
      "同一款式的完整背面平铺图，版型、颜色、面料与工艺与正面完全一致，专业服装摄影平铺风格",
  },
  {
    kind: "collar",
    label: "领口",
    icon: "◠",
    promptHint:
      "领口区域细节特写，清晰展示领型、罗纹、包边或门襟等结构，颜色面料与主款一致",
  },
  {
    kind: "cuff",
    label: "袖口",
    icon: "⌇",
    promptHint:
      "袖口区域细节特写，清晰展示袖型、罗纹、包边或开衩等结构，颜色面料与主款一致",
  },
];

export const VIEW_IMAGE_PRESET_MAP = Object.fromEntries(
  VIEW_IMAGE_PRESETS.map((p) => [p.kind, p]),
) as Record<Exclude<ViewImageKind, "custom">, ViewImagePreset>;

export function getViewPresetHint(kind: ViewImageKind, customPrompt?: string): string {
  if (kind === "custom") return customPrompt?.trim() ?? "自定义视角";
  if (kind === "flat_front") return FLAT_FRONT_VIEW_HINT;
  return VIEW_IMAGE_PRESET_MAP[kind as Exclude<ViewImageKind, "custom" | "flat_front">]?.promptHint ?? kind;
}

export function isViewImageKind(value: string): value is ViewImageKind {
  return (
    value === "custom" ||
    value === "flat_front" ||
    VIEW_IMAGE_PRESETS.some((p) => p.kind === value)
  );
}

/** 侧栏 AI 使用说明（单行紧凑） */
export const VIEW_IMAGE_AI_GUIDE =
  "基于正面主图生成 · 版型/面料/颜色与主图一致 · 偏差可展开修正后重生成";
