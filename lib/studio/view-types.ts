export type ViewImageKind = "line_art" | "back" | "collar" | "cuff" | "custom";

export type ViewImagePreset = {
  kind: Exclude<ViewImageKind, "custom">;
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
  return VIEW_IMAGE_PRESET_MAP[kind]?.promptHint ?? kind;
}

export function isViewImageKind(value: string): value is ViewImageKind {
  return (
    value === "custom" ||
    VIEW_IMAGE_PRESETS.some((p) => p.kind === value)
  );
}

/** 侧栏 AI 使用说明 */
export const VIEW_IMAGE_AI_GUIDE = [
  "基于左侧「正面主图」生成指定视角款式图",
  "生成结果须与原版版型、面料、颜色、工艺细节一致，尺寸比例与导入主图相同",
  "若效果有偏差，可在生成图下方填写修正提示词后点「重新生成」",
] as const;
