import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";

export type AdminAuditInput = {
  actorId: string;
  actorEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * 写入管理审计日志。失败只打 warn，不挡主流程。
 */
export async function writeAdminAuditLog(
  input: AdminAuditInput,
): Promise<void> {
  if (!isSupabaseServiceRoleConfigured()) return;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("admin_audit_log").insert({
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      meta: input.meta ?? {},
      ip: input.ip ?? null,
    });
    if (error) {
      // 表未建时提示一次即可
      console.warn("[admin-audit]", error.message);
    }
  } catch (err) {
    console.warn("[admin-audit]", err);
  }
}

export function clientIpFromRequest(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}
