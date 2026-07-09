export type ViewImageKind = "back" | "side" | "collar_cuff" | "custom";

export const VIEW_IMAGE_PRESETS: Record<
  Exclude<ViewImageKind, "custom">,
  { label: string; promptHint: string }
> = {
  back: {
    label: "背面图",
    promptHint: "同一款式的完整背面平铺图，保持版型、颜色与正面一致，专业服装摄影平铺风格",
  },
  side: {
    label: "侧面图",
    promptHint: "同一款式的侧面平铺或挂拍图，展示侧缝、袖型与整体轮廓",
  },
  collar_cuff: {
    label: "领口袖口",
    promptHint: "领口与袖口细节特写，清晰展示工艺、罗纹或包边等结构",
  },
};
