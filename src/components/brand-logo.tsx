import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "./brand-logo.module.css";

export function BrandLogo({
  small = false,
  className = "",
  style,
}: {
  small?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Image
      className={`${styles.logo}${small ? ` ${styles.small}` : ""}${className ? ` ${className}` : ""}`}
      src="/images/brand/goalnz-logo.png"
      alt="GoalNZ"
      width={478}
      height={176}
      style={style}
      unoptimized
      priority
    />
  );
}
