/**
 * 登录/注册成功后的云端收尾：不挡跳转。
 * 邀请领取 +（可选）自动双向同步都在后台跑。
 */

import { seedClientAuthCache } from "@/lib/supabase/auth-cache";

type AuthUserLike = {
  id: string;
  email?: string | null;
} | null;

/**
 * @returns 立刻可 router.replace；后台任务自行继续
 */
export function startPostAuthBackgroundWork(opts: {
  user: AuthUserLike;
  /** 默认 true：自动同步开时才拉/推云端 */
  runCloudSyncIfAuto?: boolean;
}): void {
  seedClientAuthCache(
    opts.user
      ? { id: opts.user.id, email: opts.user.email ?? null }
      : null,
  );

  void (async () => {
    try {
      const { claimPendingInviteAfterAuth } = await import(
        "@/lib/invite/claim-pending"
      );
      await claimPendingInviteAfterAuth();
    } catch {
      /* 邀请失败不挡使用 */
    }

    if (opts.runCloudSyncIfAuto === false) return;

    try {
      const { isCloudSyncAuto } = await import(
        "@/lib/project/sync-preference"
      );
      if (!isCloudSyncAuto()) return;
      const { syncAfterLogin } = await import("@/lib/project/cloud-sync");
      await syncAfterLogin();
    } catch {
      /* 同步失败可稍后点「同步」 */
    }
  })();
}
