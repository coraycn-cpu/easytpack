import type { ProjectRepository } from "@/lib/project/repository-core";
import {
  isLoggedInForCloud,
  mergeLocalWithCloud,
  mirrorDeleteFromCloud,
  mirrorSaveToCloud,
} from "@/lib/project/cloud-sync";
import { isCloudSyncAuto } from "@/lib/project/sync-preference";
import { reportCloudSyncResult } from "@/lib/project/sync-status";
import {
  deleteProject as localDelete,
  getProject as localGet,
  listLocalProjectsOnly,
  saveProject as localSave,
} from "@/lib/project/storage";

/**
 * 登录后用：云端为主、本机为缓存。
 * 自动同步时 save 会 await 云端；手动同步时只写本机。
 */
export const hybridProjectRepository: ProjectRepository = {
  async list() {
    const local = await listLocalProjectsOnly();
    if (!(await isLoggedInForCloud())) return local;
    return mergeLocalWithCloud(local);
  },

  async get(id) {
    return localGet(id);
  },

  async save(project) {
    await localSave(project, { skipCloudMirror: true });
    if (!(await isLoggedInForCloud())) return true;
    if (!isCloudSyncAuto()) return true;
    const res = await mirrorSaveToCloud(project);
    if (res.ok) {
      reportCloudSyncResult({ ok: true, message: "已自动同步到云端" });
      return true;
    }
    reportCloudSyncResult({
      ok: false,
      message: res.error
        ? `云端同步失败：${res.error}（本机已保存）`
        : "云端同步失败（本机已保存）",
      offlineHint: true,
    });
    return false;
  },

  async delete(id) {
    await localDelete(id, { skipCloudMirror: true });
    if (!(await isLoggedInForCloud())) return;
    // 删除始终尝试清云端，避免残留；失败只提示
    const res = await mirrorDeleteFromCloud(id);
    if (!res.ok && res.error !== "not_logged_in") {
      reportCloudSyncResult({
        ok: false,
        message: res.error
          ? `云端删除失败：${res.error}（本机已删除）`
          : "云端删除失败（本机已删除）",
        offlineHint: true,
      });
    }
  },
};
