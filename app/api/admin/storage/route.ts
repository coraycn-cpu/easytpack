import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";

type FolderStat = {
  userId: string;
  email: string | null;
  objectCount: number;
  approxBytes: number;
};

/**
 * 管理端：Storage 占用快照（style-images 顶层按 userId 目录统计）。
 * 近似字节：列出文件 size 之和；子目录深度有限，适合日常巡查。
 */
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;

  try {
    const supabase = createServiceRoleClient();
    const { data: roots, error } = await supabase.storage
      .from("style-images")
      .list("", { limit: 200, sortBy: { column: "name", order: "asc" } });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: "确认 Storage 桶 style-images 已创建，且 service_role 可用",
          items: [],
        },
        { status: 500 },
      );
    }

    const userFolders = (roots ?? []).filter((f) => {
      const isFile = Boolean(f.metadata);
      return !isFile && Boolean(f.name);
    });

    const stats: FolderStat[] = [];
    for (const folder of userFolders.slice(0, 80)) {
      const userId = folder.name;
      let objectCount = 0;
      let approxBytes = 0;

      const { data: level1 } = await supabase.storage
        .from("style-images")
        .list(userId, { limit: 100 });

      for (const entry of level1 ?? []) {
        if (entry.metadata && typeof entry.metadata.size === "number") {
          objectCount += 1;
          approxBytes += entry.metadata.size;
          continue;
        }
        // project subfolder
        const { data: level2 } = await supabase.storage
          .from("style-images")
          .list(`${userId}/${entry.name}`, { limit: 100 });
        for (const file of level2 ?? []) {
          if (file.metadata && typeof file.metadata.size === "number") {
            objectCount += 1;
            approxBytes += file.metadata.size;
          } else if (file.name) {
            objectCount += 1;
          }
        }
      }

      stats.push({
        userId,
        email: null,
        objectCount,
        approxBytes,
      });
    }

    const userIds = stats.map((s) => s.userId);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      const emailMap = new Map(
        (profiles ?? []).map((p) => [String(p.user_id), p.email ? String(p.email) : null]),
      );
      for (const s of stats) {
        s.email = emailMap.get(s.userId) ?? null;
      }
    }

    stats.sort((a, b) => b.approxBytes - a.approxBytes || b.objectCount - a.objectCount);

    const totalObjects = stats.reduce((n, s) => n + s.objectCount, 0);
    const totalBytes = stats.reduce((n, s) => n + s.approxBytes, 0);

    await writeAdminAuditLog({
      actorId: session.userId,
      actorEmail: session.email,
      action: "admin.storage.view",
      targetType: "storage",
      targetId: "style-images",
      meta: { folderCount: userFolders.length, totalObjects, totalBytes },
      ip: clientIpFromRequest(req),
    });

    return NextResponse.json({
      bucket: "style-images",
      folderCount: userFolders.length,
      totalObjects,
      totalBytes,
      items: stats,
      note: "字节为列出文件的近似值；过深目录可能低估。",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取存储失败", items: [] },
      { status: 500 },
    );
  }
}
