"use client";

import type { SchoolFrontend } from "@/lib/types";
import { ethnicTotals } from "@/lib/filters";

export function EthnicBar({ school }: { school: SchoolFrontend }) {
  const rows = ethnicTotals(school);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-ink-soft">{r.label}</span>
            <span className="font-medium text-ink">{r.pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${r.pct}%`,
                backgroundColor: r.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
