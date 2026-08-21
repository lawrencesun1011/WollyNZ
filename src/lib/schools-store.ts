"use client";

// 中小学数据的客户端全局缓存层。
// 设计：进入网站（任意页面，根布局挂载）即触发预热拉取 /api/schools-all，
// 结果存入内存 + localStorage（带 TTL），中小学页首屏用本地兜底秒开，
// PG 数据到达后通过订阅机制无缝替换，实现「优先 PG、本地兜底、该缓存缓存」。
import type { SchoolFrontend } from "./types";

const LS_KEY = "wollyn:schools:all";
const LS_TTL = 5 * 60 * 1000; // 5min，避免一直用过期数据但减少网关压力

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

export function subscribeSchools(cb: Listener): () => void {
  state.listeners.add(cb);
  return () => state.listeners.delete(cb);
}

export function getSchoolsSnapshot(): SchoolFrontend[] | null {
  return state.data;
}

// 预热：进网站即调用，结果写内存+localStorage 并通知订阅者。
// 已加载 / 加载中则跳过，避免重复请求。
export async function preloadSchools(): Promise<void> {
  if (state.data || state.loading) return;
  // 先用 localStorage 快照填充，保证秒开且跨会话复用
  const ls = readLocalStorage();
  if (ls && ls.length) {
    state.data = ls;
    emit();
    return;
  }
  state.loading = true;
  try {
    const res = await fetch("/api/schools-all");
    if (!res.ok) return;
    const list = (await res.json()) as SchoolFrontend[];
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
