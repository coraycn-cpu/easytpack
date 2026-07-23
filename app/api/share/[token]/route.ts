import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type Ctx = { params: Promise<{ token: string }> };

/** 公开读取分享快照（未登录也可） */
export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "未配置云端" }, { status: 503 });
  }
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "无效链接" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("share_links")
      .select("id, title, snapshot, created_at, revoked_at, share_hash")
      .eq("id", token)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.revoked_at) {
      return NextResponse.json(
        { error: "分享不存在或已失效" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      snapshot: data.snapshot,
      createdAt: data.created_at,
      shareHash: data.share_hash,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取失败" },
      { status: 500 },
    );
  }
}

/** 撤销分享（需登录且为所有者） */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "未配置云端" }, { status: 503 });
  }
  const { token } = await ctx.params;
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { error } = await supabase
      .from("share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", token)
      .eq("user_id", auth.user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "撤销失败" },
      { status: 500 },
    );
  }
}
