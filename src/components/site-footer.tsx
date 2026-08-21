import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-primary/10 bg-primary/[0.04]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="text-base font-bold text-ink">WollyNZ</p>
          <p className="text-sm leading-relaxed text-ink-soft">
            面向中国游学家庭的新西兰优质教育机构查询平台，帮助您按地区、类型、语言等条件筛选合适的学校。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-ink">学校库</p>
            <Link
              href="/schools"
              className="block text-ink-soft transition-colors hover:text-primary"
            >
              中小学
            </Link>
            <Link
              href="/ece"
              className="block text-ink-soft transition-colors hover:text-primary"
            >
              幼儿园
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-ink">数据</p>
            <Link
              href="https://data.govt.nz"
              className="block text-ink-soft transition-colors hover:text-primary"
            >
              数据来源
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-primary/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 WollyNZ · 仅供信息参考</p>
          <p>数据来源：data.govt.nz（CC BY 4.0）· 新西兰教育机构目录</p>
        </div>
      </div>
    </footer>
  );
}
