import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";
import type { UserPlan } from "@/lib/ai/entitlements";

type RouteContext = { params: Promise<{ userId: string }> };

function parsePlan(raw: unknown): UserPlan | null {
  if (raw === "free" || raw === "comped" || raw === "paused") return raw;
  return null;
}

/** 读取单用户权益 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;
  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("user_entitlements")
      .select("plan, ai_monthly_bonus, notes, updated_at, updated_by")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: error.message.includes("user_entitlements")
            ? "请执行最新 schema.sql（含 user_entitlements）"
            : undefined,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      userId,
      plan: data?.plan ?? "free",
      aiMonthlyBonus: Number(data?.ai_monthly_bonus) || 0,
      notes: data?.notes ?? null,
      updatedAt: data?.updated_at ?? null,
      updatedBy: data?.updated_by ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取权益失败" },
      { status: 500 },
    );
  }
}

/**
 * 更新权益：plan / aiMonthlyBonus / notes
 * body: { plan?, aiMonthlyBonus?, notes?, reason? }
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;
  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    plan?: string;
    aiMonthlyBonus?: number;
    notes?: string | null;
    reason?: string;
  };

  const patch: Record<string, unknown> = {
    user_id: userId,
    updated_by: session.userId,
    updated_at: new Date().toISOString(),
  };

  if (body.plan !== undefined) {
    const plan = parsePlan(body.plan);
    if (!plan) {
      return NextResponse.json(
        { error: "plan 只能是 free / comped / paused" },
        { status: 400 },
      );
    }
    patch.plan = plan;
  }
  if (body.aiMonthlyBonus !== undefined) {
    const n = Number(body.aiMonthlyBonus);
    if (!Number.isFinite(n) || n < 0 || n > 100_000) {
      return NextResponse.json(
        { error: "aiMonthlyBonus 须为 0–100000 的整数" },
        { status: 400 },
      );
    }
    patch.ai_monthly_bonus = Math.floor(n);
  }
  if (body.notes !== undefined) {
    patch.notes =
      body.notes === null ? null : String(body.notes).slice(0, 2000);
  }

  if (
    body.plan === undefined &&
    body.aiMonthlyBonus === undefined &&
    body.notes === undefined
  ) {
    return NextResponse.json({ error: "没有可更新字段" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    // upsert：不存在则插入默认
    const { data: existing } = await supabase
      .from("user_entitlements")
      .select("plan, ai_monthly_bonus, notes")
      .eq("user_id", userId)
      .maybeSingle();

    const row = {
      user_id: userId,
      plan: (patch.plan as string) ?? existing?.plan ?? "free",
      ai_monthly_bonus:
        (patch.ai_monthly_bonus as number | undefined) ??
        Number(existing?.ai_monthly_bonus) ??
        0,
      notes:
        patch.notes !== undefined
          ? (patch.notes as string | null)
          : (existing?.notes ?? null),
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_entitlements")
      .upsert(row, { onConflict: "user_id" })
      .select("plan, ai_monthly_bonus, notes, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: error.message.includes("user_entitlements")
            ? "请执行最新 schema.sql（含 user_entitlements）"
            : undefined,
        },
        { status: 500 },
      );
    }

    await writeAdminAuditLog({
      actorId: session.userId,
      actorEmail: session.email,
      action: "admin.entitlement.update",
      targetType: "user",
      targetId: userId,
      meta: {
        before: existing ?? null,
        after: data,
        reason: body.reason ?? null,
      },
      ip: clientIpFromRequest(req),
    });

    return NextResponse.json({
      ok: true,
      userId,
      plan: data.plan,
      aiMonthlyBonus: Number(data.ai_monthly_bonus) || 0,
      notes: data.notes,
      updatedAt: data.updated_at,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新权益失败" },
      { status: 500 },
    );
  }
}
