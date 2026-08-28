"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { SchoolFrontend } from "@/lib/types";
import { eceTypeCN, eceAuthStyle } from "@/lib/filters";
import { useFavorites, useCompare } from "@/lib/user-collections";

// Leaflet popup 是纯 HTML，无法用 React 组件。
const SVG_HOUSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
const SVG_MAPPIN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const SVG_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const SVG_FAV =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

function esc(s: string): string {
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
  onHover?: (id: string | null) => void;
  onDetail: (id: string) => void;
  onBoundsChange?: (bounds: [number, number, number, number] | null) => void;
  flyCities?: string[];
  fitSearchKey?: string;
}

const CLUSTER_THRESHOLD = 200;

const DEFAULT_NZ_BOUNDS: [number, number, number, number] = [
  -47.5, 166.0, -34.0, 178.5,
];

function isReasonableNZCoord(lat: number, lng: number): boolean {
  return lat >= -50 && lat <= -33 && lng >= 165 && lng <= 185;
}

function pinSvg(color: string): string {
  const inner = `<polygon class="shape" points="6,1.5 12,1.5 16.6,9 12,16.5 6,16.5 1.4,9" fill="${color}"/>`;
  return `<svg width="26" height="26" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round">${inner}</svg>`;
}

function heartSvg(color = "#EF4444"): string {
  const inner = `<path class="shape" d="M12 20.5l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 20.5z" fill="${color}"/>`;
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">${inner}</svg>`;
}

function legendSvg(color: string): string {
  return pinSvg(color).replace('<svg ', '<svg style="filter:drop-shadow(0 1px 3px rgba(31,45,43,0.4))" ');
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
  return svg.replace('<svg ', '<svg style="filter:drop-shadow(0 1px 3px rgba(31,45,43,0.4))" ');
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
  const lastFitSearchRef = useRef<string>("");
  const fitSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const usingClusterRef = useRef<boolean>(false);
  const markerClickInProgressRef = useRef<boolean>(false);
  const fromMapClickRef = useRef<boolean>(false);
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

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__schoolMapActions = {
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
      delete (window as unknown as Record<string, unknown>).__schoolMapActions;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      wheelPxPerZoomLevel: 80,
      maxZoom: 19,
    });

    const satBase = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics" }
    );
    const satLabels = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Tiles &copy; Esri" }
    );
    const streetBase = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }
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
      onBoundsChangeRef.current?.([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
    };

    requestAnimationFrame(() => {
      if (mapRef.current !== map) return;
      map.invalidateSize();
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
      map.on("click", (e: L.LeafletMouseEvent) => {
        const target = e.originalEvent.target as HTMLElement | null;
        if (target?.closest(".leaflet-popup, .map-pin")) return;
        if (markerClickInProgressRef.current) return;
        map.closePopup();
        onSelectRef.current(null);
      });
      map.on("popupclose", () => {
        if (markerClickInProgressRef.current) return;
        onSelectRef.current(null);
      });
      map.on("popupopen", (e: L.PopupEvent) => {
        const root = (e.popup as L.Popup).getElement();
        if (!root) return;
        const cmpSet = new Set(compareIdsRef.current);
        root.querySelectorAll<HTMLElement>(".popup-btn--compare").forEach((btn) => {
          const id = btn.dataset.id;
          if (!id) return;
          btn.classList.toggle("is-on", cmpSet.has(id));
        });
        const favSet = new Set(
          favoriteIdsRef.current.filter((e) => e.kind === "ece").map((e) => e.id)
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const key = (flyCities || []).join("|");
    if (!firstFlyRef.current && lastFlyKeyRef.current === key) return;
    firstFlyRef.current = false;
    lastFlyKeyRef.current = key;

    map.invalidateSize();
    const hasCity = !!flyCities && flyCities.length > 0;
    if (!hasCity) {
      map.fitBounds(L.latLngBounds(
        [DEFAULT_NZ_BOUNDS[0], DEFAULT_NZ_BOUNDS[1]],
        [DEFAULT_NZ_BOUNDS[2], DEFAULT_NZ_BOUNDS[3]],
      ), { padding: [20, 20] });
      return;
    }
    const pts = schools
      .filter((s) => s.lat != null && s.lng != null && isReasonableNZCoord(s.lat, s.lng))
      .map((s) => [s.lat as number, s.lng as number]);
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts as [number, number][]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyCities]);

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
      if (pts.length === 1) {
        m.setView(pts[0] as [number, number], 13);
      } else {
        m.fitBounds(L.latLngBounds(pts as [number, number][]), { padding: [40, 40], maxZoom: 13 });
      }
    }, 150);
    return () => {
      if (fitSearchTimerRef.current) clearTimeout(fitSearchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSearchKey, schools]);

  const syncAggregation = () => {
    const map = mapRef.current;
    if (!map) return;
    let inView = 0;
    let bounds: L.LatLngBounds;
    try {
      bounds = map.getBounds();
    } catch {
      return;
    }
    for (const id in markersRef.current) {
      if (bounds.contains(markersRef.current[id].getLatLng())) inView++;
    }
    const useCluster = inView > CLUSTER_THRESHOLD;

    if (useCluster) {
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    plainLayerRef.current?.clearLayers();
    clusterLayerRef.current?.clearLayers();
    markersRef.current = {};

    if (!map.hasLayer(plainLayerRef.current!)) map.addLayer(plainLayerRef.current!);
    if (!map.hasLayer(clusterLayerRef.current!)) map.addLayer(clusterLayerRef.current!);
    usingClusterRef.current = false;

    for (const s of schools) {
      if (s.lat == null || s.lng == null) continue;
      const isFav = favoriteIdsRef.current.some((e) => e.id === s.id && e.kind === "ece");
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin" data-id="${s.id}">${
          isFav ? heartSvg() : authMarkSvg(s.authorityCN)
        }</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
      });
      const marker = L.marker([s.lat, s.lng], { icon, id: s.id } as L.MarkerOptions & { id: string });

      const loc = [s.suburb, s.city].filter(Boolean).join(", ") || s.territorial || "";
      const nameEsc = esc(s.name);
      const locEsc = esc(loc || "—");
      const tags = [
        `<span class="popup-chip">${esc(s.authorityCN || "")}</span>`,
        `<span class="popup-chip">${esc(eceTypeCN(s.type))}</span>`,
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
      marker.bindTooltip(esc(s.name), {
        direction: "top",
        offset: [0, -12],
        className: "map-pin-tooltip",
        opacity: 1,
      });
      marker.on("mouseover", () => onHoverRef.current?.(s.id));
      marker.on("mouseout", () => onHoverRef.current?.(null));

      marker.on("click", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        markerClickInProgressRef.current = true;
        fromMapClickRef.current = true;
        if (activeIdRef.current === s.id) {
          marker.openPopup();
          queueMicrotask(() => { markerClickInProgressRef.current = false; });
          return;
        }
        queueMicrotask(() => {
          onSelectRef.current(s.id);
          markerClickInProgressRef.current = false;
        });
      });
      markersRef.current[s.id] = marker;
      clusterLayerRef.current!.addLayer(marker);
    }
    syncAggregation();
  }, [schools]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const s of schools) {
      const m = markersRef.current[s.id];
      if (!m) continue;
      const isFav = favoriteIds.some((e) => e.id === s.id && e.kind === "ece");
      m.setIcon(
        L.divIcon({
          className: "",
          html: `<div class="map-pin" data-id="${s.id}">${
            isFav ? heartSvg() : authMarkSvg(s.authorityCN)
          }</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -14],
        }),
      );
    }
    const popup = (map as L.Map & { _popup?: L.Popup })._popup;
    if (popup) {
      const root = popup.getElement();
      if (root) {
        const favSet = new Set(
          favoriteIds.filter((e) => e.kind === "ece").map((e) => e.id)
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const popup = (map as L.Map & { _popup?: L.Popup })._popup;
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

  useEffect(() => {
    if (!hoveredId) {
      containerRef.current?.querySelectorAll(".map-pin.is-hover").forEach((el) => el.classList.remove("is-hover"));
      return;
    }
    const map = mapRef.current;
    const m = markersRef.current[hoveredId];
    if (!map || !m) return;
    containerRef.current?.querySelectorAll(".map-pin.is-hover").forEach((el) => el.classList.remove("is-hover"));
    const el = m.getElement();
    el?.querySelector(".map-pin")?.classList.add("is-hover");
  }, [hoveredId]);

  useEffect(() => {
    const fromMapClick = fromMapClickRef.current;
    fromMapClickRef.current = false;
    activeIdRef.current = activeId;
    if (!activeId) {
      mapRef.current?.closePopup();
      containerRef.current?.querySelectorAll(".map-pin.is-active").forEach((el) => el.classList.remove("is-active"));
      return;
    }
    const map = mapRef.current;
    const m = markersRef.current[activeId];
    if (!map || !m) return;

    containerRef.current?.querySelectorAll(".map-pin.is-active").forEach((el) => el.classList.remove("is-active"));

    try {
      const latLng = m.getLatLng();
      const inView = map.getBounds().contains(latLng);
      const needFly = fromMapClick ? false : usingClusterRef.current ? true : !inView;
      if (needFly) {
        map.setView(latLng, Math.max(map.getZoom(), 13));
      }
    } catch {
      // ignore
    }
    markerClickInProgressRef.current = true;
    const popup = m.getPopup();
    if (popup) {
      if (clusterLayerRef.current?.hasLayer(m)) clusterLayerRef.current.removeLayer(m);
      if (!plainLayerRef.current?.hasLayer(m)) plainLayerRef.current?.addLayer(m);
      if (!map.hasLayer(plainLayerRef.current!)) map.addLayer(plainLayerRef.current!);
      (popup as unknown as { _latlng: L.LatLng })._latlng = m.getLatLng();
      try { (popup as unknown as { openOn: (m: L.Map) => void }).openOn(map); } catch { /* ignore */ }
    }
    queueMicrotask(() => { markerClickInProgressRef.current = false; });

    const el = m.getElement();
    el?.querySelector(".map-pin")?.classList.add("is-active");
  }, [activeId]);

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

      <div className="absolute right-3 top-3 z-[100] flex overflow-hidden rounded-full border border-stroke bg-white shadow-sm">
        <button type="button" onClick={() => switchBase("街道")} className={`px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/5 ${baseLayer === "街道" ? "text-primary" : "text-ink-soft hover:text-primary"}`}>街道</button>
        <button type="button" onClick={() => switchBase("卫星")} className={`border-l border-stroke px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/5 ${baseLayer === "卫星" ? "text-primary" : "text-ink-soft hover:text-primary"}`}>卫星</button>
      </div>

      <div className="absolute bottom-4 left-4 z-[500] rounded-2xl bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
        <p className="mb-1.5 text-xs font-semibold text-ink">办学性质图例</p>
        <div className="flex flex-col gap-1">
          {([
            ["私立", "#2e7ed4", "circle"],
            ["公立", "#8e44ad", "square"],
          ] as [string, string, "circle" | "square"][]).map(([label, color, shape]) => (
            <span key={label} className="flex items-center gap-2 text-xs text-ink-soft">
              <span className="flex h-[22px] w-[22px] items-center justify-center" dangerouslySetInnerHTML={{ __html: legendMarkSvg(color, shape) }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .map-pin { display: flex; align-items: center; justify-content: center; transition: transform 0.12s ease, filter 0.12s ease; }
        .map-pin svg { display: block; filter: drop-shadow(0 1px 3px rgba(31,45,43,0.4)); }
        .map-pin.is-hover { transform: scale(1.6); z-index: 1000; }
        .map-pin.is-hover svg .shape { stroke: #F2A541; stroke-width: 2.2; }
        .map-pin.is-hover svg { filter: drop-shadow(0 2px 6px rgba(31,45,43,0.55)); }
        .map-pin.is-active { transform: scale(1.6); z-index: 1000; }
        .map-pin.is-active svg .shape { stroke: #F2A541; stroke-width: 2.2; }
        .map-pin.is-active svg { filter: drop-shadow(0 2px 6px rgba(31,45,43,0.55)); }
        .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 8px 24px rgba(20,42,51,0.14); }
        .leaflet-popup-content { margin: 12px 14px; }
        .map-pin-tooltip.leaflet-tooltip { background: #2e9e8c; color: #fff; border: none; border-radius: 8px; padding: 4px 10px; font-size: 12px; font-weight: 600; box-shadow: 0 4px 12px rgba(46,158,140,0.28); }
        .map-pin-tooltip.leaflet-tooltip-top:before { border-top-color: #2e9e8c; }
        .popup-card { width: 260px; font-family: inherit; }
        .popup-card__head { display: flex; align-items: flex-start; gap: 6px; }
        .popup-card__title { font-size: 15px; font-weight: 600; color: #000; line-height: 1.4; flex: 1; }
        .popup-card__loc { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #888; margin-top: 4px; }
        .popup-ic { display: inline-block; width: 14px; height: 14px; flex-shrink: 0; color: #2e9e8c; }
        .popup-ic svg { width: 100%; height: 100%; display: block; }
        .popup-ic--title { width: 18px; height: 18px; margin-top: 2px; }
        .popup-ic--loc { width: 12px; height: 12px; color: #94a3b8; }
        .popup-card__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .popup-chip { font-size: 12px; padding: 3px 10px; border-radius: 999px; background: rgba(46, 158, 140, 0.08); color: #2e9e8c; font-weight: 500; line-height: 1.5; }
        .popup-card__actions { display: flex; gap: 6px; margin-top: 12px; }
        .popup-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 3px; padding: 6px 8px; font-size: 12px; font-weight: 500; border-radius: 8px; cursor: pointer; text-decoration: none; line-height: 1.2; transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease; }
        .popup-btn--solid { background: #2e9e8c; color: #fff; border: 1px solid #2e9e8c; box-shadow: 0 1px 2px rgba(46,158,140,0.15); }
        .popup-btn--solid:hover { background: #258a7a; }
        .popup-btn--compare { background: #fff; color: #6b7280; border: 1px solid rgba(46, 158, 140, 0.2); }
        .popup-btn--compare:hover { background: rgba(46, 158, 140, 0.05); color: #2e9e8c; }
        .popup-btn--compare.is-on { background: rgba(46, 158, 140, 0.05); color: #2e9e8c; border-color: #2e9e8c; }
        .popup-btn--favorite { border: 1px solid #d1d5db; color: #6b7280; }
        .popup-btn--favorite .popup-ic--fav { width: 15px; height: 15px; color: #6b7280; }
        .popup-btn--favorite .popup-ic--fav svg path { stroke: #6b7280; }
        .popup-btn--favorite.is-on { background: #fef2f2; color: #EF4444; border-color: #EF4444; }
        .popup-btn--favorite.is-on .popup-ic--fav { fill: #EF4444; color: #EF4444; }
        .popup-btn--favorite.is-on .popup-ic--fav svg { fill: #EF4444 !important; }
        .popup-btn--favorite.is-on .popup-ic--fav svg path { stroke: #EF4444; }
        .popup-check { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 1px solid rgba(107, 114, 128, 0.3); border-radius: 3px; background: #fff; flex-shrink: 0; }
        .popup-check .popup-ic { width: 10px; height: 10px; color: transparent; }
        .popup-btn--compare.is-on .popup-check { background: #2e9e8c; border-color: #2e9e8c; }
        .popup-btn--compare.is-on .popup-check .popup-ic { color: #fff; }
      `}</style>
    </div>
  );
}
