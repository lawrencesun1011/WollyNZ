import type { ReactNode } from "react";
import { cn } from "@/components/form-ui";
import type { StatusTone } from "@/lib/status";

/**
 * 状态徽章配色的唯一来源。
 *
 * 此前「学校申请卡」把配色内联在组件里、且带 1px 描边，
 * 「住宿意向卡」把配色写在 lib/accommodation.ts 里、且没有描边，
 * 导致同一个状态在两处长得不一样。现统一为：
 *   · 一律 1px 描边 + 胶囊形 + 12px 字号
 *   · 三种语气：draft（中性）/ active（朱红，进行中）/ muted（灰，已结束·已删除）
 */
const toneCls: Record<StatusTone, string> = {
  draft: "border-(--color-rule)/40 bg-(--color-neutral-soft) text-ink-soft",
  active: "border-(--color-accent)/30 bg-(--color-accent-soft) text-(--color-accent)",
  muted: "border-ink/15 bg-ink/5 text-ink-soft",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneCls[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
