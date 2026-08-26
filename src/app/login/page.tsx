"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, KeyRound, ShieldCheck, RotateCcw, GraduationCap } from "lucide-react";
import { sendEmailCode, signInWithEmailCode } from "@/lib/auth";

/** 登录 / 注册独立页面：邮箱 + 验证码同屏，居中卡片布局。 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (codeTimer.current) clearInterval(codeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      if (codeTimer.current) clearInterval(codeTimer.current);
      return;
    }
    codeTimer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (codeTimer.current) clearInterval(codeTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (codeTimer.current) clearInterval(codeTimer.current);
    };
  }, [cooldown]);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const busy = sending || verifying;

  async function handleSend() {
    setError(null);
    if (!validEmail) {
      setError("请输入有效的邮箱地址");
      emailRef.current?.focus();
      return;
    }
    setSending(true);
    try {
      await sendEmailCode(email);
      setSent(true);
      setCooldown(60);
    } catch (e: any) {
      setError(e?.message || "验证码发送失败，请稍后重试");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setError(null);
    if (!validEmail) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (!sent) {
      setError("请先获取验证码");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位验证码");
      return;
    }
    setVerifying(true);
    try {
      await signInWithEmailCode(email, code.trim());
      router.push("/");
    } catch (e: any) {
      setError(e?.message || "验证失败，请检查验证码");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-24 pt-28">
      {/* 顶部 Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light text-white shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="text-xl font-bold tracking-tight text-ink">GoalNZ</span>
      </Link>

      <div className="glass w-full max-w-md rounded-[--radius-md] p-7 shadow-[--shadow-2] animate-fade-up">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-ink">登录 / 注册</h1>
          <p className="mt-1 text-sm text-caption">
            邮箱验证码登录，首次即自动注册
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-[--radius-sm] bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* 邮箱 + 获取验证码（同一行） */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">
              邮箱
            </span>
            <div className="flex items-center gap-2">
              <div className="flex h-11 flex-1 items-center gap-2 rounded-[--radius-sm] border border-stroke bg-white/70 px-3">
                <Mail className="h-4 w-4 shrink-0 text-caption" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  autoFocus
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="you@example.com"
                  className="h-full w-full bg-transparent text-ink outline-none placeholder:text-caption/70"
                />
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={busy || !validEmail || cooldown > 0}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[--radius-sm] border border-primary/40 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  "发送中…"
                ) : cooldown > 0 ? (
                  `${cooldown}s`
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    获取
                  </>
                )}
              </button>
            </div>
          </label>

          {/* 验证码 */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">
              验证码
            </span>
            <div
              className={`flex h-11 items-center gap-2 rounded-[--radius-sm] border bg-white/70 px-3 transition-colors ${
                sent ? "border-stroke" : "border-stroke/50 opacity-60"
              }`}
            >
              <KeyRound className="h-4 w-4 shrink-0 text-caption" />
              <input
                type="text"
                inputMode="numeric"
                value={code}
                disabled={busy || !sent}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={sent ? "6 位数字" : "请先获取验证码"}
                className="h-full w-full bg-transparent text-ink outline-none placeholder:text-caption/70"
              />
            </div>
            {sent && (
              <p className="mt-1.5 text-xs text-caption">
                验证码已发送至 <span className="font-medium text-ink-soft">{email}</span>
                ，请查收邮件（可能在垃圾箱）。
              </p>
            )}
          </label>

          <button
            type="button"
            onClick={handleVerify}
            disabled={busy || !sent}
            className="h-11 w-full rounded-[--radius-sm] bg-primary font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {verifying ? "登录中…" : "登录 / 注册"}
          </button>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-[--radius-sm] bg-bg-soft/60 px-3 py-2.5 text-xs text-caption">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            登录后心愿单与对比将同步至云端，支持跨设备查看。后续将支持微信扫码一键登录。
          </span>
        </div>

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-caption underline-offset-2 hover:text-primary hover:underline"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
