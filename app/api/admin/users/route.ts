import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getFreeMonthlyAiUnits } from "@/lib/ai/quota";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1),
  ).toISOString();
}

/** 管理端：用户/档案列表 */
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const pageRaw = Number(searchParams.get("page") || "1");
  const pageSizeRaw = Number(searchParams.get("pageSize") || "20");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Math.min(
    50,
    Math.max(1, Number.isFinite(pageSizeRaw) ? Math.floor(pageSizeRaw) : 20),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = createServiceRoleClient();
    let query = supabase
      .from("profiles")
      .select("user_id, email, invite_code, points, created_at, updated_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) {
      // 邮箱 / 邀请码模糊搜；完整 uuid 精确匹配
      if (/^[0-9a-f-]{36}$/i.test(q)) {
        query = query.eq("user_id", q);
      } else {
        query = query.or(`email.ilike.%${q}%,invite_code.ilike.%${q}%`);
      }
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const userIds = rows.map((r) => r.user_id as string);
    const monthStart = startOfMonthIso();

    const usageByUser = new Map<string, number>();
    const packsByUser = new Map<string, number>();
    const invitesByUser = new Map<string, number>();
    const entitlementByUser = new Map<
      string,
      { plan: string; aiMonthlyBonus: number; notes: string | null }
    >();

    if (userIds.length > 0) {
      const [usageRes, packsRes, invitesRes, entRes] = await Promise.all([
        supabase
          .from("ai_usage")
          .select("user_id, units")
          .eq("ok", true)
          .gte("created_at", monthStart)
          .in("user_id", userIds),
        supabase
          .from("tech_packs")
          .select("user_id")
          .in("user_id", userIds),
        supabase
          .from("referrals")
          .select("inviter_id")
          .gt("points_awarded", 0)
          .in("inviter_id", userIds),
        supabase
          .from("user_entitlements")
          .select("user_id, plan, ai_monthly_bonus, notes")
          .in("user_id", userIds),
      ]);

      for (const row of usageRes.data ?? []) {
        const id = String(row.user_id);
        usageByUser.set(id, (usageByUser.get(id) ?? 0) + (Number(row.units) || 0));
      }
      for (const row of packsRes.data ?? []) {
        const id = String(row.user_id);
        packsByUser.set(id, (packsByUser.get(id) ?? 0) + 1);
      }
      for (const row of invitesRes.data ?? []) {
        const id = String(row.inviter_id);
        invitesByUser.set(id, (invitesByUser.get(id) ?? 0) + 1);
      }
      for (const row of entRes.data ?? []) {
        entitlementByUser.set(String(row.user_id), {
          plan: String(row.plan || "free"),
          aiMonthlyBonus: Math.max(0, Math.floor(Number(row.ai_monthly_bonus) || 0)),
          notes: row.notes ? String(row.notes) : null,
        });
      }
    }

    const freeBase = getFreeMonthlyAiUnits();
    const items = rows.map((r) => {
      const userId = String(r.user_id);
      const points = Number(r.points) || 0;
      const inviteBonus = Math.min(points, 300);
      const ent = entitlementByUser.get(userId);
      const adminBonus = ent?.aiMonthlyBonus ?? 0;
      const plan = ent?.plan ?? "free";
      const paused = plan === "paused";
      const monthUsed = usageByUser.get(userId) ?? 0;
      return {
        userId,
        email: r.email ? String(r.email) : null,
        inviteCode: String(r.invite_code),
        points,
        inviteBonus,
        adminBonus,
        plan,
        notes: ent?.notes ?? null,
        paused,
        monthUsed,
        monthLimit: paused ? 0 : freeBase + inviteBonus + adminBonus,
        packCount: packsByUser.get(userId) ?? 0,
        inviteSuccess: invitesByUser.get(userId) ?? 0,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      };
    });

    const total = count ?? items.length;
    if (q) {
      await writeAdminAuditLog({
        actorId: session.userId,
        actorEmail: session.email,
        action: "admin.users.search",
        targetType: "profiles",
        meta: { q, page, total },
        ip: clientIpFromRequest(req),
      });
    }
    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      freeBase,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取用户失败" },
      { status: 500 },
    );
  }
}
