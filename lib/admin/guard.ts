import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";

/** 解析 ADMIN_EMAILS；兼容引号、空格、换行 */
export function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(/[,;\n]/)
    .map((s) =>
      s
        .trim()
        .replace(/^['"]+|['"]+$/g, "")
        .toLowerCase(),
    )
    .filter((s) => s.includes("@"));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return parseAdminEmails().includes(normalized);
}

export type AdminIdentity =
  | {
      ok: true;
      userId: string;
      email: string;
      adminEmailsConfigured: boolean;
      serviceRoleConfigured: boolean;
    }
  | {
      ok: false;
      status: 401 | 403 | 503;
      error: string;
      email?: string | null;
      adminEmailsConfigured: boolean;
      serviceRoleConfigured: boolean;
    };

/**
 * 仅判断「当前登录邮箱是否在白名单」。
 * 不要求 service role——入口显示用这个，避免缺密钥时入口整段消失。
 */
export async function getAdminIdentity(): Promise<AdminIdentity> {
  const adminEmailsConfigured = parseAdminEmails().length > 0;
  const serviceRoleConfigured = isSupabaseServiceRoleConfigured();

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "未配置云端",
      adminEmailsConfigured,
      serviceRoleConfigured,
    };
  }
  if (!adminEmailsConfigured) {
    return {
      ok: false,
      status: 503,
      error:
        "未配置 ADMIN_EMAILS。在 Vercel 填入管理员邮箱（如 test@qq.com）并勾选 Preview 后 Redeploy。",
      adminEmailsConfigured,
      serviceRoleConfigured,
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return {
        ok: false,
        status: 401,
        error: "请先登录",
        adminEmailsConfigured,
        serviceRoleConfigured,
      };
    }
    const email = data.user.email ?? null;
    if (!isAdminEmail(email)) {
      return {
        ok: false,
        status: 403,
        error: "无管理后台权限（当前邮箱不在 ADMIN_EMAILS）",
        email,
        adminEmailsConfigured,
        serviceRoleConfigured,
      };
    }
    return {
      ok: true,
      userId: data.user.id,
      email: email!,
      adminEmailsConfigured,
      serviceRoleConfigured,
    };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: err instanceof Error ? err.message : "鉴权失败",
      adminEmailsConfigured,
      serviceRoleConfigured,
    };
  }
}

export type AdminSessionOk = {
  ok: true;
  userId: string;
  email: string;
};

export type AdminSessionBlocked = {
  ok: false;
  response: NextResponse;
};

/** 数据接口：白名单 + service role */
export async function requireAdminSession(): Promise<
  AdminSessionOk | AdminSessionBlocked
> {
  const identity = await getAdminIdentity();
  if (!identity.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: identity.error },
        { status: identity.status },
      ),
    };
  }
  if (!identity.serviceRoleConfigured) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "已识别管理员，但缺少 SUPABASE_SERVICE_ROLE_KEY。请在 Vercel 配置 service_role（勾选 Preview）后 Redeploy。",
        },
        { status: 503 },
      ),
    };
  }
  return {
    ok: true,
    userId: identity.userId,
    email: identity.email,
  };
}
