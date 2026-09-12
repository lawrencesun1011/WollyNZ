import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/components/form-ui";

/** 统一加载态：居中转圈 + 文案。用于路由 loading 与异步区块。 */
export function LoadingState({
  label = "加载中…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-center text-ink-soft",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** 统一空态：可选图标 + 说明文案。 */
export function EmptyState({
  children,
  icon,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-center",
        className,
      )}
    >
      {icon}
      <p className="text-sm text-ink-soft">{children}</p>
    </div>
  );
}
