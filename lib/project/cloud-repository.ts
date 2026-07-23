import type { ProjectRepository } from "@/lib/project/repository-core";
import {
  isLoggedInForCloud,
  mergeLocalWithCloud,
  mirrorDeleteFromCloud,
  mirrorSaveToCloud,
} from "@/lib/project/cloud-sync";
import { reportCloudSyncResult } from "@/lib/project/sync-status";
import {
  deleteProject as localDelete,
  getProject as localGet,
  listLocalProjectsOnly,
  saveProject as localSave,
} from "@/lib/project/storage";

/**
 * 登录后用：云端为主、本机为缓存。
 * save 会先写本机再 await 云端，失败仍保留本机并提示。
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
    const res = await mirrorSaveToCloud(project);
    if (res.ok) {
      reportCloudSyncResult({ ok: true, message: "已同步到云端" });
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
