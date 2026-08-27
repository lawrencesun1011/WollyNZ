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
 * 表结构（user_collections）：
 *   owner             text PK   —— 等于 auth.uid()
 *   email             text      —— 注册/登录邮箱（与 user_info.email 同步）
 *   school_favorites  jsonb     —— [{id, name}] 中小学收藏
 *   school_compare    jsonb     —— [{id, name}] 中小学对比
 *   ece_favorites     jsonb     —— [{id, name}] 幼儿园收藏
 *   ece_compare       jsonb     —— [{id, name}] 幼儿园对比
 *
 * 行为：
 * - 已登录：以云端数据为准；写入时增量更新云端。
 * - 首登合并：登录后若云端为空，把 localStorage 心愿单/对比写入云端（迁移）。
 * - 失败降级：云端写入失败回退 localStorage，不影响浏览。
 */

import { getAccessToken, getLoginStateRaw } from "./auth";
import { ensureUserInfo } from "./user-info";
import { getEffectiveStatus, type ApplicationItem } from "./applications";

/** 云端单条收藏/对比项（仅 id + name，kind 由列名体现）。 */
export interface CloudItem {
  id: string;
  name?: string;
}

/** 云端 user_collections 行（4 个收藏/对比列）。 */
export interface CloudCollectionRow {
  school_favorites: CloudItem[];
  school_compare: CloudItem[];
  ece_favorites: CloudItem[];
  ece_compare: CloudItem[];
}

/** saveCloudCollections 入参：前端按 kind 拆分后的统一结构，内部再路由到对应列。 */
export interface SaveCollectionsInput {
  favorites: { id: string; kind: "school" | "ece"; name?: string }[];
  compare: { id: string; kind: "school" | "ece"; name?: string }[];
}

/** mergeLocalToCloudOnLogin 返回：合并后供本地覆盖用的 {id, kind} 列表。 */
export interface MergedCollections {
  favorites: { id: string; kind: "school" | "ece" }[];
  compare: { id: string; kind: "school" | "ece" }[];
}

const TABLE = "user_collections";
const LS_FAV = "wollyn:schools:favorites";
const LS_CMP = "wollyn:schools:compare";

/** 登录邮箱缓存，随登录态更新，供写 user_collections 时同步 email 列。 */
let collectionsEmail: string | null = null;
export function setCollectionsEmail(email: string | null) {
  collectionsEmail = email;
}

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

/** 从云端拉取当前用户集合（4 列）；owner 由 RLS 过滤。返回 null 表示无云端数据/未登录/失败。 */
export async function fetchCloudCollections(): Promise<CloudCollectionRow | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${gatewayBase()}/${TABLE}?select=school_favorites,school_compare,ece_favorites,ece_compare`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      console.warn("[user-data] 云端读取失败", res.status);
      return null;
    }
    const data = (await res.json()) as Array<Record<string, unknown>>;
    const doc = data[0];
    if (!doc) return null;
    return {
      school_favorites: normalizeColumn(doc.school_favorites),
      school_compare: normalizeColumn(doc.school_compare),
      ece_favorites: normalizeColumn(doc.ece_favorites),
      ece_compare: normalizeColumn(doc.ece_compare),
    };
  } catch (e) {
    console.warn("[user-data] 云端读取异常", e);
    return null;
  }
}

/** 兼容旧数据：云端列可能是 string[]（仅 id）或 {id,name}[]，统一规范化为 CloudItem[]。 */
function normalizeColumn(raw: unknown): CloudItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x): CloudItem | null => {
      if (typeof x === "string") return { id: x, name: "" };
      if (x && typeof x === "object" && "id" in x) {
        const o = x as { id?: unknown; name?: unknown };
        return { id: String(o.id ?? ""), name: typeof o.name === "string" ? o.name : "" };
      }
      return null;
    })
    .filter((x): x is CloudItem => !!x && !!x.id);
}

/**
 * 云端 upsert（按 owner 主键插入或更新）。owner 由服务端 RLS 默认值 auth.uid() 注入，
 * 客户端不必传 owner，避免本地 uid 与服务端不一致。
 * 入参按 kind 拆分到中小学 / 幼儿园各自的收藏与对比列；email 取登录态缓存。
 */
export async function saveCloudCollections(data: SaveCollectionsInput): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const toCol = (
      list: SaveCollectionsInput["favorites"],
      kind: "school" | "ece"
    ): CloudItem[] =>
      list.filter((x) => x.kind === kind).map((x) => ({ id: x.id, name: x.name ?? "" }));

    const body: Record<string, unknown> = {
      school_favorites: toCol(data.favorites, "school"),
      ece_favorites: toCol(data.favorites, "ece"),
      school_compare: toCol(data.compare, "school"),
      ece_compare: toCol(data.compare, "ece"),
    };
    if (collectionsEmail) body.email = collectionsEmail;

    const res = await fetch(`${gatewayBase()}/${TABLE}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(body),
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

/** 读取本地对比列表（兼容旧 string[] 与新 {id,kind}[]），返回 {id,kind} 列表。 */
function readCmpLS(): { id: string; kind: "school" | "ece" }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_CMP);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const out: { id: string; kind: "school" | "ece" }[] = [];
    for (const it of parsed) {
      if (typeof it === "string") out.push({ id: it, kind: "school" });
      else if (it && typeof it.id === "string")
        out.push({ id: it.id, kind: it.kind === "ece" ? "ece" : "school" });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * 首登合并：登录后调用。
 * - 云端为空 → 把本地 localStorage 心愿单/对比写入云端（首次即迁移）。
 * - 云端已有 → 用云端覆盖本地（以云端为准），返回合并后数据供上层使用。
 * 对比项携带 kind，分别落 school_compare / ece_compare 列。
 */
export async function mergeLocalToCloudOnLogin(
  resolveName?: (id: string) => string | undefined
): Promise<MergedCollections | null> {
  const cloud = await fetchCloudCollections();
  const localFav = readFavLS();
  const localCmp = readCmpLS();

  // 兼容旧 string[] 与新 {id,kind}[]：统一为 {id, kind}（缺 kind 默认 school）
  const favEntries = (entries: { id: string; kind?: "school" | "ece" }[]): {
    id: string;
    kind: "school" | "ece";
  }[] => entries.map((e) => ({ id: e.id, kind: e.kind ?? "school" }));

  if (!cloud) {
    // 云端无文档：将本地数据上传（补充名字供后台分析）
    const favorites = favEntries(localFav);
    const compare = localCmp.map((e) => ({ id: e.id, kind: e.kind }));
    if (favorites.length || compare.length) {
      await saveCloudCollections({
        favorites: favorites.map((e) => ({
          id: e.id,
          kind: e.kind,
          name: resolveName?.(e.id) ?? "",
        })),
        compare: compare.map((e) => ({
          id: e.id,
          kind: e.kind,
          name: resolveName?.(e.id) ?? "",
        })),
      });
    }
    writeLS(
      LS_FAV,
      favorites.map((e) => ({ id: e.id, kind: e.kind }))
    );
    writeLS(
      LS_CMP,
      compare.map((e) => ({ id: e.id, kind: e.kind }))
    );
    return { favorites, compare };
  }

  // 云端有数据：以云端为准，回写本地镜像（按列分别合并 kind）。
  const favorites: MergedCollections["favorites"] = [
    ...cloud.school_favorites.map((x) => ({ id: x.id, kind: "school" as const })),
    ...cloud.ece_favorites.map((x) => ({ id: x.id, kind: "ece" as const })),
  ];
  const compare: MergedCollections["compare"] = [
    ...cloud.school_compare.map((x) => ({ id: x.id, kind: "school" as const })),
    ...cloud.ece_compare.map((x) => ({ id: x.id, kind: "ece" as const })),
  ];
  writeLS(
    LS_FAV,
    favorites.map((e) => ({ id: e.id, kind: e.kind }))
  );
  writeLS(
    LS_CMP,
    compare.map((e) => ({ id: e.id, kind: e.kind }))
  );
  return { favorites, compare };
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

/** 将过期申请的有效状态（generated→closed）写回云端，返回更新后的列表（仅对差异项做 best-effort 写回）。 */
async function reconcileApplicationStatuses(
  items: ApplicationItem[]
): Promise<ApplicationItem[]> {
  const changed: ApplicationItem[] = [];
  const result = items.map((it) => {
    const eff = getEffectiveStatus(it);
    if (eff !== it.status) {
      const updated = { ...it, status: eff };
      changed.push(updated);
      return updated;
    }
    return it;
  });
  if (changed.length) {
    await Promise.all(changed.map((it) => saveCloudApplication(it).catch(() => false)));
  }
  return result;
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
    const items = rows
      .map((r) => r.data)
      .filter((d): d is ApplicationItem => !!d && !!d.id);
    return reconcileApplicationStatuses(items);
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
 * 用户档案（省份 / 城市默认填充项）存于 user_info 表（见 user-info.ts）。
 * 提交申请时回写最后一次的省份 / 城市，下次表单自动预填（用户可改）。
 */
export interface UserProfile {
  province?: string;
  city?: string;
}

/** 读取用户 profile（省份 / 城市），来自 user_info 表。 */
export async function fetchCloudProfile(): Promise<UserProfile | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${gatewayBase()}/user_info?select=province,city`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ province?: string; city?: string }>;
    const r = rows[0];
    if (!r) return null;
    return {
      province: typeof r.province === "string" ? r.province : undefined,
      city: typeof r.city === "string" ? r.city : undefined,
    };
  } catch {
    return null;
  }
}

/** 回写用户 profile（省份 / 城市）到 user_info 表。 */
export async function saveCloudProfile(profile: UserProfile): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const state = await getLoginStateRaw();
    const owner = state?.userInfo?.uuid ?? state?.user?.uuid ?? null;
    if (!owner) return false;
    return await ensureUserInfo(owner, {
      province: profile.province,
      city: profile.city,
    });
  } catch (e) {
    console.error("[user-data] profile 云端写入异常", e);
    return false;
  }
}

export const userDataKeys = { LS_FAV, LS_CMP };

// ---- 住宿意向（独立表 accommodation_applications）----
import { getEffectiveStatus as getEffectiveAccStatus, type AccommodationItem } from "./accommodation";

/** 将过期住宿意向的有效状态（submitted→closed）写回云端，返回更新后的列表（仅对差异项做 best-effort 写回）。 */
async function reconcileAccommodationStatuses(
  items: AccommodationItem[]
): Promise<AccommodationItem[]> {
  const changed: AccommodationItem[] = [];
  const result = items.map((it) => {
    const eff = getEffectiveAccStatus(it);
    if (eff !== it.status) {
      const updated = { ...it, status: eff };
      changed.push(updated);
      return updated;
    }
    return it;
  });
  if (changed.length) {
    await Promise.all(changed.map((it) => saveCloudAccommodation(it).catch(() => false)));
  }
  return result;
}

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
    const items = rows.map((r) => r.data);
    return reconcileAccommodationStatuses(items);
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
