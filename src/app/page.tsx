import Link from "next/link";
import { ArrowRight, Baby, School } from "lucide-react";
import { SectionBackgroundLayer } from "@/components/section-background";
import { homePageBackgrounds } from "@/lib/backgrounds";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section
        className={`relative overflow-hidden ${
          homePageBackgrounds.hero.src ? "aspect-[12/5] md:aspect-[12/5]" : ""
        }`}
      >
        {/* 自定义背景图（由配置文件控制） */}
        <SectionBackgroundLayer bg={homePageBackgrounds.hero} />

        {/* 兼容：未设置背景图时使用原渐变 */}
        {!homePageBackgrounds.hero.src && (
          <>
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#EEF6F4] via-[#DCEFEB] to-[#C6E2DB]" />
            <div className="absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-16 top-32 -z-10 h-80 w-80 rounded-full bg-primary-light/20 blur-3xl" />
          </>
        )}

        <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center py-24 text-center">
          {/* 文案暂未确定，预留位置 */}
        </div>
      </section>

      {/* 学校库入口 */}
      <section id="library" className="relative mx-auto max-w-7xl overflow-hidden px-5 pb-20">
        {/* 自定义背景图（可选） */}
        <SectionBackgroundLayer bg={homePageBackgrounds.library} />
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink">学校库入口</h2>
          <p className="mt-3 text-base text-ink-soft">选择机构类型，进入可筛选的学校列表。</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            href="/schools"
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-8 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
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
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-8 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
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
    </div>
  );
}
