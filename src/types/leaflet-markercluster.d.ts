import "leaflet";

declare module "leaflet" {
  interface MarkerClusterGroupOptions {
    maxClusterRadius?: number;
    [key: string]: unknown;
  }
  function markerClusterGroup(
    options?: MarkerClusterGroupOptions
  ): L.LayerGroup;
}
