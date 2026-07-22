import type { TechPackProject } from "@/types/project";
import {
  deleteProject as localDelete,
  getProject as localGet,
  listLocalProjectsOnly,
  saveProject as localSave,
} from "@/lib/project/storage";

/**
 * 项目仓储抽象：Local 实现；Cloud/混合在 cloud-repository。
 */
export type ProjectRepository = {
  list(): Promise<TechPackProject[]>;
  get(id: string): Promise<TechPackProject | null>;
  save(project: TechPackProject): Promise<boolean>;
  delete(id: string): Promise<void>;
};

export const localProjectRepository: ProjectRepository = {
  list: () => listLocalProjectsOnly(),
  get: (id) => localGet(id),
  save: async (project) => {
    await localSave(project);
    return true;
  },
  delete: async (id) => {
    await localDelete(id);
  },
};

/** 默认仓储：后期可在此按登录态切换 */
let activeRepository: ProjectRepository = localProjectRepository;

export function getProjectRepository(): ProjectRepository {
  return activeRepository;
}

export function setProjectRepository(repo: ProjectRepository): void {
  activeRepository = repo;
}
