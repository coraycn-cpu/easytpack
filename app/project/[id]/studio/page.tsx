"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AiChatFab from "@/components/studio/AiChatFab";
import FixedViewSidebar from "@/components/studio/FixedViewSidebar";
import InfiniteCanvas from "@/components/studio/InfiniteCanvas";
import StudioDataPanel from "@/components/studio/StudioDataPanel";
import {
  loadImagePlacement,
  mapAiAnnotationToCanvas,
} from "@/lib/canvas/bounds";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import { checkCompliance, canFinalize } from "@/lib/project/compliance";
import { applyHotspotTemplate, createArtboard } from "@/lib/project/hotspots";
import { calcProgress, WORKFLOW_LABELS } from "@/lib/project/progress";
import { getProject, saveProject } from "@/lib/project/storage";
import {
  computeArtboardSlots,
  nextArtboardOrigin,
  type ArtboardSlot,
} from "@/lib/studio/artboard-layout";
import {
  getStudioLayout,
  STUDIO_TOOLBAR_ANCHOR_ID,
  type StudioLayout,
} from "@/lib/studio/layout";
import type { ViewImageKind } from "@/lib/studio/view-types";
import { createViewPlaceholderImage } from "@/lib/studio/view-image-client";
import type { BomItem, ProcessItem } from "@/types/process";
import type { Annotation, Artboard, TechPackProject, WorkflowStatus } from "@/types/project";

const AnnotationCanvas = dynamic(
  () => import("@/components/canvas/AnnotationCanvas"),
  { ssr: false, loading: () => null },
);

type Tab = "process" | "bom" | "size";

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [activeArtboardId, setActiveArtboardId] = useState("");
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("process");
  const [aiLoading, setAiLoading] = useState(false);
  const [viewGenerating, setViewGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [layout, setLayout] = useState<StudioLayout>(getStudioLayout());
  const [artboardSlots, setArtboardSlots] = useState<ArtboardSlot[]>([]);

  useEffect(() => {
    const p = getProject(id);
    if (!p) {
      router.replace("/");
      return;
    }
    if (p.status !== "studio" && p.status !== "completed") {
      router.replace(`/project/${id}/collect`);
      return;
    }
    setProject(p);
    setActiveArtboardId(p.canvas_data.activeArtboardId);
    setLayout(getStudioLayout(p.canvas_data.studioLayout));
    if (!p.canvas_data.artboards.some((a) => a.annotations.length > 0)) {
      setAiTip("左侧 AI 生成多视角 · 顶部左手动右 AI · 右下角编辑工艺数据");
    }
  }, [id, router]);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    computeArtboardSlots(project.canvas_data.artboards).then((slots) => {
      if (!cancelled) setArtboardSlots(slots);
    });
    return () => {
      cancelled = true;
    };
  }, [project?.canvas_data.artboards]);

  const activeArtboard = useMemo(
    () => project?.canvas_data.artboards.find((a) => a.id === activeArtboardId),
    [project, activeArtboardId],
  );

  const persist = useCallback((updated: TechPackProject) => {
    setProject(updated);
    saveProject(updated);
  }, []);

  const saveLayout = useCallback(
    (next: StudioLayout) => {
      setLayout(next);
      if (!project) return;
      persist({
        ...project,
        canvas_data: { ...project.canvas_data, studioLayout: next },
      });
    },
    [project, persist],
  );

  const updateArtboard = (artboardId: string, patch: Partial<Artboard>) => {
    if (!project) return;
    const artboards = project.canvas_data.artboards.map((a) =>
      a.id === artboardId ? { ...a, ...patch } : a,
    );
    persist({
      ...project,
      canvas_data: { ...project.canvas_data, artboards, activeArtboardId },
    });
  };

  const setActiveArtboard = (artboardId: string) => {
    if (!project) return;
    setActiveArtboardId(artboardId);
    setSelectedHotspotId(null);
    persist({
      ...project,
      canvas_data: { ...project.canvas_data, activeArtboardId: artboardId },
    });
  };

  const sourceImageUrl = useMemo(() => {
    if (!project) return undefined;
    const withImage = project.canvas_data.artboards.find((a) => a.imageDataUrl);
    return withImage?.imageDataUrl ?? project.intake.imageDataUrl;
  }, [project]);

  const handleGenerateView = async (kind: ViewImageKind, customPrompt?: string) => {
    if (!project || !sourceImageUrl) {
      setAiMessage("请先上传正面款式图");
      return;
    }
    setViewGenerating(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/view-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          customPrompt,
          category: project.intake.detectedCategory,
          description: project.intake.description,
          sourceImageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let imageDataUrl = data.imageDataUrl as string | null;
      if (!imageDataUrl) {
        imageDataUrl = await createViewPlaceholderImage(
          sourceImageUrl,
          data.artboardName ?? "视角图",
        );
        const err = data.synthesisError as string | undefined;
        setAiTip(
          err
            ? `生图失败：${err}。已用占位图，请检查 AI Gateway 配置。`
            : "生图 API 未返回图片，已生成占位图",
        );
      } else {
        setAiTip(
          `已通过 ${data.provider ?? "AI"} / ${data.model ?? "model"} 生成真实款式图`,
        );
      }

      const slots = await computeArtboardSlots(project.canvas_data.artboards);
      const origin = nextArtboardOrigin(slots);
      const newBoard = createArtboard(data.artboardName ?? "视角图", imageDataUrl);
      newBoard.canvasOrigin = origin;

      const artboards = [...project.canvas_data.artboards, newBoard];
      persist({
        ...project,
        canvas_data: {
          ...project.canvas_data,
          artboards,
          activeArtboardId: newBoard.id,
        },
      });
      setActiveArtboardId(newBoard.id);
      setAiMessage(`已添加「${newBoard.name}」到画布`);
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "视角图生成失败");
    } finally {
      setViewGenerating(false);
    }
  };

  const handleSmartAnnotate = async () => {
    if (!project || !activeArtboard) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/smart-annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl: activeArtboard.imageDataUrl ?? project.intake.imageDataUrl,
          processItems: project.process_items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const imgUrl = activeArtboard.imageDataUrl ?? project.intake.imageDataUrl;
      const imageOffset = activeArtboard.imageOffset ?? { x: 0, y: 0 };
      const imageFit = imgUrl
        ? await loadImagePlacement(imgUrl)
        : { x: 0, y: 0, width: 1000, height: 750 };

      const newAnnotations: Annotation[] = (data.annotations ?? []).map(
        (a: Annotation & { label?: string }, i: number) =>
          mapAiAnnotationToCanvas(
            a,
            imageFit,
            imageOffset,
            `ann_ai_${i}_${Date.now()}`,
          ),
      );

      updateArtboard(activeArtboard.id, {
        annotations: [...activeArtboard.annotations, ...newAnnotations],
      });
      setAiTip(data.userTips ?? "已在当前画板添加智能标注");
      setAiMessage("智能标注完成");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "标注失败");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateSize = async () => {
    if (!project) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/size-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl: project.intake.imageDataUrl,
          answers: project.questionnaire.answers,
          existingChart: project.size_chart,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      persist({ ...project, size_chart: { sizes: data.sizes, rows: data.rows } });
      setActiveTab("size");
      setAiTip(data.plainExplanation ?? "尺码表已生成");
      setAiMessage("尺码表已填入");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "尺码生成失败");
    } finally {
      setAiLoading(false);
    }
  };

  const handleEnhanceAll = async () => {
    if (!project) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updated = { ...project };
      if (data.process_items?.length) {
        const existing = new Set(updated.process_items.map((p) => p.part));
        updated.process_items = [
          ...updated.process_items,
          ...data.process_items.filter((p: ProcessItem) => !existing.has(p.part)),
        ];
      }
      if (data.bom_items?.length) updated.bom_items = [...updated.bom_items, ...data.bom_items];
      if (data.size_chart?.rows?.length) updated.size_chart = data.size_chart;
      persist(updated);
      setAiTip(data.summary);
      setAiMessage("工艺包已补全");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "补全失败");
    } finally {
      setAiLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!project) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `请用非专业人士能听懂的大白话，解释这款「${project.title}」的工艺包包含什么、版师会怎么用。3-5句话。工艺条目：${project.process_items.map((p) => p.part).join("、")}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const text = data.items?.[0]?.process ?? data.text;
      setAiTip(typeof text === "string" ? text : "已生成解释");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "解释失败");
    } finally {
      setAiLoading(false);
    }
  };

  if (!project || !activeArtboard) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#ececec] text-sm text-[#64748b]">
        加载工作台…
      </div>
    );
  }

  const compliance = checkCompliance(project);
  const progress = calcProgress(project);
  const scale = layout.viewport.scale;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#ececec]">
      <div id={STUDIO_TOOLBAR_ANCHOR_ID} className="z-20 shrink-0 border-b border-[#cbd5e1] bg-white" />

      <div className="flex min-h-0 flex-1">
        <FixedViewSidebar
          onApplyHotspotTemplate={() => {
            const tpl = applyHotspotTemplate(project.intake.detectedCategory);
            updateArtboard(activeArtboard.id, { hotspots: tpl });
            setAiMessage("已应用热区模板");
          }}
          onReplaceImage={(url) => {
            const main = project.canvas_data.artboards[0];
            if (main) updateArtboard(main.id, { imageDataUrl: url });
            else {
              const ab = createArtboard("正面", url);
              persist({
                ...project,
                canvas_data: {
                  ...project.canvas_data,
                  artboards: [ab],
                  activeArtboardId: ab.id,
                },
              });
            }
          }}
          onGenerateView={handleGenerateView}
          viewGenerating={viewGenerating}
          compliance={compliance}
          projectTitle={project.title}
          category={project.intake.detectedCategory}
          workflowLabel={WORKFLOW_LABELS[project.workflowStatus]}
          progress={progress}
          workflowStatus={project.workflowStatus}
          onWorkflowChange={(ws: WorkflowStatus) => {
            if (ws === "finalized" && !canFinalize(project)) {
              setAiMessage("请先完善必填项");
              return;
            }
            persist({ ...project, workflowStatus: ws });
          }}
          exportHref={`/project/${id}/export`}
        />

        <div className="relative min-h-0 min-w-0 flex-1">
          <InfiniteCanvas
            viewport={layout.viewport}
            onViewportChange={(viewport) => saveLayout({ ...layout, viewport })}
          >
            <AnnotationCanvas
              fixedChrome
              stagePosition={layout.stage}
              canvasScale={scale}
              multiArtboards={project.canvas_data.artboards}
              artboardSlots={artboardSlots}
              activeArtboardId={activeArtboardId}
              onActiveArtboardChange={setActiveArtboard}
              imageUrl={activeArtboard.imageDataUrl ?? project.intake.imageDataUrl}
              hotspots={activeArtboard.hotspots}
              annotations={normalizeAnnotations(activeArtboard.annotations)}
              onHotspotsChange={(hotspots) => updateArtboard(activeArtboard.id, { hotspots })}
              onAnnotationsChange={(annotations) =>
                updateArtboard(activeArtboard.id, { annotations })
              }
              selectedHotspotId={selectedHotspotId}
              onHotspotSelect={setSelectedHotspotId}
              imageOffset={activeArtboard.imageOffset ?? { x: 0, y: 0 }}
              onImageOffsetChange={(imageOffset) =>
                updateArtboard(activeArtboard.id, { imageOffset })
              }
              nextMarkerIndex={
                activeArtboard.annotations.filter((a) => a.type === "marker").length + 1
              }
              onSmartAnnotate={handleSmartAnnotate}
              smartAnnotateLoading={aiLoading}
              aiLoading={aiLoading || viewGenerating}
              onGenerateSize={handleGenerateSize}
              onEnhanceAll={handleEnhanceAll}
              onExplain={handleExplain}
              viewportScale={scale}
              onViewportScaleChange={(nextScale) =>
                saveLayout({ ...layout, viewport: { ...layout.viewport, scale: nextScale } })
              }
              onResetViewport={() =>
                saveLayout({ ...layout, viewport: { panX: 0, panY: 0, scale: 1 } })
              }
              toolbarMessage={aiMessage ?? aiTip}
            />
          </InfiniteCanvas>

          <div className="pointer-events-none fixed bottom-4 right-4 z-30 w-[min(100vw-2rem,420px)] pb-16">
            <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">工艺 · 物料 · 尺寸</h3>
              <StudioDataPanel
                project={project}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onPersist={persist}
              />
            </div>
          </div>

          <AiChatFab project={project} onProjectUpdate={persist} disabled={aiLoading} flat />
        </div>
      </div>
    </div>
  );
}
