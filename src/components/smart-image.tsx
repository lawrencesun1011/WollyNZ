import type { CSSProperties } from "react";

// 与 scripts/optimize-images.mjs 中的 WIDTHS 保持一致。
// 仅当图片原始宽度 ≥ 最大断点（1600）时才传 sizes 开启 srcset，避免列出未生成的尺寸。
const WIDTHS = [640, 960, 1280, 1600];

type Props = {
  /** 基路径，可带或不带 .webp，例如 /images/guide/guide-map */
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  loading?: "lazy" | "eager";
  /** 提供后开启响应式 srcset（图片原始宽度需 ≥ ${WIDTHS[WIDTHS.length - 1]}） */
  sizes?: string;
};

/** 统一图片组件：构建期由 scripts/optimize-images.mjs 生成同名 WebP（含响应式断点）。
 *  原图已移出 public/（存于 assets-src/），故只部署 WebP，这里直接引用 WebP。 */
export function SmartImage({ src, alt, width, height, className, style, priority, loading, sizes }: Props) {
  const base = src.replace(/\.webp$/i, "");
  const webpSrc = `${base}.webp`;
  const srcSet = sizes ? WIDTHS.map((w) => `${base}-${w}w.webp ${w}w`).join(", ") : undefined;

  return (
    <img
      src={webpSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      loading={priority ? "eager" : loading ?? "lazy"}
      decoding="async"
    />
  );
}
