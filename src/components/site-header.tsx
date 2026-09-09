"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Heart, LambMark } from "@/components/editorial/icons";
import { useFavorites } from "@/lib/user-collections";
import { FavoritesPopover } from "./favorites-popover";
import { UserMenu } from "./auth/user-menu";

/** 顶部导航：编辑刊物风（纸色实底 + 衬线品牌字 + 细分隔线）。
 *
 *  与参考稿一致的两层结构：
 *  外层 = 固定、居中的 1440 上限容器（对应参考的 .site-shell）；
 *  内层 = .page-width（相对 1440 容器再内缩 44px）并承载下边框。
 *  因此宽屏下边框距视口边缘 = (视口 - 1440)/2 + 22px，不会顶到头。
 *  收藏与账户沿用站点现有的 FavoritesPopover / UserMenu，仅换外观。 */
export function SiteHeader() {
  const { favoriteIds } = useFavorites();
  const [favOpen, setFavOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="editorial fixed inset-x-0 top-0 z-[900] mx-auto w-full max-w-[1440px]">
      <div className="site-header page-width flex items-center justify-between border-b border-[#789491]">
        {/* 左侧：小羊标志 + 衬线品牌字 */}
        <Link
          href="/"
          className="brand inline-flex shrink-0 items-center"
          aria-label="GoalNZ 首页"
        >
          <LambMark />
          <span>GoalNZ</span>
        </Link>

        {/* 中间：主导航 */}
        <nav aria-label="主导航" className="main-nav flex items-center">
          <Link
            href="/"
            className="nav-link"
            data-active={isActive("/")}
            aria-current={isActive("/") ? "page" : undefined}
          >
            首页
          </Link>
          <Link
            href="/guide"
            className="nav-link"
            data-active={isActive("/guide")}
            aria-current={isActive("/guide") ? "page" : undefined}
          >
            游学攻略
          </Link>

          {/* 找学校：下拉包含幼儿园与中小学 */}
          <div className="group relative">
            <button
              type="button"
              className="nav-link inline-flex items-center gap-1"
              data-active={isActive("/schools") || isActive("/ece")}
            >
              找学校
              <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
            </button>
            <div className="absolute left-1/2 top-full hidden -translate-x-1/2 pt-2 group-hover:block group-focus-within:block">
              <div className="flex w-36 flex-col overflow-hidden rounded-[7px] border border-[#789491] bg-[#f9f6f0] p-1 shadow-lg">
                <Link
                  href="/ece"
                  className="rounded-[5px] px-3 py-2 text-sm font-medium transition-colors hover:bg-[#eeeede]"
                >
                  幼儿园
                </Link>
                <Link
                  href="/schools"
                  className="rounded-[5px] px-3 py-2 text-sm font-medium transition-colors hover:bg-[#eeeede]"
                >
                  中小学
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/accommodation"
            className="nav-link"
            data-active={isActive("/accommodation")}
            aria-current={isActive("/accommodation") ? "page" : undefined}
          >
            找住宿
          </Link>
          <Link
            href="/community"
            className="nav-link"
            data-active={isActive("/community")}
            aria-current={isActive("/community") ? "page" : undefined}
          >
            加入社群
          </Link>
        </nav>

        {/* 右侧：心愿单 + 账户 */}
        <div className="account-actions flex shrink-0 items-center gap-3">
          <div className="relative">
            <button
              type="button"
              data-fav-trigger
              onClick={() => setFavOpen((v) => !v)}
              aria-label="我的心愿单"
              aria-expanded={favOpen}
              className="icon-button"
            >
              <Heart
                className={favoriteIds.length ? "fill-[#b44427] text-[#b44427]" : ""}
              />
              {favoriteIds.length > 0 && (
                <span className="icon-button-badge">
                  {favoriteIds.length > 99 ? "99+" : favoriteIds.length}
                </span>
              )}
            </button>
            {favOpen && <FavoritesPopover onClose={() => setFavOpen(false)} />}
          </div>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
