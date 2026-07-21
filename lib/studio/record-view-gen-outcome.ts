import { meterAiCall } from "@/lib/ai/metering";
import { appendAiTelemetryEvent } from "@/lib/ai/telemetry";
import type { ViewImageKind } from "@/lib/studio/view-types";

/** 视角生图结果记账（计量 + 遥测），从 studio 页拆出 */
export function recordViewImageClientOutcome(input: {
  projectId: string;
  kind: ViewImageKind;
  ok: boolean;
  provider?: string;
  model?: string;
  error?: string;
  category?: string;
  photoType?: string;
  consent?: boolean;
  artboardName?: string;
}): void {
  meterAiCall({
    action: "view-image",
    projectId: input.projectId,
    ok: input.ok,
    provider: input.provider,
    model: input.model,
    error: input.error,
  });
  appendAiTelemetryEvent({
    action: "view-image",
    projectId: input.projectId,
    category: input.category,
    photoType: input.photoType,
    provider: input.provider,
    model: input.model,
    outcome: input.ok ? "accepted" : "error",
    consent: input.consent ?? false,
    correctionText: input.error,
    aiOutputSummary: {
      kind: input.kind,
      artboardName: input.artboardName,
      ok: input.ok,
    },
  });
}
