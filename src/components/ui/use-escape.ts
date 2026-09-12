"use client";

import { useEffect } from "react";

/**
 * 统一 Esc 关闭：弹窗 / 浮层通用。
 *
 * 与「点击遮罩关闭」并列，保证键盘用户也能退出浮层。
 * 此前只有 confirm-dialog 处理了 Escape，其余 6 个弹窗都无法用键盘关闭。
 */
export function useEscapeKey(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, enabled]);
}
