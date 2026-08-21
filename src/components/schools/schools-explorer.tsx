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
  schools,
  fetchedAt,
}: {
  schools: SchoolFrontend[];
  fetchedAt: string | null;
}) {
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [sort, setSort] = useState<SortKey>("eqi");
  // 当前在地图上高亮/弹出 popup 的学校（点击地图或卡片触发）
  const [popupId, setPopupId] = useState<string | null>(null);
  // 当前详情页（modal）对应的学校 ID，由卡片"详情"按钮触发
  const [detailId, setDetailId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
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

  // 仅保留位于地图视野内的学校，使列表与地图保持一致
  const inBounds = useMemo(() => {
    if (!mapBounds) return filtered;
    const [s, w, n, e] = mapBounds;
    return filtered.filter(
      (sc) =>
        sc.lat != null &&
        sc.lng != null &&
        sc.lat >= s &&
        sc.lat <= n &&
        sc.lng >= w &&
        sc.lng <= e
    );
  }, [filtered, mapBounds]);

  // 筛选或地图视野变化时，重置分页到首页
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [inBounds]);

  const visible = inBounds.slice(0, visibleCount);
  const detailSchool = detailId ? schools.find((s) => s.id === detailId) || null : null;
  const compareSchools = compareIds
    .map((id) => schools.find((s) => s.id === id))
    .filter(Boolean) as SchoolFrontend[];

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

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
              <Toolbar total={inBounds.length} shown={visible.length} sort={sort} onSort={setSort} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-3">
              <SchoolCardList
                schools={visible}
                view="list"
                compareIds={compareIds}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onOpen={setPopupId}
                onDetail={setDetailId}
                onToggleCompare={toggleCompare}
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
              schools={filtered}
              hoveredId={hoveredId}
              activeId={popupId}
              onSelect={setPopupId}
              onDetail={setDetailId}
              onToggleCompare={toggleCompare}
              onBoundsChange={setMapBounds}
              flyCities={flyCities}
            />
          </section>
        </main>
      </div>

      {detailSchool && (
        <SchoolModal
          school={detailSchool}
          onClose={() => setDetailId(null)}
          inCompare={compareIds.includes(detailSchool.id)}
          onToggleCompare={toggleCompare}
        />
      )}

      {compareSchools.length > 0 && (
        <CompareBar
          schools={compareSchools}
          onRemove={(id) => toggleCompare(id)}
          onClear={() => setCompareIds([])}
          onCompare={() => setCompareView(true)}
        />
      )}

      {compareView && compareSchools.length >= 2 && (
        <CompareModal
          schools={compareSchools}
          compareIds={compareIds}
          onToggleCompare={toggleCompare}
          onClose={() => setCompareView(false)}
        />
      )}
    </div>
  );
}


