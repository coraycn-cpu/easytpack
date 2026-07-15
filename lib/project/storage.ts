import type { TechPackProject } from "@/types/project";
import { createDefaultCanvasData } from "@/lib/project/hotspots";
import { migrateProject } from "@/lib/project/hotspots";
import {
  clearViewGenRecords,
  getViewGenRecordsStorageBytes,
} from "@/lib/training/view-gen-log";

const STORAGE_KEY = "easytpack_projects";

const QUOTA_MESSAGE = "本地存储空间已满，请删除旧项目或大图后重试";

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
  const before = getViewGenRecordsStorageBytes();
  clearViewGenRecords();
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
    // Free training / auxiliary caches, then retry once without deleting projects
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

export function saveProject(project: TechPackProject) {
  const all = readAll();
  all[project.id] = migrateProject({
    ...project,
    updatedAt: new Date().toISOString(),
  });
  writeAll(all);
}

export function getProject(id: string): TechPackProject | null {
  const all = readAll();
  const p = all[id];
  if (!p) return null;
  const migrated = migrateProject(p);
  const canvasMigrated =
    migrated.canvas_data.artboards.length !== p.canvas_data.artboards.length ||
    migrated.canvas_data.artboards.some((ab) => {
      const prev = p.canvas_data.artboards.find((x) => x.id === ab.id);
      return Boolean(ab.viewImageMeta) && !prev?.viewImageMeta;
    });
  if (canvasMigrated) {
    all[id] = { ...migrated, updatedAt: p.updatedAt };
    writeAll(all);
  }
  return migrated;
}

export function listProjects(): TechPackProject[] {
  return Object.values(readAll())
    .map(migrateProject)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export function duplicateProject(id: string): TechPackProject | null {
  const source = getProject(id);
  if (!source) return null;

  const now = new Date().toISOString();
  const copy: TechPackProject = {
    ...JSON.parse(JSON.stringify(source)),
    id: generateProjectId(),
    title: `${source.title}（副本）`,
    workflowStatus: "draft",
    status: "studio",
    createdAt: now,
    updatedAt: now,
  };

  saveProject(copy);
  return copy;
}

export function deleteProject(id: string) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

/** Approximate localStorage usage for easytpack keys (UTF-16 bytes). */
export function getEasytpackStorageStats(): {
  projectsBytes: number;
  trainingBytes: number;
  totalBytes: number;
  projectCount: number;
} {
  if (typeof window === "undefined") {
    return { projectsBytes: 0, trainingBytes: 0, totalBytes: 0, projectCount: 0 };
  }
  let projectsBytes = 0;
  try {
    projectsBytes = stringStorageBytes(localStorage.getItem(STORAGE_KEY));
  } catch {
    projectsBytes = 0;
  }
  const trainingBytes = getViewGenRecordsStorageBytes();
  return {
    projectsBytes,
    trainingBytes,
    totalBytes: projectsBytes + trainingBytes,
    projectCount: Object.keys(readAll()).length,
  };
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
