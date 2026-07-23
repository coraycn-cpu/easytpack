import Link from "next/link";
import AuthHeaderControls from "@/components/auth/AuthHeaderControls";

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900">
          EasytPack
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/projects" className="text-zinc-600 hover:text-zinc-900">
            我的项目
          </Link>
          <Link href="/account" className="text-zinc-600 hover:text-zinc-900">
            用户中心
          </Link>
          <AuthHeaderControls />
        </nav>
      </div>
    </header>
  );
}
