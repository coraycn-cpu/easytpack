/**
 * 导出分享快照钩子（本期只算 hash；下期接公开链接与激励）。
 */
export function buildShareSnapshotHash(project: {
  id: string;
  title: string;
  process_items: unknown[];
  bom_items: unknown[];
  size_chart: { rows?: unknown[] };
  style_review?: string;
}): string {
  const payload = [
    project.id,
    project.title.trim(),
    String(project.process_items.length),
    String(project.bom_items.length),
    String(project.size_chart.rows?.length ?? 0),
    String((project.style_review ?? "").length),
  ].join("|");
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  }
  return `ss_${(h >>> 0).toString(16)}`;
}
