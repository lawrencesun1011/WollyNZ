"use client";

import { useEffect, useRef, useState } from "react";
import { User, LogOut, Mail, ShieldCheck } from "lucide-react";
import { signOut, useAuthUser } from "@/lib/auth";

interface Props {
  onLoginClick: () => void;
}

/** 顶栏右侧用户区：未登录显示登录入口，已登录显示菜单（登出 / 绑定提示）。 */
export function UserMenu({ onLoginClick }: Props) {
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <button
        type="button"
        onClick={onLoginClick}
        aria-label="登录"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stroke text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
      >
        <User className="h-[18px] w-[18px]" />
      </button>
    );
  }

  // 匿名态：引导绑定邮箱（跨设备同步）；正式邮箱态：显示邮箱 + 登出
  if (user.isAnonymous) {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="账户"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stroke text-caption transition-colors hover:bg-primary/5 hover:text-primary"
        >
          <User className="h-[18px] w-[18px]" />
        </button>
        {open && (
          <div className="glass absolute right-0 top-11 w-64 rounded-[--radius-sm] p-3 shadow-[--shadow-2] animate-fade-up">
            <div className="flex items-start gap-2 rounded-[--radius-sm] bg-primary/5 px-2.5 py-2 text-xs text-ink-soft">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>当前为匿名游客，心愿单已暂存云端。绑定邮箱后可跨设备同步。</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLoginClick();
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-[--radius-sm] bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              <Mail className="h-4 w-4" />
              绑定邮箱
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-full border border-stroke px-2.5 text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[140px] truncate text-sm">{user.email}</span>
      </button>
      {open && (
        <div className="glass absolute right-0 top-11 w-56 rounded-[--radius-sm] p-2 shadow-[--shadow-2] animate-fade-up">
          <div className="px-2 py-1.5 text-xs text-caption">{user.email}</div>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="flex w-full items-center gap-2 rounded-[--radius-sm] px-2 py-2 text-sm text-ink-soft transition-colors hover:bg-error/10 hover:text-error"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
