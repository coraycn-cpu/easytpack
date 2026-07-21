import type { TechPackProject } from "@/types/project";
import {
  deleteProject as localDelete,
  getProject as localGet,
  listProjects as localList,
  saveProject as localSave,
} from "@/lib/project/storage";

/**
 * 项目仓储抽象：本期 Local 实现；下期 Cloud（Supabase）实现同一接口。
 */
export type ProjectRepository = {
  list(): Promise<TechPackProject[]>;
  get(id: string): Promise<TechPackProject | null>;
  save(project: TechPackProject): Promise<boolean>;
  delete(id: string): Promise<void>;
};

export const localProjectRepository: ProjectRepository = {
  list: () => localList(),
  get: (id) => localGet(id),
  save: async (project) => {
    await localSave(project);
    return true;
  },
  delete: async (id) => {
    localDelete(id);
  },
};

/** 默认仓储：后期可在此按登录态切换 Cloud */
let activeRepository: ProjectRepository = localProjectRepository;

export function getProjectRepository(): ProjectRepository {
  return activeRepository;
}

/** 下期接 Supabase 后调用，切换为云优先仓储 */
export function setProjectRepository(repo: ProjectRepository): void {
  activeRepository = repo;
}
