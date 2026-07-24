/**
 * AI 用量计量钩子（本期本地记账；下期接订阅额度时改查服务端）。
 * 所有 AI 调用应经此记录，便于后期扣费与管理后台统计。
 */

export type AiMeterAction =
  | "intake"
  | "questionnaire"
  | "annotate-batch"
  | "annotate-region"
  | "bom"
  | "size-chart"
  | "size-dimension"
  | "size-dimension-batch"
  | "enhance"
  | "explain"
  | "style-review"
  | "translate-techpack"
  | "chat"
  | "view-image"
  | "generate"
  | "full-collect"
  | "other";

const ACTION_LABELS: Record<string, string> = {
  intake: "意图分析",
  questionnaire: "问卷生成",
  "annotate-batch": "一键标注",
  "annotate-region": "区域标注",
  bom: "物料清单",
  "size-chart": "尺码表",
  "size-dimension": "尺寸识别",
  "size-dimension-batch": "批量尺寸",
  enhance: "一键补全",
  explain: "说明",
  "style-review": "款式评语",
  "translate-techpack": "工艺包英译",
  chat: "对话助手",
  "view-image": "视角生图",
  generate: "工艺生成",
  "full-collect": "全量采集",
  other: "其它",
  stream: "流式调试",
};

export function aiMeterActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export type AiMeterEvent = {
  id: string;
  at: string;
  action: AiMeterAction;
  projectId?: string;
  units: number;
  ok: boolean;
  provider?: string;
  model?: string;
  error?: string;
};

const STORAGE_KEY = "easytpack_ai_usage_local";
const MAX_EVENTS = 2000;

function readEvents(): AiMeterEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiMeterEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AiMeterEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_EVENTS)),
    );
  } catch {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(events.slice(-Math.floor(MAX_EVENTS / 2))),
      );
    } catch {
      /* ignore */
    }
  }
}

/** 服务端也可调用：仅打日志，不写 localStorage */
export function meterAiCallServer(input: {
  action: AiMeterAction;
  projectId?: string;
  units?: number;
  ok: boolean;
  provider?: string;
  model?: string;
  error?: string;
}): void {
  console.info("[ai-meter]", {
    action: input.action,
    projectId: input.projectId,
    units: input.units ?? 1,
    ok: input.ok,
    provider: input.provider,
    model: input.model,
    error: input.error,
  });
}

export function meterAiCall(input: {
  action: AiMeterAction;
  projectId?: string;
  units?: number;
  ok: boolean;
  provider?: string;
  model?: string;
  error?: string;
}): AiMeterEvent {
  const event: AiMeterEvent = {
    id: `meter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    action: input.action,
    projectId: input.projectId,
    units: input.units ?? 1,
    ok: input.ok,
    provider: input.provider,
    model: input.model,
    error: input.error,
  };
  meterAiCallServer(input);
  if (typeof window !== "undefined") {
    const next = readEvents();
    next.push(event);
    writeEvents(next);
  }
  return event;
}

export function listAiMeterEvents(): AiMeterEvent[] {
  return readEvents();
}

export function clearAiMeterEvents(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getAiMeterStorageBytes(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? raw.length * 2 : 0;
  } catch {
    return 0;
  }
}

export function sumAiMeterUnits(sinceIso?: string): number {
  const since = sinceIso ? Date.parse(sinceIso) : 0;
  return readEvents().reduce((n, e) => {
    if (since && Date.parse(e.at) < since) return n;
    return n + (e.ok ? e.units : 0);
  }, 0);
}
