import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  INVITE_MAX_SUCCESS,
  INVITE_REWARD_POINTS,
} from "@/lib/invite/constants";

export type ProfilePayload = {
  inviteCode: string;
  points: number;
  email: string | null;
  inviteSuccessCount: number;
  inviteRemaining: number;
  rewardPoints: number;
  maxSuccess: number;
};

/** 确保档案存在，并返回邀请统计 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "未配置云端" }, { status: 503 });
  }
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data: profile, error } = await supabase.rpc("ensure_user_profile");
    if (error || !profile) {
      return NextResponse.json(
        {
          error:
            error?.message?.includes("ensure_user_profile") ||
            error?.message?.toLowerCase().includes("function")
              ? "请在 Supabase 重新执行 supabase/schema.sql（含 profiles / 邀请函数）"
              : error?.message || "读取档案失败",
        },
        { status: 500 },
      );
    }

    const row = profile as {
      invite_code: string;
      points: number;
      email: string | null;
      user_id: string;
    };

    const { count } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("inviter_id", auth.user.id)
      .gt("points_awarded", 0);

    const inviteSuccessCount = count ?? 0;

    const payload: ProfilePayload = {
      inviteCode: row.invite_code,
      points: Number(row.points) || 0,
      email: row.email ?? auth.user.email ?? null,
      inviteSuccessCount,
      inviteRemaining: Math.max(0, INVITE_MAX_SUCCESS - inviteSuccessCount),
      rewardPoints: INVITE_REWARD_POINTS,
      maxSuccess: INVITE_MAX_SUCCESS,
    };
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取档案失败" },
      { status: 500 },
    );
  }
}
