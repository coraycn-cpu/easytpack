import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().has(email.trim().toLowerCase());
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

/** 校验当前登录用户是否在 ADMIN_EMAILS 白名单 */
export async function requireAdminSession(): Promise<
  AdminSessionOk | AdminSessionBlocked
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "未配置云端" }, { status: 503 }),
    };
  }
  if (!isSupabaseServiceRoleConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "管理后台需要 SUPABASE_SERVICE_ROLE_KEY（Vercel 环境变量，勿暴露到前端）",
        },
        { status: 503 },
      ),
    };
  }
  if (parseAdminEmails().size === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "未配置 ADMIN_EMAILS。在 Vercel 填入管理员邮箱（逗号分隔）后 Redeploy。",
        },
        { status: 503 },
      ),
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "请先登录" }, { status: 401 }),
      };
    }
    const email = data.user.email ?? null;
    if (!isAdminEmail(email)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "无管理后台权限" },
          { status: 403 },
        ),
      };
    }
    return {
      ok: true,
      userId: data.user.id,
      email: email!,
    };
  } catch (err) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: err instanceof Error ? err.message : "鉴权失败",
        },
        { status: 500 },
      ),
    };
  }
}
