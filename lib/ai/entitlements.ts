import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  parseUserPlan,
  type UserPlan,
} from "@/lib/ai/plan-display";

export type { UserPlan };
export { planLabel, canAccessTeamFeatures } from "@/lib/ai/plan-display";

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
      plan: parseUserPlan(data.plan),
      aiMonthlyBonus: Math.max(0, Math.floor(Number(data.ai_monthly_bonus) || 0)),
      notes: data.notes ? String(data.notes) : null,
    };
  } catch {
    return DEFAULT_ENTITLEMENT;
  }
}
