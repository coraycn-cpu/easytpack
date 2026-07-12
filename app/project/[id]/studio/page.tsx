"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AiChatFab from "@/components/studio/AiChatFab";
import AiAnalysisOverlay from "@/components/ui/AiAnalysisOverlay";
import FixedViewSidebar from "@/components/studio/FixedViewSidebar";
import InfiniteCanvas from "@/components/studio/InfiniteCanvas";
import NewStyleEntryCard from "@/components/studio/NewStyleEntryCard";
import SizeChartAiDialog from "@/components/studio/SizeChartAiDialog";
import StudioDataPanel from "@/components/studio/StudioDataPanel";
import {
  resolveImageDataUrlForAi,
} from "@/lib/ai/image-for-request";
import { STYLE_REVIEW_MAX } from "@/types/process";
import {
  annotationToLogicalRect,
  annotationToLogicalLine,
  loadImagePlacement,
  mapAiAnnotationToCanvas,
} from "@/lib/canvas/bounds";
import {
  DEFAULT_LAYER_VISIBILITY,
  TAB_LAYER_PRESETS,
  type LayerVisibility,
} from "@/lib/canvas/annotation-layers";
import {
  findAnnotationsForSizePartInProject,
  getAnnotationSizePart,
  isDimensionAnnotation,
  toggleDimensionSizePartLink,
} from "@/lib/canvas/size-annotations";
import {
  applyBatchSizeDimensions,
  collectLinkedSizePartsFromProject,
} from "@/lib/canvas/apply-size-dimensions";
import {
  findAnnotationsForProcessInProject,
  findProcessIdsForAnnotation,
  isLinkableShape,
  toggleShapeProcessLink,
} from "@/lib/canvas/part-annotations";
import { normalizeAnnotations } from "@/lib/canvas/migrate";
import {
  AI_ANNOTATION_COLOR,
  MANUAL_ANNOTATION_COLOR,
  mapAnnotationColor,
} from "@/lib/canvas/annotation-colors";
import { PART_ANNOTATION_COLOR } from "@/lib/project/hotspots";
import { generateProcessId } from "@/lib/process/ids";
import { checkCompliance, canFinalize } from "@/lib/project/compliance";
import { createArtboard } from "@/lib/project/hotspots";
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
import { applySizeChartAssist, countFilledBaselineValues } from "@/lib/size-chart/apply-assist";
import type { AiLoadingPresetId } from "@/lib/ai/loading-presets";
import type { SizeRegionStandard } from "@/lib/size-chart/standards";
import type { ViewImageKind } from "@/lib/studio/view-types";
import { createViewPlaceholderImage } from "@/lib/studio/view-image-client";
import type { BomItem, ProcessItem } from "@/types/process";
import type { Annotation, Artboard, TechPackProject, WorkflowStatus } from "@/types/project";

const AnnotationCanvas = dynamic(
  () => import("@/components/canvas/AnnotationCanvas"),
  { ssr: false, loading: () => null },
);

type Tab = "process" | "bom" | "size" | "review";

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<TechPackProject | null>(null);
  const [activeArtboardId, setActiveArtboardId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("process");
  const [aiTask, setAiTask] = useState<AiLoadingPresetId | null>(null);
  const [viewGenerating, setViewGenerating] = useState(false);
  const aiBusy = aiTask !== null || viewGenerating;
  const activeAiPreset: AiLoadingPresetId | null = viewGenerating ? "view-image" : aiTask;
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [layout, setLayout] = useState<StudioLayout>(getStudioLayout());
  const [artboardSlots, setArtboardSlots] = useState<ArtboardSlot[]>([]);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [highlightedProcessIds, setHighlightedProcessIds] = useState<string[]>([]);
  const [linkedHighlightAnnIds, setLinkedHighlightAnnIds] = useState<string[]>([]);
  const [highlightedSizePart, setHighlightedSizePart] = useState<string>("");
  const [sizeAiDialogOpen, setSizeAiDialogOpen] = useState(false);
  const [aiHighlightTab, setAiHighlightTab] = useState<Tab | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectRef = useRef<TechPackProject | null>(null);
  const layoutRef = useRef<StudioLayout>(layout);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

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

  const persist = useCallback((updated: TechPackProject): boolean => {
    projectRef.current = updated;
    setProject(updated);
    try {
      saveProject(updated);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      setAiMessage(msg);
      return false;
    }
  }, []);

  /** 基于最新 project 合并保存，避免异步 AI 流程中 stale closure 覆盖 size_chart 等字段 */
  const mergePersist = useCallback(
    (patch: (prev: TechPackProject) => TechPackProject): boolean => {
      const prev = projectRef.current;
      if (!prev) return false;
      return persist(patch(prev));
    },
    [persist],
  );

  const handleNewStyle = () => router.push("/");

  const handleFullCollect = () => {
    if (aiBusy || !project) return;
    if (!project.intake.imageDataUrl) {
      setAiMessage("请先上传款式图");
      return;
    }
    const updated = { ...project, status: "collecting" as const };
    persist(updated);
    router.push(`/project/${id}/collect`);
  };

  const showNewStyleOverlay = useMemo(() => {
    if (!project) return false;
    const hasImage =
      Boolean(project.intake.imageDataUrl) ||
      project.canvas_data.artboards.some((a) => a.imageDataUrl);
    return !hasImage;
  }, [project]);

  const saveLayout = useCallback(
    (next: StudioLayout) => {
      setLayout(next);
      layoutRef.current = next;
      return mergePersist((prev) => ({
        ...prev,
        canvas_data: { ...prev.canvas_data, studioLayout: next },
      }));
    },
    [mergePersist],
  );

  const focusTab = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      setAiHighlightTab(tab);
      const preset = TAB_LAYER_PRESETS[tab];
      saveLayout({ ...layoutRef.current, annotationLayers: preset });
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setAiHighlightTab(null), 2000);
    },
    [saveLayout],
  );

  const handleTabChange = useCallback(
    (tab: Tab) => {
      focusTab(tab);
    },
    [focusTab],
  );

  const layerVisibility: LayerVisibility =
    layout.annotationLayers ?? DEFAULT_LAYER_VISIBILITY;

  const handleLayerVisibilityChange = useCallback(
    (annotationLayers: LayerVisibility) => {
      saveLayout({ ...layoutRef.current, annotationLayers });
    },
    [saveLayout],
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

  const handleProcessRowSelect = useCallback(
    (processId: string, _index: number) => {
      if (!project) return;
      setHighlightedProcessIds([processId]);
      focusTab("process");
      const linked = findAnnotationsForProcessInProject(project, processId);
      if (linked.length > 0) {
        const first = linked[0];
        if (first.artboardId !== activeArtboardId) {
          setActiveArtboardId(first.artboardId);
          persist({
            ...project,
            canvas_data: {
              ...project.canvas_data,
              activeArtboardId: first.artboardId,
            },
          });
        }
        setSelectedAnnId(first.annotation.id);
        setLinkedHighlightAnnIds(linked.map((l) => l.annotation.id));
      } else {
        setLinkedHighlightAnnIds([]);
      }
    },
    [project, activeArtboardId, persist],
  );

  const handleSelectedAnnIdChange = useCallback(
    (annId: string | null) => {
      setSelectedAnnId(annId);
      if (!project || !annId) {
        setHighlightedProcessIds([]);
        setLinkedHighlightAnnIds([]);
        setHighlightedSizePart("");
        return;
      }
      const ab = project.canvas_data.artboards.find((a) => a.id === activeArtboardId);
      const ann = ab?.annotations.find((a) => a.id === annId);
      if (!ann) return;
      const pids = findProcessIdsForAnnotation(ann, project.process_items);
      setHighlightedProcessIds(pids);
      setLinkedHighlightAnnIds([annId]);
      if (isLinkableShape(ann.type)) {
        focusTab("process");
        if (pids.length === 0) {
          setAiMessage("已框选区域 — 可 AI 识别工艺，或在工艺 Tab 勾选行手动关联");
        }
      } else if (isDimensionAnnotation(ann)) {
        focusTab("size");
        const part = getAnnotationSizePart(ann);
        setHighlightedSizePart(part ?? "");
        if (!part) {
          setAiMessage("已选尺寸线 — 可 AI 识别尺寸，或在尺寸 Tab 勾选行手动关联");
        }
      } else if (pids.length > 0) {
        setActiveTab("process");
      }
    },
    [project, activeArtboardId, focusTab],
  );

  const handleToggleProcessLink = useCallback(
    (processId: string, linked: boolean) => {
      if (!project || !selectedAnnId) return;
      const artboards = project.canvas_data.artboards.map((ab) =>
        ab.id === activeArtboardId
          ? {
              ...ab,
              annotations: mapAnnotationColor(
                toggleShapeProcessLink(ab.annotations, selectedAnnId, processId, linked),
                selectedAnnId,
                MANUAL_ANNOTATION_COLOR,
              ),
            }
          : ab,
      );
      persist({
        ...project,
        canvas_data: { ...project.canvas_data, artboards },
      });
      setHighlightedProcessIds((prev) =>
        linked ? [...new Set([...prev, processId])] : prev.filter((id) => id !== processId),
      );
    },
    [project, selectedAnnId, activeArtboardId, persist],
  );

  const selectedAnn = useMemo(() => {
    if (!selectedAnnId || !activeArtboard) return null;
    return activeArtboard.annotations.find((a) => a.id === selectedAnnId) ?? null;
  }, [selectedAnnId, activeArtboard]);

  const linkedProcessIdsForSelection = useMemo(() => {
    if (!selectedAnn) return [];
    return findProcessIdsForAnnotation(selectedAnn, project?.process_items ?? []);
  }, [selectedAnn, project?.process_items]);

  const linkedSizePartForSelection = useMemo(() => {
    if (!selectedAnn) return undefined;
    return getAnnotationSizePart(selectedAnn);
  }, [selectedAnn]);

  const handleToggleSizeLink = useCallback(
    (part: string, linked: boolean) => {
      if (!project || !selectedAnnId) return;
      const artboards = project.canvas_data.artboards.map((ab) =>
        ab.id === activeArtboardId
          ? {
              ...ab,
              annotations: mapAnnotationColor(
                toggleDimensionSizePartLink(ab.annotations, selectedAnnId, part, linked),
                selectedAnnId,
                MANUAL_ANNOTATION_COLOR,
              ),
            }
          : ab,
      );
      persist({
        ...project,
        canvas_data: { ...project.canvas_data, artboards },
      });
      if (linked) setHighlightedSizePart(part);
    },
    [project, selectedAnnId, activeArtboardId, persist],
  );

  const handleSizeRowSelect = useCallback(
    (part: string, _index: number) => {
      if (!project) return;
      setHighlightedSizePart(part);
      focusTab("size");
      const linked = findAnnotationsForSizePartInProject(project, part);
      if (linked.length > 0) {
        const first = linked[0];
        if (first.artboardId !== activeArtboardId) {
          setActiveArtboardId(first.artboardId);
          persist({
            ...project,
            canvas_data: {
              ...project.canvas_data,
              activeArtboardId: first.artboardId,
            },
          });
        }
        setSelectedAnnId(first.annotation.id);
        setLinkedHighlightAnnIds(linked.map((l) => l.annotation.id));
      } else {
        setLinkedHighlightAnnIds([]);
      }
    },
    [project, activeArtboardId, persist, focusTab],
  );

  const handleDimensionAiFill = async () => {
    if (aiBusy || !project || !activeArtboard || !selectedAnn) return;
    if (!isDimensionAnnotation(selectedAnn)) return;
    setAiTask("size-dimension");
    setAiMessage(null);
    try {
      const imgUrl = await resolveImageDataUrlForAi(
        activeArtboard.imageDataUrl,
        project.intake.imageDataUrl,
      );
      const imageOffset = activeArtboard.imageOffset ?? { x: 0, y: 0 };
      const fitSource = activeArtboard.imageDataUrl ?? project.intake.imageDataUrl ?? imgUrl;
      const imageFit = fitSource
        ? await loadImagePlacement(fitSource)
        : { x: 0, y: 0, width: 1000, height: 750 };
      const line = annotationToLogicalLine(selectedAnn, imageFit, imageOffset);
      const sampleSize = project.size_chart.sampleSize ?? "M";
      const regionStandard = project.size_chart.regionStandard ?? "cn";

      const res = await fetch("/api/ai/size-dimension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl: imgUrl,
          line,
          sampleSize,
          regionStandard,
          existingPart: selectedAnn.linkedSizePart,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const baseline = String(data.baseline_cm ?? "").trim();
      if (!baseline) throw new Error("AI 未返回有效尺寸值");

      const size_chart = applySizeChartAssist(
        {
          sizes: project.size_chart.sizes.length
            ? project.size_chart.sizes
            : [sampleSize],
          rows: [
            {
              part: data.part,
              method: data.method,
              baseline_cm: baseline,
            },
          ],
        },
        { regionStandard, sampleSize },
        project.size_chart,
      );

      const part = data.part.trim();
      const displayText = `${baseline}cm`;
      const artboards = project.canvas_data.artboards.map((ab) =>
        ab.id === activeArtboardId
          ? {
              ...ab,
              annotations: mapAnnotationColor(
                toggleDimensionSizePartLink(
                  ab.annotations.map((a) =>
                    a.id === selectedAnn.id
                      ? { ...a, text: displayText, linkedSizePart: part }
                      : a,
                  ),
                  selectedAnn.id,
                  part,
                  true,
                ),
                selectedAnn.id,
                AI_ANNOTATION_COLOR,
              ),
            }
          : ab,
      );

      persist({
        ...project,
        size_chart,
        canvas_data: { ...project.canvas_data, artboards },
      });
      setHighlightedSizePart(part);
      focusTab("size");
      setAiMessage(`已识别：${part} ${displayText}`);
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "尺寸识别失败");
    } finally {
      setAiTask(null);
    }
  };

  const setActiveArtboard = (artboardId: string) => {
    if (!project) return;
    setActiveArtboardId(artboardId);
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
    if (aiBusy) return;
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

  const handleBatchAnnotate = async () => {
    if (aiBusy || !project || !activeArtboard) return;
    focusTab("process");
    setAiTask("annotate-process");
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/annotate-batch", {
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

      let processItems = [...project.process_items];
      const newAnnotations: Annotation[] = [];

      for (const [i, region] of (data.regions ?? []).entries()) {
        let processId = region.linkToExistingProcessId as string | undefined;
        const existingIdx = processId
          ? processItems.findIndex((p) => p.id === processId)
          : -1;

        if (existingIdx >= 0) {
          processItems[existingIdx] = {
            ...processItems[existingIdx],
            ...region.process,
            id: processItems[existingIdx].id,
          };
          processId = processItems[existingIdx].id;
        } else {
          processId = generateProcessId();
          processItems.push({ id: processId, ...region.process });
        }

        const ann = mapAiAnnotationToCanvas(
          {
            type: "rect",
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
            color: PART_ANNOTATION_COLOR,
            linkedProcessIds: [processId!],
          },
          imageFit,
          imageOffset,
          `ann_batch_${i}_${Date.now()}`,
        );
        newAnnotations.push(ann);
      }

      const artboards = project.canvas_data.artboards.map((ab) =>
        ab.id === activeArtboard.id
          ? { ...ab, annotations: [...ab.annotations, ...newAnnotations] }
          : ab,
      );
      persist({
        ...project,
        process_items: processItems,
        canvas_data: { ...project.canvas_data, artboards },
      });
      setAiTip(data.userTips ?? "已添加 AI 区域标注");
      setAiMessage("AI 标工艺完成");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "标工艺失败");
    } finally {
      setAiTask(null);
    }
  };

  const handleFillBom = async () => {
    if (aiBusy || !project) return;
    focusTab("bom");
    setAiTask("fill-bom");
    setAiMessage(null);
    try {
      const res = await fetch("/api/ai/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl: project.intake.imageDataUrl,
          processItems: project.process_items,
          existingBom: project.bom_items,
          answers: project.questionnaire.answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const existingNames = new Set(project.bom_items.map((b) => b.name.trim()));
      const newItems = (data.bom_items ?? []).filter(
        (b: BomItem) => b.name?.trim() && !existingNames.has(b.name.trim()),
      );

      persist({ ...project, bom_items: [...project.bom_items, ...newItems] });
      setAiTip(data.plainExplanation ?? "物料清单已生成");
      setAiMessage(newItems.length > 0 ? `已添加 ${newItems.length} 条物料` : "物料已是最新");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "填物料失败");
    } finally {
      setAiTask(null);
    }
  };

  const handleRegionAiFill = async () => {
    if (aiBusy || !project || !activeArtboard || !selectedAnn) return;
    setAiTask("region-annotate");
    setAiMessage(null);
    try {
      const imgUrl = activeArtboard.imageDataUrl ?? project.intake.imageDataUrl;
      const imageOffset = activeArtboard.imageOffset ?? { x: 0, y: 0 };
      const imageFit = imgUrl
        ? await loadImagePlacement(imgUrl)
        : { x: 0, y: 0, width: 1000, height: 750 };
      const region = annotationToLogicalRect(selectedAnn, imageFit, imageOffset);

      const res = await fetch("/api/ai/annotate-region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl: imgUrl,
          region,
          existingPart: selectedAnn.linkedProcessIds?.length
            ? project.process_items.find((p) => p.id === selectedAnn.linkedProcessIds![0])?.part
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let processItems = [...project.process_items];
      let processId = processItems.find((p) => p.part?.trim() === data.part?.trim())?.id;
      if (processId) {
        const idx = processItems.findIndex((p) => p.id === processId);
        processItems[idx] = { ...processItems[idx], ...data, id: processId };
      } else {
        processId = generateProcessId();
        processItems.push({ id: processId, ...data });
      }

      const artboards = project.canvas_data.artboards.map((ab) =>
        ab.id === activeArtboardId
          ? {
              ...ab,
              annotations: mapAnnotationColor(
                toggleShapeProcessLink(ab.annotations, selectedAnn.id, processId!, true),
                selectedAnn.id,
                AI_ANNOTATION_COLOR,
              ),
            }
          : ab,
      );

      persist({
        ...project,
        process_items: processItems,
        canvas_data: { ...project.canvas_data, artboards },
      });
      setHighlightedProcessIds([processId!]);
      focusTab("process");
      setAiMessage(`已识别：${data.part}`);
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "区域识别失败");
    } finally {
      setAiTask(null);
    }
  };

  const handleGenerateSize = () => {
    if (aiBusy || !project) return;
    focusTab("size");
    setSizeAiDialogOpen(true);
  };

  const runSizeChartAi = async (input: {
    regionStandard: SizeRegionStandard;
    sampleSize: string;
  }) => {
    if (!project) return;
    setSizeAiDialogOpen(false);
    setAiTask("fill-size");
    setAiMessage(null);
    try {
      const imageDataUrl = await resolveImageDataUrlForAi(
        activeArtboard?.imageDataUrl,
        project.canvas_data.artboards.find((a) => a.imageDataUrl)?.imageDataUrl,
        project.intake.imageDataUrl,
      );

      const res = await fetch("/api/ai/size-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl,
          answers: project.questionnaire.answers,
          existingChart: project.size_chart,
          regionStandard: input.regionStandard,
          sampleSize: input.sampleSize,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        sizes?: string[];
        rows?: Array<{ part: string; method: string; baseline_cm?: string | number }>;
        plainExplanation?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `尺码表请求失败 (${res.status})`);
      }
      const size_chart = applySizeChartAssist(
        { sizes: data.sizes ?? [], rows: data.rows ?? [] },
        input,
        project.size_chart,
      );
      const filled = countFilledBaselineValues(size_chart);
      if (filled === 0) {
        throw new Error("AI 未返回基准码数值，请确认款式图清晰并重试");
      }

      const targetArtboard =
        activeArtboard ??
        project.canvas_data.artboards.find((a) => a.imageDataUrl) ??
        project.canvas_data.artboards[0];
      let addedDimensions = 0;
      let dimensionTips: string | undefined;
      let dimensionBatchFailed = false;

      const saveSizeChart = (artboards?: TechPackProject["canvas_data"]["artboards"]) =>
        mergePersist((prev) => ({
          ...prev,
          size_chart,
          canvas_data: {
            ...prev.canvas_data,
            artboards: artboards ?? prev.canvas_data.artboards,
          },
        }));

      const savedChart = saveSizeChart();
      if (!savedChart) {
        throw new Error("尺码表已生成但保存失败，请清理浏览器存储空间后重试");
      }

      if (targetArtboard) {
        try {
          const current = projectRef.current ?? project;
          const skipParts = collectLinkedSizePartsFromProject(current.canvas_data.artboards);
          const dimRes = await fetch("/api/ai/size-dimension-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: current.intake.detectedCategory,
              description: current.intake.description,
              imageDataUrl,
              sizeChart: size_chart,
              sampleSize: input.sampleSize,
              regionStandard: input.regionStandard,
              skipParts,
            }),
          });
          const dimData = (await dimRes.json().catch(() => ({}))) as {
            error?: string;
            dimensions?: Array<{ part: string; x: number; y: number; x2: number; y2: number }>;
            userTips?: string;
          };
          if (!dimRes.ok) throw new Error(dimData.error ?? `尺寸标注请求失败 (${dimRes.status})`);

          if (dimData.dimensions?.length) {
            const imageOffset = targetArtboard.imageOffset ?? { x: 0, y: 0 };
            const fitSource =
              targetArtboard.imageDataUrl ??
              project.intake.imageDataUrl ??
              imageDataUrl;
            const imageFit = fitSource
              ? await loadImagePlacement(fitSource)
              : { x: 0, y: 0, width: 1000, height: 750 };
            const artboards = (projectRef.current ?? project).canvas_data.artboards.map((ab) => {
              if (ab.id !== targetArtboard.id) return ab;
              const result = applyBatchSizeDimensions(
                ab.annotations,
                dimData.dimensions!,
                size_chart,
                imageFit,
                imageOffset,
              );
              addedDimensions = result.added;
              return { ...ab, annotations: result.annotations };
            });
            saveSizeChart(artboards);
            dimensionTips = dimData.userTips;
            if (addedDimensions === 0) {
              dimensionBatchFailed = true;
              setAiTip("尺码表已生成，但尺寸线未能写入画布（请检查部位名称或手动标注）");
            }
          } else if (!imageDataUrl) {
            setAiTip("尺码表已生成。款式图过大或未加载，无法在画布上自动标注尺寸线");
          }
        } catch (dimErr) {
          dimensionBatchFailed = true;
          const msg = dimErr instanceof Error ? dimErr.message : "尺寸线生成失败";
          setAiTip(`尺码表已生成，但画布尺寸线未完全生成：${msg}`);
        }
      }

      focusTab("size");
      if (!dimensionBatchFailed) {
        if (dimensionTips) {
          setAiTip(dimensionTips);
        } else {
          setAiTip(
            addedDimensions > 0
              ? `已在款式图上标注 ${addedDimensions} 条尺寸线（蓝色）`
              : (data.plainExplanation ?? "尺码表已生成"),
          );
        }
      }
      setAiMessage(
        addedDimensions > 0
          ? `已填入 ${input.sampleSize} 码 ${filled} 项，并标注 ${addedDimensions} 条尺寸线`
          : `已填入 ${input.sampleSize} 码 ${filled} 项估算值`,
      );
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "尺码生成失败");
    } finally {
      setAiTask(null);
    }
  };

  const handleEnhanceAll = async () => {
    if (aiBusy || !project) return;
    setAiTask("enhance");
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
          ...data.process_items
            .filter((p: ProcessItem) => !existing.has(p.part))
            .map((p: ProcessItem) => ({ ...p, id: p.id ?? generateProcessId() })),
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
      setAiTask(null);
    }
  };

  const handleStyleReview = async () => {
    if (aiBusy || !project) return;
    setAiTask("explain");
    setAiMessage(null);
    try {
      const imageDataUrl = await resolveImageDataUrlForAi(
        project.intake.imageDataUrl,
        activeArtboard?.imageDataUrl,
        project.canvas_data.artboards.find((a) => a.imageDataUrl)?.imageDataUrl,
      );

      const res = await fetch("/api/ai/style-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title,
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl,
          processItems: project.process_items.map(({ part, process, stitch }) => ({
            part,
            process,
            stitch,
          })),
          bomItems: project.bom_items.map(({ name, category, spec }) => ({
            name,
            category,
            spec,
          })),
          existingReview: project.style_review,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "评语生成失败");

      const review = String(data.review ?? "").trim().slice(0, STYLE_REVIEW_MAX);
      if (review.length < 20) {
        throw new Error("AI 未返回有效评语，请重试");
      }

      const saved = persist({ ...project, style_review: review });
      focusTab("review");
      setAiMessage(saved ? "款式评语已生成" : "评语已显示但未能保存到本地，请清理存储空间");
    } catch (e) {
      setAiMessage(e instanceof Error ? e.message : "评语生成失败");
    } finally {
      setAiTask(null);
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
          onNewStyle={handleNewStyle}
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
          aiBusy={aiBusy}
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
              annotations={normalizeAnnotations(activeArtboard.annotations)}
              onAnnotationsChange={(annotations) =>
                updateArtboard(activeArtboard.id, { annotations })
              }
              imageOffset={activeArtboard.imageOffset ?? { x: 0, y: 0 }}
              onImageOffsetChange={(imageOffset) =>
                updateArtboard(activeArtboard.id, { imageOffset })
              }
              onRegionAiFill={handleRegionAiFill}
              onDimensionAiFill={handleDimensionAiFill}
              dimensionAiLoading={aiTask === "size-dimension"}
              layerVisibility={layerVisibility}
              onLayerVisibilityChange={handleLayerVisibilityChange}
              onFullCollect={handleFullCollect}
              onAnnotateProcess={handleBatchAnnotate}
              annotateProcessLoading={aiTask === "annotate-process"}
              aiLoading={aiBusy}
              interactionLocked={aiBusy}
              onFillBom={handleFillBom}
              onFillSize={handleGenerateSize}
              onEnhanceAll={handleEnhanceAll}
              onExplain={handleStyleReview}
              viewportScale={scale}
              onViewportScaleChange={(nextScale) =>
                saveLayout({ ...layout, viewport: { ...layout.viewport, scale: nextScale } })
              }
              onResetViewport={() =>
                saveLayout({ ...layout, viewport: { panX: 0, panY: 0, scale: 1 } })
              }
              viewport={layout.viewport}
              onViewportChange={(viewport) => saveLayout({ ...layout, viewport })}
              toolbarMessage={aiMessage ?? aiTip}
              processItems={project.process_items}
              selectedAnnId={selectedAnnId}
              onSelectedAnnIdChange={handleSelectedAnnIdChange}
              linkedHighlightAnnIds={linkedHighlightAnnIds}
            />
          </InfiniteCanvas>

          <div className="pointer-events-none fixed top-14 right-4 z-30 w-[min(100vw-1.5rem,340px)]">
            <div className="pointer-events-auto overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <StudioDataPanel
                project={project}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onPersist={persist}
                highlightedProcessIds={highlightedProcessIds}
                onProcessRowSelect={handleProcessRowSelect}
                selectedAnnId={selectedAnnId}
                selectedAnn={selectedAnn}
                linkedProcessIdsForSelection={linkedProcessIdsForSelection}
                onToggleProcessLink={handleToggleProcessLink}
                onRegionAiFill={handleRegionAiFill}
                regionAiLoading={aiTask === "region-annotate"}
                onDimensionAiFill={handleDimensionAiFill}
                dimensionAiLoading={aiTask === "size-dimension"}
                linkedSizePartForSelection={linkedSizePartForSelection}
                onToggleSizeLink={handleToggleSizeLink}
                highlightedSizePart={highlightedSizePart}
                onSizeRowSelect={handleSizeRowSelect}
                highlightTab={aiHighlightTab}
                interactionLocked={aiBusy}
              />
            </div>
          </div>

          <AiChatFab project={project} onProjectUpdate={persist} disabled={aiBusy} flat />

          {aiBusy && activeAiPreset && (
            <AiAnalysisOverlay
              preset={activeAiPreset}
              imagePreview={project.intake.imageDataUrl}
            />
          )}

          {showNewStyleOverlay && !aiBusy && (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[1px]">
              <div className="pointer-events-auto">
                <NewStyleEntryCard
                  variant="overlay"
                  onCreated={(projectId, mode) => {
                    router.push(
                      mode === "full"
                        ? `/project/${projectId}/collect`
                        : `/project/${projectId}/studio`,
                    );
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <SizeChartAiDialog
        open={sizeAiDialogOpen}
        initialRegion={project.size_chart.regionStandard ?? "cn"}
        initialSampleSize={project.size_chart.sampleSize}
        onConfirm={runSizeChartAi}
        onCancel={() => setSizeAiDialogOpen(false)}
      />
    </div>
  );
}
