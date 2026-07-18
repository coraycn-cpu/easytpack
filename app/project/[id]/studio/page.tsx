"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StudioAiDock from "@/components/studio/StudioAiDock";
import AiAnalysisOverlay from "@/components/ui/AiAnalysisOverlay";
import FixedViewSidebar from "@/components/studio/FixedViewSidebar";
import InfiniteCanvas from "@/components/studio/InfiniteCanvas";
import NewStyleEntryCard from "@/components/studio/NewStyleEntryCard";
import SizeChartAiDialog from "@/components/studio/SizeChartAiDialog";
import StudioDataPanel from "@/components/studio/StudioDataPanel";
import GarmentPickerStep from "@/components/studio/GarmentPickerStep";
import FlatFrontPromptStep from "@/components/studio/FlatFrontPromptStep";
import {
  applyIntentToIntake,
  confirmTargetGarment,
  needsGarmentConfirmation,
  needsFlatFrontAfterGarmentPick,
  skipFlatFrontGeneration,
} from "@/lib/intake/apply-intent";
import { generateFlatFrontForPrimary } from "@/lib/studio/generate-flat-front";
import { shouldKeepPhotoReference } from "@/lib/studio/reference-artboard";
import { isModelPhoto } from "@/lib/ai/garment-scope";
import { resolveImageDataUrlForAi } from "@/lib/ai/image-for-request";
import { resolveGarmentImageForAi } from "@/lib/ai/resolve-garment-image";
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
  findSlotForArtboard,
  getPrimaryArtboardId,
} from "@/lib/canvas/sizing-artboard";
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
import {
  filterNonOverlappingRects,
  markAnnotationsManual,
  toggleAnnotationsLock,
  removeAnnotationsByIds,
  isAnnotationLocked,
} from "@/lib/canvas/annotation-helpers";
import {
  nextPasteArtboardName,
  prepareImageDataUrlForCanvas,
} from "@/lib/canvas/paste-image";
import {
  applyCropToImageDataUrl,
  cropAnnotationRegionForAi,
  displayCropToSourcePixels,
  type ImageCropRect,
} from "@/lib/canvas/crop-image";
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
import {
  aiPresetToActionId,
  getAiActionImageSource,
  resolveAiImagePreviewUrl,
} from "@/lib/ai/image-source-hints";
import type { SizeRegionStandard } from "@/lib/size-chart/standards";
import type { ViewImageKind } from "@/lib/studio/view-types";
import {
  canonicalArtboardNameForKind,
  lineArtArtboardNameFromSource,
} from "@/lib/studio/view-artboard-names";

function normalizeViewArtboardNames(artboards: Artboard[]): {
  artboards: Artboard[];
  changed: boolean;
} {
  let changed = false;
  const next = artboards.map((ab) => {
    const kind = ab.viewImageMeta?.kind;
    if (!kind) return ab;
    const desired =
      kind === "line_art"
        ? lineArtArtboardNameFromSource(
            artboards.find((a) => a.id === ab.viewImageMeta?.sourceArtboardId) ??
              ab,
          )
        : canonicalArtboardNameForKind(kind);
    if (ab.name === desired) return ab;
    changed = true;
    return { ...ab, name: desired };
  });
  return { artboards: next, changed };
}
import { createViewPlaceholderImage, getImageDimensions, matchImageToSourceSize } from "@/lib/studio/view-image-client";
import {
  appendViewGenRecord,
  buildViewGenTrainingPayload,
} from "@/lib/training/view-gen-log";
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
  const [regeneratingArtboardId, setRegeneratingArtboardId] = useState<string | null>(null);
  const garmentBlocked = Boolean(
    project && needsGarmentConfirmation(project.intake),
  );
  const aiBusy =
    aiTask !== null ||
    viewGenerating ||
    regeneratingArtboardId !== null ||
    garmentBlocked;
  const activeAiPreset: AiLoadingPresetId | null =
    viewGenerating || regeneratingArtboardId ? "view-image" : aiTask;
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [layout, setLayout] = useState<StudioLayout>(getStudioLayout());
  const [artboardSlots, setArtboardSlots] = useState<ArtboardSlot[]>([]);
  const [selectedAnnIds, setSelectedAnnIds] = useState<string[]>([]);
  const [highlightedProcessIds, setHighlightedProcessIds] = useState<string[]>([]);
  const [linkedHighlightAnnIds, setLinkedHighlightAnnIds] = useState<string[]>([]);
  const [highlightedSizePart, setHighlightedSizePart] = useState<string>("");
  const [sizeAiDialogOpen, setSizeAiDialogOpen] = useState(false);
  const [aiHighlightTab, setAiHighlightTab] = useState<Tab | null>(null);
  const [flatFrontOfferHandled, setFlatFrontOfferHandled] = useState(false);
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
    setFlatFrontOfferHandled(false);
  }, [project?.id]);

  useEffect(() => {
    let cancelled = false;
    void getProject(id).then((p) => {
      if (cancelled) return;
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
      const renamed = normalizeViewArtboardNames(p.canvas_data.artboards);
      if (renamed.changed) {
        const fixed = {
          ...p,
          canvas_data: { ...p.canvas_data, artboards: renamed.artboards },
        };
        projectRef.current = fixed;
        setProject(fixed);
        void saveProject(fixed);
      }
      if (!p.canvas_data.artboards.some((a) => a.annotations.length > 0)) {
        setAiTip("左侧 AI 生成多视角 · 顶部左手动右 AI · 右上角编辑工艺数据");
      }
    });
    return () => {
      cancelled = true;
    };
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
    void saveProject(updated).catch((err) => {
      const msg = err instanceof Error ? err.message : "保存失败";
      setAiMessage(msg);
    });
    return true;
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

  const intakeImageDataUrl = project?.intake.imageDataUrl;
  const intakeAlreadyAnalyzed = Boolean(
    project?.intake.visibleGarments?.length || project?.intake.garmentConfirmed,
  );

  useEffect(() => {
    if (!intakeImageDataUrl || intakeAlreadyAnalyzed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: projectRef.current?.intake.description,
            imageDataUrl: intakeImageDataUrl,
          }),
        });
        const intent = await res.json();
        if (!res.ok || cancelled) return;
        const base = projectRef.current;
        if (!base) return;
        const updated = {
          ...base,
          intake: applyIntentToIntake(base.intake, intent),
          title: base.title || intent.suggestedTitle || base.title,
        };
        persist(updated);
      } catch {
        /* 非阻断 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project?.id, intakeImageDataUrl, intakeAlreadyAnalyzed, persist]);

  const flatFrontRunningRef = useRef(false);

  const runFlatFrontGeneration = useCallback(
    async (baseProject: TechPackProject) => {
      if (!needsFlatFrontAfterGarmentPick(baseProject.intake)) return baseProject;
      if (flatFrontRunningRef.current) return baseProject;
      flatFrontRunningRef.current = true;
      setViewGenerating(true);
      try {
        const result = await generateFlatFrontForPrimary(baseProject);
        persist(result.project);
        setAiMessage(`已锁定目标单款 · ${result.message}`);
        if (result.success) {
          setAiTip(
            shouldKeepPhotoReference(result.project.intake.photoType)
              ? "主款画板为 AI 平铺正面，原图在参考画板；可在主款下方修正后重新生成"
              : "主款画板已替换为 AI 平铺正面，可进行工艺/尺寸标注",
          );
        }
        return result.project;
      } catch (e) {
        setAiMessage(e instanceof Error ? e.message : "平铺正面生成失败");
        return baseProject;
      } finally {
        setViewGenerating(false);
        flatFrontRunningRef.current = false;
      }
    },
    [persist],
  );

  const flatFrontPromptOpen = Boolean(
    project &&
      !garmentBlocked &&
      !flatFrontOfferHandled &&
      !viewGenerating &&
      needsFlatFrontAfterGarmentPick(project.intake),
  );

  const handleFlatFrontSkip = useCallback(() => {
    if (!project) return;
    setFlatFrontOfferHandled(true);
    persist({
      ...project,
      intake: skipFlatFrontGeneration(project.intake),
    });
    setAiMessage("已进入画布");
    setAiTip("当前使用原参考图，可稍后在主款画板重新生成平铺正面");
  }, [project, persist]);

  const handleFlatFrontGenerate = useCallback(async () => {
    if (!project) return;
    setFlatFrontOfferHandled(true);
    await runFlatFrontGeneration(project);
  }, [project, runFlatFrontGeneration]);

  const handleGarmentConfirm = useCallback(
    async (
      garment: Parameters<typeof confirmTargetGarment>[1],
      options?: { skipFlatFront?: boolean },
    ) => {
      if (!project) return;
      setFlatFrontOfferHandled(true);
      let updated: TechPackProject = {
        ...project,
        title: garment.label,
        intake: confirmTargetGarment(project.intake, garment),
      };
      if (options?.skipFlatFront) {
        updated = {
          ...updated,
          intake: skipFlatFrontGeneration(updated.intake),
        };
        persist(updated);
        setAiMessage(`已锁定目标单款：${garment.label}`);
        setAiTip("当前使用原参考图，可稍后在主款画板重新生成平铺正面");
        return;
      }
      persist(updated);
      if (needsFlatFrontAfterGarmentPick(updated.intake)) {
        await runFlatFrontGeneration(updated);
      } else {
        setAiMessage(`已锁定目标单款：${garment.label}`);
      }
    },
    [project, persist, runFlatFrontGeneration],
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
    const prev = projectRef.current;
    if (!prev) return;
    const artboards = prev.canvas_data.artboards.map((a) =>
      a.id === artboardId ? { ...a, ...patch } : a,
    );
    persist({
      ...prev,
      canvas_data: { ...prev.canvas_data, artboards, activeArtboardId },
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
        setSelectedAnnIds([first.annotation.id]);
        setLinkedHighlightAnnIds(linked.map((l) => l.annotation.id));
      } else {
        setLinkedHighlightAnnIds([]);
      }
    },
    [project, activeArtboardId, persist],
  );

  const handleSelectedAnnIdsChange = useCallback(
    (annIds: string[]) => {
      setSelectedAnnIds(annIds);
      if (!project || annIds.length === 0) {
        setHighlightedProcessIds([]);
        setLinkedHighlightAnnIds([]);
        setHighlightedSizePart("");
        return;
      }
      const primaryId = annIds[annIds.length - 1];
      const ab = project.canvas_data.artboards.find((a) => a.id === activeArtboardId);
      const ann = ab?.annotations.find((a) => a.id === primaryId);
      if (!ann) return;
      const pids = findProcessIdsForAnnotation(ann, project.process_items);
      setHighlightedProcessIds(pids);
      setLinkedHighlightAnnIds(annIds);
      if (annIds.length === 1) {
        if (isLinkableShape(ann.type)) {
          focusTab("process");
        } else if (isDimensionAnnotation(ann)) {
          focusTab("size");
          const part = getAnnotationSizePart(ann);
          setHighlightedSizePart(part ?? "");
        } else if (pids.length > 0) {
          setActiveTab("process");
        }
      }
    },
    [project, activeArtboardId, focusTab],
  );

  const primarySelectedAnnId =
    selectedAnnIds.length > 0 ? selectedAnnIds[selectedAnnIds.length - 1] : null;

  const handleToggleProcessLink = useCallback(
    (processId: string, linked: boolean) => {
      if (!project || !primarySelectedAnnId) return;
      const artboards = project.canvas_data.artboards.map((ab) =>
        ab.id === activeArtboardId
          ? {
              ...ab,
              annotations: mapAnnotationColor(
                toggleShapeProcessLink(ab.annotations, primarySelectedAnnId, processId, linked),
                primarySelectedAnnId,
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
    [project, primarySelectedAnnId, activeArtboardId, persist],
  );

  const selectedAnns = useMemo(() => {
    if (!activeArtboard || selectedAnnIds.length === 0) return [];
    const set = new Set(selectedAnnIds);
    return activeArtboard.annotations.filter((a) => set.has(a.id));
  }, [selectedAnnIds, activeArtboard]);

  const selectedAnn = useMemo(() => {
    if (!primarySelectedAnnId || !activeArtboard) return null;
    return activeArtboard.annotations.find((a) => a.id === primarySelectedAnnId) ?? null;
  }, [primarySelectedAnnId, activeArtboard]);

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
      if (!project || !primarySelectedAnnId) return;
      const artboards = project.canvas_data.artboards.map((ab) =>
        ab.id === activeArtboardId
          ? {
              ...ab,
              annotations: mapAnnotationColor(
                toggleDimensionSizePartLink(ab.annotations, primarySelectedAnnId, part, linked),
                primarySelectedAnnId,
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
    [project, primarySelectedAnnId, activeArtboardId, persist],
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
        setSelectedAnnIds([first.annotation.id]);
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
      const { dataUrl: imgUrl } = await resolveGarmentImageForAi(project, {
        activeArtboardId: activeArtboard.id,
      });
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
          intake: project.intake,
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

  const primaryArtboardId = useMemo(
    () => (project ? getPrimaryArtboardId(project.canvas_data.artboards) : undefined),
    [project],
  );

  const flatFrontRegenerating = useMemo(() => {
    if (!regeneratingArtboardId || !project) return false;
    const ab = project.canvas_data.artboards.find((a) => a.id === regeneratingArtboardId);
    return ab?.viewImageMeta?.kind === "flat_front";
  }, [regeneratingArtboardId, project]);

  const activeAiImageSource = useMemo(() => {
    if (!project || !activeAiPreset) return null;
    const actionId = aiPresetToActionId(activeAiPreset, {
      isFlatFrontRegen: flatFrontRegenerating,
    });
    if (!actionId) return null;
    return getAiActionImageSource(actionId, project, activeArtboardId);
  }, [project, activeAiPreset, activeArtboardId, flatFrontRegenerating]);

  const handleDeleteArtboard = useCallback(
    (artboardId: string) => {
      if (!project || !primaryArtboardId || artboardId === primaryArtboardId) return;
      const target = project.canvas_data.artboards.find((a) => a.id === artboardId);
      if (!target) return;
      const artboards = project.canvas_data.artboards.filter((a) => a.id !== artboardId);
      const nextActiveId =
        activeArtboardId === artboardId ? primaryArtboardId : activeArtboardId;
      setActiveArtboardId(nextActiveId);
      setSelectedAnnIds([]);
      persist({
        ...project,
        canvas_data: {
          ...project.canvas_data,
          artboards,
          activeArtboardId: nextActiveId,
        },
      });
      setAiMessage(`已删除「${target.name}」`);
    },
    [project, primaryArtboardId, activeArtboardId, persist],
  );

  const updateActiveArtboardAnnotations = useCallback(
    (updater: (annotations: Annotation[]) => Annotation[]) => {
      if (!project || !activeArtboard) return;
      const artboards = project.canvas_data.artboards.map((ab) =>
        ab.id === activeArtboard.id
          ? { ...ab, annotations: updater(ab.annotations) }
          : ab,
      );
      persist({
        ...project,
        canvas_data: { ...project.canvas_data, artboards },
      });
    },
    [project, activeArtboard, persist],
  );

  const handleMarkManualSelected = useCallback(() => {
    if (!project || selectedAnnIds.length === 0) return;
    const ids = new Set(selectedAnnIds);
    updateActiveArtboardAnnotations((anns) => markAnnotationsManual(anns, ids));
    setAiMessage(`已标记 ${selectedAnnIds.length} 项为手动（红色）`);
  }, [project, selectedAnnIds, updateActiveArtboardAnnotations]);

  const handleToggleLockSelected = useCallback(() => {
    if (!project || selectedAnnIds.length === 0 || !activeArtboard) return;
    const ids = new Set(selectedAnnIds);
    const selected = activeArtboard.annotations.filter((a) => ids.has(a.id));
    const allLocked = selected.every(isAnnotationLocked);
    updateActiveArtboardAnnotations((anns) =>
      toggleAnnotationsLock(anns, ids, !allLocked),
    );
    setAiMessage(allLocked ? "已解锁选中标注" : "已锁定选中标注");
  }, [project, selectedAnnIds, activeArtboard, updateActiveArtboardAnnotations]);

  const handleDeleteSelectedAnnotations = useCallback(() => {
    if (!project || selectedAnnIds.length === 0 || !activeArtboard) return;
    const ids = new Set(selectedAnnIds);
    const locked = activeArtboard.annotations.filter(
      (a) => ids.has(a.id) && isAnnotationLocked(a),
    );
    if (locked.length > 0) {
      setAiMessage("已锁定的标注不可删除，请先解锁");
      return;
    }
    updateActiveArtboardAnnotations((anns) => removeAnnotationsByIds(anns, ids));
    setSelectedAnnIds([]);
    setLinkedHighlightAnnIds([]);
    setHighlightedProcessIds([]);
    setHighlightedSizePart("");
  }, [project, selectedAnnIds, activeArtboard, updateActiveArtboardAnnotations]);

  const handlePasteImageToCanvas = useCallback(
    async (rawDataUrl: string) => {
      if (aiBusy || !project || !activeArtboard) return;
      setAiMessage(null);
      try {
        const imageDataUrl = await prepareImageDataUrlForCanvas(rawDataUrl);

        if (!activeArtboard.imageDataUrl) {
          updateArtboard(activeArtboard.id, { imageDataUrl });
          setAiMessage("已贴图到当前画板");
          return;
        }

        const slots = await computeArtboardSlots(project.canvas_data.artboards);
        const origin = nextArtboardOrigin(slots);
        const name = nextPasteArtboardName(project.canvas_data.artboards);
        const newBoard = createArtboard(name, imageDataUrl);
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
        setAiMessage(`已新建「${name}」贴图画板`);
      } catch (e) {
        setAiMessage(e instanceof Error ? e.message : "贴图失败");
      }
    },
    [aiBusy, project, activeArtboard, updateArtboard, persist],
  );

  const handleCropArtboardImage = useCallback(
    async (artboardId: string, displayCrop: ImageCropRect) => {
      if (aiBusy || !project) return;
      const ab = project.canvas_data.artboards.find((a) => a.id === artboardId);
      if (!ab?.imageDataUrl) return;
      setAiMessage(null);
      try {
        const fit = await loadImagePlacement(ab.imageDataUrl);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.crossOrigin = "anonymous";
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = ab.imageDataUrl!;
        });
        const scale = ab.imageScale ?? { x: 1, y: 1 };
        const srcCrop = displayCropToSourcePixels(
          displayCrop,
          {
            width: fit.width * scale.x,
            height: fit.height * scale.y,
          },
          { width: img.naturalWidth, height: img.naturalHeight },
        );
        const imageDataUrl = await applyCropToImageDataUrl(ab.imageDataUrl, srcCrop);
        updateArtboard(artboardId, {
          imageDataUrl,
          imageOffset: { x: 0, y: 0 },
          imageScale: { x: 1, y: 1 },
        });
        setAiMessage(`已剪裁「${ab.name}」`);
      } catch (e) {
        setAiMessage(e instanceof Error ? e.message : "剪裁失败");
      }
    },
    [aiBusy, project, updateArtboard],
  );

  const sourceImageUrl = useMemo(() => {
    if (!project) return undefined;
    const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
    const primary = primaryId
      ? project.canvas_data.artboards.find((a) => a.id === primaryId)
      : project.canvas_data.artboards[0];
    return (
      primary?.imageDataUrl ??
      project.canvas_data.artboards.find((a) => a.imageDataUrl)?.imageDataUrl ??
      project.intake.imageDataUrl
    );
  }, [project]);

  const runViewImageGeneration = async (params: {
    kind: ViewImageKind;
    customPrompt?: string;
    correctionPrompt?: string;
    targetArtboardId?: string;
    /** 线稿/视角的参考图来源画板；缺省为主款正面 */
    sourceArtboardId?: string;
    /** 新建线稿时绑定的源彩图画板（写入 meta） */
    lineArtSourceArtboardId?: string;
    preferredArtboardName?: string;
  }) => {
    if (aiBusy) return;
    if (!project) {
      setAiMessage("请先上传正面款式图");
      return;
    }

    const sourceBoard = params.sourceArtboardId
      ? project.canvas_data.artboards.find((a) => a.id === params.sourceArtboardId)
      : undefined;
    const effectiveSourceUrl =
      sourceBoard?.imageDataUrl ?? sourceImageUrl;
    if (!effectiveSourceUrl) {
      setAiMessage("请先上传正面款式图");
      return;
    }

    const isRegen = Boolean(params.targetArtboardId);
    if (isRegen) {
      setRegeneratingArtboardId(params.targetArtboardId!);
    } else if (params.sourceArtboardId && params.kind === "line_art") {
      // 在源彩图下方显示「生成中」
      setRegeneratingArtboardId(params.sourceArtboardId);
      setViewGenerating(true);
    } else {
      setViewGenerating(true);
    }
    setAiMessage(null);
    try {
      const imageForAi = await resolveImageDataUrlForAi(effectiveSourceUrl);
      if (!imageForAi) {
        setAiMessage("参考图过大，请换一张较小的图片后重试");
        return;
      }
      const { width: sourceWidth, height: sourceHeight } =
        await getImageDimensions(effectiveSourceUrl);

      const res = await fetch("/api/ai/view-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: params.kind,
          customPrompt: params.customPrompt,
          correctionPrompt: params.correctionPrompt,
          category: project.intake.detectedCategory,
          description: project.intake.description,
          sourceImageUrl: imageForAi,
          sourceWidth,
          sourceHeight,
          intake: project.intake,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let imageDataUrl = data.imageDataUrl as string | null;
      let outcome: "success" | "placeholder" | "error" = "success";
      if (!imageDataUrl) {
        outcome = "placeholder";
        imageDataUrl = await createViewPlaceholderImage(effectiveSourceUrl);
        const err = data.synthesisError as string | undefined;
        const viewLabel =
          params.preferredArtboardName ??
          (params.kind === "back"
            ? "背面"
            : params.kind === "line_art"
              ? "线稿"
              : "视角图");
        setAiTip(
          err
            ? `${viewLabel}生图失败：${err}。当前仅为源图占位（内容可能仍是正面），请检查密钥后重试。`
            : `${viewLabel} API 未返回图片，已用源图占位（非真实${viewLabel}），请重试。`,
        );
      } else {
        imageDataUrl = await matchImageToSourceSize(
          imageDataUrl,
          effectiveSourceUrl,
        );
        setAiTip(
          `已通过 ${data.provider ?? "AI"} / ${data.model ?? "model"} 生成真实款式图（尺寸已与源图对齐）`,
        );
      }

      appendViewGenRecord(
        buildViewGenTrainingPayload({
          projectId: project.id,
          viewKind: params.kind,
          customPrompt: params.customPrompt,
          category: project.intake.detectedCategory,
          description: project.intake.description,
          sourceImageUrl: imageForAi,
          generatedPrompt: data.imagePrompt,
          artboardName: data.artboardName,
          outputImageUrl: imageDataUrl,
          provider: data.provider,
          model: data.model,
          outcome,
          synthesisError: data.synthesisError,
        }),
      );

      const resolvedKind =
        (data.kind as ViewImageKind | undefined) ?? params.kind;
      const boundSourceId =
        params.lineArtSourceArtboardId ??
        (resolvedKind === "line_art" ? params.sourceArtboardId : undefined);

      const viewMeta = {
        kind: resolvedKind,
        customPrompt: params.customPrompt,
        lastImagePrompt: data.imagePrompt as string | undefined,
        correctionPrompt: params.correctionPrompt,
        ...(boundSourceId ? { sourceArtboardId: boundSourceId } : {}),
      };

      const displayName =
        params.preferredArtboardName ??
        canonicalArtboardNameForKind(resolvedKind);

      if (params.targetArtboardId) {
        const existing = project.canvas_data.artboards.find(
          (a) => a.id === params.targetArtboardId,
        );
        const artboards = project.canvas_data.artboards.map((ab) =>
          ab.id === params.targetArtboardId
            ? {
                ...ab,
                imageDataUrl,
                name: displayName || ab.name,
                viewImageMeta: {
                  ...viewMeta,
                  sourceArtboardId:
                    boundSourceId ??
                    existing?.viewImageMeta?.sourceArtboardId,
                },
              }
            : ab,
        );
        persist({
          ...project,
          canvas_data: { ...project.canvas_data, artboards },
        });
        setAiMessage(`已重新生成「${displayName}」`);
      } else {
        const slots = await computeArtboardSlots(project.canvas_data.artboards);
        const origin = nextArtboardOrigin(slots);
        const newBoard = createArtboard(displayName, imageDataUrl);
        newBoard.canvasOrigin = origin;
        newBoard.viewImageMeta = viewMeta;

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
      }
    } catch (e) {
      appendViewGenRecord(
        buildViewGenTrainingPayload({
          projectId: project.id,
          viewKind: params.kind,
          customPrompt: params.customPrompt,
          category: project.intake.detectedCategory,
          description: project.intake.description,
          sourceImageUrl: effectiveSourceUrl,
          outcome: "error",
          synthesisError: e instanceof Error ? e.message : "视角图生成失败",
        }),
      );
      setAiMessage(e instanceof Error ? e.message : "视角图生成失败");
    } finally {
      setViewGenerating(false);
      setRegeneratingArtboardId(null);
    }
  };

  const handleGenerateView = async (kind: ViewImageKind, customPrompt?: string) => {
    const preferredArtboardName =
      kind === "custom"
        ? customPrompt?.trim().slice(0, 8) || canonicalArtboardNameForKind("custom")
        : canonicalArtboardNameForKind(kind);
    const primaryId = project
      ? getPrimaryArtboardId(project.canvas_data.artboards)
      : undefined;
    // 优先用当前激活的彩图；否则主款正面作为背面/领口等参考
    const active = project?.canvas_data.artboards.find(
      (a) => a.id === activeArtboardId,
    );
    const sourceArtboardId =
      active?.imageDataUrl && active.viewImageMeta?.kind !== "line_art"
        ? active.id
        : primaryId;
    await runViewImageGeneration({
      kind,
      customPrompt,
      preferredArtboardName,
      sourceArtboardId,
    });
  };

  /** 从指定彩图画板转换线稿（新建画板） */
  const handleGenerateLineArtFromArtboard = async (sourceArtboardId: string) => {
    if (!project) return;
    const source = project.canvas_data.artboards.find(
      (a) => a.id === sourceArtboardId,
    );
    if (!source?.imageDataUrl) {
      setAiMessage("该画板没有可转换的彩图");
      return;
    }
    if (source.viewImageMeta?.kind === "line_art") {
      setAiMessage("当前已是线稿，请使用修正词重新生成");
      return;
    }
    await runViewImageGeneration({
      kind: "line_art",
      sourceArtboardId,
      lineArtSourceArtboardId: sourceArtboardId,
      preferredArtboardName: lineArtArtboardNameFromSource(source),
    });
  };

  const handleRegenerateView = async (artboardId: string, correctionPrompt: string) => {
    if (!project) return;
    const target = project.canvas_data.artboards.find((a) => a.id === artboardId);
    const meta = target?.viewImageMeta;
    if (!target || !meta) {
      setAiMessage("该画板无 AI 生成记录，请从左侧重新生成");
      return;
    }

    if (meta.kind === "flat_front") {
      setRegeneratingArtboardId(artboardId);
      setAiMessage(null);
      try {
        const result = await generateFlatFrontForPrimary(project, {
          correctionPrompt: correctionPrompt || undefined,
          regenerate: true,
        });
        persist(result.project);
        setAiMessage(result.success ? "平铺正面已重新生成" : result.message);
        if (result.success) {
          setAiTip("主款平铺图已更新，原图仍在参考画板");
        }
      } catch (e) {
        setAiMessage(e instanceof Error ? e.message : "平铺正面重新生成失败");
      } finally {
        setRegeneratingArtboardId(null);
      }
      return;
    }

    // 线稿重生成：必须用绑定的源彩图，而不是主款正面
    const lineSourceId =
      meta.kind === "line_art" ? meta.sourceArtboardId : undefined;
    if (meta.kind === "line_art" && !lineSourceId) {
      setAiMessage("该线稿缺少源彩图绑定，请在彩图右侧重新生成线稿");
      return;
    }

    const lineSource = lineSourceId
      ? project.canvas_data.artboards.find((a) => a.id === lineSourceId)
      : undefined;
    const preferredArtboardName =
      meta.kind === "line_art"
        ? lineArtArtboardNameFromSource(lineSource ?? target)
        : canonicalArtboardNameForKind(meta.kind);

    await runViewImageGeneration({
      kind: meta.kind,
      customPrompt: meta.customPrompt,
      correctionPrompt: correctionPrompt || undefined,
      targetArtboardId: artboardId,
      sourceArtboardId: lineSourceId,
      lineArtSourceArtboardId: lineSourceId,
      preferredArtboardName,
    });
  };

  const handleBatchAnnotate = async () => {
    if (aiBusy || !project || !activeArtboard) return;
    focusTab("process");
    setAiTask("annotate-process");
    setAiMessage(null);
    try {
      const { dataUrl: imageDataUrl } = await resolveGarmentImageForAi(project, {
        activeArtboardId: activeArtboard.id,
      });
      const res = await fetch("/api/ai/annotate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl,
          processItems: project.process_items,
          intake: project.intake,
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

      const existingLogical = activeArtboard.annotations
        .filter((a) => a.type === "rect" || a.type === "circle")
        .map((a) => annotationToLogicalRect(a, imageFit, imageOffset))
        .filter((r) => r.width > 0 && r.height > 0);

      type BatchRegion = {
        x: number;
        y: number;
        width: number;
        height: number;
        linkToExistingProcessId?: string;
        process?: Partial<ProcessItem>;
      };

      const rawRegions = filterNonOverlappingRects(
        (data.regions ?? []) as BatchRegion[],
        existingLogical,
      );

      for (const [i, region] of rawRegions.entries()) {
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
          processItems.push({
            id: processId,
            part: region.process?.part ?? "",
            process: region.process?.process ?? "",
            stitch: region.process?.stitch ?? "",
            seam_allowance: region.process?.seam_allowance ?? "",
          });
        }

        const ann = mapAiAnnotationToCanvas(
          {
            type: "rect",
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
            color: AI_ANNOTATION_COLOR,
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
      const skipped = (data.regions?.length ?? 0) - rawRegions.length;
      setAiTip(
        isModelPhoto(project.intake.photoType)
          ? `${data.userTips ?? "已添加 AI 区域标注"}（模特图基于选定单款，建议用 AI 生图补平铺图）`
          : (data.userTips ?? "已添加 AI 区域标注"),
      );
      setAiMessage(
        skipped > 0
          ? `AI 标工艺完成，跳过 ${skipped} 个与已有区域重叠的部位`
          : "AI 标工艺完成",
      );
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
      const { dataUrl: imageDataUrl } = await resolveGarmentImageForAi(project, {
        preferIntake: true,
      });
      const res = await fetch("/api/ai/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl,
          processItems: project.process_items,
          existingBom: project.bom_items,
          answers: project.questionnaire.answers,
          intake: project.intake,
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
      // 必须用当前画板原图算坐标，避免 AI 压缩图 imageFit 与标注坐标系不一致
      const boardImageUrl =
        activeArtboard.imageDataUrl ?? project.intake.imageDataUrl;
      const imageOffset = activeArtboard.imageOffset ?? { x: 0, y: 0 };
      const imageFit = boardImageUrl
        ? await loadImagePlacement(boardImageUrl)
        : { x: 0, y: 0, width: 1000, height: 750 };
      const region = annotationToLogicalRect(selectedAnn, imageFit, imageOffset);

      let regionCropped = false;
      let imageDataUrl: string | undefined;
      if (boardImageUrl) {
        const cropped = await cropAnnotationRegionForAi({
          imageDataUrl: boardImageUrl,
          ann: selectedAnn,
          imageFit,
          imageOffset,
        });
        if (cropped) {
          imageDataUrl = cropped;
          regionCropped = true;
        }
      }
      if (!imageDataUrl) {
        const resolved = await resolveGarmentImageForAi(project, {
          activeArtboardId: activeArtboard.id,
        });
        imageDataUrl = resolved.dataUrl;
      } else {
        imageDataUrl =
          (await resolveImageDataUrlForAi(imageDataUrl)) ?? imageDataUrl;
      }

      const linkedId = selectedAnn.linkedProcessIds?.[0];
      const existingPart = linkedId
        ? project.process_items.find((p) => p.id === linkedId)?.part
        : undefined;

      const res = await fetch("/api/ai/annotate-region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.intake.detectedCategory,
          description: project.intake.description,
          imageDataUrl,
          region,
          regionCropped,
          existingPart,
          intake: project.intake,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let processItems = [...project.process_items];
      // 已有关联工艺行时更新该行；勿仅凭同名合并，避免「胸/袖」认错后串改另一条
      let processId = linkedId;
      if (processId) {
        const idx = processItems.findIndex((p) => p.id === processId);
        if (idx >= 0) {
          processItems[idx] = { ...processItems[idx], ...data, id: processId };
        } else {
          processId = generateProcessId();
          processItems.push({ id: processId, ...data });
        }
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
      const { dataUrl: imageDataUrl } = await resolveGarmentImageForAi(project, {
        activeArtboardId: activeArtboard?.id,
      });

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
          intake: project.intake,
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
        (() => {
          const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
          return primaryId
            ? project.canvas_data.artboards.find((a) => a.id === primaryId)
            : project.canvas_data.artboards.find((a) => a.imageDataUrl);
        })();
      let addedDimensions = 0;
      let skippedDimensions = 0;
      let dimensionTips: string | undefined;
      let dimensionBatchFailed = false;

      const saveSizeChart = (artboards?: TechPackProject["canvas_data"]["artboards"]) =>
        mergePersist((prev) => ({
          ...prev,
          size_chart,
          canvas_data: {
            ...prev.canvas_data,
            artboards: artboards ?? prev.canvas_data.artboards,
            activeArtboardId: targetArtboard?.id ?? prev.canvas_data.activeArtboardId,
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
              intake: current.intake,
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
            const slots = await computeArtboardSlots(
              (projectRef.current ?? project).canvas_data.artboards,
            );
            const slot = findSlotForArtboard(slots, targetArtboard.id);
            const imageFit = slot?.imageFit ??
              (fitSource
                ? await loadImagePlacement(fitSource)
                : { x: 0, y: 0, width: 1000, height: 750 });
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
              skippedDimensions = result.skipped;
              return { ...ab, annotations: result.annotations };
            });
            saveSizeChart(artboards);
            if (targetArtboard.id !== activeArtboardId) {
              setActiveArtboardId(targetArtboard.id);
            }
            dimensionTips = dimData.userTips;
            if (addedDimensions === 0) {
              dimensionBatchFailed = true;
              setAiTip(
                skippedDimensions > 0
                  ? `尺码表已生成，但 ${skippedDimensions} 条尺寸线未能匹配部位或已存在，请在当前选中款图上手动标注`
                  : "尺码表已生成，但尺寸线未能写入画布（请检查部位名称或手动标注）",
              );
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
              ? `已在当前选中款图上标注 ${addedDimensions} 条尺寸线（蓝色）`
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
      if (data.bom_items?.length) {
        const existingNames = new Set(updated.bom_items.map((b) => b.name.trim()));
        updated.bom_items = [
          ...updated.bom_items,
          ...data.bom_items.filter(
            (b: BomItem) => b.name?.trim() && !existingNames.has(b.name.trim()),
          ),
        ];
      }
      if (data.size_chart?.rows?.length) {
        updated.size_chart = applySizeChartAssist(
          {
            sizes: data.size_chart.sizes ?? updated.size_chart.sizes,
            rows: data.size_chart.rows,
          },
          {
            regionStandard: updated.size_chart.regionStandard ?? "cn",
            sampleSize: updated.size_chart.sampleSize ?? "M",
          },
          updated.size_chart,
        );
      }
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
      const { dataUrl: imageDataUrl } = await resolveGarmentImageForAi(project, {
        activeArtboardId: primaryArtboardId ?? activeArtboard?.id,
      });

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
          intake: project.intake,
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
      {garmentBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md">
            <GarmentPickerStep
              intake={project.intake}
              imagePreview={project.intake.imageDataUrl}
              onConfirm={(g, opts) => void handleGarmentConfirm(g, opts)}
              flatFrontLoading={viewGenerating}
            />
          </div>
        </div>
      )}
      {flatFrontPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md">
            <FlatFrontPromptStep
              intake={project.intake}
              onGenerate={() => void handleFlatFrontGenerate()}
              onSkip={handleFlatFrontSkip}
              generateLoading={viewGenerating}
            />
          </div>
        </div>
      )}
      <div id={STUDIO_TOOLBAR_ANCHOR_ID} className="z-20 shrink-0 border-b border-[#cbd5e1] bg-white" />

      <div className="flex min-h-0 flex-1">
        <FixedViewSidebar
          onNewStyle={handleNewStyle}
          onReplaceImage={(url) => {
            const primaryId = getPrimaryArtboardId(project.canvas_data.artboards);
            const main = primaryId
              ? project.canvas_data.artboards.find((a) => a.id === primaryId)
              : project.canvas_data.artboards.find((a) => a.imageDataUrl);
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
          onLineArtHint={(message) => {
            setAiMessage(message);
            setAiTip(message);
          }}
          viewGenerating={viewGenerating || regeneratingArtboardId !== null}
          aiBusy={aiBusy}
          compliance={compliance}
          projectTitle={project.title}
          category={project.intake.targetGarment?.category ?? project.intake.detectedCategory}
          targetGarmentLabel={project.intake.targetGarment?.label}
          photoType={project.intake.photoType}
          flatFrontGenerated={project.intake.flatFrontGenerated}
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
            onViewportChange={(viewport) =>
              saveLayout({ ...layoutRef.current, viewport })
            }
            titleLabel={
              project.title?.trim() ||
              project.intake.suggestedTitle?.trim() ||
              project.intake.targetGarment?.label?.trim() ||
              undefined
            }
          >
            <AnnotationCanvas
              fixedChrome
              stagePosition={layout.stage}
              canvasScale={scale}
              multiArtboards={project.canvas_data.artboards}
              artboardSlots={artboardSlots}
              activeArtboardId={activeArtboardId}
              onActiveArtboardChange={setActiveArtboard}
              primaryArtboardId={primaryArtboardId}
              onDeleteArtboard={handleDeleteArtboard}
              onRegenerateView={handleRegenerateView}
              onGenerateLineArt={handleGenerateLineArtFromArtboard}
              regeneratingArtboardId={regeneratingArtboardId}
              imageUrl={activeArtboard.imageDataUrl ?? project.intake.imageDataUrl}
              annotations={normalizeAnnotations(activeArtboard.annotations)}
              onAnnotationsChange={(annotations) =>
                updateArtboard(activeArtboard.id, { annotations })
              }
              imageOffset={activeArtboard.imageOffset ?? { x: 0, y: 0 }}
              onImageOffsetChange={(imageOffset) =>
                updateArtboard(activeArtboard.id, { imageOffset })
              }
              onArtboardImageDragEnd={({ imageOffset, annotations }) =>
                updateArtboard(activeArtboard.id, { imageOffset, annotations })
              }
              onArtboardImageTransformEnd={({ imageOffset, imageScale, annotations }) =>
                updateArtboard(activeArtboard.id, {
                  imageOffset,
                  imageScale,
                  annotations,
                })
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
              onViewportScaleChange={(nextScale) => {
                const vp = layoutRef.current.viewport;
                saveLayout({
                  ...layoutRef.current,
                  viewport: { ...vp, scale: nextScale },
                });
              }}
              onResetViewport={() =>
                saveLayout({
                  ...layoutRef.current,
                  viewport: { panX: 0, panY: 0, scale: 1 },
                })
              }
              viewport={layout.viewport}
              onViewportChange={(viewport) =>
                saveLayout({ ...layoutRef.current, viewport })
              }
              processItems={project.process_items}
              selectedAnnIds={selectedAnnIds}
              onSelectedAnnIdsChange={handleSelectedAnnIdsChange}
              linkedHighlightAnnIds={linkedHighlightAnnIds}
              onPasteImage={handlePasteImageToCanvas}
              pasteImageDisabled={aiBusy}
              onCropArtboardImage={handleCropArtboardImage}
            />
          </InfiniteCanvas>

          <StudioAiDock
            project={project}
            onProjectUpdate={persist}
            disabled={aiBusy}
            statusText={aiMessage ?? aiTip}
          />

          <div className="pointer-events-none fixed top-14 right-4 z-30 w-[min(100vw-1.5rem,340px)]">
            <div className="pointer-events-auto overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <StudioDataPanel
                project={project}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onPersist={persist}
                highlightedProcessIds={highlightedProcessIds}
                onProcessRowSelect={handleProcessRowSelect}
                selectedAnnIds={selectedAnnIds}
                selectedAnns={selectedAnns}
                linkedProcessIdsForSelection={linkedProcessIdsForSelection}
                onToggleProcessLink={handleToggleProcessLink}
                onRegionAiFill={handleRegionAiFill}
                regionAiLoading={aiTask === "region-annotate"}
                onDimensionAiFill={handleDimensionAiFill}
                dimensionAiLoading={aiTask === "size-dimension"}
                onMarkManual={handleMarkManualSelected}
                onToggleLock={handleToggleLockSelected}
                onDeleteSelected={handleDeleteSelectedAnnotations}
                linkedSizePartForSelection={linkedSizePartForSelection}
                onToggleSizeLink={handleToggleSizeLink}
                highlightedSizePart={highlightedSizePart}
                onSizeRowSelect={handleSizeRowSelect}
                highlightTab={aiHighlightTab}
                interactionLocked={aiBusy}
              />
            </div>
          </div>

          {aiBusy && activeAiPreset && !garmentBlocked && (
            <AiAnalysisOverlay
              preset={activeAiPreset}
              imageSourceHint={activeAiImageSource?.hint}
              imagePreview={(() => {
                const actionId = aiPresetToActionId(activeAiPreset, {
                  isFlatFrontRegen: flatFrontRegenerating,
                });
                if (actionId) {
                  return resolveAiImagePreviewUrl(
                    project,
                    actionId,
                    activeArtboardId,
                  );
                }
                return project.intake.imageDataUrl;
              })()}
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
