import type { BomItem, ProcessItem } from "@/types/process";

/** 常见部位别名：正面/背面或不同说法视为同一测量点 */
const PART_ALIASES: Record<string, string[]> = {
  领口横开: ["领宽", "领围", "颈宽", "neckwidth", "neck"],
  衣长: ["身长", "长度", "全长", "bodylength", "length"],
  胸围: ["胸宽", "chest", "bust"],
  肩宽: ["肩阔", "shoulder"],
  袖长: ["袖子长", "臂长", "sleeve"],
  袖口: ["袖口宽", "cuff"],
  下摆: ["下摆宽", "hem"],
  腰围: ["腰宽", "waist"],
  臀围: ["臀宽", "hip"],
};

export function normalizePartKey(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, "")
    .replace(/\s/g, "");
}

/** 归一到别名组的代表 key，便于同义部位合并 */
export function canonicalPartKey(part: string): string {
  const key = normalizePartKey(part);
  if (!key) return "";
  for (const [canonical, aliases] of Object.entries(PART_ALIASES)) {
    const ck = normalizePartKey(canonical);
    if (key === ck || aliases.some((a) => normalizePartKey(a) === key)) {
      return ck;
    }
  }
  return key;
}

export function partsMatch(a: string, b: string): boolean {
  const ka = canonicalPartKey(a);
  const kb = canonicalPartKey(b);
  if (!ka || !kb) return false;
  return ka === kb;
}

export function mergeText(
  a: string | undefined,
  b: string | undefined,
): string {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();
  if (!left) return right;
  if (!right) return left;
  if (left === right) return left;
  if (left.includes(right)) return left;
  if (right.includes(left)) return right;
  return `${left}；${right}`;
}

type BomRole = "shell" | "lining" | "interlining" | "other";

function garmentPartKey(item: Pick<BomItem, "garmentPart">): string {
  return normalizePartKey(item.garmentPart ?? "") || "_";
}

function detectBomRole(item: Pick<BomItem, "name" | "category" | "garmentPart">): BomRole {
  const blob = `${item.name} ${item.garmentPart ?? ""}`.toLowerCase();
  if (/里料|里布|lining/.test(blob)) return "lining";
  if (/粘衬|衬布|衬料|interlin/.test(blob)) return "interlining";
  if (
    item.category === "fabric" ||
    /主面料|面料|外壳|主布|大身|shell|main\s*fabric/.test(blob)
  ) {
    if (/拉链|纽扣|钮扣|线|织带|罗纹|标|拉链头/.test(blob) && item.category !== "fabric") {
      return "other";
    }
    return "shell";
  }
  return "other";
}

/**
 * 物料身份：同款主面料/里料（同部件）合并；辅料按类别+名称区分。
 */
export function bomIdentity(item: Pick<BomItem, "name" | "category" | "garmentPart">): string {
  const role = detectBomRole(item);
  const cat = item.category ?? "fabric";
  const gp = garmentPartKey(item);
  if (role === "shell" || role === "lining" || role === "interlining") {
    return `${cat}|${role}|${gp}`;
  }
  return `${cat}|other|${gp}|${normalizePartKey(item.name)}`;
}

export function mergeBomItem(prev: BomItem, incoming: BomItem): BomItem {
  return {
    ...prev,
    name: prev.name.trim() || incoming.name,
    category: prev.category ?? incoming.category,
    garmentPart: prev.garmentPart?.trim() || incoming.garmentPart || "",
    spec: prev.spec?.trim() || incoming.spec || "",
    color: prev.color?.trim() || incoming.color || "",
    usage: mergeText(prev.usage, incoming.usage),
    supplier: prev.supplier?.trim() || incoming.supplier || "",
    code: prev.code?.trim() || incoming.code || "",
  };
}

export function upsertBomItems(
  existing: BomItem[],
  incoming: BomItem[],
): { items: BomItem[]; added: number; merged: number } {
  const items = [...existing];
  const indexById = new Map<string, number>();
  for (let i = 0; i < items.length; i++) {
    indexById.set(bomIdentity(items[i]), i);
  }

  let added = 0;
  let merged = 0;

  for (const raw of incoming) {
    const name = raw.name?.trim();
    if (!name) continue;
    const next: BomItem = { ...raw, name };
    const id = bomIdentity(next);
    const idx = indexById.get(id);
    if (idx !== undefined) {
      items[idx] = mergeBomItem(items[idx], next);
      merged += 1;
    } else {
      indexById.set(id, items.length);
      items.push(next);
      added += 1;
    }
  }

  return { items, added, merged };
}

export function findProcessIndexByPart(
  items: Array<Pick<ProcessItem, "part">>,
  part: string,
): number {
  const key = canonicalPartKey(part);
  if (!key) return -1;
  return items.findIndex((p) => canonicalPartKey(p.part) === key);
}

export function mergeProcessItem(
  prev: ProcessItem,
  patch: Partial<ProcessItem>,
): ProcessItem {
  return {
    ...prev,
    ...patch,
    id: prev.id,
    part: prev.part.trim() || patch.part || "",
    process: mergeText(prev.process, patch.process) || prev.process || patch.process || "",
    stitch: prev.stitch?.trim() || patch.stitch || "",
    seam_allowance: prev.seam_allowance?.trim() || patch.seam_allowance || "",
  };
}

export function upsertProcessItems(
  existing: ProcessItem[],
  incoming: ProcessItem[],
  generateId: () => string,
): { items: ProcessItem[]; added: number; merged: number } {
  const items = [...existing];
  let added = 0;
  let merged = 0;

  for (const raw of incoming) {
    const part = raw.part?.trim();
    if (!part) continue;
    const idx = findProcessIndexByPart(items, part);
    if (idx >= 0) {
      items[idx] = mergeProcessItem(items[idx], { ...raw, part });
      merged += 1;
    } else {
      items.push({
        ...raw,
        id: raw.id || generateId(),
        part,
      });
      added += 1;
    }
  }

  return { items, added, merged };
}
