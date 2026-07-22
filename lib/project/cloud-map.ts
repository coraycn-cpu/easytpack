import type { TechPackProject } from "@/types/project";

/** 云端表一行（字段名与 supabase/schema.sql 对齐） */
export type TechPackRow = {
  id: string;
  user_id: string;
  style_no: string | null;
  title: string;
  category: string | null;
  status: string;
  workflow_status: string;
  canvas_data: TechPackProject["canvas_data"];
  process_items: TechPackProject["process_items"];
  bom_items: TechPackProject["bom_items"];
  size_chart: TechPackProject["size_chart"];
  intake: TechPackProject["intake"];
  questionnaire: TechPackProject["questionnaire"];
  style_review: string | null;
  export_history: TechPackProject["exportHistory"];
  consent_quality_pool: boolean;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

const DATA_URL_MAX_KEEP = 8_000;

/** 云端行里保留短图 / 云端引用；去掉超长 data 与本机 idb */
export function stripHeavyImagesFromProject(
  project: TechPackProject,
): TechPackProject {
  const strip = (url?: string) => {
    if (!url) return url;
    if (url.startsWith("sbstorage:")) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("idb:")) return undefined;
    if (url.startsWith("data:") && url.length > DATA_URL_MAX_KEEP) {
      return undefined;
    }
    return url;
  };

  return {
    ...project,
    intake: {
      ...project.intake,
      imageDataUrl: strip(project.intake.imageDataUrl),
    },
    canvas_data: {
      ...project.canvas_data,
      artboards: project.canvas_data.artboards.map((ab) => ({
        ...ab,
        imageDataUrl: strip(ab.imageDataUrl),
      })),
    },
  };
}

export function projectToRow(
  project: TechPackProject,
  userId: string,
): TechPackRow {
  const slim = stripHeavyImagesFromProject(project);
  return {
    id: slim.id,
    user_id: userId,
    style_no: slim.styleNo ?? null,
    title: slim.title || "未命名款式",
    category:
      slim.intake.targetGarment?.category ||
      slim.intake.detectedCategory ||
      null,
    status: slim.status,
    workflow_status: slim.workflowStatus,
    canvas_data: slim.canvas_data,
    process_items: slim.process_items,
    bom_items: slim.bom_items,
    size_chart: slim.size_chart,
    intake: slim.intake,
    questionnaire: slim.questionnaire,
    style_review: slim.style_review ?? null,
    export_history: slim.exportHistory ?? [],
    consent_quality_pool: Boolean(slim.consentQualityPool),
    finalized_at:
      slim.workflowStatus === "finalized" ? slim.updatedAt : null,
    created_at: slim.createdAt,
    updated_at: slim.updatedAt,
  };
}

export function rowToProject(row: TechPackRow): TechPackProject {
  return {
    id: row.id,
    status: (row.status as TechPackProject["status"]) || "studio",
    workflowStatus:
      (row.workflow_status as TechPackProject["workflowStatus"]) || "draft",
    title: row.title || "未命名款式",
    styleNo: row.style_no ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    intake: row.intake ?? {
      description: "",
      imageDataUrl: "",
    },
    questionnaire: row.questionnaire ?? {
      intro: "",
      questions: [],
      answers: {},
      isComplete: false,
    },
    canvas_data: row.canvas_data ?? {
      artboards: [],
      activeArtboardId: "",
    },
    process_items: row.process_items ?? [],
    bom_items: row.bom_items ?? [],
    size_chart: row.size_chart ?? { sizes: [], rows: [] },
    style_review: row.style_review ?? undefined,
    exportHistory: row.export_history ?? undefined,
    consentQualityPool: row.consent_quality_pool ?? false,
  };
}

/** 合并本机与云端：同 id 取更新时间更晚的；图片优先保留本机有图的版本 */
export function mergeProjectsPreferNewer(
  localList: TechPackProject[],
  cloudList: TechPackProject[],
): TechPackProject[] {
  const map = new Map<string, TechPackProject>();

  const hasImage = (p: TechPackProject) =>
    Boolean(
      p.intake.imageDataUrl ||
        p.canvas_data.artboards.some((a) => a.imageDataUrl),
    );

  const put = (p: TechPackProject) => {
    const prev = map.get(p.id);
    if (!prev) {
      map.set(p.id, p);
      return;
    }
    const prevT = Date.parse(prev.updatedAt) || 0;
    const nextT = Date.parse(p.updatedAt) || 0;
    let winner = nextT >= prevT ? p : prev;
    const loser = winner === p ? prev : p;
    // 胜者没图、败者有图 → 把败者的图补回去
    if (!hasImage(winner) && hasImage(loser)) {
      winner = {
        ...winner,
        intake: {
          ...winner.intake,
          imageDataUrl:
            winner.intake.imageDataUrl || loser.intake.imageDataUrl,
        },
        canvas_data: {
          ...winner.canvas_data,
          artboards: winner.canvas_data.artboards.map((ab) => {
            const from = loser.canvas_data.artboards.find((x) => x.id === ab.id);
            return {
              ...ab,
              imageDataUrl: ab.imageDataUrl || from?.imageDataUrl,
            };
          }),
        },
      };
    }
    map.set(p.id, winner);
  };

  localList.forEach(put);
  cloudList.forEach(put);

  return Array.from(map.values()).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}
