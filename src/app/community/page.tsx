import { CheckCircle2, HeartHandshake, MessageCircle, Sparkles, Users } from "lucide-react";

export const metadata = {
  title: "加入社群 · GoalNZ",
};

// 二维码占位置：后续把 src 换成真实二维码图片即可（建议放在 /public 下）
const QR_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#fff"/>
      <rect x="10" y="10" width="50" height="50" fill="#0f766e"/>
      <rect x="25" y="25" width="20" height="20" fill="#fff"/>
      <rect x="140" y="10" width="50" height="50" fill="#0f766e"/>
      <rect x="155" y="25" width="20" height="20" fill="#fff"/>
      <rect x="10" y="140" width="50" height="50" fill="#0f766e"/>
      <rect x="25" y="155" width="20" height="20" fill="#fff"/>
      <g fill="#0f766e">
        <rect x="80" y="20" width="12" height="12"/><rect x="104" y="20" width="12" height="12"/>
        <rect x="80" y="44" width="12" height="12"/><rect x="128" y="44" width="12" height="12"/>
        <rect x="80" y="80" width="12" height="12"/><rect x="116" y="80" width="12" height="12"/>
        <rect x="152" y="80" width="12" height="12"/><rect x="80" y="116" width="12" height="12"/>
        <rect x="104" y="116" width="12" height="12"/><rect x="140" y="116" width="12" height="12"/>
        <rect x="168" y="140" width="12" height="12"/><rect x="80" y="152" width="12" height="12"/>
        <rect x="116" y="168" width="12" height="12"/><rect x="152" y="168" width="12" height="12"/>
      </g>
    </svg>`
  );

const CARDS = [
  {
    icon: Users,
    title: "家长社群",
    desc: "扫码加入 GoalNZ 家长社群，和正在为孩子选校的爸妈们一起交流择校经验、学区动态与游学攻略，第一时间获取学校库更新提醒。",
    qrNote: "长按或扫码加入社群",
  },
];

const COMMUNITY_BENEFITS = [
  {
    icon: MessageCircle,
    title: "和真实家长交流",
    desc: "把选校、插班和适应过程中的问题，放进真实经验里一起讨论。",
  },
  {
    icon: Sparkles,
    title: "获取一手更新",
    desc: "学校库更新、学期安排与实用攻略，会在社群中第一时间同步。",
  },
  {
    icon: HeartHandshake,
    title: "少一点独自摸索",
    desc: "认识同在规划新西兰教育体验的家庭，彼此分享可靠的信息。",
  },
];

export default function CommunityPage() {
  return (
    <main className="service-page">
      <section className="mx-auto max-w-5xl px-5 pb-12 pt-16 text-center sm:pt-20">
        <span className="service-eyebrow chip mb-5 inline-flex items-center gap-1.5 px-3 py-1">
          <Users className="h-3.5 w-3.5" />
          家长交流 · 持续更新
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">加入社群</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-ink-soft sm:text-base">
          和正在规划新西兰教育体验的家庭一起交流，少一点摸索，多一点有用的真实经验。
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        {CARDS.map(({ icon: Icon, title, desc, qrNote }) => (
          <div key={title} className="service-panel mx-auto grid max-w-3xl gap-8 rounded-3xl p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div className="text-center sm:text-left">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mx-0">
                <Icon className="h-6 w-6" />
              </span>
              <p className="mt-5 text-sm font-medium text-primary">GoalNZ 家长社群</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-ink-soft">{desc}</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1.5 text-xs font-medium text-ink-soft">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                免费加入，扫码即可联系
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="rounded-2xl border border-dashed border-primary/25 bg-white/80 p-3 shadow-sm">
                {/* 后续将 src 替换为真实二维码图片，例如 /qrcode-community.png */}
                <img
                  src={QR_PLACEHOLDER}
                  alt={`${title}二维码`}
                  width={200}
                  height={200}
                  className="h-[200px] w-[200px]"
                />
              </div>
              <p className="mt-3 text-xs text-ink-soft">{qrNote}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mx-auto mb-7 max-w-xl text-center">
          <p className="text-sm font-medium text-primary">社群能带来什么</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">不止是一张二维码</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {COMMUNITY_BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="service-panel service-panel-hover rounded-2xl p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-bold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-soft">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-14 pt-10">
        <div className="service-panel flex flex-col items-center gap-2 rounded-3xl p-7 text-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
          <p className="text-base font-medium text-ink">扫码后按提示加入，社群更容易保持有用</p>
          <p className="max-w-xl text-sm leading-6 text-ink-soft">
            二维码为占位图，正式上线前请替换为真实的家长社群二维码。
          </p>
        </div>
      </section>
    </main>
  );
}
