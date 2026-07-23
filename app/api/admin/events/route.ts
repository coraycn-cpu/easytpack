import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";

/** 管理端：训练 / consent 事件列表与导出 */
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;

  const { searchParams } = new URL(req.url);
  const consentParam = searchParams.get("consent"); // true | false | all
  const action = (searchParams.get("action") || "").trim();
  const outcome = (searchParams.get("outcome") || "").trim();
  const exportFmt = (searchParams.get("export") || "").trim(); // jsonl | csv | ""
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
        "id, user_id, tech_pack_id, action, category, photo_type, provider, model, outcome, consent, correction_text, created_at, ai_output, user_final",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (consentParam === "true") query = query.eq("consent", true);
    if (consentParam === "false") query = query.eq("consent", false);
    if (action) query = query.eq("action", action);
    if (outcome) query = query.eq("outcome", outcome);

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
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取事件失败" },
      { status: 500 },
    );
  }
}
