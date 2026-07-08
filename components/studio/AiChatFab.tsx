"use client";

import { useEffect, useRef, useState } from "react";
import type { BomItem, ProcessItem } from "@/types/process";
import type { SizeChart, TechPackProject } from "@/types/project";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AiChatFabProps = {
  project: TechPackProject;
  onProjectUpdate: (project: TechPackProject) => void;
  disabled?: boolean;
  flat?: boolean;
};

export default function AiChatFab({ project, onProjectUpdate, disabled, flat }: AiChatFabProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "你好！我是版房 AI 助手。你可以用大白话告诉我怎么改，比如「把袖口改成罗纹」「加一条拉链物料」「尺码表加大一码」。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        { id: `a_${Date.now()}`, role: "assistant", content: data.reply },
      ]);

      const updated = { ...project };
      if (data.title) updated.title = data.title;

      if (data.process_items?.length) {
        const map = new Map(updated.process_items.map((p) => [p.part, p]));
        for (const item of data.process_items as ProcessItem[]) {
          map.set(item.part, item);
        }
        updated.process_items = Array.from(map.values());
      }

      if (data.bom_items?.length) {
        const names = new Set(updated.bom_items.map((b) => b.name));
        updated.bom_items = [
          ...updated.bom_items,
          ...(data.bom_items as BomItem[]).filter((b) => !names.has(b.name)),
        ];
      }

      if (data.size_chart?.rows?.length) {
        updated.size_chart = data.size_chart as SizeChart;
      }

      onProjectUpdate(updated);
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
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center text-xl text-white transition disabled:opacity-50 ${
          flat
            ? "border-2 border-[#2563eb] bg-[#2563eb] hover:bg-[#1d4ed8]"
            : "rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg hover:scale-105"
        }`}
        title="AI 助手对话"
      >
        🤖
      </button>

      {open && (
        <div
          className={`fixed bottom-20 right-6 z-40 flex h-[min(480px,calc(100vh-8rem))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden border border-[#2563eb] bg-white shadow-[4px_4px_0_#00000022] ${
            flat ? "" : "rounded-2xl border-zinc-200 shadow-2xl"
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-between border-b px-3 py-2 text-white ${
              flat ? "border-[#2563eb] bg-[#2563eb]" : "border-zinc-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3"
            }`}
          >
            <div>
              <p className="text-xs font-semibold">版房 AI 助手</p>
              <p className="text-[10px] opacity-80">对话修改工艺包</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-0.5 text-sm hover:bg-white/20"
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
                  className={`max-w-[85%] px-2 py-1.5 text-[11px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#2563eb] text-white"
                      : "border border-[#e2e8f0] bg-[#f8fafc] text-[#334155]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <p className="text-center text-[10px] text-[#94a3b8]">AI 正在思考…</p>}
          </div>

          <div className="shrink-0 border-t border-[#e2e8f0] p-2">
            <div className="flex gap-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="说说你想怎么改…"
                className="min-w-0 flex-1 border border-[#cbd5e1] px-2 py-1.5 text-xs outline-none focus:border-[#2563eb]"
              />
              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={send}
                className="shrink-0 border border-[#2563eb] bg-[#2563eb] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
