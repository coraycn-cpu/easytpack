import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AiMeterAction } from "@/lib/ai/metering";
import {
  DEFAULT_ENTITLEMENT,
  getUserEntitlement,
  type UserEntitlement,
} from "@/lib/ai/entitlements";
import {
  AI_LOGIN_REQUIRED_CODE,
  AI_LOGIN_REQUIRED_MESSAGE,
} from "@/lib/ai/login-gate";

/** 免费档每月 AI 点数（可用环境变量覆盖；未接付费） */
export function getFreeMonthlyAiUnits(): number {
  const n = Number(process.env.AI_FREE_MONTHLY_UNITS || "200");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 200;
}

/** 邀请好友注册获得的积分（计入 AI 额度上限，最高 300） */
export async function getInviteBonusPoints(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("points")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return 0;
    const n = Number(data.points);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const { INVITE_POINTS_CAP } = await import("@/lib/invite/constants");
    return Math.min(Math.floor(n), INVITE_POINTS_CAP);
  } catch {
    return 0;
  }
}

export type EffectiveAiLimit = {
  base: number;
  /** 邀请积分 */
  inviteBonus: number;
  /** 管理端人工加赠 */
  adminBonus: number;
  /** invite + admin（兼容旧字段名 bonus = 两者之和） */
  bonus: number;
  limit: number;
  plan: UserEntitlement["plan"];
  paused: boolean;
};

/** 本月可用上限 = 免费档 + 邀请积分 + 人工加赠；paused 则 limit=0 */
export async function getEffectiveAiLimit(
  userId: string | null,
): Promise<EffectiveAiLimit> {
  const base = getFreeMonthlyAiUnits();
  if (!userId) {
    return {
      base,
      inviteBonus: 0,
      adminBonus: 0,
      bonus: 0,
      limit: base,
      plan: "free",
      paused: false,
    };
  }
  const [inviteBonus, entitlement] = await Promise.all([
    getInviteBonusPoints(userId),
    getUserEntitlement(userId),
  ]);
  const adminBonus = entitlement.aiMonthlyBonus;
  const bonus = inviteBonus + adminBonus;
  const paused = entitlement.plan === "paused";
  return {
    base,
    inviteBonus,
    adminBonus,
    bonus,
    limit: paused ? 0 : base + bonus,
    plan: entitlement.plan,
    paused,
  };
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function getServerAuthUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function sumCloudAiUsageThisMonth(
  userId: string,
): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_usage")
      .select("units")
      .eq("user_id", userId)
      .eq("ok", true)
      .gte("created_at", startOfMonthIso());
    if (error || !data) return 0;
    return data.reduce((n, row) => n + (Number(row.units) || 0), 0);
  } catch {
    return 0;
  }
}

export type AiQuotaOk = {
  ok: true;
  userId: string | null;
  used: number;
  limit: number;
};

export type AiQuotaBlocked = {
  ok: false;
  response: NextResponse;
};

/** 已登录用户检查本月额度；未登录禁止调 AI（引导注册，仍可手动标注） */
export async function assertWithinAiQuota(
  unitsNeeded = 1,
): Promise<AiQuotaOk | AiQuotaBlocked> {
  const userId = await getServerAuthUserId();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: AI_LOGIN_REQUIRED_MESSAGE,
          code: AI_LOGIN_REQUIRED_CODE,
        },
        { status: 401 },
      ),
    };
  }
  const { limit, base, bonus, inviteBonus, adminBonus, paused, plan } =
    await getEffectiveAiLimit(userId);
  if (paused) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "账号 AI 能力已暂停，请联系管理员恢复。",
          code: "AI_PAUSED",
          used: 0,
          limit: 0,
          plan,
        },
        { status: 403 },
      ),
    };
  }
  const used = await sumCloudAiUsageThisMonth(userId);
  if (used + unitsNeeded > limit) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `本月 AI 额度已用完（已用 ${used}/${limit}，免费 ${base} + 邀请 ${inviteBonus} + 加赠 ${adminBonus}）。可下月再试或邀请好友加分；付费升级将在后续版本开放。`,
          code: "AI_QUOTA_EXCEEDED",
          used,
          limit,
          base,
          bonus,
          inviteBonus,
          adminBonus,
        },
        { status: 429 },
      ),
    };
  }
  return { ok: true, userId, used, limit };
}

export async function persistCloudAiUsage(input: {
  userId: string | null;
  action: AiMeterAction | string;
  projectId?: string;
  units?: number;
  ok: boolean;
  provider?: string;
  model?: string;
}): Promise<void> {
  if (!input.userId || !isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    const row = {
      user_id: input.userId,
      action: input.action,
      units: input.units ?? 1,
      tech_pack_id: input.projectId ?? null,
      ok: input.ok,
      provider: input.provider ?? null,
      model: input.model ?? null,
    };
    let { error } = await supabase.from("ai_usage").insert(row);
    if (error && input.projectId) {
      const retry = await supabase.from("ai_usage").insert({
        ...row,
        tech_pack_id: null,
      });
      error = retry.error;
    }
    if (error) console.warn("[ai-usage]", error.message);
  } catch (err) {
    console.warn("[ai-usage]", err);
  }
}

export { DEFAULT_ENTITLEMENT };
