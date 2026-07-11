import type { BomItem, ProcessItem } from "./process";
import type { StudioLayout } from "@/lib/studio/layout";

export type ProjectStatus =
  | "intake"
  | "collecting"
  | "studio"
  | "completed";

export type WorkflowStatus = "draft" | "in_review" | "finalized";

export type IntakeData = {
  description: string;
  imageDataUrl?: string;
  aiIntentAnalysis?: string;
  detectedCategory?: string;
  detectedFeatures?: string[];
  suggestedTitle?: string;
};

export type QuestionOption = {
  id: string;
  label: string;
};

export type AiQuestion = {
  id: string;
  question: string;
  type: "single" | "multi" | "text";
  options?: QuestionOption[];
  required: boolean;
};

export type QuestionnaireData = {
  intro: string;
  questions: AiQuestion[];
  answers: Record<string, string | string[]>;
  isComplete: boolean;
};

import type { SizeRegionStandard } from "@/lib/size-chart/standards";

export type { SizeRegionStandard };

export type SizeChart = {
  /** 区域尺码标准（国标/欧码/美码等） */
  regionStandard?: SizeRegionStandard;
  /** 样衣基准码，AI 估算仅填此列 */
  sampleSize?: string;
  sizes: string[];
  rows: Array<{
    part: string;
    /** 简写量法，为跳码列留空间 */
    method: string;
    values: Record<string, string>;
  }>;
};

export type AnnotationType =
  | "rect"
  | "circle"
  | "arrow"
  | "text"
  | "dimension"
  | "freehand"
  | "marker";

export type Annotation = {
  id: string;
  type: AnnotationType;
  color?: string;
  strokeWidth?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
  text?: string;
  points?: number[];
  /** 闭合形状关联的工艺行 ID（多对多） */
  linkedProcessIds?: string[];
  /** @deprecated 迁移至 linkedProcessIds */
  markerIndex?: number;
  /** @deprecated 迁移至 linkedProcessIds */
  linkedPart?: string;
};

/** @deprecated 旧类型别名 */
export type LegacyAnnotationType = "arrow" | "label";

export type Artboard = {
  id: string;
  name: string;
  imageDataUrl?: string;
  annotations: Annotation[];
  /** 款式图在画板内的偏移（可拖动） */
  imageOffset?: { x: number; y: number };
  /** 画板在无限画布上的锚点（多图并排） */
  canvasOrigin?: { x: number; y: number };
  /** @deprecated 已合并至 annotations，加载时自动迁移 */
  hotspots?: import("./process").Hotspot[];
};

export type CanvasData = {
  artboards: Artboard[];
  activeArtboardId: string;
  studioLayout?: StudioLayout;
};

/** @deprecated 旧格式，仅用于迁移 */
export type LegacyCanvasData = {
  hotspots?: import("./process").Hotspot[];
};

export type TechPackProject = {
  id: string;
  status: ProjectStatus;
  workflowStatus: WorkflowStatus;
  title: string;
  styleNo?: string;
  createdAt: string;
  updatedAt: string;
  intake: IntakeData;
  questionnaire: QuestionnaireData;
  canvas_data: CanvasData;
  process_items: ProcessItem[];
  bom_items: BomItem[];
  size_chart: SizeChart;
  /** 款式评语：面向版师/车版/设计师，四段式，≤280字 */
  style_review?: string;
};

export const DEFAULT_ARTBOARD_NAMES = ["正面", "背面", "细节"];
