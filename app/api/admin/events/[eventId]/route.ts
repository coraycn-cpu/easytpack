import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";

type RouteContext = { params: Promise<{ eventId: string }> };

function parseReviewStatus(
  raw: unknown,
): "pending" | "approved" | "rejected" | null {
  if (raw === "pending" || raw === "approved" || raw === "rejected") return raw;
  return null;
}

/** 更新训练事件审核状态 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;
  const { eventId } = await ctx.params;
  if (!eventId) {
    return NextResponse.json({ error: "缺少 eventId" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    reviewStatus?: string;
    reviewNote?: string | null;
  };
  const reviewStatus = parseReviewStatus(body.reviewStatus);
  if (!reviewStatus) {
    return NextResponse.json(
      { error: "reviewStatus 须为 pending / approved / rejected" },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: before, error: readErr } = await supabase
      .from("ai_events")
      .select("id, consent, review_status, action")
      .eq("id", eventId)
      .maybeSingle();
    if (readErr) {
      return NextResponse.json(
        {
          error: readErr.message,
          hint: readErr.message.includes("review_status")
            ? "请执行最新 schema.sql（ai_events 含 review_status）"
            : undefined,
        },
        { status: 500 },
      );
    }
    if (!before) {
      return NextResponse.json({ error: "事件不存在" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      review_status: reviewStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.userId,
    };
    if (body.reviewNote !== undefined) {
      patch.review_note =
        body.reviewNote === null ? null : String(body.reviewNote).slice(0, 500);
    }

    const { data, error } = await supabase
      .from("ai_events")
      .update(patch)
      .eq("id", eventId)
      .select(
        "id, review_status, review_note, reviewed_at, reviewed_by, consent, action",
      )
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: error.message.includes("review_status")
            ? "请执行最新 schema.sql（ai_events 含 review_status）"
            : undefined,
        },
        { status: 500 },
      );
    }

    await writeAdminAuditLog({
      actorId: session.userId,
      actorEmail: session.email,
      action: "admin.events.review",
      targetType: "ai_events",
      targetId: eventId,
      meta: {
        before: before.review_status,
        after: reviewStatus,
        consent: before.consent,
        eventAction: before.action,
        reviewNote: body.reviewNote ?? null,
      },
      ip: clientIpFromRequest(req),
    });

    return NextResponse.json({
      ok: true,
      id: data?.id ?? eventId,
      reviewStatus: data?.review_status ?? reviewStatus,
      reviewNote: data?.review_note ?? null,
      reviewedAt: data?.reviewed_at ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "审核失败" },
      { status: 500 },
    );
  }
}
