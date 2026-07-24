import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type LogKind = "audit" | "usage" | "invites" | "ai_errors" | "consent";

/**
 * 管理端日志聚合：
 * - audit: 管理操作审计
 * - usage: 全站 AI 用量
 * - invites: 邀请记录
 * - ai_errors: AI 失败调用（ai_usage.ok=false）
 * - consent: consent=true 的训练事件
 */
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;

  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") || "audit") as LogKind;
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const pageRaw = Number(searchParams.get("page") || "1");
  const pageSizeRaw = Number(searchParams.get("pageSize") || "30");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Math.min(
    100,
    Math.max(1, Number.isFinite(pageSizeRaw) ? Math.floor(pageSizeRaw) : 30),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = createServiceRoleClient();

    if (kind === "audit") {
      let query = supabase
        .from("admin_audit_log")
        .select(
          "id, actor_id, actor_email, action, target_type, target_id, meta, ip, created_at",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (q) {
        query = query.or(
          `actor_email.ilike.%${q}%,action.ilike.%${q}%,target_id.ilike.%${q}%`,
        );
      }
      const { data, error, count } = await query;
      if (error) {
        return NextResponse.json(
          {
            error: error.message,
            hint: error.message.toLowerCase().includes("admin_audit_log")
              ? "请在 Supabase 执行最新 schema.sql（含 admin_audit_log）"
              : undefined,
            kind,
            items: [],
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
          { status: 500 },
        );
      }
      const total = count ?? 0;
      return NextResponse.json({
        kind,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        items: (data ?? []).map((r) => ({
          id: String(r.id),
          at: String(r.created_at),
          title: String(r.action),
          subtitle: [r.actor_email, r.target_type, r.target_id]
            .filter(Boolean)
            .join(" · "),
          meta: r.meta,
          ip: r.ip,
        })),
      });
    }

    if (kind === "usage") {
      let query = supabase
        .from("ai_usage")
        .select(
          "id, user_id, action, units, ok, provider, model, tech_pack_id, created_at",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (q) {
        if (/^[0-9a-f-]{36}$/i.test(q)) {
          query = query.eq("user_id", q);
        } else {
          query = query.ilike("action", `%${q}%`);
        }
      }
      const { data, error, count } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const total = count ?? 0;
      return NextResponse.json({
        kind,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        items: (data ?? []).map((r) => ({
          id: String(r.id),
          at: String(r.created_at),
          title: `${r.ok ? "OK" : "FAIL"} · ${r.action} · ${r.units}点`,
          subtitle: [r.user_id, r.provider, r.model, r.tech_pack_id]
            .filter(Boolean)
            .join(" · "),
          ok: Boolean(r.ok),
        })),
      });
    }

    if (kind === "ai_errors") {
      const { data, error, count } = await supabase
        .from("ai_usage")
        .select(
          "id, user_id, action, units, ok, provider, model, tech_pack_id, created_at",
          { count: "exact" },
        )
        .eq("ok", false)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const total = count ?? 0;
      return NextResponse.json({
        kind,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        items: (data ?? []).map((r) => ({
          id: String(r.id),
          at: String(r.created_at),
          title: `AI失败 · ${r.action}`,
          subtitle: [r.user_id, r.provider, r.model].filter(Boolean).join(" · "),
          ok: false,
        })),
      });
    }

    if (kind === "invites") {
      const { data, error, count } = await supabase
        .from("referrals")
        .select(
          "id, inviter_id, invitee_id, invite_code, points_awarded, created_at",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const total = count ?? 0;
      return NextResponse.json({
        kind,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        items: (data ?? []).map((r) => ({
          id: String(r.id),
          at: String(r.created_at),
          title:
            Number(r.points_awarded) > 0
              ? `邀请成功 +${r.points_awarded} · 码 ${r.invite_code}`
              : `邀请记录（未发分）· 码 ${r.invite_code}`,
          subtitle: `${r.inviter_id} → ${r.invitee_id}`,
          points: Number(r.points_awarded) || 0,
        })),
      });
    }

    // consent events
    const { data, error, count } = await supabase
      .from("ai_events")
      .select(
        "id, user_id, action, outcome, consent, provider, model, created_at",
        { count: "exact" },
      )
      .eq("consent", true)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const total = count ?? 0;
    return NextResponse.json({
      kind: "consent",
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: (data ?? []).map((r) => ({
        id: String(r.id),
        at: String(r.created_at),
        title: `${r.action}${r.outcome ? ` · ${r.outcome}` : ""}`,
        subtitle: [r.user_id, r.provider, r.model].filter(Boolean).join(" · "),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取日志失败" },
      { status: 500 },
    );
  }
}
