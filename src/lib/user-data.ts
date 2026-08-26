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
import type { ApplicationItem } from "./applications";

export interface FavoriteItem {
  id: string;
  name?: string;
  kind?: "school" | "ece";
}

export interface UserCollections {
  favorites: FavoriteItem[];
  compare: FavoriteItem[];
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

function writeLS(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 忽略 */
  }
}

/** 从云端拉取当前用户集合；owner 由 RLS 过滤，无需前端传 uid。返回 null 表示无云端数据/未登录/失败。 */
export async function fetchCloudCollections(): Promise<UserCollections | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${gatewayBase()}/${TABLE}?select=favorites,compare`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.warn("[user-data] 云端读取失败", res.status);
      return null;
    }
    const data = (await res.json()) as Array<{
      favorites?: unknown;
      compare?: unknown;
    }>;
    const doc = data[0];
    if (!doc) return null;
    return {
      favorites: normalizeItems(doc.favorites),
      compare: normalizeItems(doc.compare),
    };
  } catch (e) {
    console.warn("[user-data] 云端读取异常", e);
    return null;
  }
}

/**
 * 兼容旧数据：云端可能存的是 string[]（仅 id），也可能已经是 {id,name}[]。
 * 统一规范化为 {id,name}[]；旧 id-only 数据 name 留空，下次写时会补回。
 */
function normalizeItems(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x): FavoriteItem | null => {
      if (typeof x === "string") return { id: x, name: "", kind: "school" };
      if (x && typeof x === "object" && "id" in x) {
        const o = x as { id?: unknown; name?: unknown; kind?: unknown };
        return {
          id: String(o.id ?? ""),
          name: typeof o.name === "string" ? o.name : "",
          kind: o.kind === "ece" ? "ece" : "school",
        };
      }
      return null;
    })
    .filter((x): x is FavoriteItem => !!x && !!x.id);
}

/** 云端 upsert（按 owner 主键插入或更新）。owner 由服务端 RLS 默认值 auth.uid() 注入。 */
export async function saveCloudCollections(
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
export async function mergeLocalToCloudOnLogin(
  resolveName?: (id: string) => string | undefined
): Promise<UserCollections | null> {
  const cloud = await fetchCloudCollections();
  const localFav = readFavLS();
  const localCmp = readLS(LS_CMP);

  // 兼容旧 string[] 与新 {id,kind}[]：统一为 FavoriteItem[]（缺 kind 默认 school）
  const favItems = (entries: { id: string; kind?: "school" | "ece" }[]): FavoriteItem[] =>
    entries.map((e) => ({ id: e.id, kind: e.kind ?? "school", name: resolveName?.(e.id) ?? "" }));

  if (!cloud) {
    // 云端无文档：将本地数据上传（补充学校名字供后台分析）
    const merged: UserCollections = {
      favorites: favItems(localFav),
      compare: Array.from(new Set(localCmp))
        .slice(0, 4)
        .map((id) => ({ id, name: resolveName?.(id) ?? "" })),
    };
    if (localFav.length || localCmp.length) {
      await saveCloudCollections(merged);
    }
    return merged;
  }

  // 云端有数据：以云端为准，回写本地镜像。
  // 注意：必须保留 kind，否则本地被写成纯 id 数组后重新读取时
  // 所有项都会默认成 "school"，导致幼儿园心愿单被错分到「中小学」分组。
  writeLS(
    LS_FAV,
    cloud.favorites.map((x) => ({ id: x.id, kind: x.kind === "ece" ? "ece" : "school" }))
  );
  writeLS(LS_CMP, cloud.compare.map((x) => x.id));
  return cloud;
}

/** 读取本地心愿单，兼容旧 string[] 与新 {id,kind}[] 两种 localStorage 格式。 */
function readFavLS(): { id: string; kind?: "school" | "ece" }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_FAV);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const out: { id: string; kind?: "school" | "ece" }[] = [];
    for (const it of parsed) {
      if (typeof it === "string") out.push({ id: it, kind: "school" });
      else if (it && typeof it === "object" && "id" in it) {
        const o = it as { id?: unknown; kind?: unknown };
        out.push({ id: String(o.id ?? ""), kind: o.kind === "ece" ? "ece" : "school" });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * 申请存于独立明细表 public.applications（每条申请一行，便于审核后台
 * 按 owner/status 筛选并精准 UPDATE 单条状态）。
 *   id text PK, owner text, category text, status text, data jsonb, created_at, updated_at
 * RLS：owner = auth.uid()。
 * 未登录（匿名）时取不到 token，径直走 localStorage。
 */

export interface CloudApplicationRow {
  id: string;
  owner: string;
  category: string;
  status: string;
  data: ApplicationItem;
  created_at?: string;
  updated_at?: string;
}

/** 拉取当前用户全部申请（独立表）。owner 由 RLS(owner=auth.uid()) 过滤，无需前端传 uid。 */
export async function fetchCloudApplications(): Promise<ApplicationItem[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${gatewayBase()}/applications?select=*`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.warn("[user-data] 申请云端读取失败", res.status);
      return null;
    }
    const rows = (await res.json()) as CloudApplicationRow[];
    return rows
      .map((r) => r.data)
      .filter((d): d is ApplicationItem => !!d && !!d.id);
  } catch (e) {
    console.warn("[user-data] 申请云端读取异常", e);
    return null;
  }
}

/**
 * 云端 upsert 单条申请（按 id 主键 merge）。
 * owner 不从前端口传，由服务端 RLS 默认值 auth.uid() 注入，
 * 保证 owner 与网关解析出的 auth.uid() 一致，RLS with-check 才会放行。
 */
export async function saveCloudApplication(
  item: ApplicationItem
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const row = {
      id: item.id,
      category: item.category,
      status: item.status,
      data: item,
    };
    const res = await fetch(`${gatewayBase()}/applications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.error("[user-data] 申请云端写入失败", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[user-data] 申请云端写入异常，降级 localStorage", e);
    return false;
  }
}

/** 云端删除单条申请。 */
export async function deleteCloudApplication(id: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(
      `${gatewayBase()}/applications?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.ok;
  } catch (e) {
    console.error("[user-data] 申请云端删除异常", e);
    return false;
  }
}

/**
 * 用户档案（省份/城市等默认填充项），存于 user_collections.profile jsonb。
 * 提交申请时回写最后一次的省份/城市，下次表单自动预填（用户可改）。
 */
export interface UserProfile {
  province?: string;
  city?: string;
}

/** 读取用户 profile（省份/城市）。owner 由 RLS 过滤。 */
export async function fetchCloudProfile(): Promise<UserProfile | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${gatewayBase()}/user_collections?select=profile`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ profile?: UserProfile }>;
    return rows[0]?.profile ?? null;
  } catch {
    return null;
  }
}

/** 回写用户 profile（省份/城市）。owner 由服务端 RLS 默认值 auth.uid() 注入。 */
export async function saveCloudProfile(profile: UserProfile): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${gatewayBase()}/user_collections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ profile }),
    });
    return res.ok;
  } catch (e) {
    console.error("[user-data] profile 云端写入异常", e);
    return false;
  }
}

export const userDataKeys = { LS_FAV, LS_CMP };

// ---- 住宿意向（独立表 accommodation_applications）----
import type { AccommodationItem } from "./accommodation";

/** 拉取当前用户全部住宿意向（owner 由 RLS 过滤）。 */
export async function fetchCloudAccommodation(): Promise<AccommodationItem[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${gatewayBase()}/accommodation_applications?select=*`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.error("[user-data] 住宿云端读取失败", res.status, await res.text());
      return null;
    }
    const rows = (await res.json()) as { data: AccommodationItem }[];
    return rows.map((r) => r.data);
  } catch (e) {
    console.error("[user-data] 住宿云端读取异常", e);
    return null;
  }
}

/** 云端 upsert 单条住宿意向（按 id 主键 merge）。owner 由服务端 RLS 默认值 auth.uid() 注入。 */
export async function saveCloudAccommodation(item: AccommodationItem): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const row = { id: item.id, status: item.status, data: item };
    const res = await fetch(`${gatewayBase()}/accommodation_applications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.error("[user-data] 住宿云端写入失败", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[user-data] 住宿云端写入异常", e);
    return false;
  }
}

/** 云端删除单条住宿意向。 */
export async function deleteCloudAccommodation(id: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(
      `${gatewayBase()}/accommodation_applications?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    return res.ok || res.status === 404;
  } catch (e) {
    console.error("[user-data] 住宿云端删除异常", e);
    return false;
  }
}
