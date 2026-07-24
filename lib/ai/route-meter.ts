import { NextRequest, NextResponse } from "next/server";
import type { AiMeterAction } from "@/lib/ai/metering";
import { meterAiCallServer } from "@/lib/ai/metering";
import {
  assertWithinAiQuota,
  persistCloudAiUsage,
} from "@/lib/ai/quota";

type RunAiRouteOptions = {
  action: AiMeterAction;
  units?: number;
  getProjectId?: (body: Record<string, unknown>) => string | undefined;
  /** 返回 JSON 用的业务处理；抛错会被收成 500 */
  run: (body: Record<string, unknown>) => Promise<unknown>;
};

function pickProjectId(
  body: Record<string, unknown>,
  getter?: (body: Record<string, unknown>) => string | undefined,
): string | undefined {
  if (getter) {
    const v = getter(body);
    if (typeof v === "string" && v) return v;
  }
  if (typeof body.projectId === "string") return body.projectId;
  const project = body.project;
  if (project && typeof project === "object" && "id" in project) {
    const id = (project as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

/**
 * 统一：额度检查 → 执行 → 写 ai_usage + 日志头。
 * 未登录返回 401（引导注册）；已登录超额返回 429。
 */
export async function runMeteredAiJsonRoute(
  req: NextRequest,
  options: RunAiRouteOptions,
): Promise<NextResponse> {
  const started = Date.now();
  const units = options.units ?? 1;
  let projectId: string | undefined;
  let userId: string | null = null;

  const quota = await assertWithinAiQuota(units);
  if (!quota.ok) return quota.response;
  userId = quota.userId;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    projectId = pickProjectId(body, options.getProjectId);
    const payload = await options.run(body);
    meterAiCallServer({
      action: options.action,
      projectId,
      units,
      ok: true,
    });
    await persistCloudAiUsage({
      userId,
      action: options.action,
      projectId,
      units,
      ok: true,
    });
    const res = NextResponse.json(payload);
    res.headers.set("x-ai-action", options.action);
    res.headers.set("x-ai-ms", String(Date.now() - started));
    if (userId) {
      res.headers.set("x-ai-quota-used", String(quota.used + units));
      res.headers.set("x-ai-quota-limit", String(quota.limit));
    }
    return res;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `${options.action} 失败`;
    console.error(`[AI ${options.action}]`, error);
    meterAiCallServer({
      action: options.action,
      projectId,
      units,
      ok: false,
      error: message,
    });
    await persistCloudAiUsage({
      userId,
      action: options.action,
      projectId,
      units,
      ok: false,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
