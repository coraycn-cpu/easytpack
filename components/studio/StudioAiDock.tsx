"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatImageAttachment } from "@/lib/ai/chat";
import { applyChatResponseToProject } from "@/lib/ai/chat-apply";
import {
  buildChatProjectContext,
  buildChatWelcomeMessage,
} from "@/lib/ai/chat-context";
import {
  chatImageModeLabel,
  isBoardScopedChatAction,
  resolveChatImageMode,
} from "@/lib/ai/chat-image-intent";
import { buildChatQuickChips } from "@/lib/ai/chat-quick-chips";
import { resolveGarmentImageForAi } from "@/lib/ai/resolve-garment-image";
import type { AiChatResponse, AiChatSuggestedAction } from "@/types/process";
import type { TechPackProject } from "@/types/project";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  changeSummary?: string[];
  suggestedActions?: Array<{ action: AiChatSuggestedAction; reason: string }>;
};

const DEFAULT_STATUS = "版房 AI 助手 · 点击对话";

const ACTION_LABELS: Record<AiChatSuggestedAction, string> = {
  "annotate-process": "标工艺",
  "fill-bom": "填物料",
  "fill-size": "填尺寸",
  enhance: "一键补全",
  explain: "写评语",
  "view-back": "生成背面",
  "view-line-art": "生成线稿",
};

function historyStorageKey(projectId: string) {
  return `easytpack:chat:${projectId}`;
}

function loadPersistedMessages(projectId: string): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(historyStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.slice(-40);
  } catch {
    return null;
  }
}

function persistMessages(projectId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    const slim = messages
      .filter((m) => m.id !== "welcome")
      .slice(-40)
      .map(({ id, role, content, changeSummary }) => ({
        id,
        role,
        content,
        changeSummary,
      }));
    localStorage.setItem(historyStorageKey(projectId), JSON.stringify(slim));
  } catch {
    /* quota */
  }
}

type StudioAiDockProps = {
  project: TechPackProject;
  activeArtboardId?: string;
  onProjectUpdate: (project: TechPackProject) => void;
  disabled?: boolean;
  statusText?: string | null;
  onRunSuggestedAction?: (action: AiChatSuggestedAction) => void;
};

export default function StudioAiDock({
  project,
  activeArtboardId,
  onProjectUpdate,
  disabled,
  statusText,
  onRunSuggestedAction,
}: StudioAiDockProps) {
  const welcomeText = useMemo(
    () => buildChatWelcomeMessage(project),
    [
      project.id,
      project.title,
      project.intake.aiIntentAnalysis,
      project.intake.detectedCategory,
      project.intake.detectedFeatures,
      project.intake.suggestedTitle,
      project.intake.targetGarment?.label,
      project.intake.targetGarment?.category,
    ],
  );

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadPersistedMessages(project.id);
    const welcome = {
      id: "welcome",
      role: "assistant" as const,
      content: buildChatWelcomeMessage(project),
    };
    if (saved?.length) return [welcome, ...saved];
    return [welcome];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHint, setLoadingHint] = useState("AI 正在思考…");
  const [pendingActions, setPendingActions] = useState<
    Array<{ action: AiChatSuggestedAction; reason: string }>
  >([]);
  const listRef = useRef<HTMLDivElement>(null);
  const projectIdRef = useRef(project.id);

  const displayStatus = statusText?.trim() || DEFAULT_STATUS;

  const resolvedActiveId =
    activeArtboardId ?? project.canvas_data.activeArtboardId;
  const activeArtboardName = useMemo(() => {
    const board = project.canvas_data.artboards.find(
      (a) => a.id === resolvedActiveId,
    );
    return board?.name;
  }, [project.canvas_data.artboards, resolvedActiveId]);

  const actionTitle = useCallback(
    (action: AiChatSuggestedAction) => {
      const base = ACTION_LABELS[action];
      if (isBoardScopedChatAction(action) && activeArtboardName) {
        return `${base} · ${activeArtboardName}`;
      }
      if (action === "fill-bom") return `${base} · 上传原图`;
      return base;
    },
    [activeArtboardName],
  );

  useEffect(() => {
    if (projectIdRef.current === project.id) return;
    projectIdRef.current = project.id;
    const saved = loadPersistedMessages(project.id);
    const welcome = {
      id: "welcome",
      role: "assistant" as const,
      content: buildChatWelcomeMessage(project),
    };
    setMessages(saved?.length ? [welcome, ...saved] : [welcome]);
    setPendingActions([]);
  }, [project.id, project]);

  /** 建款分析到达后刷新开场白（不覆盖后续对话） */
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [{ id: "welcome", role: "assistant", content: welcomeText }];
      }
      if (prev[0]?.id !== "welcome") return prev;
      if (prev[0].content === welcomeText) return prev;
      return [{ ...prev[0], content: welcomeText }, ...prev.slice(1)];
    });
  }, [welcomeText]);

  useEffect(() => {
    persistMessages(project.id, messages);
  }, [messages, project.id]);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, open, pendingActions, loading]);

  const toggleOpen = () => {
    if (disabled && !open) return;
    setOpen((v) => !v);
  };

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || disabled) return;

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);
      setPendingActions([]);

      try {
        const history = nextMessages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        const context = buildChatProjectContext(project, {
          activeArtboardId: resolvedActiveId,
        });

        const imageMode = resolveChatImageMode(trimmed);
        setLoadingHint(
          `AI 正在思考（${chatImageModeLabel(imageMode, activeArtboardName)}）…`,
        );

        const images: ChatImageAttachment[] = [];
        if (imageMode !== "none") {
          try {
            const intake = await resolveGarmentImageForAi(project, {
              preferIntake: true,
            });
            if (intake.dataUrl) {
              images.push({
                role: "intake",
                dataUrl: intake.dataUrl,
                label: "上传原始参考图（款式分析唯一图像来源）",
              });
            }
          } catch {
            /* ignore */
          }
          if (imageMode === "intake_and_active" && resolvedActiveId) {
            try {
              const active = await resolveGarmentImageForAi(project, {
                activeArtboardId: resolvedActiveId,
              });
              if (active.dataUrl && active.dataUrl !== images[0]?.dataUrl) {
                images.push({
                  role: "active",
                  dataUrl: active.dataUrl,
                  label: `当前选中画板「${activeArtboardName ?? "未命名"}」（仅标注/生图参考）`,
                });
              }
            } catch {
              /* ignore */
            }
          }
        }

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            context,
            images,
          }),
        });
        const data = (await res.json()) as AiChatResponse & { error?: string };
        if (!res.ok) throw new Error(data.error || "对话失败");

        const { project: updated, changeSummary } = applyChatResponseToProject(
          project,
          data,
        );

        if (changeSummary.length > 0) {
          onProjectUpdate(updated);
        }

        const suggestions = data.suggested_actions?.length
          ? data.suggested_actions
          : undefined;

        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: "assistant",
            content: data.reply,
            changeSummary:
              changeSummary.length > 0 ? changeSummary : undefined,
            suggestedActions: suggestions,
          },
        ]);

        if (suggestions?.length) {
          setPendingActions(suggestions);
        }
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: "assistant",
            content: e instanceof Error ? e.message : "发送失败，请重试",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      disabled,
      messages,
      project,
      resolvedActiveId,
      activeArtboardName,
      onProjectUpdate,
    ],
  );

  const send = () => void sendText(input);

  const chips = useMemo(
    () => buildChatQuickChips(project),
    [
      project.intake.targetGarment?.label,
      project.intake.targetGarment?.category,
      project.intake.targetGarment?.kind,
      project.intake.detectedCategory,
      project.intake.detectedFeatures,
    ],
  );

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center">
      <div
        className={`pointer-events-auto mb-2 flex h-[min(460px,calc(100vh-12rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[#2563eb] bg-white shadow-lg transition-all duration-200 ease-out ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#2563eb] bg-[#2563eb] px-3 py-2 text-white">
          <div>
            <p className="text-xs font-semibold">版房 AI 助手</p>
            <p className="text-[10px] opacity-80">本款答疑 · 改工艺包</p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => setOpen(false)}
            className="rounded px-2 py-0.5 text-sm hover:bg-white/20 disabled:opacity-40"
            aria-label="收起对话"
          >
            ✕
          </button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-md px-2 py-1.5 text-[11px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#2563eb] text-white"
                    : "border border-[#e2e8f0] bg-[#f8fafc] text-[#334155]"
                }`}
              >
                {m.content}
                {m.changeSummary && m.changeSummary.length > 0 && (
                  <p className="mt-1 border-t border-slate-200/80 pt-1 text-[10px] text-emerald-700">
                    已更新：{m.changeSummary.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          ))}

          {pendingActions.length > 0 && !loading && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/90 p-2">
              <p className="mb-1.5 text-[10px] font-medium text-violet-800">
                AI 建议执行（需确认）：
              </p>
              <div className="flex flex-col gap-1">
                {pendingActions.map((s) => (
                  <button
                    key={s.action}
                    type="button"
                    disabled={disabled || !onRunSuggestedAction}
                    onClick={() => {
                      onRunSuggestedAction?.(s.action);
                      setPendingActions((prev) =>
                        prev.filter((p) => p.action !== s.action),
                      );
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `run_${Date.now()}`,
                          role: "assistant",
                          content: `已开始执行「${actionTitle(s.action)}」…`,
                        },
                      ]);
                    }}
                    className="rounded border border-violet-300 bg-white px-2 py-1.5 text-left text-[11px] text-violet-900 transition hover:border-violet-500 disabled:opacity-40"
                  >
                    <span className="font-semibold">
                      {actionTitle(s.action)}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-violet-600">
                      {s.reason}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPendingActions([])}
                className="mt-1.5 text-[10px] text-slate-500 underline"
              >
                忽略建议
              </button>
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[11px] text-[#64748b]">
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:300ms]" />
                </span>
                {loadingHint}
              </div>
            </div>
          )}
        </div>

        <div className={`shrink-0 border-t border-[#e2e8f0] p-2 ${loading ? "opacity-60" : ""}`}>
          <div className="mb-1.5 flex flex-wrap gap-1">
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                disabled={loading || disabled}
                onClick={() => void sendText(c.text)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40"
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="说说你想怎么改…"
              disabled={loading || disabled}
              className="min-w-0 flex-1 rounded border border-[#cbd5e1] px-2 py-1.5 text-xs outline-none focus:border-[#2563eb] disabled:bg-slate-50"
            />
            <button
              type="button"
              disabled={loading || disabled || !input.trim()}
              onClick={send}
              className="shrink-0 rounded border border-[#2563eb] bg-[#2563eb] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              {loading ? "…" : "发送"}
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled && !open}
        onClick={toggleOpen}
        title={open ? "收起 AI 对话" : "打开 AI 对话"}
        className={`pointer-events-auto inline-flex max-w-[min(90vw,560px)] items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur transition hover:border-blue-200 hover:shadow-lg disabled:opacity-50 ${
          open ? "ring-2 ring-blue-200" : ""
        }`}
      >
        <span className="shrink-0 text-base leading-none" aria-hidden>
          🤖
        </span>
        <span className="truncate text-[11px] font-medium text-slate-700">
          {displayStatus}
        </span>
        <span className="shrink-0 text-[10px] text-slate-400">
          {open ? "▾" : "▴"}
        </span>
      </button>
    </div>
  );
}
