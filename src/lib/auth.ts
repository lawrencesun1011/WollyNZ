"use client";

/**
 * Supabase Auth 客户端认证封装（邮箱验证码模式）。
 *
 * 对齐本项目原有的登录交互：输入邮箱 → 收 6 位数字码 → 填码即登录/注册。
 * - 发码：auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
 * - 验码：auth.verifyOtp({ email, token: code, type: "email" })
 *   shouldCreateUser 为 true 时，未注册邮箱验码成功即自动注册并登录。
 * - 登录态：SDK 自动把 session 持久化到 localStorage 并静默续期，
 *   这里再包一层全局 store，保证所有组件共享同一份 user 状态。
 *
 * Supabase 控制台前置（缺一不可）：
 * 1. Authentication → Providers → Email 保持开启。
 * 2. Authentication → Email Templates：「Magic Link」模板正文里加入 {{ .Token }}，
 *    否则用户只会收到一个 magic link，拿不到要填的 6 位数字。
 * 3. Authentication → SMTP：配置自定义发信服务。Supabase 内置邮件服务每小时
 *    仅 2 封且只能发给项目成员，无法用于正式环境。
 */

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export interface AuthUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
}

/**
 * 全局登录态 store：所有组件共享同一份 user 状态，登录/登出即时广播。
 * 避免「每个组件各自订阅 SDK」导致的实例不同步、事件错过（如登录后回首页首帧为 null）。
 */
let currentUser: AuthUser | null = null;
const userListeners = new Set<(u: AuthUser | null) => void>();
let storeStarted = false;

/**
 * 登录态是否已完成「首次恢复」。用于区分两种情况：
 *   - false：尚未确定（SDK 还在异步恢复 session）——此时不能判定为未登录
 *   - true ：已确定（可能是已登录，也可能是确实未登录）
 * 页面据此避免「已登录用户首帧闪一下登录墙」。
 */
let authReady = false;
const readyListeners = new Set<() => void>();

function emitReady() {
  if (authReady) return;
  authReady = true;
  readyListeners.forEach((l) => l());
}

function emitUser(next: AuthUser | null) {
  // 浅比较，避免无变化时重复通知
  if (currentUser?.uid === next?.uid && currentUser?.email === next?.email) {
    if ((currentUser === null) === (next === null)) return;
  }
  currentUser = next;
  userListeners.forEach((l) => l(next));
}

/**
 * 将 Supabase session 映射为本项目的登录态。
 * 口径：只有带邮箱的正式用户才算「已登录」；无邮箱的匿名会话视为未登录。
 */
function toAuthUser(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u?.id || !u.email) return null;
  return { uid: u.id, email: u.email, isAnonymous: false };
}

/** 初始化 Supabase 客户端（幂等），并启动全局登录态 store。 */
export function initSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    // 未配置 Supabase（缺 URL / anon key）：直接视为「已确定未登录」
    emitReady();
    return null;
  }
  if (storeStarted) return supabase;
  storeStarted = true;

  // 同步当前态
  supabase.auth
    .getSession()
    .then(({ data }) => emitUser(toAuthUser(data.session)))
    .catch(() => emitUser(null))
    .finally(() => emitReady());

  // 订阅后续变化（登录、登出、token 续期）
  supabase.auth.onAuthStateChange((_event, session) => {
    emitUser(toAuthUser(session));
    emitReady();
  });

  return supabase;
}

/**
 * 订阅登录态变化（基于全局 store）。返回取消订阅函数。
 * 注意：全局 store 由 initSupabase 启动一次；若尚未初始化，这里兜底启动。
 */
export function onUserChanged(cb: (u: AuthUser | null) => void): () => void {
  initSupabase();
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
    () => null // SSR 快照：服务端无登录态
  );
}

/**
 * 订阅「登录态首次恢复完成」。
 * 配合 useAuthUser 使用：只有 ready 为 true 时，user === null 才代表「确实未登录」，
 * 否则只是「登录态尚未恢复」，此时应显示加载态而不是登录墙。
 */
export function subscribeAuthReady(cb: () => void): () => void {
  initSupabase();
  readyListeners.add(cb);
  return () => {
    readyListeners.delete(cb);
  };
}

/** React hook：登录态是否已确定（SSR 恒为 false）。 */
export function useAuthReady(): boolean {
  return useSyncExternalStore(
    (cb) => subscribeAuthReady(() => cb()),
    () => authReady,
    () => false // SSR：服务端始终未就绪
  );
}

/** 发送邮箱验证码（未注册邮箱会一并触发注册流程）。 */
export async function sendEmailCode(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("认证未初始化");
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // 用户若直接点邮件里的链接而非填码，也会回到本站
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number; code?: string };
    console.error("[auth] sendEmailCode 失败:", err);
    throw new Error(err.message || "发送验证码失败");
  }
}

/**
 * 用邮箱 + 验证码完成登录/注册。
 * verifyOtp 成功即建立会话；邮箱未注册时由 shouldCreateUser 自动注册。
 */
export async function signInWithEmailCode(
  email: string,
  code: string,
  extra?: { name?: string; province?: string; city?: string }
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("认证未初始化");
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) throw error;

    emitUser(toAuthUser(data.session));
    emitReady();

    // 登录/注册成功后同步基础信息（至少邮箱）；注册页携带的称呼/省份/城市一并写入。
    // 失败静默忽略（表可能未建）。
    const u = data.session?.user;
    if (u?.email) {
      try {
        const { ensureUserInfo } = await import("./user-info");
        await ensureUserInfo(u.id, { email: u.email, ...extra });
      } catch {
        /* 忽略：user_info 写入失败不影响登录态 */
      }
    }
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number; code?: string };
    console.error("[auth] 邮箱验证码登录失败:", err);
    throw new Error(err.message || "验证码校验失败");
  }
}

/** 同步获取当前登录用户（不经过 React hook，供登录回调后立即拿到 uid）。 */
export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

/** 登出。 */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } finally {
    // 兜底：确保即使 SDK 未触发 onAuthStateChange，UI 也立即回到未登录
    emitUser(null);
  }
}

/** 获取当前登录用户的 access token（JWT），用于 PostgREST 网关鉴权（RLS）。 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    // getSession 会在 token 临近过期时自动续期
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch (e) {
    console.warn("[auth] 获取 access token 失败", e);
    return null;
  }
}
