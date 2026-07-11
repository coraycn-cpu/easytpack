import type { TechPackProject } from "@/types/project";
import { createDefaultCanvasData } from "@/lib/project/hotspots";
import { migrateProject } from "@/lib/project/hotspots";

const STORAGE_KEY = "easytpack_projects";

function readAll(): Record<string, TechPackProject> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(projects: Record<string, TechPackProject>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new Error("本地存储空间已满，请删除旧项目或大图后重试");
    }
    throw err;
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
  const p = readAll()[id];
  return p ? migrateProject(p) : null;
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

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
