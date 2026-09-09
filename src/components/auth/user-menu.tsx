"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Mail, FileText, BedDouble } from "lucide-react";
import { signOut, useAuthUser } from "@/lib/auth";
import { User } from "@/components/editorial/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** 顶栏右侧用户区：点击小人弹出下拉菜单（注册/登录、我的申请、退出登录）。 */
export function UserMenu() {
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    setSigningOut(true);
    await signOut();
    // 登录态变 null 后，auth 桥接已同步清空本地心愿单/对比镜像；
    // 硬刷新回首页，确保以游客态干净重渲染（不残留任何登录态）。
    window.location.assign("/");
  }

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
        className="icon-button"
      >
        <User />
      </button>

      {open && (
        <div className="bg-paper absolute right-0 top-[calc(100%+10px)] z-[1100] w-64 origin-top-right overflow-hidden rounded-2xl border border-stroke p-2 shadow-xl animate-popover">
          {!user && (
            <>
              <div className="px-2 pb-1 pt-1 text-xs text-caption">
                未登录，登录后可同步云端数据
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
            学校申请
          </Link>
          <Link
            href="/my-accommodations"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-[--radius-sm] px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
          >
            <BedDouble className="h-4 w-4" />
            住宿意向
          </Link>

          {user && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-[--radius-sm] px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-error/10 hover:text-error"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="确认退出登录？"
        confirmText="退出登录"
        cancelText="取消"
        pending={signingOut}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
