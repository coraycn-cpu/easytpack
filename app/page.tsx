"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NewStyleEntryCard, {
  CanvasGridBackground,
  CanvasHubChrome,
  type NewStyleMode,
} from "@/components/studio/NewStyleEntryCard";
import { calcProgress } from "@/lib/project/progress";
import { listProjects } from "@/lib/project/storage";
import type { TechPackProject } from "@/types/project";

export default function CanvasHomePage() {
  const router = useRouter();
  const [recentProjects, setRecentProjects] = useState<TechPackProject[]>([]);

  useEffect(() => {
    setRecentProjects(listProjects().slice(0, 5));
  }, []);

  const handleCreated = (projectId: string, mode: NewStyleMode) => {
    router.push(
      mode === "full"
        ? `/project/${projectId}/collect`
        : `/project/${projectId}/studio`,
    );
  };

  const recent = recentProjects.map((p) => ({
    id: p.id,
    title: p.title,
    progress: calcProgress(p),
    href:
      p.status === "collecting"
        ? `/project/${p.id}/collect`
        : `/project/${p.id}/studio`,
  }));

  return (
    <div className="relative h-screen overflow-hidden">
      <CanvasGridBackground />
      <CanvasHubChrome recentProjects={recent} />
      <div className="relative z-10 flex h-full items-center justify-center p-4 pt-16">
        <NewStyleEntryCard variant="home" onCreated={handleCreated} />
      </div>
    </div>
  );
}
