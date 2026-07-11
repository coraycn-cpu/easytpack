export function generateProcessId() {
  return `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ensureProcessItemIds<T extends { id?: string }>(
  items: T[],
): (T & { id: string })[] {
  return items.map((item) => ({
    ...item,
    id: item.id ?? generateProcessId(),
  }));
}
