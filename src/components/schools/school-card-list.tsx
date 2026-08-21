"use client";

import type { SchoolFrontend, ViewMode } from "@/lib/types";
import { SchoolCard } from "./school-card";
import { SearchX } from "lucide-react";

interface Props {
  schools: SchoolFrontend[];
  view: ViewMode;
  compareIds: string[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
  onDetail: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

export function SchoolCardList({
  schools,
  view,
  compareIds,
  hoveredId,
  onHover,
  onOpen,
  onDetail,
  onToggleCompare,
}: Props) {
  if (schools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-white/50 py-20 text-center">
        <SearchX className="h-8 w-8 text-ink-soft" />
        <p className="mt-4 text-base font-medium text-ink">没有符合条件的学校</p>
        <p className="mt-1 text-sm text-ink-soft">
          请调整筛选条件，或清除筛选后重新查找。
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        view === "grid"
          ? "grid gap-4 sm:grid-cols-2"
          : "flex flex-col gap-3"
      }
    >
      {schools.map((s) => (
        <SchoolCard
                      key={s.id}
                      school={s}
                      view={view}
                      inCompare={compareIds.includes(s.id)}
                      hovered={hoveredId === s.id}
                      onHover={onHover}
                      onOpen={onOpen}
                      onDetail={onDetail}
                      onToggleCompare={onToggleCompare}
                    />
      ))}
    </div>
  );
}
