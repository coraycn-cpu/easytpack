import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900">
          EasytPack
        </Link>
        <span className="text-xs text-zinc-400">AI 服装工艺包</span>
      </div>
    </header>
  );
}
