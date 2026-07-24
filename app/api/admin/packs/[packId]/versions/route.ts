import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  writeAdminAuditLog,
} from "@/lib/admin/audit";
import {
  buildPackVersionSnapshot,
  insertPackVersion,
  projectFromPackVersionSnapshot,
  type PackVersionKind,
} from "@/lib/project/pack-versions";
import { projectToRow, rowToProject, type TechPackRow } from "@/lib/project/cloud-map";

type RouteContext = { params: Promise<{ packId: string }> };

function parseKind(raw: unknown): PackVersionKind | null {
  if (raw === "ai_draft" || raw === "user_checkpoint" || raw === "user_final") {
    return raw;
  }
  return null;
}

/** 列出某工艺包的版本快照 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;
  const { packId } = await ctx.params;
  if (!packId) {
    return NextResponse.json({ error: "缺少 packId" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: pack, error: packErr } = await supabase
      .from("tech_packs")
      .select(
        "id, user_id, title, style_no, workflow_status, updated_at, finalized_at",
      )
      .eq("id", packId)
      .maybeSingle();
    if (packErr) {
      return NextResponse.json({ error: packErr.message }, { status: 500 });
    }
    if (!pack) {
      return NextResponse.json({ error: "工艺包不存在" }, { status: 404 });
    }

    const { data: versions, error } = await supabase
      .from("pack_versions")
      .select("id, kind, source_action, created_at, snapshot")
      .eq("tech_pack_id", packId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: error.message.includes("pack_versions")
            ? "请执行最新 schema.sql（含 pack_versions）"
            : undefined,
        },
        { status: 500 },
      );
    }

    await writeAdminAuditLog({
      actorId: session.userId,
      actorEmail: session.email,
      action: "admin.packs.versions.list",
      targetType: "tech_packs",
      targetId: packId,
      meta: { count: versions?.length ?? 0 },
      ip: clientIpFromRequest(req),
    });

    return NextResponse.json({
      pack: {
        id: String(pack.id),
        userId: String(pack.user_id),
        title: String(pack.title || "未命名款式"),
        styleNo: pack.style_no ? String(pack.style_no) : null,
        workflowStatus: String(pack.workflow_status || "draft"),
        updatedAt: String(pack.updated_at),
        finalizedAt: pack.finalized_at ? String(pack.finalized_at) : null,
      },
      versions: (versions ?? []).map((v) => {
        const snap = v.snapshot as {
          projectUpdatedAt?: string;
          capturedAt?: string;
        } | null;
        return {
          id: String(v.id),
          kind: String(v.kind),
          sourceAction: v.source_action ? String(v.source_action) : null,
          createdAt: String(v.created_at),
          projectUpdatedAt: snap?.projectUpdatedAt ?? null,
          capturedAt: snap?.capturedAt ?? null,
        };
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取版本失败" },
      { status: 500 },
    );
  }
}

/**
 * 从当前 tech_packs 行创建检查点，或恢复到指定版本。
 * body:
 *  - { action: "checkpoint", kind?: "user_checkpoint"|"user_final"|"ai_draft" }
 *  - { action: "restore", versionId: string }
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await requireAdminSession();
  if (!session.ok) return session.response;
  const { packId } = await ctx.params;
  if (!packId) {
    return NextResponse.json({ error: "缺少 packId" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    kind?: string;
    versionId?: string;
  };
  const action = body.action || "";

  try {
    const supabase = createServiceRoleClient();
    const { data: packRow, error: packErr } = await supabase
      .from("tech_packs")
      .select("*")
      .eq("id", packId)
      .maybeSingle();
    if (packErr) {
      return NextResponse.json({ error: packErr.message }, { status: 500 });
    }
    if (!packRow) {
      return NextResponse.json({ error: "工艺包不存在" }, { status: 404 });
    }

    if (action === "checkpoint") {
      const kind = parseKind(body.kind) || "user_checkpoint";
      const project = rowToProject(packRow as TechPackRow);
      const snapshot = buildPackVersionSnapshot(
        project,
        String(packRow.user_id),
      );
      const res = await insertPackVersion(supabase, {
        techPackId: packId,
        userId: String(packRow.user_id),
        kind,
        snapshot,
        sourceAction: "admin.checkpoint",
        dedupeSameUpdatedAt: false,
      });
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 500 });
      }
      await writeAdminAuditLog({
        actorId: session.userId,
        actorEmail: session.email,
        action: "admin.packs.checkpoint",
        targetType: "pack_versions",
        targetId: res.id ?? packId,
        meta: { packId, kind },
        ip: clientIpFromRequest(req),
      });
      return NextResponse.json({
        ok: true,
        versionId: res.id,
        kind,
        message: "已从当前云端稿创建检查点",
      });
    }

    if (action === "restore") {
      const versionId = (body.versionId || "").trim();
      if (!versionId) {
        return NextResponse.json(
          { error: "恢复需要 versionId" },
          { status: 400 },
        );
      }
      const { data: version, error: verErr } = await supabase
        .from("pack_versions")
        .select("id, tech_pack_id, kind, snapshot, created_at")
        .eq("id", versionId)
        .eq("tech_pack_id", packId)
        .maybeSingle();
      if (verErr) {
        return NextResponse.json({ error: verErr.message }, { status: 500 });
      }
      if (!version) {
        return NextResponse.json(
          { error: "版本不存在或不属于该工艺包" },
          { status: 404 },
        );
      }

      const restoredProject = projectFromPackVersionSnapshot(version.snapshot);
      if (!restoredProject) {
        return NextResponse.json(
          { error: "版本快照无法解析，无法恢复" },
          { status: 422 },
        );
      }

      // 恢复前：把当前主表状态存成检查点，便于回滚说明
      const preProject = rowToProject(packRow as TechPackRow);
      const preSnap = buildPackVersionSnapshot(
        preProject,
        String(packRow.user_id),
      );
      const preRes = await insertPackVersion(supabase, {
        techPackId: packId,
        userId: String(packRow.user_id),
        kind: "user_checkpoint",
        snapshot: preSnap,
        sourceAction: `admin.pre_restore:${versionId}`,
        dedupeSameUpdatedAt: false,
      });

      const now = new Date().toISOString();
      const withMeta = {
        ...restoredProject,
        id: packId,
        updatedAt: now,
      };
      const row = projectToRow(withMeta, String(packRow.user_id));
      const { error: upErr } = await supabase
        .from("tech_packs")
        .upsert(row, { onConflict: "id" });
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      await writeAdminAuditLog({
        actorId: session.userId,
        actorEmail: session.email,
        action: "admin.packs.restore",
        targetType: "tech_packs",
        targetId: packId,
        meta: {
          versionId,
          versionKind: version.kind,
          versionCreatedAt: version.created_at,
          preRestoreVersionId: preRes.id,
          note: "已先写 pre_restore 检查点；图片若不在 Storage 需用户重传",
        },
        ip: clientIpFromRequest(req),
      });

      return NextResponse.json({
        ok: true,
        packId,
        restoredFrom: versionId,
        preRestoreVersionId: preRes.id,
        message:
          "已恢复到选定版本。用户刷新/拉取云端后即可打开该款。恢复前状态已另存为检查点，可再恢复回去。",
      });
    }

    return NextResponse.json(
      { error: "action 须为 checkpoint 或 restore" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "操作失败" },
      { status: 500 },
    );
  }
}
