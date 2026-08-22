// CloudBase PostgreSQL REST gateway 客户端封装（服务端使用）。
// 通过 CloudBase for Supabase 版提供的 PostgREST 网关访问 public schema 下的表。
// 注意：node-sdk 的 app.rdb() 会把 envId 当作 schema 名导致无法访问，
// 因此这里直接使用 REST gateway（https://<envId>.api.tcloudbasegateway.com/v1/rdb/rest/...）。
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 从 .env.local / 环境变量读取配置
function loadEnvLocal() {
  const p = join(__dirname, "..", "..", ".env.local");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf-8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvLocal();

export const ENV_ID = process.env.CLOUDBASE_ENV_ID || "";
const PUBLISHABLE_KEY = process.env.CLOUDBASE_PUBLISHABLE_KEY || "";
const API_KEY = process.env.CLOUDBASE_API_KEY || "";

export const PG_GATEWAY_BASE = `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest`;

// 诊断日志：确认运行时环境变量是否注入
console.log("[pg] ENV_ID =", JSON.stringify(ENV_ID));
console.log("[pg] PUBLISHABLE_KEY 长度 =", PUBLISHABLE_KEY.length);
console.log("[pg] PG_GATEWAY_BASE =", PG_GATEWAY_BASE);

// snake_case 物理列 -> SchoolFrontend camelCase 的字段映射
export const SCHOOL_COLUMN_MAP: Record<string, string> = {
  id: "id",
  name: "name",
  type: "type",
  level: "level",
  authority: "authority",
  authority_cn: "authorityCN",
  gender: "gender",
  gender_cn: "genderCN",
  boarding: "boarding",
  language: "language",
  language_cn: "languageCN",
  enrolment: "enrolment",
  street: "street",
  suburb: "suburb",
  city: "city",
  territorial: "territorial",
  region: "region",
  urban_rural: "urbanRural",
  phone: "phone",
  email: "email",
  roll: "roll",
  eqi: "eqi",
  isolation: "isolation",
  european: "european",
  maori: "maori",
  pacific: "pacific",
  asian: "asian",
  melaa: "melaa",
  other: "other",
  intl: "intl",
  lat: "lat",
  lng: "lng",
  website: "website",
  url: "url",
};

export const SCHOOL_COLUMNS = Object.keys(SCHOOL_COLUMN_MAP);

// 服务端查询（只读，用 Publishable Key / anon）
export async function pgSelect(
  table: string,
  query = ""
): Promise<Record<string, unknown>[]> {
  if (!ENV_ID) {
    throw new Error("[pg] CLOUDBASE_ENV_ID 为空，无法请求 PG 网关");
  }
  if (!PUBLISHABLE_KEY) {
    throw new Error("[pg] CLOUDBASE_PUBLISHABLE_KEY 为空，鉴权会失败");
  }
  const url = `${PG_GATEWAY_BASE}/${table}${query ? `?${query}` : ""}`;
  console.log("[pg] 请求:", url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${PUBLISHABLE_KEY}` },
  });
  if (!res.ok) throw new Error(`PG 查询失败 ${res.status}: ${await res.text()}`);
  return (await res.json()) as Record<string, unknown>[];
}

// 简单服务端内存缓存：避免每个请求都打 PG 网关（实测单次 1~3s）。
// 注意：Serverless 实例可能多副本/冷启动，缓存仅作加速，不保证强一致。
const _cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 60_000; // 60s

export function getCached<T>(key: string): T | null {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data as T;
  return null;
}
export function setCached<T>(key: string, data: T): void {
  _cache.set(key, { ts: Date.now(), data });
}

// 分批拉全量（PostgREST 默认 limit=1000，不加分页会截断）。
// 自动按 offset 累加直到取完，解决「只返回 1000 条」的截断问题。
export async function pgSelectAll(
  table: string,
  columns: string[],
  order = "name.asc",
  pageSize = 1000
): Promise<Record<string, unknown>[]> {
  const orderPart = order ? `&order=${order}` : "";
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  // 上限保护，避免异常时死循环
  for (let i = 0; i < 50; i++) {
    const q = `select=${columns.join(",")}&limit=${pageSize}&offset=${offset}${orderPart}`;
    const rows = await pgSelect(table, q);
    all.push(...rows);
    if (rows.length < pageSize) break; // 最后一页
    offset += pageSize;
  }
  return all;
}
