import type { CSSProperties } from "react";
import { SmartImage } from "./smart-image";
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
    <SmartImage
      className={`${styles.logo}${small ? ` ${styles.small}` : ""}${className ? ` ${className}` : ""}`}
      src="/images/brand/goalnz-logo"
      alt="GoalNZ"
      width={478}
      height={176}
      style={style}
      priority
    />
  );
}
