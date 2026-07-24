import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1),
  ).toISOString();
}

/** 管理后台总览：用户/邀请/用量/consent 事件 */
export async function GET() {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;

  try {
    const supabase = createServiceRoleClient();
    const monthStart = startOfMonthIso();

    const [
      profilesRes,
      referralsRes,
      usageMonthRes,
      eventsConsentRes,
      eventsRecentRes,
      referralsRecentRes,
    ] = await Promise.all([
      supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .gt("points_awarded", 0),
      supabase
        .from("ai_usage")
        .select("units")
        .eq("ok", true)
        .gte("created_at", monthStart),
      supabase
        .from("ai_events")
        .select("id", { count: "exact", head: true })
        .eq("consent", true),
      supabase
        .from("ai_events")
        .select(
          "id, user_id, action, outcome, category, provider, model, consent, created_at, tech_pack_id",
        )
        .eq("consent", true)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("referrals")
        .select("id, inviter_id, invitee_id, invite_code, points_awarded, created_at")
        .gt("points_awarded", 0)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const monthUnits = (usageMonthRes.data ?? []).reduce(
      (n, row) => n + (Number(row.units) || 0),
      0,
    );

    return NextResponse.json({
      adminEmail: session.email,
      stats: {
        profileCount: profilesRes.count ?? 0,
        successfulInvites: referralsRes.count ?? 0,
        monthAiUnits: monthUnits,
        consentedEvents: eventsConsentRes.count ?? 0,
      },
      recentEvents: eventsRecentRes.data ?? [],
      recentInvites: referralsRecentRes.data ?? [],
      errors: {
        profiles: profilesRes.error?.message ?? null,
        referrals: referralsRes.error?.message ?? null,
        usage: usageMonthRes.error?.message ?? null,
        events: eventsConsentRes.error?.message ?? eventsRecentRes.error?.message ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取总览失败" },
      { status: 500 },
    );
  }
}
