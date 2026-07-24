export {
  localProjectRepository,
  getProjectRepository,
  setProjectRepository,
  type ProjectRepository,
} from "@/lib/project/repository-core";

import {
  localProjectRepository,
  setProjectRepository,
} from "@/lib/project/repository-core";
import type { ProjectRepository } from "@/lib/project/repository-core";
import { hybridProjectRepository } from "@/lib/project/cloud-repository";
import { isLoggedInForCloud } from "@/lib/project/cloud-sync";

/** 登录用混合仓；未登录用本机仓（并缓存为当前仓储） */
export async function resolveProjectRepository(): Promise<ProjectRepository> {
  if (await isLoggedInForCloud()) {
    setProjectRepository(hybridProjectRepository);
    return hybridProjectRepository;
  }
  setProjectRepository(localProjectRepository);
  return localProjectRepository;
}
