import { NextRequest } from "next/server";
import { enhanceTechPack } from "@/lib/ai/assist";
import { runMeteredAiJsonRoute } from "@/lib/ai/route-meter";
import type { TechPackProject } from "@/types/project";

export async function POST(req: NextRequest) {
  return runMeteredAiJsonRoute(req, {
    action: "enhance",
    run: async (body) => {
      const project = body.project as TechPackProject | undefined;
      if (!project) {
        throw new Error("缺少项目数据");
      }
      return enhanceTechPack(project);
    },
  });
}
