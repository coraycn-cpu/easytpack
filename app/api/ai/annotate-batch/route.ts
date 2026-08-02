import { NextRequest } from "next/server";
import { generateBatchAnnotations } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
import { normalizeLocale } from "@/lib/i18n/locale";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "annotate-batch",
    run: async (body) =>
      generateBatchAnnotations({
        ...body,
        locale: normalizeLocale(body.locale),
      } as never),
  });
}
