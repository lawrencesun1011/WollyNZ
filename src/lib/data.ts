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

// 客户端挂载后/布局预热时，从 PG 拉全量（分页补全 2465 条，消除 limit=1000 截断）。
// 带 60s 服务端缓存 + 客户端 localStorage 缓存，避免重复打网关。
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
    console.warn("[data] PG 全量查询失败，回退本地文件:", (e as Error).message);
    return await readLocalSchools();
  }
}

async function readLocalSchools(): Promise<SchoolFrontend[]> {
  const raw = await readFile(join(DATA_DIR, "schools-frontend.json"), "utf-8");
  return JSON.parse(raw) as SchoolFrontend[];
}

// 首屏秒开：直接读本地兜底文件（~6ms），不阻塞首屏。
// PG 数据由全局预热层（schools-store）在后台拉取并就绪后无缝替换。
export async function getSchoolFrontendLocal(): Promise<SchoolFrontend[]> {
  return readLocalSchools();
}

export async function getDataMeta(): Promise<DataMeta | null> {
  // meta 由本地更新脚本生成（_meta.json），首屏直接读本地，不阻塞 PG。
  try {
    const raw = await readFile(join(DATA_DIR, "_meta.json"), "utf-8");
    return JSON.parse(raw) as DataMeta;
  } catch {
    return null;
  }
}
