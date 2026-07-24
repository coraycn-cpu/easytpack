import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";

/** 管理端：工艺包列表（含版本数），用于备份/恢复巡查 */
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
      .from("tech_packs")
      .select(
        "id, user_id, title, style_no, workflow_status, updated_at, created_at, finalized_at",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false });

    if (q) {
      // 去掉 PostgREST 过滤特殊字符，避免 filter 注入
      const safe = q.replace(/[%_,.()]/g, " ").trim();
      if (safe) {
        query = query.or(
          `id.ilike.%${safe}%,title.ilike.%${safe}%,style_no.ilike.%${safe}%`,
        );
      }
    }

    const { data, error, count } = await query.range(from, to);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const packIds = rows.map((r) => String(r.id));
    const userIds = Array.from(
      new Set(rows.map((r) => String(r.user_id)).filter(Boolean)),
    );

    const versionCount = new Map<string, number>();
    if (packIds.length > 0) {
      const { data: versions } = await supabase
        .from("pack_versions")
        .select("tech_pack_id")
        .in("tech_pack_id", packIds);
      for (const v of versions ?? []) {
        const id = String(v.tech_pack_id);
        versionCount.set(id, (versionCount.get(id) ?? 0) + 1);
      }
    }

    const emailMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      for (const p of profiles ?? []) {
        emailMap.set(
          String(p.user_id),
          p.email ? String(p.email) : null,
        );
      }
    }

    // 若按邮箱搜：补充过滤（本页 + 提示）
    let items = rows.map((r) => {
      const id = String(r.id);
      const userId = String(r.user_id);
      return {
        id,
        userId,
        email: emailMap.get(userId) ?? null,
        title: String(r.title || "未命名款式"),
        styleNo: r.style_no ? String(r.style_no) : null,
        workflowStatus: String(r.workflow_status || "draft"),
        versionCount: versionCount.get(id) ?? 0,
        updatedAt: String(r.updated_at),
        createdAt: String(r.created_at),
        finalizedAt: r.finalized_at ? String(r.finalized_at) : null,
      };
    });

    if (q.includes("@")) {
      items = items.filter((it) =>
        (it.email || "").toLowerCase().includes(q),
      );
    }

    const total = count ?? items.length;
    await writeAdminAuditLog({
      actorId: session.userId,
      actorEmail: session.email,
      action: "admin.packs.list",
      targetType: "tech_packs",
      meta: { q: q || null, page, count: items.length },
      ip: clientIpFromRequest(req),
    });

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取工艺包失败" },
      { status: 500 },
    );
  }
}
