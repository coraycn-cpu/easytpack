import {
  clearPendingInviteCode,
  readPendingInviteCode,
  savePendingInviteCode,
} from "@/lib/invite/constants";

const CLAIM_TIP_KEY = "easytpack_invite_claim_tip";

/** 从 URL ?ref= 写入本机待领取邀请码 */
export function captureInviteRefFromSearch(
  ref: string | null | undefined,
): void {
  if (!ref) return;
  savePendingInviteCode(ref);
}

export function stashInviteClaimTip(message: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CLAIM_TIP_KEY, message);
  } catch {
    /* ignore */
  }
}

export function consumeInviteClaimTip(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const tip = sessionStorage.getItem(CLAIM_TIP_KEY);
    if (tip) sessionStorage.removeItem(CLAIM_TIP_KEY);
    return tip;
  } catch {
    return null;
  }
}

function friendlyClaimError(code: string | undefined): string {
  switch (code) {
    case "already_claimed":
      return "这个账号已经领过邀请奖励了";
    case "invalid_code":
      return "邀请码无效，请向好友重新要链接";
    case "self_invite":
      return "不能用自己的邀请码";
    case "inviter_limit":
      return "对方邀请名额已满，可换一位好友的邀请链接再注册";
    case "missing_code":
      return "缺少邀请码";
    default:
      return "邀请奖励未能自动领取，可稍后在用户中心查看积分";
  }
}

/**
 * 登录/注册成功后：确保档案存在，并用待领取邀请码给双方加积分。
 * 失败不抛错（不挡进入产品）。
 */
export async function claimPendingInviteAfterAuth(): Promise<{
  claimed: boolean;
  error?: string;
}> {
  try {
    await fetch("/api/account/profile").catch(() => null);

    const code = readPendingInviteCode();
    if (!code) return { claimed: false };

    const res = await fetch("/api/invite/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: code }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      invitee_points?: number;
    } | null;

    const err = json?.error || (!res.ok ? "claim_failed" : undefined);
    const definitive =
      json?.ok === true ||
      err === "already_claimed" ||
      err === "invalid_code" ||
      err === "self_invite" ||
      err === "inviter_limit" ||
      err === "missing_code";

    if (definitive) clearPendingInviteCode();

    if (json?.ok) {
      const pts = json.invitee_points ?? 50;
      stashInviteClaimTip(`邀请奖励已到账：你获得 ${pts} 积分`);
      return { claimed: true };
    }
    if (err) stashInviteClaimTip(friendlyClaimError(err));
    return { claimed: false, error: err };
  } catch {
    return { claimed: false, error: "claim_failed" };
  }
}
