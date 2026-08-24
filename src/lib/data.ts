import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SchoolFrontend, DataMeta } from "./types";

const DATA_DIR = join(process.cwd(), "data");

// 服务端读取本地 JSON 数据文件（构建期由 fetch-data.mjs 生成并提交 git）。
// 低频更新 + 小体量，直接读文件 + 内存缓存，避免每次请求读盘或打外部数据库。

// 简单服务端内存缓存：避免每次请求都读盘（文件几 MB，读一次即可）。
// 注意：Serverless 实例可能多副本/冷启动，缓存仅作加速。
const _cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 60_000; // 60s

function getCached<T>(key: string): T | null {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data as T;
  return null;
}
function setCached<T>(key: string, data: T): void {
  _cache.set(key, { ts: Date.now(), data });
}

async function readJson<T>(file: string): Promise<T> {
  const raw = await readFile(join(DATA_DIR, file), "utf-8");
  return JSON.parse(raw) as T;
}

// 中小学：直接读取已过滤好的前端 JSON（SchoolFrontend[]），无需运行时转换。
export async function getSchoolFrontendAll(): Promise<SchoolFrontend[]> {
  const cacheKey = "schools:all";
  const cached = getCached<SchoolFrontend[]>(cacheKey);
  if (cached) return cached;
  try {
    const list = await readJson<SchoolFrontend[]>("schools-frontend.json");
    setCached(cacheKey, list);
    return list;
  } catch (e) {
    console.error("[data] 读取 schools-frontend.json 失败:", (e as Error).message);
    return [];
  }
}

// 幼儿园（ECE）：读取 ece-frontend.json，字段结构与 SchoolFrontend 对齐
// （ECE 用不到的字段以占位/0 填充），并额外携带 maxChildren / maxUnder2 /
// acceptsUnder2 等 ECE 专用字段。
export async function getEceFrontendAll(): Promise<SchoolFrontend[]> {
  const cacheKey = "ece:all";
  const cached = getCached<SchoolFrontend[]>(cacheKey);
  if (cached) return cached;
  try {
    const list = await readJson<SchoolFrontend[]>("ece-frontend.json");
    setCached(cacheKey, list);
    return list;
  } catch (e) {
    console.error("[data] 读取 ece-frontend.json 失败:", (e as Error).message);
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
