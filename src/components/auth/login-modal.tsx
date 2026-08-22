"use client";

import { useEffect, useState } from "react";
import { X, Mail, ShieldCheck } from "lucide-react";
import { sendEmailCode, signInWithEmailCode } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Stage = "email" | "code" | "loading";

export function LoginModal({ open, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStage("email");
      setCode("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const loading = stage === "loading";

  async function handleSend() {
    setError(null);
    if (!validEmail) {
      setError("请输入有效的邮箱地址");
      return;
    }
    setStage("loading");
    try {
      await sendEmailCode(email);
      setStage("code");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "验证码发送失败，请稍后重试");
      setStage("email");
    }
  }

  async function handleVerify() {
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位验证码");
      return;
    }
    setStage("loading");
    try {
      await signInWithEmailCode(email, code);
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "验证失败，请检查验证码");
      setStage("code");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/30 p-4 animate-overlay"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-md rounded-[--radius-md] p-7 shadow-[--shadow-2] animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">登录 / 注册</h2>
            <p className="mt-1 text-sm text-caption">
              邮箱验证码登录，首次即自动注册
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-full p-1.5 text-caption transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-[--radius-sm] bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        {stage === "email" && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                邮箱
              </span>
              <div className="flex items-center gap-2 rounded-[--radius-sm] border border-stroke bg-white/70 px-3">
                <Mail className="h-4 w-4 text-caption" />
                <input
                  type="email"
                  value={email}
                  autoFocus
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full bg-transparent text-ink outline-none placeholder:text-caption/70"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="h-11 w-full rounded-[--radius-sm] bg-primary font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "发送中…" : "获取验证码"}
            </button>
          </div>
        )}

        {stage === "code" && (
          <div className="space-y-4">
            <div className="rounded-[--radius-sm] bg-primary/5 px-3 py-2 text-sm text-ink-soft">
              验证码已发送至 <span className="font-semibold text-ink">{email}</span>
              ，请查收邮件（可能在垃圾箱）。
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">
                验证码
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                autoFocus
                disabled={loading}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6 位数字"
                className="h-11 w-full rounded-[--radius-sm] border border-stroke bg-white/70 px-3 text-ink outline-none focus:border-primary"
              />
            </label>
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading}
              className="h-11 w-full rounded-[--radius-sm] bg-primary font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "登录中…" : "登录"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-sm text-caption underline-offset-2 hover:text-primary hover:underline"
            >
              重新输入邮箱
            </button>
          </div>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-[--radius-sm] bg-bg-soft/60 px-3 py-2.5 text-xs text-caption">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            登录后心愿单与对比将同步至云端，支持跨设备查看。后续将支持微信扫码一键登录。
          </span>
        </div>
      </div>
    </div>
  );
}
