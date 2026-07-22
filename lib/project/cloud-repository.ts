import type { ProjectRepository } from "@/lib/project/repository-core";
import {
  isLoggedInForCloud,
  mergeLocalWithCloud,
  mirrorDeleteFromCloud,
  mirrorSaveToCloud,
} from "@/lib/project/cloud-sync";
import {
  deleteProject as localDelete,
  getProject as localGet,
  listLocalProjectsOnly,
  saveProject as localSave,
} from "@/lib/project/storage";

/**
 * 登录后用：本机 + 云端一起管。
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
    await localSave(project);
    if (!(await isLoggedInForCloud())) return true;
    const res = await mirrorSaveToCloud(project);
    return res.ok;
  },

  async delete(id) {
    await localDelete(id);
    if (await isLoggedInForCloud()) {
      await mirrorDeleteFromCloud(id);
    }
  },
};
