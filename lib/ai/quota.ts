import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AiMeterAction } from "@/lib/ai/metering";

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

/** 本月可用上限 = 免费档 + 邀请积分 */
export async function getEffectiveAiLimit(userId: string | null): Promise<{
  base: number;
  bonus: number;
  limit: number;
}> {
  const base = getFreeMonthlyAiUnits();
  if (!userId) return { base, bonus: 0, limit: base };
  const bonus = await getInviteBonusPoints(userId);
  return { base, bonus, limit: base + bonus };
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

/** 已登录用户检查本月额度；未登录放行（本机模式） */
export async function assertWithinAiQuota(
  unitsNeeded = 1,
): Promise<AiQuotaOk | AiQuotaBlocked> {
  const userId = await getServerAuthUserId();
  const { limit, base, bonus } = await getEffectiveAiLimit(userId);
  if (!userId) {
    return { ok: true, userId: null, used: 0, limit };
  }
  const used = await sumCloudAiUsageThisMonth(userId);
  if (used + unitsNeeded > limit) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `本月 AI 额度已用完（已用 ${used}/${limit}，含邀请积分 ${bonus}）。可下月再试或邀请好友加分；付费升级将在后续版本开放。`,
          code: "AI_QUOTA_EXCEEDED",
          used,
          limit,
          base,
          bonus,
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
    // 项目尚未上云时外键会失败：去掉 tech_pack_id 再记一笔
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
