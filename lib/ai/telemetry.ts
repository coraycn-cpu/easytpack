/**
 * AI 质量/训练遥测事件形状（本期本地队列；下期入 Supabase ai_events + 管理后台）。
 */

export type AiTelemetryOutcome =
  | "accepted"
  | "edited"
  | "regenerated"
  | "discarded"
  | "error"
  | "pending";

export type AiTelemetryEvent = {
  id: string;
  at: string;
  action: string;
  projectId?: string;
  category?: string;
  photoType?: string;
  provider?: string;
  model?: string;
  correctionText?: string;
  /** AI 输出摘要（勿存整图 dataUrl） */
  aiOutputSummary?: Record<string, unknown>;
  /** 用户定稿/改后摘要 */
  userFinalSummary?: Record<string, unknown>;
  outcome: AiTelemetryOutcome;
  consent?: boolean;
  imageRefs?: string[];
};

const STORAGE_KEY = "easytpack_ai_telemetry_local";
const MAX_EVENTS = 1000;

function readEvents(): AiTelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiTelemetryEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AiTelemetryEvent[]): void {
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

export function appendAiTelemetryEvent(
  partial: Omit<AiTelemetryEvent, "id" | "at"> & { id?: string; at?: string },
): AiTelemetryEvent {
  const event: AiTelemetryEvent = {
    id: partial.id ?? `tel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: partial.at ?? new Date().toISOString(),
    action: partial.action,
    projectId: partial.projectId,
    category: partial.category,
    photoType: partial.photoType,
    provider: partial.provider,
    model: partial.model,
    correctionText: partial.correctionText,
    aiOutputSummary: partial.aiOutputSummary,
    userFinalSummary: partial.userFinalSummary,
    outcome: partial.outcome,
    consent: partial.consent,
    imageRefs: partial.imageRefs,
  };
  const next = readEvents();
  next.push(event);
  writeEvents(next);
  if (event.consent) {
    void import("@/lib/ai/telemetry-cloud")
      .then(({ pushTelemetryEventToCloud }) =>
        pushTelemetryEventToCloud(event),
      )
      .catch(() => {
        /* ignore */
      });
  }
  return event;
}

export function listAiTelemetryEvents(): AiTelemetryEvent[] {
  return readEvents();
}

export function clearAiTelemetryEvents(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function exportAiTelemetryJsonl(): string {
  return readEvents()
    .map((e) => JSON.stringify(e))
    .join("\n");
}

export function getAiTelemetryStorageBytes(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? raw.length * 2 : 0;
  } catch {
    return 0;
  }
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
