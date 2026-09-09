import type { CSSProperties } from "react";
import { ReferenceArtwork } from "@/components/reference-artwork";

/**
 * 用 CSS 窗口从设计稿图集中裁出插画区域，避免把文字和 UI 一起栅格化。
 * 页面上所有文字与按钮都是真实 HTML，只有这四个图形区域来自图片。
 * 坐标系基于 1182 × 1331 的设计图集，改动任一数值都会切错图。
 */
const regions = {
  notebook: { x: 98, y: 836, w: 215, h: 140 },
  school: { x: 451, y: 835, w: 292, h: 149 },
  keys: { x: 854, y: 832, w: 220, h: 144 },
  lamb: { x: 22, y: 1118, w: 293, h: 147 },
} as const;

const ATLAS_W = 1182;
const ATLAS_H = 1331;

export type ArtworkName = keyof typeof regions;

export function Artwork({
  name,
  className = "",
}: {
  name: ArtworkName;
  className?: string;
}) {
  if (name === "school") {
    return <ReferenceArtwork name="school" className={`artwork artwork-school ${className}`} />;
  }
  const { x, y, w, h } = regions[name];
  const style = {
    aspectRatio: `${w} / ${h}`,
    backgroundImage: "url('/images/design-atlas.webp')",
    backgroundSize: `${(ATLAS_W / w) * 100}% ${(ATLAS_H / h) * 100}%`,
    backgroundPosition: `${(x / (ATLAS_W - w)) * 100}% ${(y / (ATLAS_H - h)) * 100}%`,
  } satisfies CSSProperties;

  return (
    <span
      className={`artwork artwork-${name} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
