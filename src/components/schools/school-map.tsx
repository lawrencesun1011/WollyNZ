"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { SchoolFrontend } from "@/lib/types";
import { levelShape } from "@/lib/filters";
import type { MarkerShape } from "@/lib/filters";
import { cnGender } from "@/lib/labels";
import { useFavorites, useCompare } from "@/lib/user-collections";

// Leaflet popup 是纯 HTML，无法用 React 组件。
// 这里把卡片用到的 4 个 lucide 图标以 inline SVG 形式注入，保持视觉一致。
// path 取自 lucide-react@0.400（24x24 viewBox，stroke 渲染）。
const SVG_HOUSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
const SVG_MAPPIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const SVG_EXTERNAL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
const SVG_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const SVG_FAV =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

function esc(s: string): string {
  // HTML 字符串里插值的简单转义，避免学校名/地址含特殊字符破坏 HTML
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

const CLUSTER_THRESHOLD = 200;

// 新西兰全景框（含 Northland 到 Stewart Island），用于默认/取消筛选时的视野，
// 刻意不包 Chatham Islands 等离群点，避免视野被撑大到覆盖南极。
const DEFAULT_NZ_BOUNDS: [number, number, number, number] = [
  -47.5, 166.0, -34.0, 178.5,
];

// 坐标合理性校验：过滤掉 Chatham Islands 等离群点（lng < 165 或 lng > 185 或 lat > -33），
// 避免.fitBounds 被撑成全球视图（低 zoom 下墨卡托投影世界地图水平重复 = "地图复制"）。
function isReasonableNZCoord(lat: number, lng: number): boolean {
  return lat >= -50 && lat <= -33 && lng >= 165 && lng <= 185;
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
  return svg.replace('<svg ', '<svg style="filter:drop-shadow(0 1px 3px rgba(31,45,43,0.4))" ');
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
  const [baseLayer, setBaseLayer] = useState<"街道" | "卫星">("街道");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const plainLayerRef = useRef<L.LayerGroup | null>(null);
  const clusterLayerRef = useRef<ReturnType<typeof L.markerClusterGroup> | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const baseLayersRef = useRef<Record<string, L.LayerGroup> | null>(null);
  const onSelectRef = useRef(onSelect);
  const onDetailRef = useRef(onDetail);
  const onHoverRef = useRef(onHover);
  const onToggleCompareRef = useRef(toggleCompare);
  const onToggleFavoriteRef = useRef(toggleFavorite);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const firstFlyRef = useRef(true);
  const lastFlyKeyRef = useRef<string>("");
  // 搜索自适应：记录上次已应用过的搜索词（避免 schools 数据替换时重复 fit）
  const lastFitSearchRef = useRef<string>("");
  // 搜索自适应防抖 timer
  const fitSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  // 当前是否启用聚合（基于地图视野内点数，而非全量筛选数）
  const usingClusterRef = useRef<boolean>(false);
  // 标记：marker click 处理流程中（含 Leaflet 同步触发 popupclose），
  // 用于 popupclose 区分"用户主动关"与"marker 切换"，避免误清高亮
  const markerClickInProgressRef = useRef<boolean>(false);
  // 标记：本次 activeId 是否由"点击地图上的 marker"触发（而非列表卡片）。
  // 用于聚合模式下区分：地图点点击保持视野；列表卡片点击则强制飞行定位。
  const fromMapClickRef = useRef<boolean>(false);
  // 同步当前对比列表，供 popupopen 监听同步 popup 按钮视觉
  const compareIdsRef = useRef<string[]>(compareIds);
  const favoriteIdsRef = useRef<{ id: string; kind: "school" | "ece" }[]>(favoriteIds);
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

  // 供 popup 内 HTML 按钮调用的全局回调（Leaflet popup 是纯 HTML，无法用 React onClick）
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__schoolMapActions = {
      detail: (id: string) => onDetailRef.current(id),
      compare: (id: string) => {
        onToggleCompareRef.current(id);
        // 同步更新当前 popup 内的对比按钮视觉（Leaflet 不会自动重渲 popup）
        const btn = document.querySelector(
          `.popup-btn--compare[data-id="${CSS.escape(id)}"]`
        ) as HTMLElement | null;
        if (btn) btn.classList.toggle("is-on");
      },
      favorite: (id: string) => {
        onToggleFavoriteRef.current(id, "school");
        // 同步更新当前 popup 内的收藏按钮视觉（Leaflet 不会自动重渲 popup）
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
      delete (window as unknown as Record<string, unknown>).__schoolMapActions;
    };
  }, []);

  // 初始化地图（仅一次）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      wheelPxPerZoomLevel: 80,
      maxZoom: 19,
    });

    // ── 卫星底图组：Esri 影像 + CARTO 透明标注 ──
    const satBase = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      }
    );
    const satLabels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
        attribution:
          "&copy; OpenStreetMap contributors &copy; CARTO",
      }
    );

    // ── 街道底图组：CARTO Voyager（默认） ──
    const streetBase = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      }
    );

    baseLayersRef.current = {
      卫星: L.layerGroup([satBase, satLabels]),
      街道: L.layerGroup([streetBase]).addTo(map),
    };

    plainLayerRef.current = L.layerGroup().addTo(map);
    clusterLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
    }).addTo(map);

    const reportBounds = () => {
      const b = map.getBounds();
      onBoundsChangeRef.current?.([
        b.getSouth(),
        b.getWest(),
        b.getNorth(),
        b.getEast(),
      ]);
    };

    // 等待容器完成布局后再定位，避免 Leaflet 读取到 0 尺寸而变成世界视图
    requestAnimationFrame(() => {
      // StrictMode 重挂载可能导致旧 map 已被 remove，确保当前仍是同一个实例
      if (mapRef.current !== map) return;
      map.invalidateSize();
      // 先定位到默认新西兰全景框，确保 map 已 set center/zoom（否则
      // getBounds/reportBounds 会抛错中断初始化）；后续由 flyCities effect
      // 在默认/取消筛选时复现同一视野
      map.fitBounds(
        L.latLngBounds(
          [DEFAULT_NZ_BOUNDS[0], DEFAULT_NZ_BOUNDS[1]],
          [DEFAULT_NZ_BOUNDS[2], DEFAULT_NZ_BOUNDS[3]],
        ),
        { padding: [20, 20] },
      );
      map.on("moveend", () => {
        reportBounds();
        syncAggregation();
      });
      // 点击地图空白处（非 marker / 非 popup 内部）→ 取消当前选中的高亮/弹窗。
      // marker 的 click 已 stopPropagation，不会到达这里；popup 内部点击（如按钮）
      // 也会被排除，避免"popup 刚弹出就被 map click 关闭"。
      map.on("click", (e: L.LeafletMouseEvent) => {
        const target = e.originalEvent.target as HTMLElement | null;
        if (target?.closest(".leaflet-popup, .map-pin")) return;
        if (markerClickInProgressRef.current) return;
        map.closePopup();
        onSelectRef.current(null);
      });
      // popup 被关闭时清除高亮，但若由 marker 切换/重复点触发（markerClickInProgress 标记）则忽略
      map.on("popupclose", () => {
        if (markerClickInProgressRef.current) return;
        onSelectRef.current(null);
      });
      // 每次 popup 打开时，把当前对比/收藏列表状态同步到 popup 内按钮
      // （覆盖上次手动切换 / 处理从列表卡片点开 popup 的情况）
      map.on("popupopen", (e: L.PopupEvent) => {
        const popup = e.popup as L.Popup & { _content?: string };
        const root = popup.getElement();
        if (!root) return;
        const cmpSet = new Set(compareIdsRef.current);
        root.querySelectorAll<HTMLElement>(".popup-btn--compare").forEach((btn) => {
          const id = btn.dataset.id;
          if (!id) return;
          btn.classList.toggle("is-on", cmpSet.has(id));
        });
        const favSet = new Set(
          favoriteIdsRef.current.filter((e) => e.kind === "school").map((e) => e.id)
        );
        root.querySelectorAll<HTMLElement>(".popup-btn--favorite").forEach((btn) => {
          const id = btn.dataset.id;
          if (!id) return;
          const isOn = favSet.has(id);
          btn.classList.toggle("is-on", isOn);
          const label = btn.querySelector("span:last-child") as HTMLElement | null;
          if (label) label.textContent = isOn ? "心愿单" : "心愿";
        });
      });
      reportBounds();
      syncAggregation();
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 选中城市（点热门地区 / 城市筛选）变化时，地图飞到对应区域
  // 无筛选 / 取消全部时统一回退到固定的新西兰全景框（DEFAULT_NZ_BOUNDS），
  // 避免被 Chatham Islands 等离群点把 fitBounds 撑成"覆盖到南极"的超大视野。
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const key = (flyCities || []).join("|");
    // 首次进入强制执行（确保默认视图与后续"取消筛选"完全一致）；
    // 之后仅在 flyCities 语义真正变化时才处理
    if (!firstFlyRef.current && lastFlyKeyRef.current === key) return;
    firstFlyRef.current = false;
    lastFlyKeyRef.current = key;

    map.invalidateSize();
    const hasCity = !!flyCities && flyCities.length > 0;
    if (!hasCity) {
      // 默认 / 取消全部筛选 → 固定新西兰全景框
      map.fitBounds(L.latLngBounds(
        [DEFAULT_NZ_BOUNDS[0], DEFAULT_NZ_BOUNDS[1]],
        [DEFAULT_NZ_BOUNDS[2], DEFAULT_NZ_BOUNDS[3]],
      ), { padding: [20, 20] });
      return;
    }
    // 有筛选时仍按当前结果 fitBounds（学校已过滤为该城市区域，点集中）
    const pts = schools
      .filter((s) => s.lat != null && s.lng != null && isReasonableNZCoord(s.lat, s.lng))
      .map((s) => [s.lat as number, s.lng as number]);
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts as [number, number][]);
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 13,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyCities]);

  // 搜索自适应：输入搜索词时，地图按当前搜索结果（schools=filtered）的范围
  // 自动缩放/平移到合适位置；清空搜索词后重置，便于再次输入相同词重新定位。
  // 150ms 防抖，避免连续击键时地图反复动画。
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
      const pts = schools
        .filter((s) => s.lat != null && s.lng != null && isReasonableNZCoord(s.lat, s.lng))
        .map((s) => [s.lat as number, s.lng as number]);
      if (pts.length === 0) return;
      m.invalidateSize();
      // 单点 fitBounds 会把 zoom 缩到 0（全球级），因为 bounds 大小为 0；
      // 改用 setView 固定到合理 zoom；多点仍用 fitBounds。
      if (pts.length === 1) {
        m.setView(pts[0] as [number, number], 13);
      } else {
        m.fitBounds(L.latLngBounds(pts as [number, number][]), {
          padding: [40, 40],
          maxZoom: 13,
        });
      }
    }, 150);
    return () => {
      if (fitSearchTimerRef.current) clearTimeout(fitSearchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSearchKey, schools]);

  // 统计当前地图视野内的 marker 数量，并据此在聚合/普通图层间切换。
  // 聚合阈值按"视野内点数"而非"全量筛选数"判定，这样飞到一个学校附近
  // 时（视野内 <200 点）会展开成普通点，而不是仍被聚合成一个大簇。
  const syncAggregation = () => {
    const map = mapRef.current;
    if (!map) return;
    let inView = 0;
    let bounds: L.LatLngBounds;
    try {
      // map 尚未 setView/fitBounds 定位时 getBounds 会抛错，此时跳过
      bounds = map.getBounds();
    } catch {
      return;
    }
    for (const id in markersRef.current) {
      const latLng = markersRef.current[id].getLatLng();
      if (bounds.contains(latLng)) inView++;
    }
    const useCluster = inView > CLUSTER_THRESHOLD;

    if (useCluster) {
      // 聚合模式：把所有 marker 收进 cluster，隐藏 plain 层
      // 若刚进入聚合，才需要把 plain 里的 marker 移回 cluster
      if (!usingClusterRef.current) {
        for (const id in markersRef.current) {
          const m = markersRef.current[id];
          if (plainLayerRef.current?.hasLayer(m)) {
            plainLayerRef.current.removeLayer(m);
            clusterLayerRef.current?.addLayer(m);
          }
        }
        map.removeLayer(plainLayerRef.current!);
        if (!map.hasLayer(clusterLayerRef.current!)) map.addLayer(clusterLayerRef.current!);
      }
    } else {
      // 非聚合模式：每次视野变化都重新同步——把当前视野内的 marker 移到 plain，
      // 视野外的移回 cluster。不能因 useCluster 未变而跳过，否则拖动地图后
      // 新视野内的点不会出现在地图上。
      for (const id in markersRef.current) {
        const m = markersRef.current[id];
        const inViewNow = bounds.contains(m.getLatLng());
        if (inViewNow) {
          if (clusterLayerRef.current?.hasLayer(m)) {
            clusterLayerRef.current.removeLayer(m);
            plainLayerRef.current?.addLayer(m);
          }
        } else if (plainLayerRef.current?.hasLayer(m)) {
          plainLayerRef.current.removeLayer(m);
          clusterLayerRef.current?.addLayer(m);
        }
      }
      map.removeLayer(clusterLayerRef.current!);
      if (!map.hasLayer(plainLayerRef.current!)) map.addLayer(plainLayerRef.current!);
    }
    usingClusterRef.current = useCluster;
  };

  // 渲染标记（随筛选变化）；默认先全部放入聚合组，再由 syncAggregation 依视野内点数切层
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 清空两个图层
    plainLayerRef.current?.clearLayers();
    clusterLayerRef.current?.clearLayers();
    markersRef.current = {};

    // 无论聚合与否，先把图层都加上，marker 先放入聚合组，syncAggregation 再切到普通层
    if (!map.hasLayer(plainLayerRef.current!)) map.addLayer(plainLayerRef.current!);
    if (!map.hasLayer(clusterLayerRef.current!)) map.addLayer(clusterLayerRef.current!);
    usingClusterRef.current = false;

    for (const s of schools) {
      if (s.lat == null || s.lng == null) continue;
      const meta = levelShape(s.level);
      const isFav = favoriteIdsRef.current.some((e) => e.id === s.id && e.kind === "school");
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin" data-id="${s.id}">${
          isFav ? heartSvg() : pinSvg(meta.shape, meta.color)
        }</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
      });
      const marker = L.marker([s.lat, s.lng], { icon, id: s.id } as L.MarkerOptions & { id: string });

      // popup 内容（与学校卡片风格看齐：薄荷 chip tag + House/MapPin 图标 + 三按钮操作区）
      const loc = [s.suburb, s.city].filter(Boolean).join(", ") || s.territorial || "";
      const years = levelYears(s.level);
      const levelLabel = years ? `${s.level}（${years}）` : s.level;
      const nameEsc = esc(s.name);
      const locEsc = esc(loc || "—");
      const tags = [
        `<span class="popup-chip">${esc(s.authorityCN || "")}</span>`,
        `<span class="popup-chip">${esc(levelLabel)}</span>`,
        `<span class="popup-chip">${esc(cnGender(s.gender, s.genderCN))}</span>`,
        `<span class="popup-chip">学生 ${s.roll ?? "—"}</span>`,
        `<span class="popup-chip">EQI ${s.eqi ?? "—"}</span>`,
      ].join("");
      const favoriteHtml = `<button class="popup-btn popup-btn--favorite" data-id="${s.id}" onclick="window.__schoolMapActions.favorite('${s.id}')"><i class="popup-ic popup-ic--fav">${SVG_FAV}</i><span>心愿</span></button>`;
      const popupHtml = `<div class="popup-card">
          <div class="popup-card__head"><i class="popup-ic popup-ic--title">${SVG_HOUSE}</i><span class="popup-card__title">${nameEsc}</span></div>
          <div class="popup-card__loc"><i class="popup-ic popup-ic--loc">${SVG_MAPPIN}</i><span>${locEsc}</span></div>
          <div class="popup-card__tags">${tags}</div>
          <div class="popup-card__actions">
            ${favoriteHtml}
            <button type="button" class="popup-btn popup-btn--solid" onclick="window.__schoolMapActions.detail('${esc(s.id)}')">详情</button>
            <button type="button" class="popup-btn popup-btn--compare" data-id="${esc(s.id)}" onclick="window.__schoolMapActions.compare('${esc(s.id)}')"><span class="popup-check"><i class="popup-ic">${SVG_CHECK}</i></span><span>对比</span></button>
          </div>
        </div>`;
      marker.bindPopup(popupHtml);
      // 鼠标悬停 marker 时显示学校名称
      marker.bindTooltip(esc(s.name), {
        direction: "top",
        offset: [0, -12],
        className: "map-pin-tooltip",
        opacity: 1,
      });
      // 悬停 marker 时联动高亮（地图 pin + 列表卡片）
      marker.on("mouseover", () => onHoverRef.current?.(s.id));
      marker.on("mouseout", () => onHoverRef.current?.(null));

      marker.on("click", (e: L.LeafletMouseEvent) => {
        // 阻止冒泡到 map click，否则 map click 的 closePopup/onSelect(null)
        // 会把刚打开的 popup 立即关掉
        L.DomEvent.stopPropagation(e);
        // 标记：marker click 流程中（含 Leaflet 同步触发 popupclose/popupopen），
        // 让 popupclose 区分"用户主动关"与"marker 切换/重复点"
        markerClickInProgressRef.current = true;
        // 记录本次选中来自"点击地图上的 marker"，供 activeId effect 判断是否保持视野
        // （点击地图点时点已可见，不触发飞行；列表卡片点击则可能被聚合需强制飞行）
        fromMapClickRef.current = true;
        // 点击的已是当前高亮学校：保持 popup 打开（Leaflet 会同步 close→open 触发
        // popupclose，但因有标志位不会清除高亮），不触发任何状态变更
        if (activeIdRef.current === s.id) {
          marker.openPopup();
          // 同步段执行完，清除标志
          queueMicrotask(() => { markerClickInProgressRef.current = false; });
          return;
        }
        // 切换到新 marker：先让 Leaflet 关闭旧 popup（同步触发 popupclose 被忽略），
        // 再 setActiveId；为避免同步 setPopupId(null) 在前，把 setActiveId 推迟到
        // 微任务，让 popupId 最终落到新学校
        queueMicrotask(() => {
          onSelectRef.current(s.id);
          markerClickInProgressRef.current = false;
        });
      });
      markersRef.current[s.id] = marker;
      // marker 一律先加入聚合组，最后统一按视野内点数决定是否切到普通层
      clusterLayerRef.current!.addLayer(marker);
    }
    syncAggregation();
  }, [schools]);

  // 加入心愿单状态变化时：已渲染的 marker 图标实时切换为爱心 / 还原为原形状
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const s of schools) {
      const m = markersRef.current[s.id];
      if (!m) continue;
      const meta = levelShape(s.level);
      const isFav = favoriteIds.some((e) => e.id === s.id && e.kind === "school");
      m.setIcon(
        L.divIcon({
          className: "",
          html: `<div class="map-pin" data-id="${s.id}">${
            isFav ? heartSvg() : pinSvg(meta.shape, meta.color)
          }</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -14],
        }),
      );
    }
    // 同步当前已打开的 popup 内收藏按钮视觉（处理从收藏夹浮层/卡片等外部
    // 取消收藏的情况：popup 是纯 HTML，不会随全局状态自动重渲）。
    const mapAny = map as L.Map & { _popup?: L.Popup };
    const popup = mapAny._popup;
    if (popup) {
      const root = popup.getElement();
      if (root) {
        const favSet = new Set(
          favoriteIds.filter((e) => e.kind === "school").map((e) => e.id)
        );
        root.querySelectorAll<HTMLElement>(".popup-btn--favorite").forEach((btn: HTMLElement) => {
          const id = btn.dataset.id;
          if (!id) return;
          const isOn = favSet.has(id);
          btn.classList.toggle("is-on", isOn);
          const label = btn.querySelector("span:last-child") as HTMLElement | null;
          if (label) label.textContent = isOn ? "心愿单" : "心愿";
        });
      }
    }
  }, [favoriteIds, schools]);

  // 对比状态变化时：同步当前已打开的 popup 内对比按钮视觉（同上，处理外部切
  // 换对比的情况，避免 popup 按钮卡在旧状态）。
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const mapAny = map as L.Map & { _popup?: L.Popup };
    const popup = mapAny._popup;
    if (popup) {
      const root = popup.getElement();
      if (root) {
        const cmpSet = new Set(compareIds);
        root.querySelectorAll<HTMLElement>(".popup-btn--compare").forEach((btn: HTMLElement) => {
          const id = btn.dataset.id;
          if (!id) return;
          btn.classList.toggle("is-on", cmpSet.has(id));
        });
      }
    }
  }, [compareIds]);

  // 悬停高亮：地图视野平移到该点 + 金色描边
  useEffect(() => {
    if (!hoveredId) {
      // 清除所有 hover 高亮
      containerRef.current
        ?.querySelectorAll(".map-pin.is-hover")
        .forEach((el) => el.classList.remove("is-hover"));
      return;
    }
    const map = mapRef.current;
    const m = markersRef.current[hoveredId];
    if (!map || !m) return;

    // 清除旧 hover
    containerRef.current
      ?.querySelectorAll(".map-pin.is-hover")
      .forEach((el) => el.classList.remove("is-hover"));

    // 仅高亮地图上的对应 pin，不平移地图
    const el = m.getElement();
    el?.querySelector(".map-pin")?.classList.add("is-hover");
  }, [hoveredId]);

  // 点击卡片打开详情时：居中跳转 + 放大高亮 + 弹出 popup
  useEffect(() => {
    // 消费来源标记：本次是否由"点击地图上的 marker"触发
    const fromMapClick = fromMapClickRef.current;
    fromMapClickRef.current = false;
    activeIdRef.current = activeId;
    if (!activeId) {
      // 清除所有 active 高亮 + 关闭 popup
      mapRef.current?.closePopup();
      containerRef.current
        ?.querySelectorAll(".map-pin.is-active")
        .forEach((el) => el.classList.remove("is-active"));
      return;
    }
    const map = mapRef.current;
    const m = markersRef.current[activeId];
    if (!map || !m) return;

    // 清除旧 active
    containerRef.current
      ?.querySelectorAll(".map-pin.is-active")
      .forEach((el) => el.classList.remove("is-active"));

    // 决定是否移动地图（居中 + 放大到至少 13 级）：
    // 1) 点击地图上的 marker（fromMapClick=true）→ 点已可见，保持视野不动；
    // 2) 点击列表卡片且处于聚合模式（usingCluster=true，点被聚合成簇不可见）
    //    → 强制飞行定位过去，否则用户看不到对应位置；
    // 3) 点击列表卡片且非聚合 → 仅当学校不在当前视野内时才定位，否则保持视野。
    try {
      const latLng = m.getLatLng();
      const inView = map.getBounds().contains(latLng);
      const needFly = fromMapClick
        ? false
        : usingClusterRef.current
          ? true
          : !inView;
      if (needFly) {
        map.setView(latLng, Math.max(map.getZoom(), 13));
      }
    } catch {
      // 忽略个别 setView 异常（如 tile 计算问题），保证下方 popup 仍能打开
    }
    // openPopup 内部若 map._popup 已存在会 removeLayer 旧 popup 触发 popupclose，
    // 这里提前打标让 popupclose 跳过清除（避免切换 card 时高亮被误清）。
    // 注意：不能直接调 m.openPopup()——marker 在 FeatureGroup（聚合组）里时
    // m._map 未设，openPopup 内部会因 _map 无效而静默失败；改为手动设 popup
    // 定位后显式 openOn(map)。聚合模式下 marker 也在 cluster，仍需能弹 popup。
    markerClickInProgressRef.current = true;
    const popup = m.getPopup();
    if (popup) {
      // 确保目标 marker 在 plain 层（若仍在聚合组则 popup 无法正常显示），
      // 并把 plain 层放到地图上，这样聚合模式下点卡片也能弹出 popup
      if (clusterLayerRef.current?.hasLayer(m)) clusterLayerRef.current.removeLayer(m);
      if (!plainLayerRef.current?.hasLayer(m)) plainLayerRef.current?.addLayer(m);
      if (!map.hasLayer(plainLayerRef.current!)) map.addLayer(plainLayerRef.current!);
      (popup as any)._latlng = m.getLatLng();
      try { (popup as any).openOn(map); } catch {
        // 极端情况（如 cluster 内 marker 未渲染）忽略，避免高亮流程中断
      }
    }
    queueMicrotask(() => { markerClickInProgressRef.current = false; });

    const el = m.getElement();
    el?.querySelector(".map-pin")?.classList.add("is-active");
  }, [activeId]);

  // 底图切换
  function switchBase(name: "街道" | "卫星") {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    if (!map || !layers) return;
    Object.keys(layers).forEach((k) => {
      if (k === name) layers[k].addTo(map);
      else map.removeLayer(layers[k]);
    });
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

      {/* ── 地图样式（marker hover/active 高亮 + popup） ── */}
      <style>{`
        .map-pin {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease, filter 0.12s ease;
        }
        .map-pin svg {
          display: block;
          filter: drop-shadow(0 1px 3px rgba(31,45,43,0.4));
        }
        .map-pin.is-hover {
          transform: scale(1.6);
          z-index: 1000;
        }
        .map-pin.is-hover svg .shape {
          stroke: #F2A541;
          stroke-width: 2.2;
        }
        .map-pin.is-hover svg {
          filter: drop-shadow(0 2px 6px rgba(31,45,43,0.55));
        }
        .map-pin.is-active {
          transform: scale(1.6);
          z-index: 1000;
        }
        .map-pin.is-active svg .shape {
          stroke: #F2A541;
          stroke-width: 2.2;
        }
        .map-pin.is-active svg {
          filter: drop-shadow(0 2px 6px rgba(31,45,43,0.55));
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(20,42,51,0.14);
        }
        .leaflet-popup-content {
          margin: 12px 14px;
        }
        /* marker 悬停显示学校名称的 tooltip */
        .map-pin-tooltip.leaflet-tooltip {
          background: #2e9e8c;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(46,158,140,0.28);
        }
        .map-pin-tooltip.leaflet-tooltip-top:before {
          border-top-color: #2e9e8c;
        }
        .popup-card {
          width: 260px;
          font-family: inherit;
        }
        .popup-card__head {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .popup-card__title {
          font-size: 15px;
          font-weight: 600;
          color: #000;
          line-height: 1.4;
          flex: 1;
        }
        .popup-card__loc {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #888;
          margin-top: 4px;
        }
        .popup-ic {
          display: inline-block;
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          color: #2e9e8c;
        }
        .popup-ic svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .popup-ic--title {
          width: 18px;
          height: 18px;
          margin-top: 2px;
        }
        .popup-ic--loc {
          width: 12px;
          height: 12px;
          color: #94a3b8;
        }
        .popup-ic--r {
          margin-left: 3px;
        }
        .popup-card__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .popup-chip {
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(46, 158, 140, 0.08);
          color: #2e9e8c;
          font-weight: 500;
          line-height: 1.5;
        }
        .popup-card__actions {
          display: flex;
          gap: 6px;
          margin-top: 12px;
        }
        .popup-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 6px 8px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          text-decoration: none;
          line-height: 1.2;
          transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .popup-btn--ghost {
          background: #fff;
          color: #2e9e8c;
          border: 1px solid rgba(46, 158, 140, 0.3);
        }
        .popup-btn--ghost:hover {
          background: rgba(46, 158, 140, 0.05);
        }
        .popup-btn--solid {
          background: #2e9e8c;
          color: #fff;
          border: 1px solid #2e9e8c;
          box-shadow: 0 1px 2px rgba(46,158,140,0.15);
        }
        .popup-btn--solid:hover {
          background: #258a7a;
        }
        .popup-btn--compare {
          background: #fff;
          color: #6b7280;
          border: 1px solid rgba(46, 158, 140, 0.2);
        }
        .popup-btn--compare:hover {
          background: rgba(46, 158, 140, 0.05);
          color: #2e9e8c;
        }
        .popup-btn--compare.is-on {
          background: rgba(46, 158, 140, 0.05);
          color: #2e9e8c;
          border-color: #2e9e8c;
        }
        .popup-btn--disabled {
          color: #c0c4c9;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          cursor: not-allowed;
        }
        .popup-btn--favorite {
          border: 1px solid #d1d5db;
          color: #6b7280;
        }
        .popup-btn--favorite .popup-ic--fav {
          width: 15px;
          height: 15px;
          color: #6b7280;
        }
        .popup-btn--favorite .popup-ic--fav svg path {
          stroke: #6b7280;
        }
        .popup-btn--favorite.is-on {
          background: #fef2f2;
          color: #EF4444;
          border-color: #EF4444;
        }
        .popup-btn--favorite.is-on .popup-ic--fav {
          fill: #EF4444;
          color: #EF4444;
        }
        .popup-btn--favorite.is-on .popup-ic--fav svg {
          fill: #EF4444 !important;
        }
        .popup-btn--favorite.is-on .popup-ic--fav svg path {
          stroke: #EF4444;
        }
        .popup-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          border: 1px solid rgba(107, 114, 128, 0.3);
          border-radius: 3px;
          background: #fff;
          flex-shrink: 0;
        }
        .popup-check .popup-ic {
          width: 10px;
          height: 10px;
          color: transparent;
        }
        .popup-btn--compare.is-on .popup-check {
          background: #2e9e8c;
          border-color: #2e9e8c;
        }
        .popup-btn--compare.is-on .popup-check .popup-ic {
          color: #fff;
        }
      `}</style>
    </div>
  );
}
