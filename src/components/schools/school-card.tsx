"use client";

import type { SchoolFrontend } from "@/lib/types";
import { cnGender } from "@/lib/labels";
import { MapPin, Home, Check, Star } from "lucide-react";
import { useFavorites, useCompare } from "@/lib/user-collections";

interface Props {
  school: SchoolFrontend;
  view: "grid" | "list";
  hovered: boolean;
  onHover: (id: string | null) => void;
  /** 点击卡片或"详情"外的区域时打开地图 popup */
  onOpen: (id: string) => void;
  /** 点击"详情"按钮时打开详情页（modal） */
  onDetail: (id: string) => void;
}

function levelYears(level: string) {
  switch (level) {
    case "小学":
      return "1-6 年级";
    case "初中":
      return "7-8 年级";
    case "高中":
      return "9-13 年级";
    case "贯通制":
      return "1-13 年级";
    default:
      return "";
  }
}

export function SchoolCard({
  school,
  view,
  hovered,
  onHover,
  onOpen,
  onDetail,
}: Props) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { compareIds, toggleCompare } = useCompare();
  const inFavorite = favoriteIds.includes(school.id);
  const inCompare = compareIds.includes(school.id);
  const location = [school.suburb, school.city].filter(Boolean).join(", ");
  const years = levelYears(school.level);

  const cardBody = (
    <>
      {/* 标题 */}
      <div className="flex items-start gap-2.5">
        <Home className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <h3 className="line-clamp-2 text-base font-semibold text-ink">
          {school.name}
        </h3>
      </div>

      {/* 地址 */}
      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{location || "—"}</span>
      </div>

      {/* 标签 */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <span className="chip bg-primary/8 text-primary">
          {school.authorityCN}
        </span>
        <span className="chip bg-primary/8 text-primary">
          {school.level}
          {years && `（${years}）`}
        </span>
        <span className="chip bg-primary/8 text-primary">
          {cnGender(school.gender, school.genderCN)}
        </span>
        <span className="chip bg-primary/8 text-primary">
          学生 {school.roll ?? "—"}
        </span>
        <span className="chip bg-primary/8 text-primary">
          EQI {school.eqi ?? "—"}
        </span>
      </div>
    </>
  );

  return (
    <article
      onClick={() => onOpen(school.id)}
      onMouseEnter={() => onHover(school.id)}
      onMouseLeave={() => onHover(null)}
      className={`group flex cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        hovered ? "border-primary ring-1 ring-primary/30" : "border-primary/10"
      } ${view === "list" ? "flex-row items-center gap-4" : "flex-col gap-4"}`}
    >
      <div className={view === "list" ? "min-w-0 flex-1" : ""}>
        {cardBody}
      </div>

      {/* 操作区 */}
      <div
        className={`shrink-0 ${
          view === "list"
            ? "flex w-20 flex-col gap-1.5"
            : "mt-auto flex w-full items-center gap-2"
        }`}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleFavorite(school.id); }}
          className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
            inFavorite
              ? "border-amber-400 bg-amber-50 text-amber-500"
              : "border-primary/20 bg-white text-ink-soft hover:bg-primary/5 hover:text-primary"
          } ${view === "list" ? "h-9 w-full" : "flex-1 px-3 py-2"}`}
        >
          <Star className={`h-3.5 w-3.5 ${inFavorite ? "fill-amber-400" : ""}`} />
          <span>{inFavorite ? "已收藏" : "收藏"}</span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDetail(school.id); }}
          className={`inline-flex items-center justify-center rounded-lg bg-primary text-xs font-medium text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md ${
            view === "list" ? "h-9 w-full" : "flex-1 px-3 py-2"
          }`}
        >
          详情
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleCompare(school.id); }}
          className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
            inCompare
              ? "border-primary bg-primary/5 text-primary"
              : "border-primary/20 bg-white text-ink-soft hover:bg-primary/5 hover:text-primary"
          } ${view === "list" ? "h-9 w-full" : "flex-initial"}`}
        >
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
              inCompare
                ? "border-primary bg-primary text-white"
                : "border-ink-soft/30"
            }`}
          >
            {inCompare && <Check className="h-2.5 w-2.5" />}
          </span>
          对比
        </button>
      </div>
    </article>
  );
}
