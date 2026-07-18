export type ViewImageKind =
  | "flat_front"
  | "line_art"
  | "back"
  | "collar"
  | "cuff"
  | "custom";

/** 选款后自动生成的平铺正面（不在侧栏展示） */
export const FLAT_FRONT_VIEW_HINT =
  "从参考图中仅提取用户选定的那一件目标单款，生成该件完整正面真平铺图（平摊白底、禁人台/假模特）。若选的是下装（短裤/裤/裙），画面中只能出现该下装，同框马甲/上衣必须去掉；若选的是上装，同框下装必须去掉。禁止输出整套搭配。无真人模特，版型颜色面料与目标款一致";

/** 套装选款时的平铺正面 */
export const FLAT_FRONT_SET_VIEW_HINT =
  "从参考图中提取用户选定的整套目标套装（上装与下装一起），生成完整正面真平铺图（平摊、禁人台/假模特），上下装比例与穿着关系与参考一致，无真人模特、白底或中性背景";

export type ViewImagePreset = {
  kind: Exclude<ViewImageKind, "custom" | "flat_front" | "line_art">;
  label: string;
  icon: string;
  promptHint: string;
};

/** 线稿不在侧栏：由各彩图画板右侧「生成线稿」从对应彩图转换 */
export const LINE_ART_VIEW_HINT =
  "严格按参考彩图像素描摹为黑白工艺单线稿：轮廓、袖长、裙长、领型、腰带/口袋位置与印花纹样位置必须与源图一致，禁止按文字另画新款或改版型";

/** B 区 AI 生图：背面 / 领口 / 袖口 + 自定义视角（线稿在彩图上转换） */
export const VIEW_IMAGE_PRESETS: ViewImagePreset[] = [
  {
    kind: "back",
    label: "背面图",
    icon: "↩",
    promptHint:
      "同一款式的完整背面平铺图（必须是衣服背面朝上，不是正面复制），版型颜色面料与正面一致，真平铺无模特无人台",
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
) as Record<Exclude<ViewImageKind, "custom" | "flat_front" | "line_art">, ViewImagePreset>;

export function getViewPresetHint(kind: ViewImageKind, customPrompt?: string): string {
  if (kind === "custom") return customPrompt?.trim() ?? "自定义视角";
  if (kind === "flat_front") return FLAT_FRONT_VIEW_HINT;
  if (kind === "line_art") return LINE_ART_VIEW_HINT;
  return VIEW_IMAGE_PRESET_MAP[kind]?.promptHint ?? kind;
}

export function isViewImageKind(value: string): value is ViewImageKind {
  return (
    value === "custom" ||
    value === "flat_front" ||
    value === "line_art" ||
    VIEW_IMAGE_PRESETS.some((p) => p.kind === value)
  );
}

/** 侧栏主说明：只负责彩图；线稿走画板右侧按钮 */
export const VIEW_IMAGE_AI_GUIDE =
  "生成背面 / 领口 / 袖口或自定义彩图。线稿请到彩图右侧点「生成线稿」。";

/** 侧栏补充：数据来源（模特/拼贴时显示） */
export const SIDEBAR_AI_SOURCE_HINT =
  "默认基于当前激活彩图（若当前是线稿则改用主款正面）；主款平铺重生成用原始参考图。";

/** 自定义里写「线稿」时的引导（不再全局生图） */
export const LINE_ART_USE_OVERLAY_HINT =
  "线稿需在对应彩图右侧点「生成线稿」，将严格按该彩图转换";
