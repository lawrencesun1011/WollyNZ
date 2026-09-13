import type { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 className（clsx + tailwind-merge），全站共用。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 输入框 / 下拉框统一基类：圆角 7px 风、描边、聚焦变主色、禁用态。 */
const controlBase =
  "w-full rounded-control border border-stroke bg-white px-3 py-2.5 text-base text-ink outline-none transition-colors hover:border-primary/40 focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft disabled:opacity-70";

/** 文本 / 日期等输入框。error 时加红色描边。 */
export function inputCls(error?: string) {
  return cn(controlBase, error && "border-error");
}

/** 下拉选择框（在 input 基础上加 appearance-none）。 */
export function selectCls(extra = "") {
  return `${controlBase} appearance-none ${extra}`;
}

/** 表单字段：18px 粗体标签 + 控件 + 必填(*)/选填标记 + 错误/提示文字。 */
export function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="flex items-center gap-1 text-lg font-bold text-ink">
        {label}
        {required ? (
          <span className="text-error">*</span>
        ) : (
          <span className="text-xs font-normal text-ink-soft">（选填）</span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

/** 表单区块标题：18px 粗体 + 必填(*)/选填标记。 */
export function SectionTitle({
  title,
  required,
}: {
  title: string;
  required?: boolean;
}) {
  return (
    <h3 className="flex items-center gap-1 text-lg font-bold text-ink">
      {title}
      {required ? (
        <span className="text-error">*</span>
      ) : (
        <span className="text-xs font-normal text-ink-soft">（选填）</span>
      )}
    </h3>
  );
}

/* ============================================================
   按钮：唯一来源（3 变体 × 2 尺寸）
   · md：主操作 —— 16px，min-height 44px
   · sm：行内操作 —— 15px（text-sm），min-height 36px
   统一圆角（rounded-control = 12px）、统一焦点环与禁用态。
   调用处如需 shrink-0 / flex-1 / w-full 等布局类，自行追加。
   新代码请直接用 buttonCls()；下方常量仅为兼容既有调用点。
   ============================================================ */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm" | "xs";

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60";

const buttonSizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 py-2.5 text-base",
  sm: "min-h-9 px-4 py-2 text-sm",
  xs: "min-h-8 px-3 py-1.5 text-xs",
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary font-semibold text-white hover:bg-primary/90",
  secondary: "border border-stroke font-medium text-ink hover:bg-primary/5",
  ghost: "font-medium text-ink-soft hover:bg-primary/5",
};

/** 组合按钮类名，例：buttonCls("primary", "sm")。 */
export function buttonCls(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
) {
  return cn(buttonBase, buttonSizes[size], buttonVariants[variant], extra);
}

/* 兼容既有调用点的常量别名。 */
export const primaryBtnCls = buttonCls("primary", "md");
export const secondaryBtnCls = buttonCls("secondary", "md");
export const ghostBtnCls = buttonCls("ghost", "md");
export const primaryBtnSmCls = buttonCls("primary", "sm");
export const secondaryBtnSmCls = buttonCls("secondary", "sm");
export const ghostBtnSmCls = buttonCls("ghost", "sm");

/* 图标按钮（仅图标，无文字）：圆形，用于关闭 / 前后翻页 / 移除等。
   尺寸由调用处指定，默认 h-9 w-9。 */
export function iconBtnCls(size = "h-9 w-9", extra?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    size,
    extra,
  );
}

/* 药丸标签 / 筛选 chip（可带激活态）。 */
export function chipCls(active = false, extra?: string) {
  return cn(
    "inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-stroke bg-white text-ink hover:border-primary/40 hover:text-primary",
    extra,
  );
}

/* 下拉 / 菜单项（整行可点，用于用户菜单、页眉下拉等）。 */
export function menuItemCls(extra?: string) {
  return cn(
    "flex w-full items-center gap-2 rounded-control px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-(--color-paper-hover)",
    extra,
  );
}
