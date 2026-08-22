"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { SchoolFrontend, Filters, SortKey } from "@/lib/types";
import {
  applyFilters,
  applySort,
  emptyFilters,
  hasActiveFilters,
} from "@/lib/filters";
import { FilterBar } from "./filter-bar";
import Toolbar from "./toolbar";
import { SchoolCardList } from "./school-card-list";
import { SchoolModal } from "./school-modal";
import { CompareBar } from "./compare-bar";
import { CompareModal } from "./compare-modal";
import { subscribeSchools, getSchoolsSnapshot } from "@/lib/schools-store";
import { useFavorites, useCompare } from "@/lib/user-collections";


const SchoolMap = dynamic(
  () => import("./school-map").then((m) => m.SchoolMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-2xl bg-primary/5 text-sm text-ink-soft">
        地图加载中…
      </div>
    ),
  }
);

const PAGE_SIZE = 60;

export function SchoolsExplorer({
  initialSchools,
  fetchedAt,
}: {
  initialSchools: SchoolFrontend[];
  fetchedAt: string | null;
}) {
  // 首屏本地兜底秒开；PG 数据由全局预热层（布局内 SchoolsPreloader）拉取就绪后无缝替换。
  const [schools, setSchools] = useState<SchoolFrontend[]>(initialSchools);

  useEffect(() => {
    // 若预热层已有数据（同会话命中或跨会话 localStorage 命中），直接采用
    const snap = getSchoolsSnapshot();
    if (snap && snap.length >= initialSchools.length) {
      setSchools(snap);
      return;
    }
    const unsub = subscribeSchools((list) => {
      setSchools((prev) => (list.length >= prev.length ? list : prev));
    });
    return unsub;
  }, [initialSchools]);

  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [sort, setSort] = useState<SortKey>("eqi");
  // 当前在地图上高亮/弹出 popup 的学校（点击地图或卡片触发）
  const [popupId, setPopupId] = useState<string | null>(null);
  // 当前详情页（modal）对应的学校 ID，由卡片"详情"按钮触发
  const [detailId, setDetailId] = useState<string | null>(null);
  const { compareIds } = useCompare();
  const { favoriteIds } = useFavorites();
  // 仅显示心愿单学校开关
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // 是否打开横向对比视图（"查看对比"触发）
  const [compareView, setCompareView] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // 地图当前视野范围 [south, west, north, east]
  const [mapBounds, setMapBounds] = useState<
    [number, number, number, number] | null
  >(null);
  // 列表分页：当前展示数量（每次加 PAGE_SIZE）
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => applySort(applyFilters(schools, filters), sort),
    [schools, filters, sort]
  );

  // 心愿单筛选：仅在开启时，把已筛选结果收敛为收藏学校
  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const base = useMemo(
    () => (favoritesOnly ? filtered.filter((s) => favSet.has(s.id)) : filtered),
    [filtered, favoritesOnly, favSet]
  );

  // 地图飞行目标：普通城市按城市名；奥克兰子区（北岸/中区/东区）携带 hotRegion
  // 以区分三者，确保切换子区时地图重新飞行到对应范围
  const flyCities = useMemo(
    () =>
      filters.cities.length
        ? filters.cities
        : filters.suburbs.length
          ? [filters.hotRegion || "Auckland"]
          : [],
    [filters.cities, filters.suburbs, filters.hotRegion]
  );

  // 搜索时：结果为全局匹配（不受地图范围影响），仍受其它筛选项影响。
  // 未搜索时：仅保留位于地图视野内的学校，使列表与地图保持一致。
  const hasKeyword = filters.keyword.trim() !== "";
  const inBounds = useMemo(() => {
    if (hasKeyword || !mapBounds) return base;
    const [s, w, n, e] = mapBounds;
    return base.filter(
      (sc) =>
        sc.lat != null &&
        sc.lng != null &&
        sc.lat >= s &&
        sc.lat <= n &&
        sc.lng >= w &&
        sc.lng <= e
    );
  }, [base, mapBounds, hasKeyword]);

  // 地图自适应 key：开启心愿单时按收藏学校位置缩放；否则沿用关键词搜索缩放
  const fitKey = useMemo(() => {
    if (favoritesOnly) return `fav-${base.length}`;
    return filters.keyword.trim() || undefined;
  }, [favoritesOnly, base.length, filters.keyword]);

  // 筛选或地图视野变化时，重置分页到首页
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [inBounds]);

  // 选中的 marker 学校可能还在"加载更多"之外，自动展开分页以显示并高亮
  useEffect(() => {
    if (!popupId) return;
    const idx = inBounds.findIndex((s) => s.id === popupId);
    if (idx >= 0 && idx >= visibleCount) {
      setVisibleCount(idx + 1);
    }
  }, [popupId, inBounds, visibleCount]);

  const visible = inBounds.slice(0, visibleCount);
  const detailSchool = detailId ? schools.find((s) => s.id === detailId) || null : null;
  const compareSchools = compareIds
    .map((id) => schools.find((s) => s.id === id))
    .filter(Boolean) as SchoolFrontend[];

  return (
    <div className="min-h-screen bg-bg">
      {/* ── 热门地区 + 筛选栏 ── */}
      <div className="px-6 py-5 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <FilterBar
            schools={schools}
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyFilters())}
            active={hasActiveFilters(filters)}
          />
        </div>
      </div>

      {/* ── 下方：左列表 + 右地图（宽度与上面对齐） ── */}
      <div className="px-6 pb-8 lg:px-10">
        <main className="mx-auto flex h-[720px] max-w-[1400px] gap-5 overflow-hidden">
          {/* 左侧列表 */}
          <section className="flex w-full flex-col overflow-hidden rounded-2xl border border-stroke bg-white shadow-sm lg:w-[420px] xl:w-[480px]">
            <div className="shrink-0 border-b border-stroke px-5 py-3">
              <Toolbar
                total={inBounds.length}
                shown={visible.length}
                sort={sort}
                onSort={setSort}
                favoritesOnly={favoritesOnly}
                onToggleFavoritesOnly={setFavoritesOnly}
                favoriteCount={favoriteIds.length}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-3">
              <SchoolCardList
                schools={visible}
                view="list"
                hoveredId={hoveredId}
                selectedId={popupId}
                onHover={setHoveredId}
                onOpen={setPopupId}
                onDetail={setDetailId}
              />
              {visibleCount < inBounds.length && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((v) => Math.min(v + PAGE_SIZE, inBounds.length))
                    }
                    className="rounded-full border border-stroke bg-white px-5 py-2 text-xs text-ink-soft shadow-sm transition hover:border-primary hover:text-primary"
                  >
                    加载更多 · 剩余 {inBounds.length - visibleCount} 所
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 右侧地图 */}
          <section className="hidden min-h-0 flex-1 overflow-hidden rounded-2xl border border-stroke shadow-sm lg:block">
            <SchoolMap
              schools={base}
              hoveredId={hoveredId}
              activeId={popupId}
              onSelect={setPopupId}
              onHover={setHoveredId}
              onDetail={setDetailId}
              onBoundsChange={setMapBounds}
              flyCities={favoritesOnly ? [] : flyCities}
              fitSearchKey={fitKey}
            />
          </section>
        </main>
      </div>

      {detailSchool && (
        <SchoolModal school={detailSchool} onClose={() => setDetailId(null)} />
      )}

      {compareSchools.length > 0 && (
        <CompareBar schools={compareSchools} onCompare={() => setCompareView(true)} />
      )}

      {compareView && compareSchools.length >= 2 && (
        <CompareModal schools={compareSchools} onClose={() => setCompareView(false)} />
      )}
    </div>
  );
}


