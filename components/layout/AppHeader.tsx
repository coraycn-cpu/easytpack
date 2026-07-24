import AuthHeaderControls from "@/components/auth/AuthHeaderControls";
import BrandMark from "@/components/brand/BrandMark";
import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <BrandMark nameClassName="text-lg leading-none" />
        <nav className="flex shrink-0 items-center gap-3 text-sm">
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
