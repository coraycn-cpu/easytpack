import type { AiTelemetryEvent } from "@/lib/ai/telemetry";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

/**
 * 用户已同意质量池时，把遥测事件尽力写入云端 ai_events。
 * 失败不影响本机队列。
 */
export async function pushTelemetryEventToCloud(
  event: AiTelemetryEvent,
): Promise<boolean> {
  if (!event.consent) return false;
  if (!isSupabaseConfigured()) return false;
  if (typeof window === "undefined") return false;
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return false;

    const { error } = await supabase.from("ai_events").insert({
      user_id: userId,
      tech_pack_id: event.projectId ?? null,
      action: event.action,
      category: event.category ?? null,
      photo_type: event.photoType ?? null,
      provider: event.provider ?? null,
      model: event.model ?? null,
      ai_output: event.aiOutputSummary ?? null,
      user_final: event.userFinalSummary ?? null,
      correction_text: event.correctionText ?? null,
      outcome: event.outcome,
      image_refs: event.imageRefs ?? [],
      consent: true,
      // M3 审核队列：新 consent 事件默认待审
      review_status: "pending",
    });
    if (error) {
      console.warn("[ai-events]", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[ai-events]", err);
    return false;
  }
}
