import type { SectionBackground } from "@/lib/backgrounds";
import Image from "next/image";

/**
 * 通用区域背景层组件
 * ─────────────────────
 * 用于在任意 section 内部插入背景图 + 蒙层。
 * 只需传 background 配置对象即可自动渲染。
 */
export function SectionBackgroundLayer({
  bg,
}: {
  bg?: SectionBackground;
}) {
  // 没有配置或路径为空 → 不渲染
  if (!bg || !bg.src) return null;

  // 蒙层渐变
  const overlayClasses: Record<string, string> = {
    top: "bg-gradient-to-b from-white/70 via-white/20 to-transparent",
    bottom: "bg-gradient-to-t from-white/70 via-white/20 to-transparent",
    center: "bg-gradient-to-b from-white/30 via-white/50 to-white/30",
    all: "bg-white/30",
  };

  const strengthMap: Record<string, string> = {
    light: "from-white/40 via-white/15 to-white/40",
    medium: "from-white/60 via-white/30 to-white/60",
    strong: "from-white/80 via-white/50 to-white/80",
  };

  const overlayClass = bg.overlayDirection === "all"
    ? bg.overlayStrength === "light" ? "bg-white/25"
      : bg.overlayStrength === "medium" ? "bg-white/45"
      : "bg-white/65"
    : `${overlayClasses[bg.overlayDirection || "center"]}`.replace(
        /from-white\/\d+ via-white\/\d+ to-white\/\d+/,
        strengthMap[bg.overlayStrength || "light"]
      );

  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden"
      style={bg.fit === "contain" ? { backgroundColor: bg.bgColor || "#EEF6F4" } : undefined}
    >
      {bg.fit === "contain" ? (
        // contain 模式：用原生 img，浏览器按图片原始宽高比显示，绝不拉伸变形
        // 图片完整呈现，区域多余空间由 bgColor 填充
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg.src}
          alt=""
          className="h-full w-full object-contain"
          style={{ objectPosition: bg.position || "center" }}
        />
      ) : (
        // cover 模式：用 next/image 优化加载，铺满裁切
        <Image
          src={bg.src}
          alt=""
          fill
          priority
          className="object-cover"
          style={{ objectPosition: bg.position || "center" }}
          sizes="100vw"
        />
      )}
      {bg.overlay && (
        <div className={`absolute inset-0 ${overlayClass}`} />
      )}
    </div>
  );
}
