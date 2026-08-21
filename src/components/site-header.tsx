import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/40 bg-bg/70 backdrop-blur-xl">
      <div className="px-6 lg:px-10">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-ink">
              WollyNZ
            </span>
          </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/schools"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-primary"
          >
            中小学
          </Link>
          <Link
            href="/ece"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-primary"
          >
            幼儿园
          </Link>
        </nav>

        <button
          type="button"
          disabled
          title="登录功能即将上线"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-stroke px-3.5 py-1 text-xs font-medium text-caption"
        >
          登录
        </button>
      </div></div>
    </header>
  );
}
