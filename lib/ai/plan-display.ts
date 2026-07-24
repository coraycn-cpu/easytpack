/** 档位展示文案（客户端可安全引用） */

export type UserPlan = "free" | "comped" | "paused";

export function planLabel(plan: UserPlan | string | null | undefined): string {
  switch (plan) {
    case "paused":
      return "已暂停";
    case "comped":
      return "内部赠送";
    case "free":
    default:
      return "免费";
  }
}

export function parseUserPlan(raw: unknown): UserPlan {
  if (raw === "comped" || raw === "paused" || raw === "free") return raw;
  return "free";
}

/** 邮箱前缀当会员名；没有邮箱时用「会员」 */
export function memberDisplayName(email: string | null | undefined): string {
  const raw = (email || "").trim();
  if (!raw) return "会员";
  const at = raw.indexOf("@");
  if (at > 0) return raw.slice(0, at);
  return raw;
}

/** 支付/档位条件：团队等能力暂未开放；comped 仅表示内部赠送额度 */
export function canAccessTeamFeatures(plan: UserPlan): boolean {
  // 真实团队组织仍暂缓；预留条件位
  void plan;
  return false;
}
