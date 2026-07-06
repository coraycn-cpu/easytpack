import type { BomItem, Hotspot, ProcessItem } from "./process";

export type ProjectStatus =
  | "intake"
  | "collecting"
  | "studio"
  | "completed";

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

export type TechPackProject = {
  id: string;
  status: ProjectStatus;
  title: string;
  createdAt: string;
  updatedAt: string;
  intake: IntakeData;
  questionnaire: QuestionnaireData;
  canvas_data: {
    hotspots: Hotspot[];
  };
  process_items: ProcessItem[];
  bom_items: BomItem[];
  size_chart: SizeChart;
};
