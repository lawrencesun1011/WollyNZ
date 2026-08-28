import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

/* ============================================================
   底图：OpenFreeMap（矢量） + Esri World Imagery（影像）
   OpenFreeMap 公共实例免 key、免注册、无配额，数据来自 OpenStreetMap。
   @see https://openfreemap.org/quick_start/
   ============================================================ */

export const OPENFREEMAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

/**
 * OpenFreeMap liberty 底图样式的符号层会引用一批 sprite 图集里实际**不存在**
 * 的 POI 图标名（如 sports_centre / swimming_pool / atm / office / gate …
 * 上游 sprite 只有 swimming / bank / entrance 等近似变体），MapLibre 渲染时
 * 会反复报 "Image ... could not be loaded"。给缺失图标注册一个透明占位即可
 * 消除控制台警告，且不破坏其它符号层的渲染。这是 MapLibre 官方推荐的处理方式。
 */
export function installMissingImageFallback(map: MapLibreMap) {
  map.on("styleimagemissing", (e: { id: string }) => {
    if (map.hasImage(e.id)) return;
    try {
      map.addImage(
        e.id,
        { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) },
        { pixelRatio: 1 }
      );
    } catch {
      // 个别非法图标名忽略，避免二次报错
    }
  });
}

/**
 * 卫星底图。
 * OpenFreeMap 只提供 OSM 矢量底图、不含影像瓦片，因此影像层沿用
 * Esri World Imagery 栅格源（免费、免 key），并叠加 Esri 边界与地名
 * 标注层，保持迁移前「卫星影像 + 地名」的视觉效果。
 * 注意：Esri 的 URL 顺序是 {z}/{y}/{x}（行/列），MapLibre 只做字符串
 * 替换，照抄即可。
 */
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
    },
    "esri-labels": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Tiles &copy; Esri",
    },
  },
  layers: [
    { id: "esri-imagery", type: "raster", source: "esri-imagery" },
    { id: "esri-labels", type: "raster", source: "esri-labels" },
  ],
};

export type BaseLayerName = "街道" | "卫星";

export const BASE_STYLES: Record<BaseLayerName, string | StyleSpecification> = {
  街道: OPENFREEMAP_STYLE_URL,
  卫星: SATELLITE_STYLE,
};

/* ============================================================
   地理常量与工具
   ============================================================ */

/** 地图最大缩放层级（与迁移前 Leaflet 的 maxZoom: 19 保持一致） */
export const MAP_MAX_ZOOM = 19;

/** 视野内 marker 数超过该值就切换为聚合模式 */
export const CLUSTER_THRESHOLD = 200;

/** 聚合半径（屏幕像素），对应迁移前 leaflet.markercluster 的 maxClusterRadius */
export const CLUSTER_RADIUS_PX = 50;

/**
 * 新西兰全景框（含 Northland 到 Stewart Island）。
 * 刻意不包 Chatham Islands 等离群点，避免视野被撑大到覆盖南极。
 */
export const DEFAULT_NZ_BOUNDS: [number, number, number, number] = [
  -47.5, 166.0, -34.0, 178.5,
];

/**
 * 坐标合理性校验：过滤掉 Chatham Islands 等离群点。
 * 避免 fitBounds 被撑成全球视图（低 zoom 下墨卡托世界地图水平重复 = "地图复制"）。
 */
export function isReasonableNZCoord(lat: number, lng: number): boolean {
  return lat >= -50 && lat <= -33 && lng >= 165 && lng <= 185;
}

/** simple HTML 转义：学校名 / 地址含特殊字符时避免破坏注入的 HTML 字符串 */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 把 DEFAULT_NZ_BOUNDS（[south, west, north, east]）转成
 * MapLibre fitBounds 需要的 [[west, south], [east, north]]。
 */
export function nzBoundsLngLat(): [[number, number], [number, number]] {
  return [
    [DEFAULT_NZ_BOUNDS[1], DEFAULT_NZ_BOUNDS[0]],
    [DEFAULT_NZ_BOUNDS[3], DEFAULT_NZ_BOUNDS[2]],
  ];
}

/* ============================================================
   Marker / 聚合气泡 DOM 构造
   ============================================================ */

export interface MapPoint {
  id: string;
  /** [lng, lat] —— MapLibre 统一使用经度在前 */
  lngLat: [number, number];
}

/** 一个屏幕空间的聚合簇 */
export interface ScreenCluster {
  key: string;
  /** 屏幕坐标（px） */
  x: number;
  y: number;
  points: MapPoint[];
}

/**
 * marker 元素结构：
 *   .map-pin-wrap  固定 26×26，作为 MapLibre anchor 的基准（anchor: center）
 *     └ .map-pin   可缩放的图形区（hover / active 时 scale）
 *     └ .map-pin-tip 悬停时显示的名称气泡（纯 CSS，替代 Leaflet tooltip）
 */
export function createPinElement(
  id: string,
  svg: string,
  label: string
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "map-pin-wrap";
  el.dataset.id = id;
  el.innerHTML =
    `<div class="map-pin" data-id="${esc(id)}">${svg}</div>` +
    `<div class="map-pin-tip">${esc(label)}</div>`;
  return el;
}

/** 更新已存在 marker 的图形（心愿单切换等） */
export function updatePinSvg(marker: { getElement(): HTMLElement }, svg: string) {
  const pin = marker.getElement()?.querySelector(".map-pin");
  if (pin) pin.innerHTML = svg;
}

export function clusterSizeClass(count: number): "sm" | "md" | "lg" {
  if (count < 10) return "sm";
  if (count < 100) return "md";
  return "lg";
}

export function createClusterElement(count: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `map-cluster map-cluster--${clusterSizeClass(count)}`;
  el.textContent = String(count);
  return el;
}

/* ============================================================
   屏幕空间聚合
   ============================================================ */

/**
 * 按屏幕距离做贪心聚合（O(n) 近邻查询用网格加速）。
 * 与 leaflet.markercluster 一样，只在地图停止移动（moveend）时重算。
 */
export function computeScreenClusters(
  map: MapLibreMap,
  points: MapPoint[],
  radius: number = CLUSTER_RADIUS_PX
): ScreenCluster[] {
  const clusters: ScreenCluster[] = [];
  const buckets = new Map<string, ScreenCluster[]>();
  const r2 = radius * radius;

  for (const p of points) {
    const sp = map.project(p.lngLat);
    const cx = Math.floor(sp.x / radius);
    const cy = Math.floor(sp.y / radius);

    let target: ScreenCluster | null = null;
    for (let dx = -1; dx <= 1 && !target; dx++) {
      for (let dy = -1; dy <= 1 && !target; dy++) {
        const arr = buckets.get(`${cx + dx}:${cy + dy}`);
        if (!arr) continue;
        for (const c of arr) {
          const ddx = c.x - sp.x;
          const ddy = c.y - sp.y;
          if (ddx * ddx + ddy * ddy <= r2) {
            target = c;
            break;
          }
        }
      }
    }

    if (target) {
      target.points.push(p);
      // 维护质心，使气泡落在点群中心
      const n = target.points.length;
      target.x += (sp.x - target.x) / n;
      target.y += (sp.y - target.y) / n;
    } else {
      const c: ScreenCluster = {
        key: `${cx}:${cy}:${clusters.length}`,
        x: sp.x,
        y: sp.y,
        points: [p],
      };
      clusters.push(c);
      const bk = `${cx}:${cy}`;
      const arr = buckets.get(bk);
      if (arr) arr.push(c);
      else buckets.set(bk, [c]);
    }
  }

  return clusters;
}

/* ============================================================
   popup 内使用的内联图标（popup 是纯 HTML，无法直接用 lucide 组件）
   path 取自 lucide-react（24x24 viewBox，stroke 渲染）
   ============================================================ */

export const SVG_HOUSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
export const SVG_MAPPIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
export const SVG_EXTERNAL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
export const SVG_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
export const SVG_FAV =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

/**
 * popup 内的按钮是内联 onclick，需要一个全局入口回调到 React。
 * 两个地图组件共用同一个 key（同一页面只挂载其中一个）。
 */
declare global {
  interface Window {
    __schoolMapActions?: {
      detail: (id: string) => void;
      compare: (id: string) => void;
      favorite: (id: string) => void;
    };
  }
}
