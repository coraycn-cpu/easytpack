import type { TechPackProject } from "@/types/project";
import { getPrimaryArtboardId } from "@/lib/canvas/sizing-artboard";

/** 常用分类（可再自定义） */
export const LIBRARY_CATEGORY_PRESETS = [
  "上衣",
  "裤装",
  "裙装",
  "套装",
  "外套",
  "配件",
  "其它",
] as const;

export const LIBRARY_UNCATEGORIZED = "未分类";

export const LIBRARY_PAGE_SIZE = 12;

/** 首页 / 顶栏切换：只展示最近更新的条数 */
export const RECENT_PROJECTS_LIMIT = 5;

export function getProjectLibraryCategory(
  project: TechPackProject,
): string {
  const raw = project.intake.libraryCategory?.trim();
  return raw || LIBRARY_UNCATEGORIZED;
}

export function shortProjectTitle(
  title: string | null | undefined,
  maxChars = 16,
): string {
  const t = (title || "").trim() || "未命名款式";
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}

export function formatProjectDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mi}`;
}

/** 列表缩略图优先用主图 / intake 图引用（可能是 idb: / sbstorage: / data:） */
export function getProjectThumbRef(
  project: TechPackProject,
): string | undefined {
  const intake = project.intake.imageDataUrl?.trim();
  if (intake) return intake;
  const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
  const primary = primaryId
    ? project.canvas_data.artboards.find((a) => a.id === primaryId)
    : project.canvas_data.artboards.find((a) => a.imageDataUrl);
  return primary?.imageDataUrl?.trim() || undefined;
}

export function collectLibraryCategories(
  projects: TechPackProject[],
): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    const c = getProjectLibraryCategory(p);
    if (c !== LIBRARY_UNCATEGORIZED) set.add(c);
  }
  for (const preset of LIBRARY_CATEGORY_PRESETS) set.add(preset);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function studioHrefForProject(p: {
  id: string;
  status: string;
}): string {
  return p.status === "collecting"
    ? `/project/${p.id}/studio?fullCollect=1`
    : `/project/${p.id}/studio`;
}
