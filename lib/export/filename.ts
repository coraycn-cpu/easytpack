import type { TechPackProject } from "@/types/project";

/** 款式名（用于导出文件名） */
export function styleExportBasename(project: Pick<TechPackProject, "title" | "intake">): string {
  const raw =
    project.intake.targetGarment?.label?.trim() ||
    project.intake.suggestedTitle?.trim() ||
    project.title?.trim() ||
    "techpack";
  return sanitizeFilename(raw);
}

export function sanitizeFilename(name: string, maxLen = 48): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  const base = cleaned || "techpack";
  return base.length > maxLen ? base.slice(0, maxLen).trim() : base;
}

export function exportFilename(
  project: Pick<TechPackProject, "title" | "intake">,
  suffix: string,
): string {
  const base = styleExportBasename(project);
  const s = suffix.startsWith("-") || suffix.startsWith(".") ? suffix : `-${suffix}`;
  return `${base}${s}`;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
