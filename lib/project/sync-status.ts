/** 最近一次云同步结果（给项目页 / 顶栏提示用） */
export type CloudSyncStatus = {
  ok: boolean;
  message: string;
  at: string;
  offlineHint?: boolean;
};

let lastStatus: CloudSyncStatus | null = null;
const listeners = new Set<(s: CloudSyncStatus | null) => void>();

export function getCloudSyncStatus(): CloudSyncStatus | null {
  return lastStatus;
}

export function setCloudSyncStatus(status: CloudSyncStatus | null): void {
  lastStatus = status;
  listeners.forEach((fn) => fn(lastStatus));
}

export function subscribeCloudSyncStatus(
  fn: (s: CloudSyncStatus | null) => void,
): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function reportCloudSyncResult(input: {
  ok: boolean;
  message: string;
  offlineHint?: boolean;
}): void {
  setCloudSyncStatus({
    ok: input.ok,
    message: input.message,
    offlineHint: input.offlineHint,
    at: new Date().toISOString(),
  });
}
