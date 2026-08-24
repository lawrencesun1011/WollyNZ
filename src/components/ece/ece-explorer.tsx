"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { SchoolFrontend, Filters, SortKey } from "@/lib/types";
import {
  applyFilters,
  applySort,
  applySortEce,
  emptyFilters,
  hasActiveFilters,
} from "@/lib/filters";
import Toolbar from "../schools/toolbar";
import { EceFilterBar } from "./ece-filter-bar";
import { EceCardList } from "./ece-card-list";
import { EceModal } from "./ece-modal";
import { EceCompareBar } from "./ece-compare-bar";
import { EceCompareModal } from "./ece-compare-modal";
import { useFavorites, useCompare } from "@/lib/user-collections";

const EceMap = dynamic(
  () => import("./ece-map").then((m) => m.EceMap),
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

export function EceExplorer({ initialSchools }: { initialSchools: SchoolFrontend[] }) {
  // ECE 数据来自本地 JSON（ece-frontend.json），直接用首屏数据，无需预热层。
  const [schools, setSchools] = useState<SchoolFrontend[]>(initialSchools);

  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [sort, setSort] = useState<SortKey>("eqi");
  const [popupId, setPopupId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { compareIds } = useCompare();
  const { favoriteIds } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [compareView, setCompareView] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => applySortEce(applyFilters(schools, filters), sort),
    [schools, filters, sort]
  );

  const favSet = useMemo(
    () => new Set(favoriteIds.filter((e) => e.kind === "ece").map((e) => e.id)),
    [favoriteIds]
  );
  const base = useMemo(
    () => (favoritesOnly ? filtered.filter((s) => favSet.has(s.id)) : filtered),
    [filtered, favoritesOnly, favSet]
  );

  const flyCities = useMemo(
    () =>
      filters.cities.length
        ? filters.cities
        : filters.suburbs.length
          ? [filters.hotRegion || "Auckland"]
          : [],
    [filters.cities, filters.suburbs, filters.hotRegion]
  );

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

  const fitKey = useMemo(() => {
    if (favoritesOnly) return `fav-${base.length}`;
    return filters.keyword.trim() || undefined;
  }, [favoritesOnly, base.length, filters.keyword]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [inBounds]);

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
      <div className="px-6 py-5 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <EceFilterBar
            schools={schools}
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyFilters())}
            active={hasActiveFilters(filters)}
          />
        </div>
      </div>

      <div className="px-6 pb-8 lg:px-10">
        <main className="mx-auto flex h-[720px] max-w-[1400px] gap-5 overflow-hidden">
          <section className="flex w-full flex-col overflow-hidden rounded-2xl border border-stroke bg-white shadow-sm lg:w-[420px] xl:w-[480px]">
            <div className="shrink-0 border-b border-stroke px-5 py-3">
              <Toolbar
                total={inBounds.length}
                shown={visible.length}
                sort={sort}
                onSort={setSort}
                favoritesOnly={favoritesOnly}
                onToggleFavoritesOnly={setFavoritesOnly}
                favoriteCount={favoriteIds.filter((e) => e.kind === "ece").length}
                eqiDesc
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-3">
              <EceCardList
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

          <section className="hidden min-h-0 flex-1 overflow-hidden rounded-2xl border border-stroke shadow-sm lg:block">
            <EceMap
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
        <EceModal school={detailSchool} onClose={() => setDetailId(null)} />
      )}

      {compareSchools.length > 0 && (
        <EceCompareBar schools={compareSchools} onCompare={() => setCompareView(true)} />
      )}

      {compareView && compareSchools.length >= 2 && (
        <EceCompareModal schools={compareSchools} onClose={() => setCompareView(false)} />
      )}
    </div>
  );
}
