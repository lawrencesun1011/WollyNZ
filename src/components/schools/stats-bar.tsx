import { School, Building2, Lock, Activity } from "lucide-react";

interface Stats {
  total: number;
  publicCount: number;
  privateCount: number;
  eqiAvg: number;
}

export function StatsBar({ stats }: { stats: Stats }) {
  const items = [
    {
      icon: School,
      label: "学校总数",
      value: stats.total,
      color: "from-primary to-primary-light",
    },
    {
      icon: Building2,
      label: "公立学校",
      value: stats.publicCount,
      color: "from-primary-light to-primary-soft",
    },
    {
      icon: Lock,
      label: "私立学校",
      value: stats.privateCount,
      color: "from-amber-500 to-orange-500",
    },
    {
      icon: Activity,
      label: "平均 EQI",
      value: stats.eqiAvg,
      color: "from-emerald-500 to-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="glass rounded-2xl p-5 shadow-sm">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${it.color} text-white shadow-sm`}
          >
            <it.icon className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-ink">{it.value}</p>
          <p className="text-xs text-ink-soft">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
