import Link from "next/link";
import { ArrowRight, Baby, BookOpen, Compass, School } from "lucide-react";

export default function HomePage() {
  return (
    <main className="service-page">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-14 pt-16 text-center sm:pb-16 sm:pt-24">
        <span className="service-eyebrow chip mb-5 inline-flex items-center gap-1.5 px-3 py-1">
          <Compass className="h-3.5 w-3.5" />
          新西兰教育体验规划
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          把新西兰教育体验，规划得更清楚
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-ink-soft sm:text-base">
          从选校、插班到住宿，用清晰的资料与真实经验，帮家庭找到适合自己的下一步。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#library"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            浏览学校库
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 rounded-xl border border-stroke/80 bg-white/45 px-7 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
          >
            阅读游学攻略
            <BookOpen className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* 学校库入口 */}
      <section id="library" className="mx-auto max-w-5xl px-5 pb-20 pt-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">从这里开始</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">找到适合孩子的学校</h2>
          <p className="mt-3 text-[15px] leading-7 text-ink-soft">选择机构类型，进入可筛选、可地图查看的学校库。</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/schools"
            className="service-panel service-panel-hover group relative flex flex-col overflow-hidden rounded-2xl p-7 sm:p-8"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-sm transition-transform group-hover:scale-110">
              <School className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-ink">中小学</h3>
            <p className="mt-1 text-sm font-medium text-ink-soft">Schools</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              新西兰小学至高中（Year 1–13），支持地区、类型、公私立、寄宿、教学语言等多维筛选与地图查看。
            </p>
            <span className="mt-6 flex items-center gap-1 text-sm font-medium text-primary transition-all group-hover:gap-2">
              进入学校库
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/ece"
            className="service-panel service-panel-hover group relative flex flex-col overflow-hidden rounded-2xl p-7 sm:p-8"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-primary-soft text-white shadow-sm transition-transform group-hover:scale-110">
              <Baby className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-ink">幼儿园</h3>
            <p className="mt-1 text-sm font-medium text-ink-soft">Early Childhood Services</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              新西兰早期儿童服务机构，含托儿所、幼儿园、家庭日托等，支持城市、学校类型、办学性质、EQI 与接受 2 岁以下筛选。
            </p>
            <span className="mt-6 flex items-center gap-1 text-sm font-medium text-primary transition-all group-hover:gap-2">
              进入幼儿园库
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
