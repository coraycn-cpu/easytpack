import type { TechPackProject } from "@/types/project";

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
    canvas_data: { hotspots: [] },
    process_items: [],
    bom_items: [],
    size_chart: { sizes: [], rows: [] },
  };
}

export function saveProject(project: TechPackProject) {
  const all = readAll();
  all[project.id] = { ...project, updatedAt: new Date().toISOString() };
  writeAll(all);
}

export function getProject(id: string): TechPackProject | null {
  return readAll()[id] ?? null;
}

export function listProjects(): TechPackProject[] {
  return Object.values(readAll()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
