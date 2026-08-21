import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SchoolFrontend, DataMeta } from "./types";
import { getDb, SCHOOL_COLUMN_MAP, SCHOOL_COLUMNS } from "./pg";

const DATA_DIR = join(process.cwd(), "data");

// 将 PG 返回的 snake_case 行映射回 SchoolFrontend。
function rowToSchoolFrontend(row: Record<string, unknown>): SchoolFrontend {
  const out: Record<string, unknown> = {};
  for (const [col, key] of Object.entries(SCHOOL_COLUMN_MAP)) {
    out[key] = row[col] ?? null;
  }
  return out as SchoolFrontend;
}

export async function getSchoolFrontendList(): Promise<SchoolFrontend[]> {
  try {
    const db = getDb();
    const { data, error } = await db
      .from("schools")
      .select(SCHOOL_COLUMNS.join(","))
      .order("name");
    if (error || !data) throw error ?? new Error("PG 查询返回空");
    return data.map(rowToSchoolFrontend);
  } catch (e) {
    console.warn("[data] PG 查询失败，回退本地文件:", (e as Error).message);
    const raw = await readFile(join(DATA_DIR, "schools-frontend.json"), "utf-8");
    return JSON.parse(raw) as SchoolFrontend[];
  }
}

export async function getDataMeta(): Promise<DataMeta | null> {
  try {
    const db = getDb();
    const { count, error } = await db
      .from("schools_raw")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    const raw = await readFile(join(DATA_DIR, "_meta.json"), "utf-8");
    const meta = JSON.parse(raw) as DataMeta;
    if (typeof count === "number") {
      meta.sources.schools.count = count;
    }
    return meta;
  } catch {
    try {
      const raw = await readFile(join(DATA_DIR, "_meta.json"), "utf-8");
      return JSON.parse(raw) as DataMeta;
    } catch {
      return null;
    }
  }
}
