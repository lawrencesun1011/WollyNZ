"use client";

import type { SchoolFrontend } from "@/lib/types";
import { X, GitCompare } from "lucide-react";
import { useCompare } from "@/lib/user-collections";
import { buttonCls } from "@/components/form-ui";

interface Props {
  schools: SchoolFrontend[];
  onCompare: () => void;
}

export function CompareBar({ schools, onCompare }: Props) {
  const { removeCompare, clearCompare } = useCompare();
  return (
    <div className="fixed inset-x-0 bottom-0 z-(--z-header) px-4 pb-4">
      <div className="glass mx-auto flex max-w-5xl items-center gap-3 rounded-surface px-4 py-3 shadow-md">
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
                onClick={() => removeCompare(s.id)}
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
            onClick={() => clearCompare("school")}
            className={buttonCls("ghost", "sm")}
          >
            清空
          </button>
          <button
            type="button"
            disabled={schools.length < 2}
            onClick={onCompare}
            className={buttonCls("primary", "sm")}
          >
            查看对比
          </button>
        </div>
      </div>
    </div>
  );
}
