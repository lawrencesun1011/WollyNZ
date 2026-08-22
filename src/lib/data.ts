import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SchoolFrontend, DataMeta } from "./types";
import {
  pgSelectAll,
  getCached,
  setCached,
  SCHOOL_COLUMN_MAP,
  SCHOOL_COLUMNS,
} from "./pg";

const DATA_DIR = join(process.cwd(), "data");

// 将 PG 返回的 snake_case 行映射回 SchoolFrontend
function rowToSchoolFrontend(row: Record<string, unknown>): SchoolFrontend {
  const out: Record<string, unknown> = {};
  for (const [col, key] of Object.entries(SCHOOL_COLUMN_MAP)) {
    out[key] = row[col] ?? null;
  }
  return out as unknown as SchoolFrontend;
}

// SSR 首屏直接走 PG（带 60s 服务端缓存，避免每个请求都打网关）。
// PG 失败时返回空数组，让客户端兜底展示空态，避免 SSR 整体 500。
export async function getSchoolFrontendAll(): Promise<SchoolFrontend[]> {
  const cacheKey = "schools:all";
  const cached = getCached<SchoolFrontend[]>(cacheKey);
  if (cached) return cached;
  try {
    const rows = await pgSelectAll("schools", SCHOOL_COLUMNS, "name.asc");
    const list = rows.map(rowToSchoolFrontend);
    setCached(cacheKey, list);
    return list;
  } catch (e) {
    console.error("[data] PG 查询失败:", (e as Error).message);
    return [];
  }
}

export async function getDataMeta(): Promise<DataMeta | null> {
  // meta 由本地更新脚本生成（_meta.json），仅作为展示用元数据，不阻塞主流程。
  try {
    const raw = await readFile(join(DATA_DIR, "_meta.json"), "utf-8");
    return JSON.parse(raw) as DataMeta;
  } catch {
    return null;
  }
}
