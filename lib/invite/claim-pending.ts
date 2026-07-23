import {
  clearPendingInviteCode,
  readPendingInviteCode,
  savePendingInviteCode,
} from "@/lib/invite/constants";

/** 从 URL ?ref= 写入本机待领取邀请码 */
export function captureInviteRefFromSearch(
  ref: string | null | undefined,
): void {
  if (!ref) return;
  savePendingInviteCode(ref);
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
    // 先确保自己有档案（含邀请码）
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
    } | null;

    const err = json?.error || (!res.ok ? "claim_failed" : undefined);
    const definitive =
      json?.ok === true ||
      err === "already_claimed" ||
      err === "invalid_code" ||
      err === "self_invite" ||
      err === "inviter_limit" ||
      err === "missing_code";

    // 终态才清本机码；缺表/网络错误保留以便下次重试
    if (definitive) clearPendingInviteCode();

    if (json?.ok) return { claimed: true };
    return { claimed: false, error: err };
  } catch {
    return { claimed: false, error: "claim_failed" };
  }
}
