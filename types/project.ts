import type { BomItem, ProcessItem } from "./process";
import type { StudioLayout } from "@/lib/studio/layout";

export type ProjectStatus =
  | "intake"
  | "collecting"
  | "studio"
  | "completed";

export type WorkflowStatus = "draft" | "in_review" | "finalized";

export type PhotoType = "flat_lay" | "model" | "collage" | "sketch";

export type GarmentKind = "single" | "set";

export type TargetGarment = {
  id: string;
  label: string;
  category: string;
  kind?: GarmentKind;
  /** 套装时包含的单件 id */
  componentIds?: string[];
};

export type VisibleGarment = TargetGarment & {
  confidence?: "high" | "medium" | "low";
};

export type IntakeData = {
  description: string;
  imageDataUrl?: string;
  aiIntentAnalysis?: string;
  detectedCategory?: string;
  detectedFeatures?: string[];
  suggestedTitle?: string;
  /** 图片类型 */
  photoType?: PhotoType;
  /** AI 识别到的可见款式列表 */
  visibleGarments?: VisibleGarment[];
  /** AI 推荐的主款 id */
  recommendedGarmentId?: string;
  /** 用户锁定的目标单款 */
  targetGarment?: TargetGarment;
  intentConfidence?: "high" | "medium" | "low";
  /** 用户已确认目标单款 */
  garmentConfirmed?: boolean;
  /** intake 分析：是否必须用户选款 */
  requiresGarmentPick?: boolean;
  /** 已从模特/拼贴图生成平铺正面主款 */
  flatFrontGenerated?: boolean;
  /** 用户选择暂不自动生成平铺正面，直接使用原参考图进入画布 */
  flatFrontSkipped?: boolean;
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
  | "line"
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
  /** 直线是否虚线（type===line） */
  dashed?: boolean;
  /** 闭合形状关联的工艺行 ID（多对多） */
  linkedProcessIds?: string[];
  /** 关联尺码表部位名（尺寸标注 dimension） */
  linkedSizePart?: string;
  /** 锁定后不可拖动/删除/AI 改写 */
  locked?: boolean;
  /** @deprecated 迁移至 linkedProcessIds */
  markerIndex?: number;
  /** @deprecated 迁移至 linkedProcessIds */
  linkedPart?: string;
};

/** @deprecated 旧类型别名 */
export type LegacyAnnotationType = "arrow" | "label";

export type ArtboardViewImageMeta = {
  kind: import("@/lib/studio/view-types").ViewImageKind;
  customPrompt?: string;
  lastImagePrompt?: string;
  /** 最近一次修正提示词（重新生成用） */
  correctionPrompt?: string;
  /** 线稿绑定的源彩图画板 id（重新生成时仍用该彩图转换） */
  sourceArtboardId?: string;
  /**
   * 生图结果状态。placeholder = 曾用源图顶替（不应再新增）；
   * 新流程失败时不应写入画板。
   */
  generationStatus?: "ok" | "placeholder" | "failed";
  /** 最近一次生图失败原因（供角标/重试提示） */
  lastSynthesisError?: string;
};

export type Artboard = {
  id: string;
  name: string;
  imageDataUrl?: string;
  annotations: Annotation[];
  /** 款式图在画板内的偏移（可拖动） */
  imageOffset?: { x: number; y: number };
  /**
   * 相对 computeImageFit 基准尺寸的拉伸比例（角/边拉伸）
   * 缺省视为 { x: 1, y: 1 }
   */
  imageScale?: { x: number; y: number };
  /** 画板在无限画布上的锚点（多图并排） */
  canvasOrigin?: { x: number; y: number };
  /** AI 生成款式图元数据（含主款平铺正面重新生成） */
  viewImageMeta?: ArtboardViewImageMeta;
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
  /** 导出偏好 */
  exportSettings?: {
    /** 标注图稿：合并一张或工艺/尺寸各一张 */
    annotatedImageMode?: "merged" | "split";
  };
  /** 导出记录（轻量沉淀） */
  exportHistory?: Array<{
    at: string;
    kind: "pdf" | "xlsx" | "composite" | "share";
    basename: string;
    pageCount?: number;
    imageMode?: "merged" | "split";
    /** 分享激励用：匿名摘要 hash */
    shareSnapshotHash?: string;
    /** 分享链接 id（kind=share） */
    shareId?: string;
  }>;
  /**
   * 是否同意进入质量/检索池（下期管理后台与训练整理用）。
   * 默认 false；定稿导出时可勾选。
   */
  consentQualityPool?: boolean;
};

export const DEFAULT_ARTBOARD_NAMES = ["正面", "背面", "细节"];
