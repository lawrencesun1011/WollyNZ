"use client";

/**
 * 云端用户数据（心愿单 / 对比）读写层（PostgreSQL）。
 *
 * 本环境为 CloudBase for Supabase 模式，仅含 PostgreSQL 实例（无 NoSQL），
 * 因此用户数据存于 public.user_collections 表，经 PostgREST 网关访问。
 *
 * 鉴权：写入需携带登录用户的 JWT（access token），由 RLS 限制
 *   owner = auth.uid()  —— 仅本人可读写自己的行。
 * 未登录（匿名）时取不到用户 token，径直走 localStorage（见 favorites.ts）。
 *
 * 文档结构（表 user_collections）：
 *   owner      text PK   —— 等于 auth.uid()
 *   favorites  jsonb     —— string[]
 *   compare    jsonb     —— string[]
 *   updated_at timestamptz
 *
 * 行为：
 * - 已登录：以云端数据为准；写入时增量更新云端。
 * - 首登合并：登录后若云端为空，把 localStorage 心愿单/对比写入云端（迁移）。
 * - 失败降级：云端写入失败回退 localStorage，不影响浏览。
 */

import { getAccessToken } from "./auth";

export interface UserCollections {
  favorites: string[];
  compare: string[];
}

const TABLE = "user_collections";
const LS_FAV = "wollyn:schools:favorites";
const LS_CMP = "wollyn:schools:compare";

function gatewayBase(): string {
  const envId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID!;
  return `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest`;
}

function readLS(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeLS(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* 忽略 */
  }
}

/** 从云端拉取当前用户集合；返回 null 表示无云端数据/未登录/失败。 */
export async function fetchCloudCollections(uid: string): Promise<UserCollections | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${gatewayBase()}/${TABLE}?owner=eq.${encodeURIComponent(uid)}&select=favorites,compare`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.warn("[user-data] 云端读取失败", res.status);
      return null;
    }
    const rows = (await res.json()) as Array<{ favorites?: string[]; compare?: string[] }>;
    const doc = rows[0];
    if (!doc) return null;
    return {
      favorites: Array.isArray(doc.favorites) ? doc.favorites : [],
      compare: Array.isArray(doc.compare) ? doc.compare : [],
    };
  } catch (e) {
    console.warn("[user-data] 云端读取异常", e);
    return null;
  }
}

/** 云端 upsert（按 owner 主键插入或更新）。 */
export async function saveCloudCollections(
  uid: string,
  data: UserCollections
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${gatewayBase()}/${TABLE}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        owner: uid,
        favorites: data.favorites,
        compare: data.compare,
      }),
    });
    if (!res.ok) {
      console.warn("[user-data] 云端写入失败", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[user-data] 云端写入异常，降级 localStorage", e);
    return false;
  }
}

/**
 * 首登合并：登录后调用。
 * - 云端为空 → 把本地 localStorage 心愿单/对比写入云端（首次即迁移）。
 * - 云端已有 → 用云端覆盖本地（以云端为准），返回云端数据供上层使用。
 */
export async function mergeLocalToCloudOnLogin(uid: string): Promise<UserCollections | null> {
  const cloud = await fetchCloudCollections(uid);
  const localFav = readLS(LS_FAV);
  const localCmp = readLS(LS_CMP);

  if (!cloud) {
    // 云端无文档：将本地数据上传
    const merged: UserCollections = {
      favorites: Array.from(new Set(localFav)),
      compare: Array.from(new Set(localCmp)).slice(0, 4),
    };
    if (localFav.length || localCmp.length) {
      await saveCloudCollections(uid, merged);
    }
    return merged;
  }

  // 云端有数据：以云端为准，回写本地镜像
  writeLS(LS_FAV, cloud.favorites);
  writeLS(LS_CMP, cloud.compare);
  return cloud;
}

export const userDataKeys = { LS_FAV, LS_CMP };
