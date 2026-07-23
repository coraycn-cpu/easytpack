import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/** 被邀请人登录/注册后领取邀请奖励（给邀请人加积分） */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "未配置云端" }, { status: 503 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      inviteCode?: string;
    };
    const code = (body.inviteCode || "").trim().toLowerCase();
    if (!code) {
      return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("claim_invite_reward", {
      p_code: code,
    });
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          hint: error.message.toLowerCase().includes("function")
            ? "请重新执行 supabase/schema.sql"
            : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? { ok: false });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "claim_failed",
      },
      { status: 500 },
    );
  }
}
