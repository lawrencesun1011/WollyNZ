import Image from "next/image";
import { CheckCircle2, HeartHandshake, MessageCircle, Sparkles, Users } from "lucide-react";

export const metadata = {
  title: "加入社群 · GoalNZ",
};


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
              <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white p-3 shadow-sm">
                <Image
                  src="/images/community/wechat-qrcode.png"
                  alt={`${title}二维码`}
                  width={200}
                  height={200}
                  className="h-[200px] w-[200px]"
                />
              </div>
              <p className="mt-3 text-xs font-medium text-ink">{qrNote}</p>
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
          <p className="text-base font-medium text-ink">扫码后按提示加入</p>
          <p className="max-w-xl text-sm leading-6 text-ink-soft">
            如果扫码失败，请刷新页面或联系我们。
          </p>
        </div>
      </section>
    </main>
  );
}
