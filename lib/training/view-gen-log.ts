import type { ViewImageKind } from "@/lib/studio/view-types";

export type ViewGenOutcome = "success" | "placeholder" | "error";

export type ViewGenTrainingRecord = {
  id: string;
  timestamp: string;
  projectId: string;
  viewKind: ViewImageKind;
  customPrompt?: string;
  category?: string;
  description?: string;
  sourceImageHash?: string;
  generatedPrompt?: string;
  artboardName?: string;
  outputImageHash?: string;
  provider?: string;
  model?: string;
  outcome: ViewGenOutcome;
  synthesisError?: string;
  userAccepted?: boolean;
  userReplaced?: boolean;
  userRegenerated?: boolean;
};

const STORAGE_KEY = "easytpack_view_gen_training";
const MAX_RECORDS = 500;

function hashSnippet(dataUrl: string | undefined): string | undefined {
  if (!dataUrl) return undefined;
  const len = dataUrl.length;
  const tail = dataUrl.slice(-48);
  return `${len}:${tail}`;
}

export function createViewGenRecordId(): string {
  return `vgr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readRecords(): ViewGenTrainingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ViewGenTrainingRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: ViewGenTrainingRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
  } catch {
    // quota — drop oldest half and retry once
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records.slice(-Math.floor(MAX_RECORDS / 2))),
      );
    } catch {
      // ignore
    }
  }
}

export function appendViewGenRecord(
  record: Omit<ViewGenTrainingRecord, "id" | "timestamp"> & {
    id?: string;
    timestamp?: string;
  },
): ViewGenTrainingRecord {
  const full: ViewGenTrainingRecord = {
    id: record.id ?? createViewGenRecordId(),
    timestamp: record.timestamp ?? new Date().toISOString(),
    ...record,
  };
  const records = readRecords();
  records.push(full);
  writeRecords(records);
  return full;
}

export function updateViewGenRecord(
  id: string,
  patch: Partial<
    Pick<
      ViewGenTrainingRecord,
      "userAccepted" | "userReplaced" | "userRegenerated" | "outcome"
    >
  >,
): void {
  const records = readRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return;
  records[idx] = { ...records[idx], ...patch };
  writeRecords(records);
}

export function listViewGenRecords(): ViewGenTrainingRecord[] {
  return readRecords();
}

export function exportViewGenRecordsJsonl(): string {
  return readRecords().map((r) => JSON.stringify(r)).join("\n");
}

export function buildViewGenTrainingPayload(input: {
  projectId: string;
  viewKind: ViewImageKind;
  customPrompt?: string;
  category?: string;
  description?: string;
  sourceImageUrl?: string;
  generatedPrompt?: string;
  artboardName?: string;
  outputImageUrl?: string | null;
  provider?: string;
  model?: string;
  outcome: ViewGenOutcome;
  synthesisError?: string;
}): Omit<ViewGenTrainingRecord, "id" | "timestamp"> {
  return {
    projectId: input.projectId,
    viewKind: input.viewKind,
    customPrompt: input.customPrompt,
    category: input.category,
    description: input.description,
    sourceImageHash: hashSnippet(input.sourceImageUrl),
    generatedPrompt: input.generatedPrompt,
    artboardName: input.artboardName,
    outputImageHash: hashSnippet(input.outputImageUrl ?? undefined),
    provider: input.provider,
    model: input.model,
    outcome: input.outcome,
    synthesisError: input.synthesisError,
    userAccepted: input.outcome === "success",
  };
}
