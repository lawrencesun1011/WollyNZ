"use client";

import type { SchoolFrontend } from "@/lib/types";
import { EceDetailCard } from "./ece-modal";
import { X, GitCompare, Trash2 } from "lucide-react";
import { useCompare } from "@/lib/user-collections";

interface Props {
  schools: SchoolFrontend[];
  onClose: () => void;
}

export function EceCompareModal({ schools, onClose }: Props) {
  const { removeCompare } = useCompare();
  return (
    <div
      className="animate-overlay fixed inset-0 z-[1000] flex flex-col bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b border-stroke bg-white/95 px-6 py-4 backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-primary">
          <GitCompare className="h-5 w-5" />
          <span className="text-base font-semibold">
            幼儿园对比（{schools.length}/4）
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-x-auto p-6 scroll-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-full w-max items-stretch gap-5">
          {schools.map((s) => (
            <div
              key={s.id}
              className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
            >
              <EceDetailCard
                school={s}
                noWrapTitle
                closeButton={
                  <button
                    type="button"
                    onClick={() => removeCompare(s.id)}
                    aria-label="移出对比"
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                }
              />
            </div>
          ))}
          {schools.length === 0 && (
            <div className="flex h-full items-center text-sm text-ink-soft">
              尚未选择幼儿园
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
