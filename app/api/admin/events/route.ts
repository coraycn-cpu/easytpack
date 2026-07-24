import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";

/** 管理端：训练 / consent 事件列表、审核筛选、导出、金标准包 */
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;

  const { searchParams } = new URL(req.url);
  const consentParam = searchParams.get("consent"); // true | false | all
  const action = (searchParams.get("action") || "").trim();
  const outcome = (searchParams.get("outcome") || "").trim();
  const reviewStatus = (searchParams.get("reviewStatus") || "").trim(); // pending|approved|rejected|unset|all
  const exportFmt = (searchParams.get("export") || "").trim(); // jsonl | csv | gold | ""
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
    let query = supabase
      .from("ai_events")
      .select(
        "id, user_id, tech_pack_id, action, category, photo_type, provider, model, outcome, consent, correction_text, created_at, ai_output, user_final, image_refs, review_status, review_note, reviewed_at, reviewed_by",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (consentParam === "true") query = query.eq("consent", true);
    if (consentParam === "false") query = query.eq("consent", false);
    if (action) query = query.eq("action", action);
    if (outcome) query = query.eq("outcome", outcome);
    if (reviewStatus === "pending" || reviewStatus === "approved" || reviewStatus === "rejected") {
      query = query.eq("review_status", reviewStatus);
    } else if (reviewStatus === "unset") {
      query = query.is("review_status", null);
    }

    // —— 金标准样本包：consent=true + approved（可叠加其它筛选）——
    if (exportFmt === "gold") {
      let goldQuery = supabase
        .from("ai_events")
        .select(
          "id, user_id, tech_pack_id, action, category, photo_type, provider, model, outcome, consent, correction_text, created_at, ai_output, user_final, image_refs, review_status, review_note, reviewed_at, reviewed_by",
        )
        .eq("consent", true)
        .eq("review_status", "approved")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (action) goldQuery = goldQuery.eq("action", action);
      if (outcome) goldQuery = goldQuery.eq("outcome", outcome);

      const { data, error } = await goldQuery;
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
      const rows = data ?? [];
      const filters = {
        consent: true,
        reviewStatus: "approved",
        action: action || null,
        outcome: outcome || null,
        limit: 2000,
      };
      const manifest = {
        kind: "easytpack-gold-standard",
        version: 1,
        exportedAt: new Date().toISOString(),
        exportedBy: session.email,
        filters,
        count: rows.length,
        note: "金标准：用户已同意质量池且管理员审核通过。仅含事件元数据与摘要，不含完整原图二进制。",
      };
      await writeAdminAuditLog({
        actorId: session.userId,
        actorEmail: session.email,
        action: "admin.events.export_gold",
        targetType: "ai_events",
        meta: { count: rows.length, filters },
        ip: clientIpFromRequest(req),
      });
      const body = JSON.stringify({ manifest, events: rows }, null, 2);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="gold-standard-${Date.now()}.json"`,
        },
      });
    }

    if (exportFmt === "jsonl" || exportFmt === "csv") {
      // 导出最多 2000 条，默认只导 consent=true（除非显式 all/false）
      if (!consentParam) query = query.eq("consent", true);
      const { data, error } = await query.limit(2000);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const rows = data ?? [];
      await writeAdminAuditLog({
        actorId: session.userId,
        actorEmail: session.email,
        action: "admin.events.export",
        targetType: "ai_events",
        meta: {
          format: exportFmt,
          count: rows.length,
          consent: consentParam || "true(default)",
          action: action || null,
          outcome: outcome || null,
          reviewStatus: reviewStatus || null,
        },
        ip: clientIpFromRequest(req),
      });
      if (exportFmt === "jsonl") {
        const body = rows.map((r) => JSON.stringify(r)).join("\n");
        return new NextResponse(body + (body ? "\n" : ""), {
          status: 200,
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Content-Disposition": `attachment; filename="ai-events-${Date.now()}.jsonl"`,
          },
        });
      }
      const header = [
        "id",
        "user_id",
        "action",
        "outcome",
        "consent",
        "review_status",
        "category",
        "provider",
        "model",
        "created_at",
      ];
      const lines = [
        header.join(","),
        ...rows.map((r) =>
          [
            r.id,
            r.user_id,
            r.action,
            r.outcome,
            r.consent,
            r.review_status,
            r.category,
            r.provider,
            r.model,
            r.created_at,
          ]
            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      ];
      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ai-events-${Date.now()}.csv"`,
        },
      });
    }

    const { data, error, count } = await query.range(from, to);
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

    const total = count ?? (data?.length ?? 0);
    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: (data ?? []).map((r) => ({
        id: String(r.id),
        userId: r.user_id ? String(r.user_id) : null,
        techPackId: r.tech_pack_id ? String(r.tech_pack_id) : null,
        action: String(r.action),
        category: r.category ? String(r.category) : null,
        photoType: r.photo_type ? String(r.photo_type) : null,
        provider: r.provider ? String(r.provider) : null,
        model: r.model ? String(r.model) : null,
        outcome: r.outcome ? String(r.outcome) : null,
        consent: Boolean(r.consent),
        correctionText: r.correction_text ? String(r.correction_text) : null,
        createdAt: String(r.created_at),
        hasAiOutput: Boolean(r.ai_output),
        hasUserFinal: Boolean(r.user_final),
        reviewStatus: r.review_status ? String(r.review_status) : null,
        reviewNote: r.review_note ? String(r.review_note) : null,
        reviewedAt: r.reviewed_at ? String(r.reviewed_at) : null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取事件失败" },
      { status: 500 },
    );
  }
}
