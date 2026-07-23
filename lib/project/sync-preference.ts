/**
 * 云端同步偏好（本机记住）：自动 = 登录/保存时同步；手动 = 仅点按钮才同步。
 */
export type CloudSyncMode = "auto" | "manual";

const STORAGE_KEY = "easytpack_cloud_sync_mode";

const listeners = new Set<(mode: CloudSyncMode) => void>();

function readMode(): CloudSyncMode {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "manual" || raw === "auto") return raw;
  } catch {
    /* ignore */
  }
  // 默认自动：与当前「登录后同步 / 保存镜像」行为一致
  return "auto";
}

let cached: CloudSyncMode | null = null;

export function getCloudSyncMode(): CloudSyncMode {
  if (cached) return cached;
  cached = readMode();
  return cached;
}

export function isCloudSyncAuto(): boolean {
  return getCloudSyncMode() === "auto";
}

export function setCloudSyncMode(mode: CloudSyncMode): void {
  cached = mode;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((fn) => fn(mode));
}

export function subscribeCloudSyncMode(
  fn: (mode: CloudSyncMode) => void,
): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function cloudSyncModeLabel(mode: CloudSyncMode): string {
  return mode === "auto" ? "自动同步" : "手动同步";
}
