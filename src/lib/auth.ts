"use client";

/**
 * CloudBase Auth v2 客户端认证封装（邮箱验证码模式）。
 *
 * 适配本项目的 @cloudbase/js-sdk 版本（官方邮箱验证码登录文档）：
 * - 监听登录态：auth.onLoginStateChanged(cb)
 * - 发码：auth.getVerification({ email }) → 返回 verificationInfo
 * - 验码 + 登录/注册：auth.signInWithEmail({ verificationInfo, verificationCode, email })
 *   内部按 verificationInfo.is_user 分支：已注册用户直接登录，新用户自动注册
 * - 匿名：auth.signInAnonymously() 返回 { data, error }
 *
 * 控制台前置：身份认证/登录方式 开启「邮箱验证码」，并配置发件邮箱（SMTP 或零配置代发）。
 */

import { useEffect, useState } from "react";
import cloudbase from "@cloudbase/js-sdk";

const ENV_ID = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY!;

export interface AuthUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
}

let app: any = null;
let auth: any = null;
let initialized = false;
let emailVerifyCtx: { verificationInfo: any; email: string } | null = null;

function toAuthUser(loginState: any): AuthUser | null {
  const u = loginState?.user;
  if (!u) return null;
  return {
    uid: u.uid ?? u.openid ?? u.customUserId ?? "",
    email: u.email ?? null,
    isAnonymous: u.loginType === "ANONYMOUS" || !u.email,
  };
}

/** 初始化 CloudBase 客户端（幂等），返回 auth 实例。 */
export function initCloudBase(): any {
  if (initialized && app && auth) return auth;
  if (!ENV_ID || !PUBLISHABLE_KEY) {
    console.warn(
      "[auth] 缺少 NEXT_PUBLIC_CLOUDBASE_ENV_ID / PUBLISHABLE_KEY，登录功能不可用"
    );
    return null;
  }
  app = cloudbase.init({
    env: ENV_ID,
    accessKey: PUBLISHABLE_KEY,
  });
  auth = app.auth();
  initialized = true;
  return auth;
}

/** 获取当前 auth 实例（确保已初始化）。 */
function getAuth(): any {
  return initCloudBase();
}

/** 监听登录态变化，返回取消订阅函数。 */
export function onUserChanged(cb: (u: AuthUser | null) => void): () => void {
  const a = getAuth();
  if (!a) return () => {};

  // 先同步当前态
  a.getLoginState()
    .then((state: any) => cb(toAuthUser(state)))
    .catch(() => cb(null));

  const handler = (loginState: any) => cb(toAuthUser(loginState));
  a.onLoginStateChanged(handler);
  return () => {
    a.offLoginStateChanged?.(handler);
  };
}

/** React hook：订阅当前用户态（首帧为空，挂载后同步）。 */
export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    initCloudBase();
    const unsub = onUserChanged(setUser);
    return unsub;
  }, []);
  return user;
}

/** 进站匿名兜底：若未登录则自动匿名登录。 */
export async function ensureAnonymous(): Promise<AuthUser | null> {
  const a = getAuth();
  if (!a) return null;
  const state = await a.getLoginState();
  if (state?.user) return toAuthUser(state);
  try {
    const { data, error } = await a.signInAnonymously();
    if (error) throw error;
    return toAuthUser(data);
  } catch (e) {
    console.warn("[auth] 匿名登录失败（可能未开启匿名登录方式）", e);
    return null;
  }
}

/** 发送邮箱验证码：调用 getVerification，缓存 verificationInfo 供后续登录/注册使用。 */
export async function sendEmailCode(email: string): Promise<void> {
  const a = getAuth();
  if (!a) throw new Error("认证未初始化");
  try {
    const res: any = await a.getVerification({ email });
    if (res?.error) throw res.error;
    emailVerifyCtx = { verificationInfo: res?.data ?? res, email };
  } catch (e: any) {
    console.error("[auth] sendEmailCode 失败:", {
      message: e?.message,
      code: e?.code,
      requestId: e?.requestId,
      status: e?.status,
      error: e,
    });
    throw new Error(
      e?.message || `发送验证码失败${e?.code ? ` (code=${e.code})` : ""}`,
    );
  }
}

/**
 * 用邮箱 + 验证码完成登录/注册。
 * signInWithEmail 内部按 verificationInfo.is_user 自动分支：
 * 已注册用户直接登录，新用户自动注册（注册成功即登录）。
 */
export async function signInWithEmailCode(email: string, code: string): Promise<void> {
  const a = getAuth();
  if (!a) throw new Error("认证未初始化");
  if (!emailVerifyCtx || emailVerifyCtx.email !== email) {
    throw new Error("请先获取验证码");
  }
  try {
    const res: any = await a.signInWithEmail({
      verificationInfo: emailVerifyCtx.verificationInfo,
      verificationCode: code,
      email,
    });
    if (res?.error) throw res.error;
  } catch (e: any) {
    console.error("[auth] 邮箱验证码登录失败:", {
      message: e?.message,
      code: e?.code,
      requestId: e?.requestId,
      status: e?.status,
      error: e,
    });
    throw new Error(
      e?.message || `验证失败${e?.code ? ` (code=${e.code})` : ""}`,
    );
  } finally {
    emailVerifyCtx = null;
  }
}

/** 登出（匿名态也会清除）。 */
export async function signOut(): Promise<void> {
  const a = getAuth();
  if (!a) return;
  await a.signOut();
}

/** 获取当前登录用户的 access token（JWT），用于 PostgREST 网关鉴权（RLS）。 */
export function getAccessToken(): string | null {
  const a = getAuth();
  if (!a) return null;
  try {
    const info = a.getAccessToken();
    return info?.accessToken ?? null;
  } catch (e) {
    console.warn("[auth] 获取 access token 失败", e);
    return null;
  }
}

/**
 * 预留：后续升级为微信扫码登录时调用。
 * 开启微信登录方式后，将当前匿名/邮箱账号关联到微信：
 *   await auth.currentUser.linkWithWechat({ ... })
 * 关联后 uid 不变，云端数据保留。本期不实现。
 */
// export async function linkWithWechat(): Promise<void> { /* TODO */ }
