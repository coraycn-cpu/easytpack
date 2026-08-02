import { NextRequest } from "next/server";
import { analyzeIntent } from "@/lib/ai/intake";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
import { normalizeLocale } from "@/lib/i18n/locale";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "intake",
    run: async (body) =>
      analyzeIntent({
        description: typeof body.description === "string" ? body.description : "",
        imageDataUrl:
          typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined,
        locale: normalizeLocale(body.locale),
      }),
  });
}
