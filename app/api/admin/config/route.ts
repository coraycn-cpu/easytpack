import { NextResponse } from "next/server";
import { getAdminIdentity, parseAdminEmails } from "@/lib/admin/guard";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";
import { getFreeMonthlyAiUnits } from "@/lib/ai/quota";
import {
  INVITE_MAX_SUCCESS,
  INVITE_POINTS_CAP,
  INVITE_REWARD_POINTS,
} from "@/lib/invite/constants";

/** 管理端：生效配置（不含密钥）；只需邮箱白名单 */
export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.ok) {
    return NextResponse.json({ error: identity.error }, { status: identity.status });
  }

  const emails = parseAdminEmails();
  return NextResponse.json({
    freeMonthlyAiUnits: getFreeMonthlyAiUnits(),
    inviteRewardPoints: INVITE_REWARD_POINTS,
    inviteMaxSuccess: INVITE_MAX_SUCCESS,
    invitePointsCap: INVITE_POINTS_CAP,
    adminEmailCount: emails.length,
    adminEmailsMasked: emails.map((e) => {
      const [name, domain] = e.split("@");
      if (!domain) return "***";
      const n =
        name.length <= 2 ? `${name[0] ?? "*"}*` : `${name.slice(0, 2)}***`;
      return `${n}@${domain}`;
    }),
    serviceRoleConfigured: isSupabaseServiceRoleConfigured(),
    supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    payment: {
      enabled: false,
      note: "支付接口暂未接入；后续用 entitlements.plan 做条件限制",
    },
  });
}
