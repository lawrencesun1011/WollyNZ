"use client";

import { useEffect, useState } from "react";
import type { SchoolFrontend } from "@/lib/types";
import { subscribeSchools, getSchoolsSnapshot } from "@/lib/schools-store";
import { useFavorites } from "@/lib/user-collections";
import { Heart, X, MapPin } from "lucide-react";

function useSchoolsList(): SchoolFrontend[] {
  const [list, setList] = useState<SchoolFrontend[]>(() => getSchoolsSnapshot() ?? []);
  useEffect(() => {
    setList(getSchoolsSnapshot() ?? []);
    return subscribeSchools((data) => setList(data ?? []));
  }, []);
  return list;
}

interface Props {
  onClose: () => void;
}

/** 右上角全局收藏夹浮层：跨页面可见，与卡片 / 地图 popup 同源同步。 */
export function FavoritesPopover({ onClose }: Props) {
  const { favoriteIds, removeFavorite, clearFavorites } = useFavorites();
  const schools = useSchoolsList();

  const favSchools = favoriteIds
    .map((id) => schools.find((s) => s.id === id))
    .filter((s): s is SchoolFrontend => Boolean(s));

  // 点击浮层外部关闭
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-fav-popover]") || target.closest("[data-fav-trigger]")) {
        return;
      }
      onClose();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [onClose]);

  return (
    <div
      data-fav-popover
      className="animate-popover absolute right-0 top-[calc(100%+10px)] z-[1100] w-[320px] origin-top-right"
    >
      <div className="glass overflow-hidden rounded-2xl border border-white/60 shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-stroke/70 px-4 py-3">
          <div className="flex items-center gap-2 text-[#EF4444]">
            <Heart className="h-4 w-4 fill-[#EF4444] text-[#EF4444]" />
            <span className="text-sm font-semibold text-ink">我的心愿单（{favSchools.length}）</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 列表 */}
        {favSchools.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Heart className="h-8 w-8 text-[#EF4444]/30" />
            <p className="text-sm text-ink-soft">还没有心愿的学校</p>
            <p className="text-xs text-ink-soft/80">
              在学校卡片或地图弹窗中点击「心愿」即可加入这里
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin p-2">
            {favSchools.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-primary/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {[s.suburb, s.city].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => removeFavorite(s.id)}
                    aria-label="移除心愿"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 text-ink-soft transition-colors hover:bg-error/5 hover:text-error"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部清空 */}
        {favSchools.length > 0 && (
          <div className="border-t border-stroke/70 px-3 py-2">
            <button
              type="button"
              onClick={clearFavorites}
              className="w-full rounded-lg py-2 text-sm text-ink-soft transition-colors hover:bg-error/5 hover:text-error"
            >
              清空心愿单
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
