"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ChevronDown } from "lucide-react";
import { useFavorites } from "@/lib/user-collections";
import { FavoritesPopover } from "./favorites-popover";
import { UserMenu } from "./auth/user-menu";

export function SiteHeader() {
  const { favoriteIds } = useFavorites();
  const [favOpen, setFavOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-[800] border-b border-white/40 bg-bg/70 backdrop-blur-xl">
      <div className="px-6 lg:px-10">
        <div className="mx-auto relative flex h-16 max-w-[1400px] items-center justify-center">
          {/* 左侧：Logo */}
          <Link href="/" className="absolute left-0 flex items-center gap-2">
            <Image
              src="/images/brand/goalnz-map-pin.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-contain mix-blend-multiply"
            />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-[#062754]">Goal</span><span className="text-primary">NZ</span>
            </span>
          </Link>

          {/* 中间：导航 */}
          <nav className="flex items-center gap-7">
            <Link
              href="/"
              className="text-base font-medium text-ink-soft transition-colors hover:text-primary"
            >
              首页
            </Link>
            <Link
              href="/guide"
              className="text-base font-medium text-ink-soft transition-colors hover:text-primary"
            >
              游学攻略
            </Link>
            {/* 找学校：下拉包含幼儿园与中小学 */}
            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 text-base font-medium text-ink-soft transition-colors hover:text-primary"
              >
                找学校
                <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute left-1/2 top-full hidden -translate-x-1/2 pt-2 group-hover:block">
                <div className="flex w-36 flex-col overflow-hidden rounded-xl border border-white/60 bg-bg/90 p-1 shadow-lg backdrop-blur-xl">
                  <Link
                    href="/ece"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    幼儿园
                  </Link>
                  <Link
                    href="/schools"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    中小学
                  </Link>
                </div>
              </div>
            </div>
            {/* 找住宿 */}
            <Link
              href="/accommodation"
              className="text-base font-medium text-ink-soft transition-colors hover:text-primary"
            >
              找住宿
            </Link>
            <Link
              href="/community"
              className="text-base font-medium text-ink-soft transition-colors hover:text-primary"
            >
              加入社群
            </Link>
          </nav>

          {/* 右侧：心愿单 + 登录 */}
          <div className="absolute right-0 flex items-center gap-2">
            {/* 心愿单入口：跨页面可见，与卡片 / 地图 popup 同源同步 */}
            <div className="relative">
              <button
                type="button"
                data-fav-trigger
                onClick={() => setFavOpen((v) => !v)}
                aria-label="我的心愿单"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-stroke text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <Heart
                  className={`h-[18px] w-[18px] ${favoriteIds.length ? "fill-[#EF4444] text-[#EF4444]" : ""}`}
                />
                {favoriteIds.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-white">
                    {favoriteIds.length > 99 ? "99+" : favoriteIds.length}
                  </span>
                )}
              </button>
              {favOpen && <FavoritesPopover onClose={() => setFavOpen(false)} />}
            </div>

            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
