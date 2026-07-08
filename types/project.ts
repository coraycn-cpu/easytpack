import type { BomItem, Hotspot, ProcessItem } from "./process";

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

export type SizeChart = {
  sizes: string[];
  rows: Array<{
    part: string;
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
  /** 序号标注 ①②③，关联工艺条目 */
  markerIndex?: number;
  linkedPart?: string;
};

/** @deprecated 旧类型别名 */
export type LegacyAnnotationType = "arrow" | "label";

export type Artboard = {
  id: string;
  name: string;
  imageDataUrl?: string;
  hotspots: Hotspot[];
  annotations: Annotation[];
};

export type CanvasData = {
  artboards: Artboard[];
  activeArtboardId: string;
};

/** @deprecated 旧格式，仅用于迁移 */
export type LegacyCanvasData = {
  hotspots?: Hotspot[];
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
};

export const DEFAULT_ARTBOARD_NAMES = ["正面", "背面", "细节"];
