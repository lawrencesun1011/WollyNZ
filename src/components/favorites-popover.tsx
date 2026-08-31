"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import type { SchoolFrontend } from "@/lib/types";
import { subscribeSchools, getSchoolsSnapshot, preloadSchools } from "@/lib/schools-store";
import { getEceSnapshot, loadEceSnapshot } from "@/lib/ece-store";
import { useFavorites } from "@/lib/user-collections";
import { removeFavoritesByKind } from "@/lib/favorites";
import { Heart, X, MapPin, GraduationCap } from "lucide-react";

function useSchoolsList(): SchoolFrontend[] {
  // 浮层打开时若学校数据尚未加载（如停留在 /ece、/my-applications 等页面），
  // 主动预拉取，确保中小学心愿项能反查到名称，避免只显示数字。
  // 数据就绪后由外部 store 的订阅通知组件更新，故此处不再 setState。
  useEffect(() => {
    if (!getSchoolsSnapshot()) {
      void preloadSchools();
    }
  }, []);
  // 直接订阅全局学校库：首帧即为真实值，避免「先空后填充」的级联渲染
  return useSyncExternalStore(
    subscribeSchools,
    () => getSchoolsSnapshot() ?? [],
    () => []
  );
}

interface Props {
  onClose: () => void;
}

type FavoriteKind = "school" | "ece";

/** 右上角全局收藏夹浮层：跨页面可见，与卡片 / 地图 popup 同源同步。
 *  按数据来源（中小学 / 幼儿园）分两个子模块分别管理。 */
export function FavoritesPopover({ onClose }: Props) {
  const { favoriteIds, removeFavorite } = useFavorites();
  const schools = useSchoolsList();
  const [eceSchools, setEceSchools] = useState<SchoolFrontend[]>(() => getEceSnapshot() ?? []);
  const router = useRouter();

  // 浮层打开时按需拉取并缓存 ECE 数据，用于反查心愿项名称
  useEffect(() => {
    let alive = true;
    if (!getEceSnapshot()) {
      void loadEceSnapshot().then((data) => {
        if (alive) setEceSchools(data ?? []);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  const schoolById = new Map(schools.map((s) => [s.id, s]));
  const eceById = new Map(eceSchools.map((s) => [s.id, s]));

  const sections: { kind: FavoriteKind; label: string; byId: Map<string, SchoolFrontend> }[] = [
    { kind: "ece", label: "幼儿园", byId: eceById },
    { kind: "school", label: "中小学", byId: schoolById },
  ];

  const total = favoriteIds.length;

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

  const goApply = (kind: FavoriteKind) => {
    router.push(`/apply?category=${kind}`);
    onClose();
  };

  return (
    <div
      data-fav-popover
      className="animate-popover absolute right-0 top-[calc(100%+10px)] z-[1100] w-[340px] origin-top-right"
    >
      <div className="glass overflow-hidden rounded-2xl border border-white/60 shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-stroke/70 px-4 py-3">
          <div className="flex items-center gap-2 text-[#EF4444]">
            <Heart className="h-4 w-4 fill-[#EF4444] text-[#EF4444]" />
            <span className="text-sm font-semibold text-ink">我的心愿单（{total}）</span>
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

        {/* 列表（按来源分两个子模块） */}
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Heart className="h-8 w-8 text-[#EF4444]/30" />
            <p className="text-sm text-ink-soft">还没有心愿的学校</p>
            <p className="text-xs text-ink-soft/80">
              在学校卡片或地图弹窗中点击「心愿」即可加入这里
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scroll-thin p-2">
            {sections.map(({ kind, label, byId }) => {
              const entries = favoriteIds.filter((e) => e.kind === kind);
              if (entries.length === 0) return null;
              const items = entries
                .map((e) => byId.get(e.id))
                .filter((s): s is SchoolFrontend => Boolean(s));
              return (
                <div key={kind} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between rounded-md bg-ink/5 px-2 py-1.5">
                    <p className="text-sm font-bold text-ink">{label}（{entries.length}）</p>
                    <button
                      type="button"
                      onClick={() => removeFavoritesByKind(kind)}
                      className="rounded-md px-2 py-0.5 text-xs text-ink-soft transition-colors hover:bg-error/5 hover:text-error"
                    >
                      清空
                    </button>
                  </div>
                  <div className="flex flex-col">
                    {items.map((s) => (
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
                            onClick={() => removeFavorite(s.id, kind)}
                            aria-label="移除心愿"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 text-ink-soft transition-colors hover:bg-error/5 hover:text-error"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => goApply(kind)}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    去申请（{entries.length}）
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
