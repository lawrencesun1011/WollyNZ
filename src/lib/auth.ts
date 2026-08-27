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

import { useSyncExternalStore } from "react";
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

/**
 * 全局登录态 store：所有组件共享同一份 user 状态，登录/登出即时广播。
 * 避免「每个组件各自订阅 SDK」导致的实例不同步、事件错过（如登录后回首页首帧为 null）。
 */
let currentUser: AuthUser | null = null;
const userListeners = new Set<(u: AuthUser | null) => void>();
let storeStarted = false;

function emitUser(next: AuthUser | null) {
  // 浅比较，避免无变化时重复通知
  if (currentUser?.uid === next?.uid && currentUser?.email === next?.email) {
    if ((currentUser === null) === (next === null)) return;
  }
  currentUser = next;
  userListeners.forEach((l) => l(next));
}

function startUserStore() {
  const a = getAuth();
  if (storeStarted || !a) return;
  storeStarted = true;
  // 同步当前态
  a.getLoginState()
    .then((state: any) => emitUser(toAuthUser(state)))
    .catch(() => emitUser(null));
  // 订阅后续变化
  a.onLoginStateChanged((loginState: any) => emitUser(toAuthUser(loginState)));
}

/**
 * 将 CloudBase loginState 映射为本项目的登录态。
 * 口径：只有邮箱登录（user.email 存在且非匿名）才算「已登录」；
 * 匿名态、或没有邮箱的态一律视为「未登录」(返回 null)，小人区不显示退出登录。
 */
function toAuthUser(loginState: any): AuthUser | null {
  const u = loginState?.user;
  if (!u) return null;
  const isAnonymous = u.loginType === "ANONYMOUS" || !u.email;
  if (isAnonymous) return null;
  return {
    uid: u.uid ?? u.openid ?? u.customUserId ?? "",
    email: u.email ?? null,
    isAnonymous: false,
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
    region: "ap-shanghai",
  });
  auth = app.auth();
  initialized = true;
  startUserStore();
  return auth;
}

/** 获取当前 auth 实例（确保已初始化）。 */
function getAuth(): any {
  return initCloudBase();
}

/**
 * 订阅登录态变化（基于全局 store）。返回取消订阅函数。
 * 注意：全局 store 由 initCloudBase 启动一次；若尚未初始化，这里兜底启动。
 */
export function onUserChanged(cb: (u: AuthUser | null) => void): () => void {
  initCloudBase();
  startUserStore();
  cb(currentUser);
  userListeners.add(cb);
  return () => {
    userListeners.delete(cb);
  };
}

/**
 * React hook：订阅当前用户态。
 * 基于 useSyncExternalStore，登录/登出即时同步（含 SSR 安全快照）。
 */
export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(
    (cb) => onUserChanged(() => cb()),
    () => currentUser,
    () => null, // SSR 快照：服务端无登录态
  );
}

/** 返回原始 loginState（未经 toAuthUser 过滤），供 auth-init 判断是否匿名残留。 */
export function getLoginStateRaw(): Promise<any> {
  const a = getAuth();
  if (!a) return Promise.resolve(null);
  return a.getLoginState().catch(() => null);
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
export async function signInWithEmailCode(
  email: string,
  code: string,
  extra?: { name?: string; province?: string; city?: string }
): Promise<void> {
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
    // 双保险：主动从 SDK 拉一次最新 loginState 并 emit，
    // 保证即便 SDK 内部未及时触发 onLoginStateChanged，UI 也能立即更新到登录态。
    try {
      const state: any = await a.getLoginState();
      emitUser(toAuthUser(state));
      // 登录/注册成功后始终同步基础信息（至少邮箱）；注册页携带的称呼/省份/城市一并写入。
      // 失败静默忽略（表可能未建）。merge-duplicates 仅更新提供的列，不会清空已有字段。
      if (currentUser) {
        const { ensureUserInfo } = await import("./user-info");
        await ensureUserInfo(currentUser.uid, {
          email: currentUser.email ?? email,
          ...extra,
        }).catch(() => {});
      }
    } catch (refreshErr) {
      console.warn("[auth] post-login getLoginState failed:", refreshErr);
    }
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

/** 同步获取当前登录用户（不经过 React hook，供登录回调后立即拿到 uid）。 */
export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

/** 登出（匿名态也会清除）。 */
export async function signOut(): Promise<void> {
  const a = getAuth();
  if (!a) return;
  try {
    await a.signOut();
  } finally {
    // 兜底：确保即使 SDK 未触发 onLoginStateChanged，UI 也立即回到未登录
    emitUser(null);
  }
}

/** 获取当前登录用户的 access token（JWT），用于 PostgREST 网关鉴权（RLS）。 */
export async function getAccessToken(): Promise<string | null> {
  const a = getAuth();
  if (!a) return null;
  try {
    const info = await a.getAccessToken();
    return (info as any)?.accessToken ?? null;
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
