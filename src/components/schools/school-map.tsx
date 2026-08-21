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

interface Props {
  schools: SchoolFrontend[];
  hoveredId: string | null;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  /** 打开学校详情（modal） */
  onDetail: (id: string) => void;
  /** 加入/移出对比 */
  onToggleCompare: (id: string) => void;
  /** 地图视野变化时上报当前范围 [south, west, north, east] */
  onBoundsChange?: (bounds: [number, number, number, number] | null) => void;
  /** 选中的城市（英文），变化后地图自动飞到该区域 */
  flyCities?: string[];
}

const CLUSTER_THRESHOLD = 200;

// 新西兰全景框（含 Northland 到 Stewart Island），用于默认/取消筛选时的视野，
// 刻意不包 Chatham Islands 等离群点，避免视野被撑大到覆盖南极。
const DEFAULT_NZ_BOUNDS: [number, number, number, number] = [
  -47.5, 166.0, -34.0, 178.5,
];

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

/* ── 图例 SVG（小尺寸） ── */
function legendSvg(shape: MarkerShape, color: string): string {
  return pinSvg(shape, color);
}

export function SchoolMap({
  schools,
  hoveredId,
  activeId,
  onSelect,
  onDetail,
  onToggleCompare,
  onBoundsChange,
  flyCities,
}: Props) {
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
  const onToggleCompareRef = useRef(onToggleCompare);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const firstFlyRef = useRef(true);
  const lastFlyKeyRef = useRef<string>("");
  const activeIdRef = useRef<string | null>(null);
  // 当前是否启用聚合（基于地图视野内点数，而非全量筛选数）
  const usingClusterRef = useRef<boolean>(false);
  // 标记：marker click 处理流程中（含 Leaflet 同步触发 popupclose），
  // 用于 popupclose 区分"用户主动关"与"marker 切换"，避免误清高亮
  const markerClickInProgressRef = useRef<boolean>(false);
  // 标记：本次 activeId 是否由"点击地图上的 marker"触发（而非列表卡片）。
  // 用于聚合模式下区分：地图点点击保持视野；列表卡片点击则强制飞行定位。
  const fromMapClickRef = useRef<boolean>(false);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onDetailRef.current = onDetail;
    onToggleCompareRef.current = onToggleCompare;
    onBoundsChangeRef.current = onBoundsChange;
  });

  // 供 popup 内 HTML 按钮调用的全局回调（Leaflet popup 是纯 HTML，无法用 React onClick）
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__schoolMapActions = {
      detail: (id: string) => onDetailRef.current(id),
      compare: (id: string) => onToggleCompareRef.current(id),
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
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => [s.lat as number, s.lng as number]);
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts as [number, number][]);
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 13,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyCities]);

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
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin" data-id="${s.id}">${pinSvg(meta.shape, meta.color)}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
      });
      const marker = L.marker([s.lat, s.lng], { icon, id: s.id } as L.MarkerOptions & { id: string });

      // popup 内容（与学校卡片保持一致：办学性质 / 学段+年级 / 性别 / 学生 / EQI）
      const loc = [s.suburb, s.city].filter(Boolean).join(", ") || s.territorial || "";
      const years = levelYears(s.level);
      const levelLabel = years ? `${s.level}（${years}）` : s.level;
      const websiteHtml = s.website
        ? `<a class="popup-card__action" href="${s.website}" target="_blank" rel="noopener noreferrer">官网</a>`
        : `<span class="popup-card__action popup-card__action--disabled">官网</span>`;
      marker.bindPopup(
        `<div class="popup-card">
          <div class="popup-card__title">${s.name}</div>
          <div class="popup-card__loc">${loc}</div>
          <div class="popup-card__tags">
            <span class="tag tag--coral">${s.authorityCN}</span>
            <span class="tag tag--green">${levelLabel}</span>
            <span class="tag tag--ocean">${cnGender(s.gender, s.genderCN)}</span>
            <span class="tag tag--amber">学生 ${s.roll ?? "—"}</span>
            <span class="tag tag--gray">EQI ${s.eqi ?? "—"}</span>
          </div>
          <div class="popup-card__actions">
            ${websiteHtml}
            <button type="button" class="popup-card__action" onclick="window.__schoolMapActions.detail('${s.id}')">详情</button>
            <button type="button" class="popup-card__action" onclick="window.__schoolMapActions.compare('${s.id}')">对比</button>
          </div>
        </div>`
      );

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
      <div className="absolute right-3 top-3 z-[500] flex overflow-hidden rounded-full border border-stroke bg-white shadow-sm">
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
      <div className="absolute bottom-4 left-4 z-[500] rounded-2xl bg-white/90 px-5 py-3 shadow-sm backdrop-blur">
        <p className="mb-2 text-sm font-semibold text-ink">学段图例</p>
        <div className="flex flex-col gap-1.5">
          {([
            ["小学", "circle", "#2e7ed4"],
            ["初中", "diamond", "#e0392b"],
            ["高中", "square", "#8e44ad"],
            ["一贯制", "hexagon", "#9c6b3f"],
          ] as [string, MarkerShape, string][]).map(([label, shape, color]) => (
            <span
              key={label}
              className="flex items-center gap-2 text-sm text-ink-soft"
            >
              <span
                className="flex h-5 w-5 items-center justify-center"
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
        .popup-card {
          width: 240px;
        }
        .popup-card__title {
          font-size: 15px;
          font-weight: 600;
          color: #1F2D2B;
          line-height: 1.4;
        }
        .popup-card__loc {
          font-size: 12px;
          color: #888;
          margin-top: 2px;
        }
        .popup-card__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .popup-card__tags .tag {
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 999px;
          color: #fff;
          font-weight: 500;
        }
        .popup-card__tags .tag--coral { background: #E4572E; }
        .popup-card__tags .tag--green { background: #3E9C8C; }
        .popup-card__tags .tag--ocean { background: #0E6BA8; }
        .popup-card__tags .tag--amber { background: #B8860B; }
        .popup-card__tags .tag--gray { background: #94A3B8; }
        .popup-card__actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .popup-card__action {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 0;
          font-size: 12px;
          font-weight: 500;
          color: #3e9c8c;
          background: #fff;
          border: 1px solid #3e9c8c;
          border-radius: 8px;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .popup-card__action:hover {
          background: #3e9c8c;
          color: #fff;
        }
        .popup-card__action--disabled {
          color: #c0c4c9;
          border-color: #e5e7eb;
          cursor: not-allowed;
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}
