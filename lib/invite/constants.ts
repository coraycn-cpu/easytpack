/** 邀请好友注册奖励（与 schema claim_invite_reward 一致） */
export const INVITE_REWARD_POINTS = 50;
/** 双方各得一份；每人最多成功邀请 6 人 */
export const INVITE_MAX_SUCCESS = 6;
/** 邀请积分上限（6 × 50） */
export const INVITE_POINTS_CAP = 300;

const REF_STORAGE_KEY = "easytpack_invite_ref";

export function savePendingInviteCode(code: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const c = (code || "").trim().toLowerCase();
  if (!c) return;
  try {
    localStorage.setItem(REF_STORAGE_KEY, c);
  } catch {
    /* ignore */
  }
}

export function readPendingInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const c = localStorage.getItem(REF_STORAGE_KEY);
    return c?.trim() ? c.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export function clearPendingInviteCode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildInviteRegisterUrl(inviteCode: string, origin?: string): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/login?mode=register&ref=${encodeURIComponent(inviteCode)}`;
}
