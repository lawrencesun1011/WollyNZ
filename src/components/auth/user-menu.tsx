"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, LogOut, Mail, FileText } from "lucide-react";
import { signOut, useAuthUser } from "@/lib/auth";

interface Props {
  onLoginClick: () => void;
}

/** 顶栏右侧用户区：点击小人弹出下拉菜单（注册/登录、我的申请、退出登录）。 */
export function UserMenu() {
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="账户菜单"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stroke text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
      >
        <User className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="glass absolute right-0 top-11 w-64 rounded-[--radius-sm] p-2 shadow-[--shadow-2] animate-fade-up">
          {!user && (
            <>
              <div className="px-2 pb-1 pt-1 text-xs text-caption">
                未登录，登录后可同步心愿单
              </div>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-[--radius-sm] px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                注册 / 登录
              </Link>
            </>
          )}

          {user && (
            <div className="px-2 py-1.5 text-xs text-caption">
              {user.email ?? "已登录"}
            </div>
          )}

          <Link
            href="/my-applications"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-[--radius-sm] px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
          >
            <FileText className="h-4 w-4" />
            我的申请
          </Link>

          {user && (
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await signOut();
              }}
              className="flex w-full items-center gap-2 rounded-[--radius-sm] px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-error/10 hover:text-error"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          )}
        </div>
      )}
    </div>
  );
}
