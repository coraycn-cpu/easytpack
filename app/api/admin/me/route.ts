import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/admin/guard";

/** 当前登录用户是否具备管理后台入口权限（只看邮箱白名单） */
export async function GET() {
  const identity = await getAdminIdentity();

  if (identity.ok) {
    return NextResponse.json({
      isAdmin: true,
      email: identity.email,
      adminEmailsConfigured: identity.adminEmailsConfigured,
      serviceRoleConfigured: identity.serviceRoleConfigured,
      hint: identity.serviceRoleConfigured
        ? null
        : "已识别管理员，但还缺 SUPABASE_SERVICE_ROLE_KEY，打开后台后无法拉数据。请在 Vercel 配置并 Redeploy。",
    });
  }

  // 未登录 / 非管理员：入口隐藏；配置问题时返回 hint 便于排查
  return NextResponse.json({
    isAdmin: false,
    email: "email" in identity ? identity.email ?? null : null,
    adminEmailsConfigured: identity.adminEmailsConfigured,
    serviceRoleConfigured: identity.serviceRoleConfigured,
    error: identity.error,
    hint:
      identity.status === 503
        ? identity.error
        : identity.status === 403
          ? "当前登录邮箱不在 ADMIN_EMAILS。请确认 Vercel 变量值为 test@qq.com（勾选 Preview）并已 Redeploy。"
          : null,
  });
}
