import { Baby, Loader2 } from "lucide-react";

export const metadata = {
  title: "幼儿园学校库 · WollyNZ",
};

export default function EcePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-sm">
          <Baby className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            幼儿园学校库
          </h1>
          <p className="text-sm text-ink-soft">
            Early Childhood Services · 数据接入中
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-white/50 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-base font-medium text-ink">数据接入中</p>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          幼儿园（早期儿童服务机构）列表与筛选功能正在开发，后续将基于 data.govt.nz 官方数据每日同步。
        </p>
      </div>
    </div>
  );
}
