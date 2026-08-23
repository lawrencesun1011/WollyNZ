"use client";

/**
 * CloudBase Auth v2 客户端认证封装（supabase-like 模式）。
 *
 * 适配本项目的 @cloudbase/js-sdk 版本：
 * - 监听登录态：auth.onLoginStateChanged(cb)
 * - 发码：auth.signInWithOtp({ email }) 发起邮箱验证码挑战
 * - 验码：auth.verifyOtp({ email, token }) 完成登录/注册
 * - 匿名：auth.signInAnonymously() 返回 { data, error }
 *
 * 注意：邮箱验证码模板需在 CloudBase 控制台设为「发送验证码」模式；
 * 若验码报 missing/invalid type，则 verifyOtp 需补 type 字段（如 type: 'EMAIL'）。
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

/** 发送邮箱验证码。 */
export async function sendEmailCode(email: string): Promise<void> {
  const a = getAuth();
  if (!a) throw new Error("认证未初始化");
  const { error } = await a.signInWithOtp({ email });
  if (error) {
    console.error("[auth] sendEmailCode 失败:", {
      message: error.message,
      code: (error as any).code,
      requestId: (error as any).requestId,
      status: (error as any).status,
      error,
    });
    throw new Error(
      error.message ||
        `发送验证码失败${(error as any).code ? ` (code=${(error as any).code})` : ""}`,
    );
  }
}

/** 用邮箱 + 验证码完成登录/注册。 */
export async function signInWithEmailCode(email: string, code: string): Promise<void> {
  const a = getAuth();
  if (!a) throw new Error("认证未初始化");
  const { error } = await a.verifyOtp({ email, token: code });
  if (error) {
    console.error("[auth] verifyOtp 失败:", {
      message: error.message,
      code: (error as any).code,
      requestId: (error as any).requestId,
      status: (error as any).status,
      error,
    });
    throw new Error(
      error.message ||
        `验证失败${(error as any).code ? ` (code=${(error as any).code})` : ""}`,
    );
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
