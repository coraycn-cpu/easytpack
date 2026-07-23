import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getEffectiveAiLimit,
  getServerAuthUserId,
  sumCloudAiUsageThisMonth,
} from "@/lib/ai/quota";

export type AiUsageItem = {
  id: string;
  action: string;
  units: number;
  ok: boolean;
  provider: string | null;
  model: string | null;
  projectId: string | null;
  createdAt: string;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** 当前登录用户本月 AI 用量汇总 + 分页明细 */
export async function GET(req: NextRequest) {
  const userId = await getServerAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const pageRaw = Number(searchParams.get("page") || "1");
  const pageSizeRaw = Number(
    searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE),
  );
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.isFinite(pageSizeRaw) ? Math.floor(pageSizeRaw) : DEFAULT_PAGE_SIZE,
    ),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const used = await sumCloudAiUsageThisMonth(userId);
  const { limit, base, bonus } = await getEffectiveAiLimit(userId);

  try {
    const supabase = await createClient();
    const start = new Date();
    const monthStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
    ).toISOString();

    const { data, error, count } = await supabase
      .from("ai_usage")
      .select(
        "id, action, units, ok, provider, model, tech_pack_id, created_at",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: AiUsageItem[] = (data ?? []).map((row) => ({
      id: String(row.id),
      action: String(row.action ?? "other"),
      units: Number(row.units) || 0,
      ok: Boolean(row.ok),
      provider: row.provider ? String(row.provider) : null,
      model: row.model ? String(row.model) : null,
      projectId: row.tech_pack_id ? String(row.tech_pack_id) : null,
      createdAt: String(row.created_at),
    }));

    const total = count ?? items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      used,
      limit,
      base,
      bonus,
      page,
      pageSize,
      total,
      totalPages,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "读取用量失败",
        used,
        limit,
        base,
        bonus,
        page,
        pageSize,
        total: 0,
        totalPages: 1,
        items: [],
      },
      { status: 500 },
    );
  }
}
