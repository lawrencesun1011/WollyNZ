"use client";

import type { SortKey } from "@/lib/types";
import { ArrowUpDown, Heart } from "lucide-react";

interface Props {
  total: number;
  shown: number;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: (v: boolean) => void;
  favoriteCount: number;
}

const SORT_LABELS: Record<SortKey, string> = {
  name: "名称（A–Z）",
  eqi: "EQI（升序）",
  roll: "人数（降序）",
};

export default function Toolbar({
  total,
  shown,
  sort,
  onSort,
  favoritesOnly,
  onToggleFavoritesOnly,
  favoriteCount,
}: Props) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <p className="text-sm text-ink-soft">
        当前 {shown} / {total}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggleFavoritesOnly(!favoritesOnly)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            favoritesOnly
              ? "border-[#EF4444] bg-[#fef2f2] text-[#EF4444]"
              : "border-primary/20 bg-white text-ink-soft hover:border-primary hover:text-primary"
          }`}
        >
          <Heart className={`h-4 w-4 ${favoritesOnly ? "fill-[#EF4444]" : ""}`} />
          心愿单
          {favoriteCount > 0 && (
            <span className={favoritesOnly ? "text-[#EF4444]" : "text-ink-soft"}>
              ({favoriteCount})
            </span>
          )}
        </button>

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
