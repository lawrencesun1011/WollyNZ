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
import { levelShape } from "@/lib/filters";
import type { MarkerShape } from "@/lib/filters";
import { cnGender } from "@/lib/labels";
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
  /** 悬停 marker / 卡片时联动高亮 */
  onHover?: (id: string | null) => void;
  /** 打开学校详情（modal） */
  onDetail: (id: string) => void;
  /** 地图视野变化时上报当前范围 [south, west, north, east] */
  onBoundsChange?: (bounds: [number, number, number, number] | null) => void;
  /** 选中的城市（英文），变化后地图自动飞到该区域 */
  flyCities?: string[];
  /** 搜索词（非空且变化时）：按当前 schools（=搜索结果）范围自适应缩放 */
  fitSearchKey?: string;
}

/* ── 学段年级范围（与学校卡片保持一致） ── */
function levelYears(level: string): string {
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

/* ── 生成内联 SVG marker（对齐原项目 pinSvg 第509-524行） ── */
function pinSvg(shape: MarkerShape, color: string): string {
  let inner = "";
  if (shape === "circle") {
    inner = `<circle class="shape" cx="9" cy="9" r="6.2" fill="${color}"/>`;
  } else if (shape === "diamond") {
    inner = `<polygon class="shape" points="9,1.8 16.2,9 9,16.2 1.8,9" fill="${color}"/>`;
  } else if (shape === "square") {
    inner = `<rect class="shape" x="2" y="2" width="14" height="14" rx="3.2" fill="${color}"/>`;
  } else {
    inner = `<polygon class="shape" points="6,1.5 12,1.5 16.6,9 12,16.5 6,16.5 1.4,9" fill="${color}"/>`;
  }
  return `<svg width="26" height="26" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round">${inner}</svg>`;
}

/** 加入心愿单后地图上的标记改为爱心（红色，与卡片 / 心愿单统一） */
function heartSvg(color = "#EF4444"): string {
  const inner = `<path class="shape" d="M12 20.5l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 20.5z" fill="${color}"/>`;
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">${inner}</svg>`;
}

/* ── 图例 SVG（与地图 pin 一致：白描边 + 阴影） ── */
function legendSvg(shape: MarkerShape, color: string): string {
  const svg = pinSvg(shape, color);
  // 注入 drop-shadow 使图例在白色背景上也有立体感（与 .map-pin svg 一致）
  return svg.replace(
    "<svg ",
    '<svg style="filter:drop-shadow(0 1px 3px rgba(31,45,43,0.4))" '
  );
}

/**
 * popup 内容（与学校卡片风格看齐：薄荷 chip tag + House/MapPin 图标 + 三按钮操作区）。
 * MapLibre popup 是纯 DOM，无法用 React 组件，因此与迁移前一样注入 HTML 字符串。
 */
function buildPopupHtml(
  s: SchoolFrontend,
  state: { isFav: boolean; isCompare: boolean }
): string {
  const loc = [s.suburb, s.city].filter(Boolean).join(", ") || s.territorial || "";
  const years = levelYears(s.level);
  const levelLabel = years ? `${s.level}（${years}）` : s.level;
  const tags = [
    `<span class="popup-chip">${esc(s.authorityCN || "")}</span>`,
    `<span class="popup-chip">${esc(levelLabel)}</span>`,
    `<span class="popup-chip">${esc(cnGender(s.gender, s.genderCN))}</span>`,
    `<span class="popup-chip">学生 ${s.roll ?? "—"}</span>`,
    `<span class="popup-chip">EQI ${s.eqi ?? "—"}</span>`,
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

export function SchoolMap({
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
  // 收藏 / 对比全局状态（与卡片、收藏夹浮层同源同步）
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { compareIds, toggleCompare } = useCompare();
  // 当前激活的底图（默认街道，与初始化一致）
  const [baseLayer, setBaseLayer] = useState<BaseLayerName>("街道");
  // 地图 style 是否已加载完成（加载完成后才允许 fitBounds / 聚合）
  const [loaded, setLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  // 全部 marker（无论当前是否挂在地图上）
  const markersRef = useRef<Record<string, MapLibreMarker>>({});
  // 当前筛选结果的点位（[lng, lat]）
  const pointsRef = useRef<MapPoint[]>([]);
  const pointByIdRef = useRef<Record<string, [number, number]>>({});
  const schoolByIdRef = useRef<Record<string, SchoolFrontend>>({});
  // 当前已挂在地图上的 marker id（普通点 + 聚合模式下的单点）
  const onMapRef = useRef<Set<string>>(new Set());
  // 当前渲染中的聚合气泡
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
  // 搜索自适应：记录上次已应用过的搜索词（避免 schools 数据替换时重复 fit）
  const lastFitSearchRef = useRef<string>("");
  // 搜索自适应防抖 timer
  const fitSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  // 当前是否启用聚合（基于地图视野内点数，而非全量筛选数）
  const usingClusterRef = useRef<boolean>(false);
  // 标记：本次 activeId 是否由「点击地图上的 marker」触发（而非列表卡片）。
  // 用于聚合模式下区分：地图点点击保持视野；列表卡片点击则强制飞行定位。
  const fromMapClickRef = useRef<boolean>(false);
  // 抑制 popup 的 close 事件（程序内部关闭 / 切换 popup 时不清除选中态）
  const suppressingCloseRef = useRef<boolean>(false);
  // spiderfy（摊开重合点）中被临时移位的 marker
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

  // 供 popup 内 HTML 按钮调用的全局回调（MapLibre popup 是纯 HTML，无法用 React onClick）
  useEffect(() => {
    window.__schoolMapActions = {
      detail: (id: string) => onDetailRef.current(id),
      compare: (id: string) => {
        onToggleCompareRef.current(id, "school");
        // 同步更新当前 popup 内的对比按钮视觉（popup 不会自动重渲）
        const btn = document.querySelector(
          `.popup-btn--compare[data-id="${CSS.escape(id)}"]`
        ) as HTMLElement | null;
        if (btn) btn.classList.toggle("is-on");
      },
      favorite: (id: string) => {
        onToggleFavoriteRef.current(id, "school");
        // 同步更新当前 popup 内的收藏按钮视觉
        const btn = document.querySelector(
          `.popup-btn--favorite[data-id="${CSS.escape(id)}"]`
        ) as HTMLElement | null;
        if (!btn) return;
        const wasOn = btn.classList.contains("is-on");
        btn.classList.toggle("is-on");
        // 切换文字：心愿 ↔ 心愿单
        const label = btn.querySelector("span:last-child") as HTMLElement | null;
        if (label) label.textContent = wasOn ? "心愿" : "心愿单";
      },
    };
    return () => {
      delete window.__schoolMapActions;
    };
  }, []);

  /* ────────────────────────────────────────────────────────────
     内部工具：以下函数只读取 ref，因此被「仅执行一次」的 effect
     捕获旧闭包也依然正确。
     ──────────────────────────────────────────────────────────── */

  const clearClusters = () => {
    for (const m of Array.from(clusterMarkersRef.current.values())) m.remove();
    clusterMarkersRef.current.clear();
  };

  /** 把 spiderfy 时被移位的 marker 还原到真实坐标 */
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

  /** 保证当前选中项在聚合模式下也能显示（对应迁移前把 marker 从聚合组移到普通层） */
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
    // 点击的已是当前高亮学校：保持 popup 打开，不重建（对应迁移前的重复点行为）
    if (popupIdRef.current === s.id) return;
    closePopup();

    const isFav = favoriteIdsRef.current.some(
      (e) => e.id === s.id && e.kind === "school"
    );
    const isCompare = compareIdsRef.current.includes(s.id);

    suppressingCloseRef.current = true;
    const popup = new MapLibrePopup({
      closeButton: true,
      // 关闭时机由 map 的 click 处理统一控制，避免"popup 刚弹出就被 map click 关闭"
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
      // 程序内部关闭（切换 popup / 取消选中）不清除选中态
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

  /** 把地图缩放到一组点的范围；单点直接定位（fitBounds 单点会把 zoom 拉到 0） */
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

  /** 聚合簇被点击：缩放到簇的范围；已到最大层级或点完全重合时摊开成环 */
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

  /** spiderfy：把重合的点沿圆周摊开（替代 leaflet.markercluster 的 spiderfyOnMaxZoom） */
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

  /**
   * 统计当前地图视野内的 marker 数量，并据此在聚合 / 普通模式间切换。
   * 聚合阈值按「视野内点数」而非「全量筛选数」判定，这样飞到一个学校附近
   * 时（视野内 <200 点）会展开成普通点，而不是仍被聚合成一个大簇。
   */
  const syncAggregation = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    let bounds;
    try {
      bounds = map.getBounds();
    } catch {
      // 地图尚未完成定位时 getBounds 会抛错，此时跳过
      return;
    }

    unspiderfy();
    clearClusters();

    const inView = pointsRef.current.filter((p) => bounds.contains(p.lngLat));
    const useCluster = inView.length > CLUSTER_THRESHOLD;
    usingClusterRef.current = useCluster;

    if (useCluster) {
      // 聚合模式：先把视野内的点全部收起，再按屏幕距离重算聚合
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
          // 阻止冒泡到 map click，否则气泡点击会被误判为"点空白"
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
      // 普通模式：增量增删，只渲染视野内的 marker（避免每次移动整片重建）
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
        // 街道底图：OpenFreeMap 公共实例（免 key，数据来自 OpenStreetMap），海水已预改色
        style,
        // 先给一个大致的新西兰中心，随后由 flyCities effect 精确 fitBounds
        center: [
          (DEFAULT_NZ_BOUNDS[1] + DEFAULT_NZ_BOUNDS[3]) / 2,
          (DEFAULT_NZ_BOUNDS[0] + DEFAULT_NZ_BOUNDS[2]) / 2,
        ],
        zoom: 5,
        minZoom: 3,
        maxZoom: MAP_MAX_ZOOM,
        scrollZoom: true, // 对应 Leaflet 的 scrollWheelZoom
        dragRotate: false, // 锁定正北，避免旋转后 pin 方向错乱
        attributionControl: { compact: true },
      });
      mapRef.current = m;
      // 缩放控件（对应 Leaflet 默认的 zoomControl，位置同为左上角）
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
        // StrictMode 重挂载可能导致旧 map 已被 remove，确保当前仍是同一个实例
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

      // 点击地图空白处（非 marker / 非 popup 内部）→ 取消当前选中的高亮/弹窗。
      // popup 挂在 map.getContainer() 上，不会冒泡到 canvas 容器；
      // marker 与聚合气泡挂在 canvas 容器上，已各自 stopPropagation。
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

    // 清空上一批 marker / 聚合气泡 / popup
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
      const meta = levelShape(s.level);
      const isFav = favoriteIdsRef.current.some(
        (e) => e.id === s.id && e.kind === "school"
      );
      const el = createPinElement(
        s.id,
        isFav ? heartSvg() : pinSvg(meta.shape, meta.color),
        s.name
      );
      const marker = new MapLibreMarker({ element: el, anchor: "center" })
        .setLngLat([s.lng, s.lat]);

      el.addEventListener("click", (ev) => {
        // 阻止冒泡到 map click，否则 map click 的 closePopup/onSelect(null)
        // 会把刚打开的 popup 立即关掉
        ev.stopPropagation();
        // 记录本次选中来自「点击地图上的 marker」，供 activeId effect 判断是否保持视野
        fromMapClickRef.current = true;
        onSelectRef.current(s.id);
      });
      // 悬停 marker 时联动高亮（地图 pin + 列表卡片）
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

  // 选中城市（点热门地区 / 城市筛选）变化时，地图飞到对应区域
  // 无筛选 / 取消全部时统一回退到固定的新西兰全景框（DEFAULT_NZ_BOUNDS），
  // 避免被 Chatham Islands 等离群点把 fitBounds 撑成"覆盖到南极"的超大视野。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const key = (flyCities || []).join("|");
    // 首次进入强制执行（确保默认视图与后续"取消筛选"完全一致）；
    // 之后仅在 flyCities 语义真正变化时才处理
    if (!firstFlyRef.current && lastFlyKeyRef.current === key) return;
    firstFlyRef.current = false;
    lastFlyKeyRef.current = key;

    map.resize();
    if (!flyCities || flyCities.length === 0) {
      map.fitBounds(nzBoundsLngLat(), { padding: 20 });
      return;
    }
    // 有筛选时按当前结果 fitBounds（schools 已由上级过滤为该城市区域，点位集中）。
    // 本 effect 声明在「渲染标记」effect 之后，pointsRef.current 已是该城市的点位。
    const pts = pointsRef.current.filter((p) =>
      isReasonableNZCoord(p.lngLat[1], p.lngLat[0])
    );
    fitPoints(pts, 13);
  }, [flyCities, loaded]);

  // 搜索自适应：输入搜索词时，地图按当前搜索结果（schools=filtered）的范围
  // 自动缩放/平移到合适位置；清空搜索词后重置，便于再次输入相同词重新定位。
  // 150ms 防抖，避免连续击键时地图反复动画。
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

  // 加入心愿单状态变化时：已渲染的 marker 图标实时切换为爱心 / 还原为原形状
  useEffect(() => {
    for (const s of schools) {
      const m = markersRef.current[s.id];
      if (!m) continue;
      const meta = levelShape(s.level);
      const isFav = favoriteIds.some((e) => e.id === s.id && e.kind === "school");
      updatePinSvg(m, isFav ? heartSvg() : pinSvg(meta.shape, meta.color));
    }
    // 同步当前已打开的 popup 内收藏按钮视觉（处理从收藏夹浮层/卡片等外部
    // 取消收藏的情况：popup 是纯 HTML，不会随全局状态自动重渲）。
    const root = popupRef.current?.getElement();
    if (!root) return;
    const favSet = new Set(
      favoriteIds.filter((e) => e.kind === "school").map((e) => e.id)
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

  // 对比状态变化时：同步当前已打开的 popup 内对比按钮视觉（同上，处理外部切
  // 换对比的情况，避免 popup 按钮卡在旧状态）。
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

  // 悬停高亮：金色描边（地图 pin 与列表卡片双向联动）
  // 同时把被悬停 marker 的容器（.maplibregl-marker）提到最上层，
  // 否则其名称气泡 / 放大后的 pin 会被相邻 marker 遮挡。
  // 注意：必须在「marker 容器」上设 z-index——MapLibre 给 .maplibregl-marker
  // 加了 transform，使其成为独立层叠上下文，子元素 z-index 无法盖过兄弟 marker。
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

  // 点击卡片 / marker 打开详情时：居中跳转 + 放大高亮 + 弹出 popup
  useEffect(() => {
    // 消费来源标记：本次是否由「点击地图上的 marker」触发
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

    // 决定是否移动地图（居中 + 放大到至少 13 级）：
    // 1) 点击地图上的 marker（fromMapClick=true）→ 点已可见，保持视野不动；
    // 2) 点击列表卡片且处于聚合模式（usingCluster=true，点被聚合成簇不可见）
    //    → 强制飞行定位过去，否则用户看不到对应位置；
    // 3) 点击列表卡片且非聚合 → 仅当学校不在当前视野内时才定位，否则保持视野。
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
    // 选中 pin 也提到最上层，避免被相邻 marker 遮挡
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

      {/* ── 底图切换开关（右上角）：街道在前、卫星在后，激活项文字为绿色 ── */}
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

      {/* ── 图例（左下角，对齐原项目 .map-legend） ── */}
      <div className="absolute bottom-4 left-4 z-[500] rounded-2xl bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
        <p className="mb-1.5 text-xs font-semibold text-ink">学段图例</p>
        <div className="flex flex-col gap-1">
          {([
            ["小学", "circle", "#2e7ed4"],
            ["初中", "diamond", "#F59E0B"],
            ["高中", "square", "#8e44ad"],
            ["一贯制", "hexagon", "#9c6b3f"],
          ] as [string, MarkerShape, string][]).map(([label, shape, color]) => (
            <span
              key={label}
              className="flex items-center gap-2 text-xs text-ink-soft"
            >
              <span
                className="flex h-[22px] w-[22px] items-center justify-center"
                dangerouslySetInnerHTML={{
                  __html: legendSvg(shape, color),
                }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
