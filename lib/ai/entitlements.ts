import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type UserPlan = "free" | "comped" | "paused";

export type UserEntitlement = {
  plan: UserPlan;
  aiMonthlyBonus: number;
  notes: string | null;
};

export const DEFAULT_ENTITLEMENT: UserEntitlement = {
  plan: "free",
  aiMonthlyBonus: 0,
  notes: null,
};

function parsePlan(raw: unknown): UserPlan {
  if (raw === "comped" || raw === "paused" || raw === "free") return raw;
  return "free";
}

/** 当前用户自己的权益（anon + RLS） */
export async function getUserEntitlement(
  userId: string,
): Promise<UserEntitlement> {
  if (!isSupabaseConfigured()) return DEFAULT_ENTITLEMENT;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_entitlements")
      .select("plan, ai_monthly_bonus, notes")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return DEFAULT_ENTITLEMENT;
    return {
      plan: parsePlan(data.plan),
      aiMonthlyBonus: Math.max(0, Math.floor(Number(data.ai_monthly_bonus) || 0)),
      notes: data.notes ? String(data.notes) : null,
    };
  } catch {
    return DEFAULT_ENTITLEMENT;
  }
}

/** 支付/档位条件：团队等能力暂未开放；comped 仅表示内部赠送额度 */
export function canAccessTeamFeatures(plan: UserPlan): boolean {
  // 真实团队组织仍暂缓；预留条件位
  void plan;
  return false;
}

export function planLabel(plan: UserPlan): string {
  switch (plan) {
    case "paused":
      return "已暂停";
    case "comped":
      return "内部赠送";
    default:
      return "免费";
  }
}
