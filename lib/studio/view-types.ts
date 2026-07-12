export type ViewImageKind = "back" | "side" | "collar_cuff" | "hem" | "custom";

export type ViewImagePreset = {
  kind: Exclude<ViewImageKind, "custom">;
  label: string;
  icon: string;
  promptHint: string;
};

/** B 区 AI 生图：4 个部位预设 + 1 个自定义提示词 */
export const VIEW_IMAGE_PRESETS: ViewImagePreset[] = [
  {
    kind: "back",
    label: "背面图",
    icon: "↩",
    promptHint:
      "同一款式的完整背面平铺图，保持版型、颜色与正面一致，专业服装摄影平铺风格",
  },
  {
    kind: "side",
    label: "侧面图",
    icon: "↔",
    promptHint:
      "同一款式的侧面平铺或挂拍图，展示侧缝、袖型与整体轮廓",
  },
  {
    kind: "collar_cuff",
    label: "领口袖口",
    icon: "◎",
    promptHint:
      "领口与袖口细节特写，清晰展示工艺、罗纹或包边等结构",
  },
  {
    kind: "hem",
    label: "下摆细节",
    icon: "⌁",
    promptHint:
      "下摆、口袋或门襟等局部细节特写，保持与正面款式一致的颜色与工艺",
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
