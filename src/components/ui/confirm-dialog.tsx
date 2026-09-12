"use client";

import { useEffect } from "react";
import { buttonCls } from "@/components/form-ui";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** 确认操作进行中：禁用按钮，防止重复提交 */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 通用二次确认弹窗：遮罩 + 居中纸色卡片。
 * 不透明实底（bg-paper），沿用项目弹窗统一风格（圆角描边 + 阴影）。
 * 点击遮罩或「取消」关闭；pending 时禁用两个按钮。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // ESC 关闭（pending 时不拦截，避免打断进行中的操作）
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-(--z-confirm) flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-overlay"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-paper w-full max-w-sm rounded-surface border border-stroke p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-ink-soft">{description}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className={buttonCls("ghost", "sm")}
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={buttonCls("ghost", "sm", "bg-error/10 font-semibold text-error hover:bg-error/15")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
