"use client";

import { useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import AppSideNav from "@/components/layout/AppSideNav";
import Link from "next/link";

/** 模板库占位页（参考图有 Templates；功能后续再开） */
export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto flex max-w-6xl">
        <AppSideNav />
        <main className="flex min-w-0 flex-1 flex-col items-center px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">模板库</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            这里以后会放常用款式模板，方便一键套用工艺与尺码表。
            当前版本请先用「新建款式」从空白开始。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/" className="pf-btn-primary px-4 py-2 text-sm">
              + 新建款式
            </Link>
            <Link href="/projects" className="pf-btn-secondary px-4 py-2 text-sm">
              回项目库
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
