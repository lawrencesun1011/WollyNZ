"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  NavigationControl,
  Popup as MapLibrePopup,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SchoolFrontend } from "@/lib/types";
import { eceTypeCN, eceAuthStyle, eceEqiShort } from "@/lib/filters";
import { useFavorites, useCompare } from "@/lib/user-collections";
import {
  BASE_STYLES,
  CLUSTER_THRESHOLD,
  DEFAULT_NZ_BOUNDS,
  MAP_MAX_ZOOM,
  SVG_CHECK,
  SVG_FAV,
  SVG_HOUSE,
  SVG_MAPPIN,
  computeScreenClusters,
  createClusterElement,
  createPinElement,
  esc,
  installMissingImageFallback,
  isReasonableNZCoord,
  nzBoundsLngLat,
  updatePinSvg,
  getStreetStyle,
  type BaseLayerName,
  type MapPoint,
  type ScreenCluster,
} from "@/lib/maplibre-shared";

interface Props {
  schools: SchoolFrontend[];
  hoveredId: string | null;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onHover?: (id: string | null) => void;
  onDetail: (id: string) => void;
  onBoundsChange?: (bounds: [number, number, number, number] | null) => void;
  flyCities?: string[];
  fitSearchKey?: string;
}

// ECE marker：按办学性质区分形状与颜色（私立蓝圆 / 公立紫方）
// 几何与中小学 pinSvg 完全一致（viewBox 18×18、26px、白描边 1.6），保证尺寸统一
function circleSvg(color: string): string {
  return `<svg width="26" height="26" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"><circle class="shape" cx="9" cy="9" r="6.2" fill="${color}"/></svg>`;
}
function squareSvg(color: string): string {
  return `<svg width="26" height="26" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"><rect class="shape" x="2" y="2" width="14" height="14" rx="3.2" fill="${color}"/></svg>`;
}
function authMarkSvg(authorityCN: string | undefined): string {
  const { color, shape } = eceAuthStyle(authorityCN);
  return shape === "circle" ? circleSvg(color) : squareSvg(color);
}
function legendMarkSvg(color: string, shape: "circle" | "square"): string {
  const svg = shape === "circle" ? circleSvg(color) : squareSvg(color);
  return svg.replace(
    "<svg ",
    '<svg style="filter:drop-shadow(0 1px 3px rgba(31,45,43,0.4))" '
  );
}

/** 加入心愿单后地图上的标记改为爱心（红色，与卡片 / 心愿单统一） */
function heartSvg(color = "#EF4444"): string {
  const inner = `<path class="shape" d="M12 20.5l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 20.5z" fill="${color}"/>`;
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">${inner}</svg>`;
}

/** popup 内容（MapLibre popup 是纯 DOM，与迁移前一样注入 HTML 字符串） */
function buildPopupHtml(
  s: SchoolFrontend,
  state: { isFav: boolean; isCompare: boolean }
): string {
  const loc = [s.suburb, s.city].filter(Boolean).join(", ") || s.territorial || "";
  const tags = [
    `<span class="popup-chip">${esc(s.authorityCN || "")}</span>`,
    `<span class="popup-chip">${esc(eceTypeCN(s.type))}</span>`,
    `<span class="popup-chip">学生 ${s.roll ?? "—"}</span>`,
    `<span class="popup-chip">EQI ${eceEqiShort(s.eqi)}</span>`,
  ].join("");
  return `<div class="popup-card">
      <div class="popup-card__head"><i class="popup-ic popup-ic--title">${SVG_HOUSE}</i><span class="popup-card__title">${esc(
        s.name
      )}</span></div>
      <div class="popup-card__loc"><i class="popup-ic popup-ic--loc">${SVG_MAPPIN}</i><span>${esc(
        loc || "—"
      )}</span></div>
      <div class="popup-card__tags">${tags}</div>
      <div class="popup-card__actions">
        <button type="button" class="popup-btn popup-btn--favorite${
          state.isFav ? " is-on" : ""
        }" data-id="${esc(s.id)}" onclick="window.__schoolMapActions.favorite('${
    s.id
  }')"><i class="popup-ic popup-ic--fav">${SVG_FAV}</i><span>${
    state.isFav ? "心愿单" : "心愿"
  }</span></button>
        <button type="button" class="popup-btn popup-btn--solid" onclick="window.__schoolMapActions.detail('${esc(
          s.id
        )}')">详情</button>
        <button type="button" class="popup-btn popup-btn--compare${
          state.isCompare ? " is-on" : ""
        }" data-id="${esc(
    s.id
  )}" onclick="window.__schoolMapActions.compare('${esc(
    s.id
  )}')"><span class="popup-check"><i class="popup-ic">${SVG_CHECK}</i></span><span>对比</span></button>
      </div>
    </div>`;
}

export function EceMap({
  schools,
  hoveredId,
  activeId,
  onSelect,
  onHover,
  onDetail,
  onBoundsChange,
  flyCities,
  fitSearchKey,
}: Props) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { compareIds, toggleCompare } = useCompare();
  const [baseLayer, setBaseLayer] = useState<BaseLayerName>("街道");
  const [loaded, setLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const markersRef = useRef<Record<string, MapLibreMarker>>({});
  const pointsRef = useRef<MapPoint[]>([]);
  const pointByIdRef = useRef<Record<string, [number, number]>>({});
  const schoolByIdRef = useRef<Record<string, SchoolFrontend>>({});
  const onMapRef = useRef<Set<string>>(new Set());
  const clusterMarkersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const popupRef = useRef<MapLibrePopup | null>(null);
  const popupIdRef = useRef<string | null>(null);

  const onSelectRef = useRef(onSelect);
  const onDetailRef = useRef(onDetail);
  const onHoverRef = useRef(onHover);
  const onToggleCompareRef = useRef(toggleCompare);
  const onToggleFavoriteRef = useRef(toggleFavorite);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const compareIdsRef = useRef<string[]>(compareIds);
  const favoriteIdsRef = useRef<{ id: string; kind: "school" | "ece" }[]>(
    favoriteIds
  );

  const firstFlyRef = useRef(true);
  const lastFlyKeyRef = useRef<string>("");
  const lastFitSearchRef = useRef<string>("");
  const fitSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const usingClusterRef = useRef<boolean>(false);
  const fromMapClickRef = useRef<boolean>(false);
  const suppressingCloseRef = useRef<boolean>(false);
  const spiderIdsRef = useRef<string[] | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onDetailRef.current = onDetail;
    onHoverRef.current = onHover;
    onToggleCompareRef.current = toggleCompare;
    onToggleFavoriteRef.current = toggleFavorite;
    onBoundsChangeRef.current = onBoundsChange;
    compareIdsRef.current = compareIds;
    favoriteIdsRef.current = favoriteIds;
  });

  // 供 popup 内 HTML 按钮调用的全局回调
  useEffect(() => {
    window.__schoolMapActions = {
      detail: (id: string) => onDetailRef.current(id),
      compare: (id: string) => {
        onToggleCompareRef.current(id, "ece");
        const btn = document.querySelector(
          `.popup-btn--compare[data-id="${CSS.escape(id)}"]`
        ) as HTMLElement | null;
        if (btn) btn.classList.toggle("is-on");
      },
      favorite: (id: string) => {
        onToggleFavoriteRef.current(id, "ece");
        const btn = document.querySelector(
          `.popup-btn--favorite[data-id="${CSS.escape(id)}"]`
        ) as HTMLElement | null;
        if (!btn) return;
        const wasOn = btn.classList.contains("is-on");
        btn.classList.toggle("is-on");
        const label = btn.querySelector("span:last-child") as HTMLElement | null;
        if (label) label.textContent = wasOn ? "心愿" : "心愿单";
      },
    };
    return () => {
      delete window.__schoolMapActions;
    };
  }, []);

  /* ── 内部工具（只读取 ref，被一次性 effect 捕获也安全） ── */

  const clearClusters = () => {
    for (const m of Array.from(clusterMarkersRef.current.values())) m.remove();
    clusterMarkersRef.current.clear();
  };

  const unspiderfy = () => {
    const ids = spiderIdsRef.current;
    if (!ids) return;
    spiderIdsRef.current = null;
    for (const id of ids) {
      const m = markersRef.current[id];
      const orig = pointByIdRef.current[id];
      if (m && orig) m.setLngLat(orig);
    }
  };

  const ensureActiveOnMap = () => {
    const map = mapRef.current;
    const id = activeIdRef.current;
    if (!map || !id) return;
    const m = markersRef.current[id];
    if (!m || onMapRef.current.has(id)) return;
    m.addTo(map);
    onMapRef.current.add(id);
  };

  const closePopup = () => {
    const p = popupRef.current;
    popupRef.current = null;
    popupIdRef.current = null;
    if (!p) return;
    suppressingCloseRef.current = true;
    try {
      p.remove();
    } finally {
      queueMicrotask(() => {
        suppressingCloseRef.current = false;
      });
    }
  };

  const openPopupFor = (s: SchoolFrontend) => {
    const map = mapRef.current;
    if (!map || s.lat == null || s.lng == null) return;
    if (popupIdRef.current === s.id) return;
    closePopup();

    const isFav = favoriteIdsRef.current.some(
      (e) => e.id === s.id && e.kind === "ece"
    );
    const isCompare = compareIdsRef.current.includes(s.id);

    suppressingCloseRef.current = true;
    const popup = new MapLibrePopup({
      closeButton: true,
      closeOnClick: false,
      closeOnMove: false,
      offset: 14,
      maxWidth: "300px",
      className: "school-popup",
    })
      .setLngLat([s.lng, s.lat])
      .setHTML(buildPopupHtml(s, { isFav, isCompare }))
      .addTo(map);

    popup.on("close", () => {
      if (suppressingCloseRef.current) return;
      popupRef.current = null;
      popupIdRef.current = null;
      onSelectRef.current(null);
    });

    popupRef.current = popup;
    popupIdRef.current = s.id;
    queueMicrotask(() => {
      suppressingCloseRef.current = false;
    });
  };

  const fitPoints = (pts: MapPoint[], maxZoom: number) => {
    const map = mapRef.current;
    if (!map || pts.length === 0) return;
    if (pts.length === 1) {
      map.easeTo({ center: pts[0].lngLat, zoom: maxZoom, duration: 500 });
      return;
    }
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    for (const p of pts) {
      w = Math.min(w, p.lngLat[0]);
      e = Math.max(e, p.lngLat[0]);
      s = Math.min(s, p.lngLat[1]);
      n = Math.max(n, p.lngLat[1]);
    }
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 40, maxZoom }
    );
  };

  const onClusterClick = (c: ScreenCluster) => {
    const map = mapRef.current;
    if (!map) return;
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    for (const p of c.points) {
      w = Math.min(w, p.lngLat[0]);
      e = Math.max(e, p.lngLat[0]);
      s = Math.min(s, p.lngLat[1]);
      n = Math.max(n, p.lngLat[1]);
    }
    const atMaxZoom = map.getZoom() >= MAP_MAX_ZOOM - 0.01;
    if (atMaxZoom || (e - w < 1e-7 && n - s < 1e-7)) {
      spiderfy(c);
      return;
    }
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 60, maxZoom: Math.min(MAP_MAX_ZOOM - 1, 17) }
    );
  };

  const spiderfy = (c: ScreenCluster) => {
    const map = mapRef.current;
    if (!map) return;
    const centerPt = map.project(map.unproject([c.x, c.y]));
    const r = Math.min(30 + c.points.length * 2, 90);
    spiderIdsRef.current = c.points.map((p) => p.id);
    c.points.forEach((p, i) => {
      const m = markersRef.current[p.id];
      if (!m) return;
      const angle = (i / c.points.length) * Math.PI * 2 - Math.PI / 2;
      m.setLngLat(
        map.unproject([
          centerPt.x + Math.cos(angle) * r,
          centerPt.y + Math.sin(angle) * r,
        ])
      );
      m.addTo(map);
      onMapRef.current.add(p.id);
    });
  };

  const syncAggregation = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    let bounds;
    try {
      bounds = map.getBounds();
    } catch {
      return;
    }

    unspiderfy();
    clearClusters();

    const inView = pointsRef.current.filter((p) => bounds.contains(p.lngLat));
    const useCluster = inView.length > CLUSTER_THRESHOLD;
    usingClusterRef.current = useCluster;

    if (useCluster) {
      for (const id of Array.from(onMapRef.current)) {
        markersRef.current[id]?.remove();
        onMapRef.current.delete(id);
      }
      for (const c of computeScreenClusters(map, inView)) {
        if (c.points.length === 1) {
          const p = c.points[0];
          const m = markersRef.current[p.id];
          if (m) {
            m.addTo(map);
            onMapRef.current.add(p.id);
          }
          continue;
        }
        const el = createClusterElement(c.points.length);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const cm = clusterMarkersRef.current.get(c.key);
          if (cm) {
            cm.remove();
            clusterMarkersRef.current.delete(c.key);
          }
          onClusterClick(c);
        });
        const marker = new MapLibreMarker({ element: el, anchor: "center" })
          .setLngLat(map.unproject([c.x, c.y]))
          .addTo(map);
        clusterMarkersRef.current.set(c.key, marker);
      }
    } else {
      const keep = new Set(inView.map((p) => p.id));
      for (const id of Array.from(onMapRef.current)) {
        if (keep.has(id)) continue;
        markersRef.current[id]?.remove();
        onMapRef.current.delete(id);
      }
      for (const p of inView) {
        if (onMapRef.current.has(p.id)) continue;
        markersRef.current[p.id]?.addTo(map);
        onMapRef.current.add(p.id);
      }
    }

    ensureActiveOnMap();
  };

  /* ──────────────────────────────────────────────────────────── */

  // 初始化地图（仅一次）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      // 预拉取并把海水改色的街道样式，使首帧即为天蓝，避免浅蓝闪现
      const style = await getStreetStyle();
      if (cancelled || !containerRef.current) return;

      const m = new MapLibreMap({
        container: containerRef.current,
        style,
        center: [
          (DEFAULT_NZ_BOUNDS[1] + DEFAULT_NZ_BOUNDS[3]) / 2,
          (DEFAULT_NZ_BOUNDS[0] + DEFAULT_NZ_BOUNDS[2]) / 2,
        ],
        zoom: 5,
        minZoom: 3,
        maxZoom: MAP_MAX_ZOOM,
        scrollZoom: true,
        dragRotate: false,
        attributionControl: { compact: true },
      });
      mapRef.current = m;
      m.addControl(new NavigationControl({ showCompass: false }), "top-left");

      // OpenFreeMap liberty 底图 sprite 缺图（sports_centre / atm …）的透明占位，
      // 消除 "Image ... could not be loaded" 控制台警告。
      installMissingImageFallback(m);

      const reportBounds = () => {
        const b = m.getBounds();
        onBoundsChangeRef.current?.([
          b.getSouth(),
          b.getWest(),
          b.getNorth(),
          b.getEast(),
        ]);
      };

      m.on("load", () => {
        if (mapRef.current !== m) return;
        loadedRef.current = true;
        m.resize();
        reportBounds();
        syncAggregation();
        setLoaded(true);
      });

      m.on("moveend", () => {
        if (!loadedRef.current) return;
        reportBounds();
        syncAggregation();
      });

      m.on("click", (e) => {
        if (suppressingCloseRef.current) return;
        const target = e.originalEvent?.target as HTMLElement | null;
        if (target?.closest(".maplibregl-popup, .map-pin-wrap, .map-cluster")) {
          return;
        }
        closePopup();
        onSelectRef.current(null);
      });
    })();

    return () => {
      cancelled = true;
      loadedRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
      pointsRef.current = [];
      pointByIdRef.current = {};
      schoolByIdRef.current = {};
      onMapRef.current.clear();
      clusterMarkersRef.current.clear();
      popupRef.current = null;
      popupIdRef.current = null;
      spiderIdsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 渲染标记（随筛选变化）—— 必须排在「城市飞行」effect 之前：
  // 选城市时 flyCities 与 schools 同批变化，先重建 pointsRef 再让飞行
  // effect 读取到「已过滤到该城市」的点位，否则会基于旧的全量点位缩放。
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearClusters();
    for (const id of Object.keys(markersRef.current)) {
      markersRef.current[id].remove();
    }
    markersRef.current = {};
    onMapRef.current.clear();
    spiderIdsRef.current = null;
    pointByIdRef.current = {};
    schoolByIdRef.current = {};
    closePopup();

    const points: MapPoint[] = [];
    for (const s of schools) {
      if (s.lat == null || s.lng == null) continue;
      const isFav = favoriteIdsRef.current.some(
        (e) => e.id === s.id && e.kind === "ece"
      );
      const el = createPinElement(
        s.id,
        isFav ? heartSvg() : authMarkSvg(s.authorityCN),
        s.name
      );
      const marker = new MapLibreMarker({ element: el, anchor: "center" })
        .setLngLat([s.lng, s.lat]);

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        fromMapClickRef.current = true;
        onSelectRef.current(s.id);
      });
      el.addEventListener("mouseenter", () => onHoverRef.current?.(s.id));
      el.addEventListener("mouseleave", () => onHoverRef.current?.(null));

      markersRef.current[s.id] = marker;
      pointByIdRef.current[s.id] = [s.lng, s.lat];
      schoolByIdRef.current[s.id] = s;
      points.push({ id: s.id, lngLat: [s.lng, s.lat] });
    }

    pointsRef.current = points;
    syncAggregation();
    // 依赖 loaded：地图为异步创建，就绪后需重跑本 effect 才能渲染 marker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools, loaded]);

  // 选中城市变化时飞到对应区域；无筛选时回退到新西兰全景框
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const key = (flyCities || []).join("|");
    if (!firstFlyRef.current && lastFlyKeyRef.current === key) return;
    firstFlyRef.current = false;
    lastFlyKeyRef.current = key;

    map.resize();
    if (!flyCities || flyCities.length === 0) {
      map.fitBounds(nzBoundsLngLat(), { padding: 20 });
      return;
    }
    // schools 已由上级过滤为该城市区域，点位集中；本 effect 在「渲染标记」
    // effect 之后，pointsRef.current 已是该城市的点位。
    const pts = pointsRef.current.filter((p) =>
      isReasonableNZCoord(p.lngLat[1], p.lngLat[0])
    );
    fitPoints(pts, 13);
  }, [flyCities, loaded]);

  // 搜索自适应（150ms 防抖）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (!fitSearchKey) {
      lastFitSearchRef.current = "";
      return;
    }
    if (lastFitSearchRef.current === fitSearchKey) return;
    if (fitSearchTimerRef.current) clearTimeout(fitSearchTimerRef.current);
    fitSearchTimerRef.current = setTimeout(() => {
      const m = mapRef.current;
      if (!m) return;
      lastFitSearchRef.current = fitSearchKey;
      const pts = pointsRef.current.filter((p) =>
        isReasonableNZCoord(p.lngLat[1], p.lngLat[0])
      );
      if (pts.length === 0) return;
      m.resize();
      fitPoints(pts, 13);
    }, 150);
    return () => {
      if (fitSearchTimerRef.current) clearTimeout(fitSearchTimerRef.current);
    };
  }, [fitSearchKey, schools, loaded]);

  // 心愿单状态变化时：marker 图标切换为爱心 / 还原；并同步 popup 内按钮
  useEffect(() => {
    for (const s of schools) {
      const m = markersRef.current[s.id];
      if (!m) continue;
      const isFav = favoriteIds.some((e) => e.id === s.id && e.kind === "ece");
      updatePinSvg(m, isFav ? heartSvg() : authMarkSvg(s.authorityCN));
    }
    const root = popupRef.current?.getElement();
    if (!root) return;
    const favSet = new Set(
      favoriteIds.filter((e) => e.kind === "ece").map((e) => e.id)
    );
    root
      .querySelectorAll<HTMLElement>(".popup-btn--favorite")
      .forEach((btn: HTMLElement) => {
        const id = btn.dataset.id;
        if (!id) return;
        const isOn = favSet.has(id);
        btn.classList.toggle("is-on", isOn);
        const label = btn.querySelector("span:last-child") as HTMLElement | null;
        if (label) label.textContent = isOn ? "心愿单" : "心愿";
      });
  }, [favoriteIds, schools]);

  // 对比状态变化时：同步 popup 内按钮
  useEffect(() => {
    const root = popupRef.current?.getElement();
    if (!root) return;
    const cmpSet = new Set(compareIds);
    root
      .querySelectorAll<HTMLElement>(".popup-btn--compare")
      .forEach((btn: HTMLElement) => {
        const id = btn.dataset.id;
        if (!id) return;
        btn.classList.toggle("is-on", cmpSet.has(id));
      });
  }, [compareIds]);

  // 悬停高亮：同时把被悬停 marker 的容器（.maplibregl-marker）提到最上层，
  // 否则其名称气泡 / 放大后的 pin 会被相邻 marker 遮挡。
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container
        .querySelectorAll(".map-pin.is-hover")
        .forEach((el) => {
          el.classList.remove("is-hover");
          (el.closest(".maplibregl-marker") as HTMLElement | null)?.style.removeProperty(
            "z-index"
          );
        });
    }
    if (!hoveredId) return;
    const wrap = markersRef.current[hoveredId]?.getElement();
    const pin = wrap?.querySelector(".map-pin");
    if (pin) {
      pin.classList.add("is-hover");
      (wrap?.closest(".maplibregl-marker") as HTMLElement | null)?.style.setProperty(
        "z-index",
        "1000"
      );
    }
  }, [hoveredId]);

  // 选中项变化：居中 + 放大 + 弹 popup
  useEffect(() => {
    const fromMapClick = fromMapClickRef.current;
    fromMapClickRef.current = false;
    activeIdRef.current = activeId;

    containerRef.current
      ?.querySelectorAll(".map-pin.is-active")
      .forEach((el) => {
        el.classList.remove("is-active");
        (el.closest(".maplibregl-marker") as HTMLElement | null)?.style.removeProperty(
          "z-index"
        );
      });

    if (!activeId) {
      closePopup();
      return;
    }

    const map = mapRef.current;
    const m = markersRef.current[activeId];
    const lngLat = pointByIdRef.current[activeId];
    const school = schoolByIdRef.current[activeId];
    if (!map || !m || !lngLat) return;

    if (!fromMapClick) {
      let inView = false;
      try {
        inView = map.getBounds().contains(lngLat);
      } catch {
        inView = false;
      }
      if (usingClusterRef.current || !inView) {
        map.easeTo({
          center: lngLat,
          zoom: Math.max(map.getZoom(), 13),
          duration: 500,
        });
      }
    }

    ensureActiveOnMap();
    if (school) openPopupFor(school);
    const activeWrap = m.getElement();
    activeWrap?.querySelector(".map-pin")?.classList.add("is-active");
    (activeWrap?.closest(".maplibregl-marker") as HTMLElement | null)?.style.setProperty(
      "z-index",
      "1000"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, loaded]);

  // 底图切换（OpenFreeMap 街道 ⇄ Esri 卫星影像）
  async function switchBase(name: BaseLayerName) {
    const map = mapRef.current;
    if (!map || baseLayer === name) return;
    // 切回街道时用已改色的样式对象，避免浅蓝闪现
    const style = name === "街道" ? await getStreetStyle() : BASE_STYLES[name];
    map.setStyle(style);
    setBaseLayer(name);
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute right-3 top-3 z-[100] flex overflow-hidden rounded-full border border-stroke bg-white shadow-sm">
        <button
          type="button"
          onClick={() => switchBase("街道")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/5 ${
            baseLayer === "街道" ? "text-primary" : "text-ink-soft hover:text-primary"
          }`}
        >
          街道
        </button>
        <button
          type="button"
          onClick={() => switchBase("卫星")}
          className={`border-l border-stroke px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/5 ${
            baseLayer === "卫星" ? "text-primary" : "text-ink-soft hover:text-primary"
          }`}
        >
          卫星
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-[500] rounded-2xl bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
        <p className="mb-1.5 text-xs font-semibold text-ink">办学性质图例</p>
        <div className="flex flex-col gap-1">
          {([
            ["私立", "#2e7ed4", "circle"],
            ["公立", "#8e44ad", "square"],
          ] as [string, string, "circle" | "square"][]).map(
            ([label, color, shape]) => (
              <span
                key={label}
                className="flex items-center gap-2 text-xs text-ink-soft"
              >
                <span
                  className="flex h-[22px] w-[22px] items-center justify-center"
                  dangerouslySetInnerHTML={{
                    __html: legendMarkSvg(color, shape),
                  }}
                />
                {label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
