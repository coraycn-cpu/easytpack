import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildShareSnapshot,
  generateShareId,
  shareHashForProject,
  type ShareSnapshot,
} from "@/lib/share/snapshot";
import type { TechPackProject } from "@/types/project";

/** 登录后创建公开分享链接 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "未配置云端，无法生成分享链接" },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
      return NextResponse.json(
        { error: "请先登录后再生成分享链接" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      project?: TechPackProject;
      projectId?: string;
    };
    if (!body.project?.id) {
      return NextResponse.json({ error: "缺少项目数据" }, { status: 400 });
    }

    const project = body.project;
    const id = generateShareId();
    const snapshot: ShareSnapshot = buildShareSnapshot(project);
    const shareHash = shareHashForProject(project);

    const { error } = await supabase.from("share_links").insert({
      id,
      user_id: auth.user.id,
      tech_pack_id: project.id,
      title: snapshot.title,
      snapshot,
      share_hash: shareHash,
    });

    if (error) {
      const hint =
        error.message.includes("share_links") ||
        error.message.toLowerCase().includes("does not exist")
          ? "请在 Supabase SQL Editor 重新执行仓库里的 supabase/schema.sql（含 share_links 表）"
          : error.message;
      return NextResponse.json({ error: hint }, { status: 500 });
    }

    // 顺带记一版 checkpoint（失败忽略）
    void (async () => {
      try {
        await supabase.from("pack_versions").insert({
          tech_pack_id: project.id,
          user_id: auth.user.id,
          kind: "user_checkpoint",
          snapshot,
          source_action: "share_link",
        });
      } catch {
        /* ignore */
      }
    })();

    const origin = new URL(req.url).origin;
    const url = `${origin}/share/${id}`;
    return NextResponse.json({ id, url, shareHash, title: snapshot.title });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "创建分享失败" },
      { status: 500 },
    );
  }
}

/** 列出当前用户最近分享 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [] });
  }
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const { data, error } = await supabase
      .from("share_links")
      .select("id, title, created_at, revoked_at, share_hash, tech_pack_id")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      return NextResponse.json({ error: error.message, items: [] }, { status: 500 });
    }
    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "读取失败",
        items: [],
      },
      { status: 500 },
    );
  }
}
