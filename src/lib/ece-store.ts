"use client";

// 幼儿园（ECE）数据的客户端全局缓存层，与 schools-store 同构。
// 进入网站（根布局挂载 EcePreloader）即触发预热拉取 /api/ece-all.json，
// 该 JSON 由构建期脚本 scripts/prepare-static-data.mjs 生成（静态托管下无 API Route）。
// 结果存入内存 + localStorage（带 TTL），ECE 页首屏用本地兜底秒开，
// 接口数据到达后通过订阅机制无缝替换，实现「优先接口、本地兜底」。
import type { SchoolFrontend } from "./types";

const LS_KEY = "goalnz:ece:all";
const LS_TTL = 5 * 60 * 1000; // 5min，避免一直用过期数据但减少接口压力

type Listener = (list: SchoolFrontend[]) => void;

const state: {
  data: SchoolFrontend[] | null;
  loading: boolean;
  listeners: Set<Listener>;
} = {
  data: null,
  loading: false,
  listeners: new Set(),
};

function emit() {
  for (const l of state.listeners) l(state.data!);
}

function readLocalStorage(): SchoolFrontend[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: SchoolFrontend[] };
    if (Date.now() - parsed.ts > LS_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeLocalStorage(data: SchoolFrontend[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // 忽略隐私模式等写入失败
  }
}

export function subscribeEce(cb: Listener): () => void {
  state.listeners.add(cb);
  return () => state.listeners.delete(cb);
}

export function getEceSnapshot(): SchoolFrontend[] | null {
  return state.data;
}

let loadPromise: Promise<void> | null = null;

async function doLoad(): Promise<void> {
  // 先用 localStorage 快照填充，保证秒开且跨会话复用
  const ls = readLocalStorage();
  if (ls && ls.length) {
    state.data = ls;
    emit();
    return;
  }
  state.loading = true;
  try {
    const res = await fetch("/api/ece-all.json");
    if (!res.ok) return;
    const json = (await res.json()) as { schools: SchoolFrontend[] };
    const list = json.schools ?? [];
    if (!list.length) return;
    state.data = list;
    writeLocalStorage(list);
    emit();
  } catch {
    // 拉取失败不影响：首屏已有本地兜底
  } finally {
    state.loading = false;
  }
}

// 预热：进网站即调用，结果写内存+localStorage 并通知订阅者。
// 已加载 / 加载中则复用同一 promise，避免重复请求。
export async function preloadEce(): Promise<void> {
  if (state.data) return;
  if (loadPromise) return loadPromise;
  loadPromise = doLoad().finally(() => {
    loadPromise = null;
  });
  return loadPromise;
}

// 触发加载并在数据就绪后回传（供 application-form / favorites-popover 等使用）。
export async function loadEceSnapshot(): Promise<SchoolFrontend[] | null> {
  await preloadEce();
  return getEceSnapshot();
}
