import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";
import { findOrphanStyleImages } from "@/lib/admin/storage-orphans";
import { STYLE_IMAGES_BUCKET } from "@/lib/project/cloud-images";

/** dry-run：列出孤儿文件（未被 tech_packs / pack_versions 引用） */
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;

  const { searchParams } = new URL(req.url);
  const userId = (searchParams.get("userId") || "").trim() || undefined;
  const limitRaw = Number(searchParams.get("limit") || "200");
  const limit = Math.min(
    500,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 200),
  );

  try {
    const supabase = createServiceRoleClient();
    const result = await findOrphanStyleImages(supabase, { userId });
    const orphans = result.orphans.slice(0, limit);

    await writeAdminAuditLog({
      actorId: session.userId,
      actorEmail: session.email,
      action: "admin.storage.orphans.dry_run",
      targetType: "storage",
      targetId: STYLE_IMAGES_BUCKET,
      meta: {
        userId: userId ?? null,
        orphanCount: result.orphans.length,
        returned: orphans.length,
        totalObjects: result.totalObjects,
        referencedCount: result.referencedCount,
      },
      ip: clientIpFromRequest(req),
    });

    return NextResponse.json({
      dryRun: true,
      bucket: STYLE_IMAGES_BUCKET,
      userId: userId ?? null,
      totalObjects: result.totalObjects,
      referencedCount: result.referencedCount,
      orphanCount: result.orphans.length,
      orphans,
      note: result.note,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "扫描孤儿文件失败",
        orphans: [],
      },
      { status: 500 },
    );
  }
}

/**
 * 确认删除孤儿文件。
 * body: { confirm: true, paths?: string[], userId?: string }
 * - 若给 paths：只删这些（且必须仍是孤儿）
 * - 若不给 paths：按 userId（可选）扫出的全部孤儿删除（上限 200）
 */
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;

  const body = (await req.json().catch(() => ({}))) as {
    confirm?: boolean;
    paths?: string[];
    userId?: string;
  };

  if (!body.confirm) {
    return NextResponse.json(
      {
        error: "删除需 confirm: true。请先 GET dry-run 查看列表。",
        hint: "删除后文件本身不可自动还原；工艺包可用 pack_versions 恢复元数据。",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const userId = body.userId?.trim() || undefined;
    const result = await findOrphanStyleImages(supabase, { userId });
    const orphanSet = new Set(result.orphans.map((o) => o.path));

    let toDelete: string[] = [];
    if (Array.isArray(body.paths) && body.paths.length > 0) {
      toDelete = body.paths
        .map((p) => String(p).trim())
        .filter((p) => p && orphanSet.has(p));
      const rejected = body.paths.filter(
        (p) => p && !orphanSet.has(String(p).trim()),
      );
      if (rejected.length > 0 && toDelete.length === 0) {
        return NextResponse.json(
          {
            error: "指定路径均不是当前孤儿（可能已被引用或已删除）",
            rejected,
          },
          { status: 400 },
        );
      }
    } else {
      toDelete = result.orphans.slice(0, 200).map((o) => o.path);
    }

    if (toDelete.length === 0) {
      return NextResponse.json({
        ok: true,
        deleted: 0,
        message: "没有可删的孤儿文件",
        note: result.note,
      });
    }

    // Storage remove 分批
    let deleted = 0;
    const errors: string[] = [];
    for (let i = 0; i < toDelete.length; i += 50) {
      const batch = toDelete.slice(i, i + 50);
      const { error } = await supabase.storage
        .from(STYLE_IMAGES_BUCKET)
        .remove(batch);
      if (error) {
        errors.push(error.message);
      } else {
        deleted += batch.length;
      }
    }

    await writeAdminAuditLog({
      actorId: session.userId,
      actorEmail: session.email,
      action: "admin.storage.orphans.delete",
      targetType: "storage",
      targetId: STYLE_IMAGES_BUCKET,
      meta: {
        userId: userId ?? null,
        requested: toDelete.length,
        deleted,
        samplePaths: toDelete.slice(0, 20),
        errors: errors.length ? errors : null,
        rollbackNote: result.note,
      },
      ip: clientIpFromRequest(req),
    });

    return NextResponse.json({
      ok: errors.length === 0,
      deleted,
      requested: toDelete.length,
      errors: errors.length ? errors : undefined,
      note: result.note,
      message:
        errors.length === 0
          ? `已删除 ${deleted} 个孤儿文件（已写审计）。`
          : `删除部分完成：成功约 ${deleted}，有错误请看 errors。`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "删除失败" },
      { status: 500 },
    );
  }
}
