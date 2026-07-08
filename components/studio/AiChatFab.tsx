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
};

export default function AiChatFab({ project, onProjectUpdate, disabled }: AiChatFabProps) {
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
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl text-white shadow-lg shadow-blue-600/30 transition hover:scale-105 hover:shadow-xl disabled:opacity-50"
        title="AI 助手对话"
      >
        🤖
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[min(480px,calc(100vh-8rem))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">版房 AI 助手</p>
              <p className="text-[10px] text-blue-100">对话修改工艺包</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm hover:bg-white/20"
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <p className="text-center text-xs text-zinc-400">AI 正在思考…</p>
            )}
          </div>

          <div className="shrink-0 border-t border-zinc-100 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="说说你想怎么改…"
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
              />
              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={send}
                className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
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
