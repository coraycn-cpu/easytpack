import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";

/** 当前登录用户是否具备管理后台权限 */
export async function GET() {
  const session = await requireAdminSession();
  if (!session.ok) {
    // 未登录 / 非管理员 / 未配齐环境：对前端统一视为非管理员
    const status = session.response.status;
    if (status === 401 || status === 403 || status === 503) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }
    return session.response;
  }
  return NextResponse.json({
    isAdmin: true,
    email: session.email,
  });
}
