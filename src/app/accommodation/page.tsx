import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, MessageCircle, Search } from "lucide-react";

export const metadata = {
  title: "找住宿 · GoalNZ",
  description: "GoalNZ 合作物业公司房源匹配：提交您的住宿需求，有合适房源我们将主动联系您。",
};

const PARTNERS = [
  { name: "Auckland Homestay Partners", note: "奥克兰 homestay 与学区房" },
  { name: "Kiwi Rentals Co.", note: "惠灵顿 / 基督城长租" },
  { name: "Families Welcome Ltd.", note: "带娃家庭友好型房源" },
  { name: "Campus Near Living", note: "近学校短租与过渡房" },
];

const STEPS = [
  {
    icon: Search,
    title: "填写意向",
    desc: "告诉我们您期望的区域、预算、户型与入住时间等需求。",
  },
  {
    icon: Building2,
    title: "我们匹配房源",
    desc: "我们从合作的物业公司资源中为您筛选合适房源。",
  },
  {
    icon: MessageCircle,
    title: "主动联系您",
    desc: "如有合适房源，我们会通过您留的邮箱主动与您联系，不收取任何费用。",
  },
];

export default function AccommodationPage() {
  return (
    <main className="service-page">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-5 pb-12 pt-16 text-center sm:pt-20">
          <span className="service-eyebrow chip mb-5 inline-flex items-center gap-1.5 px-3 py-1">
            <Building2 className="h-3.5 w-3.5" />
            合作物业 · 免费匹配
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">找住宿（内测中）</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-ink-soft sm:text-base">
            GoalNZ 与多家新西兰本地物业公司合作。提交您的住宿需求，
            <span className="font-medium text-ink">如有合适房源，我们会主动联系您</span>
            ——全程免费、无义务。
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/apply/accommodation"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              填写意向
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/my-accommodations"
              className="inline-flex items-center gap-2 rounded-xl border border-stroke/70 px-7 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
            >
              管理我的住宿意向
            </Link>
          </div>
        </div>
      </section>

      {/* 如何运作 */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mx-auto mb-7 max-w-xl text-center">
          <p className="text-sm font-medium text-primary">简单三步</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">如何运作</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="service-panel service-panel-hover rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-ink-soft">第 {i + 1} 步</span>
              </div>
              <h3 className="mt-3 font-bold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 合作物业公司 */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mx-auto mb-7 max-w-xl text-center">
          <p className="text-sm font-medium text-primary">合作网络</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">合作物业公司</h2>
        </div>
        <p className="-mt-4 mb-6 text-center text-sm text-ink-soft">
          以下为合作方示例，正式上线前将替换为真实合作机构。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className="service-panel service-panel-hover flex items-center gap-3 rounded-2xl p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">{p.name}</p>
                <p className="text-sm text-ink-soft">{p.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 安心说明 */}
      <section className="mx-auto max-w-3xl px-5 pb-14 pt-10">
        <div className="service-panel flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <p className="text-base font-medium text-ink">免费、无义务、隐私保护</p>
          <p className="max-w-xl text-sm text-ink-soft">
            您填写的意向仅用于房源匹配，我们不会向无关第三方分享您的联系方式。
            没有合适房源时，您无需任何操作。
          </p>
        </div>
      </section>
    </main>
  );
}
