import type { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 className（clsx + tailwind-merge），全站共用。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 输入框 / 下拉框统一基类：圆角 7px 风、描边、聚焦变主色、禁用态。 */
const controlBase =
  "w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors hover:border-primary/40 focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft disabled:opacity-70";

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

/* 按钮：编辑风深湖绿，统一 20px（与全局 .accom-editorial .bg-primary 一致）；
   调用处如需 shrink-0 / flex-1 等布局类，自行追加即可。 */
export const primaryBtnCls =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[20px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60";

export const secondaryBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-stroke px-4 py-2.5 text-[20px] font-medium text-ink transition-colors hover:bg-primary/5 disabled:opacity-60";

export const ghostBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[20px] font-medium text-ink-soft transition-colors hover:bg-primary/5 disabled:opacity-60";

/* 小号按钮（14px）：内联语境操作，如「验证 / 确认 / 日历确定 / 导入心愿单」。 */
export const primaryBtnSmCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60";

export const secondaryBtnSmCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-stroke px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-primary/5 disabled:opacity-60";

export const ghostBtnSmCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-primary/5 disabled:opacity-60";
