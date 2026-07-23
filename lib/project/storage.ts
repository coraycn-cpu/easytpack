import type { Artboard, TechPackProject } from "@/types/project";
import { createDefaultCanvasData } from "@/lib/project/hotspots";
import { migrateProject } from "@/lib/project/hotspots";
import {
  clearViewGenRecords,
  getViewGenRecordsStorageBytes,
} from "@/lib/training/view-gen-log";
import {
  clearAiMeterEvents,
  getAiMeterStorageBytes,
} from "@/lib/ai/metering";
import {
  clearAiTelemetryEvents,
  getAiTelemetryStorageBytes,
} from "@/lib/ai/telemetry";
import {
  IDB_IMAGE_PREFIX,
  idbDeleteProjectImages,
  idbPutImage,
  isIdbImageRef,
  makeImageKey,
  resolveImageRef,
  toIdbRef,
} from "@/lib/project/image-idb";
import { toDurableImageRef } from "@/lib/project/cloud-images";

const STORAGE_KEY = "easytpack_projects";

const QUOTA_MESSAGE = "本地存储空间已满，请删除旧项目或大图后重试";

/** Offload data URLs longer than this into IndexedDB */
const IDB_OFFLOAD_MIN_LEN = 24_000;

function readAll(): Record<string, TechPackProject> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** UTF-16 approximate bytes for a localStorage value string */
function stringStorageBytes(value: string | null): number {
  return value ? value.length * 2 : 0;
}

/**
 * Drop non-project caches first so project saves can proceed.
 * Returns true if any key was removed.
 */
export function evacuateNonProjectStorage(): boolean {
  if (typeof window === "undefined") return false;
  const before =
    getViewGenRecordsStorageBytes() +
    getAiMeterStorageBytes() +
    getAiTelemetryStorageBytes();
  clearViewGenRecords();
  clearAiMeterEvents();
  clearAiTelemetryEvents();
  return before > 0;
}

function writeAll(projects: Record<string, TechPackProject>) {
  const payload = JSON.stringify(projects);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "QuotaExceededError")) {
      throw err;
    }
    if (evacuateNonProjectStorage()) {
      try {
        localStorage.setItem(STORAGE_KEY, payload);
        return;
      } catch (retryErr) {
        if (
          retryErr instanceof DOMException &&
          retryErr.name === "QuotaExceededError"
        ) {
          throw new Error(QUOTA_MESSAGE);
        }
        throw retryErr;
      }
    }
    throw new Error(QUOTA_MESSAGE);
  }
}

async function offloadImageField(
  projectId: string,
  slot: string,
  value: string | undefined,
): Promise<string | undefined> {
  if (!value) return value;
  if (isIdbImageRef(value)) return value;
  if (!value.startsWith("data:") || value.length < IDB_OFFLOAD_MIN_LEN) {
    return value;
  }
  const key = makeImageKey(projectId, slot);
  await idbPutImage(key, value);
  return toIdbRef(key);
}

async function dehydrateProject(project: TechPackProject): Promise<TechPackProject> {
  const id = project.id;
  // 先把临时签名链还原成 sbstorage:，避免写坏本机缓存
  const durableIntake = toDurableImageRef(project.intake.imageDataUrl);
  const intakeUrl = await offloadImageField(id, "intake", durableIntake);

  const artboards: Artboard[] = [];
  for (const ab of project.canvas_data.artboards) {
    const durable = toDurableImageRef(ab.imageDataUrl);
    const imageDataUrl = await offloadImageField(id, `ab:${ab.id}`, durable);
    artboards.push({ ...ab, imageDataUrl });
  }

  return {
    ...project,
    intake: { ...project.intake, imageDataUrl: intakeUrl },
    canvas_data: { ...project.canvas_data, artboards },
  };
}

async function hydrateProject(project: TechPackProject): Promise<TechPackProject> {
  const intakeRaw =
    toDurableImageRef(project.intake.imageDataUrl) ?? project.intake.imageDataUrl;
  const intakeUrl = await resolveImageRef(intakeRaw);
  const artboards: Artboard[] = [];
  for (const ab of project.canvas_data.artboards) {
    const raw = toDurableImageRef(ab.imageDataUrl) ?? ab.imageDataUrl;
    const resolved = await resolveImageRef(raw);
    // 解析失败时不要把 idb:/sbstorage: 原串当 src（会空白且难排查）
    const imageDataUrl =
      resolved ??
      (raw && (isIdbImageRef(raw) || raw.startsWith("sbstorage:"))
        ? undefined
        : raw);
    artboards.push({ ...ab, imageDataUrl });
  }
  return {
    ...project,
    intake: {
      ...project.intake,
      imageDataUrl:
        intakeUrl ??
        (intakeRaw &&
        (isIdbImageRef(intakeRaw) || intakeRaw.startsWith("sbstorage:"))
          ? undefined
          : intakeRaw),
    },
    canvas_data: { ...project.canvas_data, artboards },
  };
}

export function generateProjectId() {
  return `tp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyProject(
  partial: Pick<TechPackProject, "intake"> & { title?: string },
): TechPackProject {
  const now = new Date().toISOString();
  return {
    id: generateProjectId(),
    status: "intake",
    workflowStatus: "draft",
    title: partial.title ?? "未命名款式",
    createdAt: now,
    updatedAt: now,
    intake: partial.intake,
    questionnaire: {
      intro: "",
      questions: [],
      answers: {},
      isComplete: false,
    },
    canvas_data: createDefaultCanvasData(partial.intake.imageDataUrl),
    process_items: [],
    bom_items: [],
    size_chart: { sizes: [], rows: [] },
  };
}

export async function saveProject(project: TechPackProject): Promise<void> {
  const migrated = migrateProject({
    ...project,
    updatedAt: new Date().toISOString(),
  });
  let slim = await dehydrateProject(migrated);
  const all = readAll();
  all[project.id] = slim;

  try {
    writeAll(all);
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("存储空间已满")) {
      throw err;
    }
    // Force-offload any remaining inline data URLs then retry
    slim = await dehydrateProject({
      ...migrated,
      intake: {
        ...migrated.intake,
        imageDataUrl:
          migrated.intake.imageDataUrl &&
          !isIdbImageRef(migrated.intake.imageDataUrl) &&
          migrated.intake.imageDataUrl.startsWith("data:")
            ? migrated.intake.imageDataUrl
            : migrated.intake.imageDataUrl,
      },
    });
    // Lower threshold retry: offload everything that looks like data URL
    const forceId = project.id;
    if (
      slim.intake.imageDataUrl?.startsWith("data:") &&
      !isIdbImageRef(slim.intake.imageDataUrl)
    ) {
      const key = makeImageKey(forceId, "intake");
      await idbPutImage(key, slim.intake.imageDataUrl);
      slim = {
        ...slim,
        intake: { ...slim.intake, imageDataUrl: toIdbRef(key) },
      };
    }
    const forceBoards: Artboard[] = [];
    for (const ab of slim.canvas_data.artboards) {
      if (ab.imageDataUrl?.startsWith("data:") && !isIdbImageRef(ab.imageDataUrl)) {
        const key = makeImageKey(forceId, `ab:${ab.id}`);
        await idbPutImage(key, ab.imageDataUrl);
        forceBoards.push({ ...ab, imageDataUrl: toIdbRef(key) });
      } else {
        forceBoards.push(ab);
      }
    }
    slim = {
      ...slim,
      canvas_data: { ...slim.canvas_data, artboards: forceBoards },
    };
    all[project.id] = slim;
    writeAll(all);
  }

  // 已登录则同步到云端：用脱水后的永久引用，避免把临时签名链写坏云端
  void import("@/lib/project/cloud-sync")
    .then(({ mirrorSaveToCloud }) => mirrorSaveToCloud(slim))
    .catch(() => {
      /* ignore */
    });
}

export async function getProject(id: string): Promise<TechPackProject | null> {
  const all = readAll();
  const localRaw = all[id] ? migrateProject(all[id]) : null;

  // 有本机缓存时也和云端合并，修复本地过期签名链 / 丢图
  let merged: TechPackProject | null = localRaw;
  try {
    const { mergeOneLocalWithCloud } = await import("@/lib/project/cloud-sync");
    merged = await mergeOneLocalWithCloud(id, localRaw);
  } catch {
    merged = localRaw;
  }

  if (!merged) return null;

  const migrated = migrateProject(merged);
  try {
    // 缓存永久引用到本机（不含临时 https）
    const slim = await dehydrateProject(migrated);
    all[id] = { ...slim, updatedAt: migrated.updatedAt };
    writeAll(all);
  } catch {
    /* quota ignore */
  }
  return hydrateProject(migrated);
}

/** 仅本机列表（不含云端合并，供混合仓使用） */
export async function listLocalProjectsOnly(): Promise<TechPackProject[]> {
  return Object.values(readAll())
    .map(migrateProject)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

/** List projects for UI; images may remain as idb: refs (no hydrate). */
export async function listProjects(): Promise<TechPackProject[]> {
  const local = await listLocalProjectsOnly();
  try {
    const { mergeLocalWithCloud } = await import("@/lib/project/cloud-sync");
    return await mergeLocalWithCloud(local);
  } catch {
    return local;
  }
}

export async function duplicateProject(id: string): Promise<TechPackProject | null> {
  const source = await getProject(id);
  if (!source) return null;

  const now = new Date().toISOString();
  const newId = generateProjectId();
  const copy: TechPackProject = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    title: `${source.title}（副本）`,
    workflowStatus: "draft",
    status: "studio",
    createdAt: now,
    updatedAt: now,
  };

  await saveProject(copy);
  return copy;
}

export async function deleteProject(id: string): Promise<void> {
  const all = readAll();
  delete all[id];
  writeAll(all);
  try {
    await idbDeleteProjectImages(id);
  } catch {
    // ignore IDB cleanup failures
  }
  void import("@/lib/project/cloud-sync")
    .then(({ mirrorDeleteFromCloud }) => mirrorDeleteFromCloud(id))
    .catch(() => {
      /* ignore */
    });
}

/** Approximate localStorage usage for easytpack keys (UTF-16 bytes). */
export function getEasytpackStorageStats(): {
  projectsBytes: number;
  trainingBytes: number;
  meterBytes: number;
  telemetryBytes: number;
  totalBytes: number;
  projectCount: number;
} {
  if (typeof window === "undefined") {
    return {
      projectsBytes: 0,
      trainingBytes: 0,
      meterBytes: 0,
      telemetryBytes: 0,
      totalBytes: 0,
      projectCount: 0,
    };
  }
  let projectsBytes = 0;
  try {
    projectsBytes = stringStorageBytes(localStorage.getItem(STORAGE_KEY));
  } catch {
    projectsBytes = 0;
  }
  const trainingBytes = getViewGenRecordsStorageBytes();
  const meterBytes = getAiMeterStorageBytes();
  const telemetryBytes = getAiTelemetryStorageBytes();
  return {
    projectsBytes,
    trainingBytes,
    meterBytes,
    telemetryBytes,
    totalBytes: projectsBytes + trainingBytes + meterBytes + telemetryBytes,
    projectCount: Object.keys(readAll()).length,
  };
}

/** 导出项目 JSON（备份；图片可能为 idb: 引用，需本机才能还原） */
export function exportProjectJsonBackup(project: TechPackProject): string {
  return JSON.stringify(project, null, 2);
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export { IDB_IMAGE_PREFIX };
