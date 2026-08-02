import { NextRequest } from "next/server";
import { generateBomAssist } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
import { normalizeLocale } from "@/lib/i18n/locale";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "bom",
    run: async (body) =>
      generateBomAssist({
        ...body,
        locale: normalizeLocale(body.locale),
      } as never),
  });
}
