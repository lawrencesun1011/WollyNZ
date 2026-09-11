"use client";

/**
 * Supabase 客户端单例（浏览器端）。
 *
 * 两套用法并存：
 * - getSupabase()：给认证用（@supabase/supabase-js，自带 session 持久化与续期）。
 * - restBase() / anonKey()：给手写 fetch 的模块用（user-data / user-info 是
 *   直接打 PostgREST 的，沿用项目原有写法，不引入 query builder）。
 *
 * 注意：PostgREST 网关要求每个请求都带 apikey 头（放 anon key），
 * 否则会直接 401 —— 这是从 CloudBase 网关迁过来最容易漏的一处。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
let warned = false;

/** 是否已配置 Supabase；未配置时云端功能整体降级（不抛错，避免白屏）。 */
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** 获取（并缓存）Supabase 客户端；未配置时返回 null。 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (!warned) {
      console.warn(
        "[supabase] 缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY，云端功能不可用"
      );
      warned = true;
    }
    return null;
  }
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** PostgREST 基址，供手写 fetch 的模块拼接表名。 */
export function restBase(): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1`;
}

/** anon key，用作 PostgREST 的 apikey 头。 */
export function anonKey(): string | null {
  return SUPABASE_ANON_KEY ?? null;
}

/**
 * 构造 PostgREST 请求头：apikey + 用户 JWT + 可选的业务头。
 * RLS 依据 Authorization 里的 JWT 判定 auth.uid()，apikey 只负责通过网关。
 */
export function restAuthHeaders(
  token: string,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    apikey: anonKey() ?? "",
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}
