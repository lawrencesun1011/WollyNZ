"use client";

import type { SortKey } from "@/lib/types";
import { ArrowUpDown } from "lucide-react";

interface Props {
  total: number;
  shown: number;
  sort: SortKey;
  onSort: (s: SortKey) => void;
}

const SORT_LABELS: Record<SortKey, string> = {
  name: "名称（A–Z）",
  eqi: "EQI（升序）",
  roll: "人数（降序）",
  city: "地区",
};

export default function Toolbar({ total, shown, sort, onSort }: Props) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <p className="text-sm text-ink-soft">
        共 <span className="font-semibold text-ink">{total}</span> 所 · 当前显示{" "}
        <span className="font-semibold text-ink">{shown}</span> / {total}
      </p>

      <div className="flex items-center gap-2">
        <div className="relative flex items-center gap-2 rounded-xl border border-primary/20 bg-white px-3 py-2">
          <ArrowUpDown className="h-4 w-4 text-ink-soft" />
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="bg-transparent text-sm text-ink focus:outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

      </div>
    </div>
  );
}
