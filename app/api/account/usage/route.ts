import { NextResponse } from "next/server";
import {
  getFreeMonthlyAiUnits,
  getServerAuthUserId,
  sumCloudAiUsageThisMonth,
} from "@/lib/ai/quota";

/** 当前登录用户本月 AI 用量（给用户中心展示） */
export async function GET() {
  const userId = await getServerAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const used = await sumCloudAiUsageThisMonth(userId);
  const limit = getFreeMonthlyAiUnits();
  return NextResponse.json({ used, limit });
}
