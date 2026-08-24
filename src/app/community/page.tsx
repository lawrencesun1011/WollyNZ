import { MessageCircle, Users } from "lucide-react";

export const metadata = {
  title: "加入社群 · WollyNZ",
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
    desc: "扫码加入 WollyNZ 家长社群，和正在为孩子选校的爸妈们一起交流择校经验、学区动态与游学攻略，第一时间获取学校库更新提醒。",
    qrNote: "长按或扫码加入社群",
  },
  {
    icon: MessageCircle,
    title: "在线客服",
    desc: "有任何关于学校查询、数据纠错或网站使用的疑问，扫码联系我们的在线客服，工作日通常会在数小时内回复。",
    qrNote: "扫码联系客服",
  },
];

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-sm">
          <Users className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">加入社群</h1>
          <p className="text-sm text-ink-soft">
            Community &amp; Support · 扫码联系我们
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {CARDS.map(({ icon: Icon, title, desc, qrNote }) => (
          <div
            key={title}
            className="flex flex-col items-center rounded-2xl border border-border bg-white p-8 text-center shadow-sm"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{desc}</p>

            <div className="mt-6 rounded-xl border border-dashed border-primary/20 bg-white p-3">
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
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-ink-soft">
        二维码为占位图，正式上线前请替换为真实的社群 / 客服二维码。
      </p>
    </div>
  );
}
