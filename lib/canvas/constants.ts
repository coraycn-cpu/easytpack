import {
  AI_ANNOTATION_COLOR,
  MANUAL_ANNOTATION_COLOR,
} from "@/lib/canvas/annotation-colors";

/** 画板逻辑坐标系（导出与 AI 均基于此尺寸） */
export const CANVAS_W = 1000;
export const CANVAS_H = 750;

export { AI_ANNOTATION_COLOR, MANUAL_ANNOTATION_COLOR };

export const ANNOTATION_COLORS = [
  { id: "red", value: MANUAL_ANNOTATION_COLOR, label: "红" },
  { id: "orange", value: "#f97316", label: "橙" },
  { id: "yellow", value: "#eab308", label: "黄" },
  { id: "green", value: "#22c55e", label: "绿" },
  { id: "blue", value: AI_ANNOTATION_COLOR, label: "蓝" },
  { id: "white", value: "#ffffff", label: "白" },
] as const;

export const DEFAULT_ANNOTATION_COLOR = MANUAL_ANNOTATION_COLOR;
