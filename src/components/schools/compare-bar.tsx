"use client";

import type { SchoolFrontend } from "@/lib/types";
import { X, GitCompare } from "lucide-react";

interface Props {
  schools: SchoolFrontend[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

export function CompareBar({
  schools,
  onRemove,
  onClear,
  onCompare,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[900] px-4 pb-4">
      <div className="glass mx-auto flex max-w-5xl items-center gap-3 rounded-2xl px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2 text-primary">
          <GitCompare className="h-5 w-5" />
          <span className="hidden text-sm font-semibold sm:inline">
            对比（{schools.length}/4）
          </span>
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto scroll-thin">
          {schools.map((s) => (
            <span
              key={s.id}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1 text-sm text-ink"
            >
              {s.name}
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                aria-label="移除"
                className="text-ink-soft hover:text-error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {schools.length === 0 && (
            <span className="text-sm text-ink-soft">尚未选择学校</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            清空
          </button>
          <button
            type="button"
            disabled={schools.length < 2}
            onClick={onCompare}
            className="rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            查看对比
          </button>
        </div>
      </div>
    </div>
  );
}
