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

/** 按「最近更新」倒序；时间无效时排后，同时间再按创建At、id 稳定排序 */
export function sortProjectsByUpdatedAtDesc<
  T extends { id: string; updatedAt: string; createdAt?: string },
>(projects: T[]): T[] {
  return [...projects].sort((a, b) => {
    const tb = Date.parse(b.updatedAt);
    const ta = Date.parse(a.updatedAt);
    const nb = Number.isFinite(tb) ? tb : 0;
    const na = Number.isFinite(ta) ? ta : 0;
    if (nb !== na) return nb - na;
    const cb = Date.parse(b.createdAt ?? "");
    const ca = Date.parse(a.createdAt ?? "");
    const ncb = Number.isFinite(cb) ? cb : 0;
    const nca = Number.isFinite(ca) ? ca : 0;
    if (ncb !== nca) return ncb - nca;
    return a.id.localeCompare(b.id);
  });
}

/** 取最近更新的前 N 条（已排除可选 id） */
export function takeRecentProjects<
  T extends { id: string; updatedAt: string; createdAt?: string },
>(projects: T[], limit = RECENT_PROJECTS_LIMIT, excludeId?: string): T[] {
  const source = excludeId
    ? projects.filter((p) => p.id !== excludeId)
    : projects;
  return sortProjectsByUpdatedAtDesc(source).slice(0, limit);
}

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
