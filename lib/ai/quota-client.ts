/**
 * 浏览器端额度刷新：AI 接口返回后通知画布角标更新。
 */

export const AI_QUOTA_CHANGED_EVENT = "easytpack:ai-quota-changed";

export type AiQuotaChangedDetail = {
  used?: number;
  limit?: number;
};

export function notifyAiQuotaChanged(detail?: AiQuotaChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AI_QUOTA_CHANGED_EVENT, { detail: detail ?? {} }),
  );
}

/** 从 AI 响应头读取最新已用/上限并广播 */
export function notifyAiQuotaFromResponse(res: Response): void {
  const usedRaw = res.headers.get("x-ai-quota-used");
  const limitRaw = res.headers.get("x-ai-quota-limit");
  if (usedRaw == null && limitRaw == null) {
    // 仍触发一次拉取（例如 429 后）
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      notifyAiQuotaChanged();
    }
    return;
  }
  const used = usedRaw != null ? Number(usedRaw) : undefined;
  const limit = limitRaw != null ? Number(limitRaw) : undefined;
  notifyAiQuotaChanged({
    used: Number.isFinite(used) ? Math.floor(used as number) : undefined,
    limit: Number.isFinite(limit) ? Math.floor(limit as number) : undefined,
  });
}

/** 包装 fetch：自动把额度头同步到角标 */
export async function fetchAi(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  notifyAiQuotaFromResponse(res);
  return res;
}
