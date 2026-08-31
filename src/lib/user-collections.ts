"use client";

// 心愿单与对比的全局客户端状态（跨组件、跨页面共享）。
// 设计沿用项目既有的「模块级 pub/sub + localStorage」模式（见 favorites.ts / schools-store.ts），
// 使右上角心愿单浮层、学校卡片、地图 popup、对比栏读取同一数据源，天然实时同步。
// 登录后（currentUid 非空）读写改为云端同步，以云端为准。
//
// 对比项携带 kind（"school" | "ece"），便于云端分别落 school_compare / ece_compare 列。
import { useSyncExternalStore } from "react";
import { getSchoolsSnapshot } from "./schools-store";
import { getEceSnapshot } from "./ece-store";
import {
  getFavoriteIds,
  subscribeFavorites,
  toggleFavorite,
  removeFavorite,
  clearFavorites,
} from "./favorites";

/** SSR / 首帧的空快照（必须是稳定引用，否则 useSyncExternalStore 会无限重渲染） */
const EMPTY_FAVORITES: { id: string; kind: "school" | "ece" }[] = [];
const EMPTY_COMPARE: string[] = [];

const COMPARE_LS_KEY = "wollyn:schools:compare";
const COMPARE_MAX = 4;

type CompareKind = "school" | "ece";
interface CompareItem {
  id: string;
  kind: CompareKind;
}

type CompareListener = (ids: string[]) => void;

const compareState: {
  items: CompareItem[];
  listeners: Set<CompareListener>;
} = {
  items: readCompareLocalStorage(),
  listeners: new Set(),
};

// 当前登录用户 uid；null 表示未登录态，此时对比走 localStorage。
let currentUid: string | null = null;

/** 依据 id 判断属于中小学还是幼儿园（用于旧 localStorage 仅有 id 时回填 kind）。 */
function resolveKind(id: string): CompareKind {
  try {
    const ece = getEceSnapshot ? getEceSnapshot() : null;
    if (ece && Array.isArray(ece) && ece.some((s: { id: string }) => s.id === id))
      return "ece";
  } catch {
    /* ignore */
  }
  return "school";
}

function readCompareLocalStorage(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: CompareItem[] = [];
    for (const it of parsed) {
      if (typeof it === "string") out.push({ id: it, kind: resolveKind(it) });
      else if (it && typeof it.id === "string")
        out.push({ id: it.id, kind: it.kind === "ece" ? "ece" : "school" });
    }
    return out;
  } catch {
    return [];
  }
}

function writeCompareLocalStorage(items: CompareItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPARE_LS_KEY, JSON.stringify(items));
  } catch {
    // 忽略隐私模式等写入失败
  }
}

/**
 * 对比 id 的稳定快照：useSyncExternalStore 要求 getSnapshot 返回「稳定引用」，
 * 若每次调用都 map 出新数组会触发无限重渲染。故在 emitCompare 时统一刷新。
 */
let compareIdsSnapshot: string[] = compareState.items.map((i) => i.id);

function emitCompare() {
  compareIdsSnapshot = compareState.items.map((i) => i.id);
  for (const l of compareState.listeners) l(compareIdsSnapshot);
}

export function subscribeCompare(cb: CompareListener): () => void {
  compareState.listeners.add(cb);
  return () => compareState.listeners.delete(cb);
}

export function getCompareIds(): string[] {
  return compareIdsSnapshot;
}

/** 供 favorites.ts 读取当前对比列表（含 kind，用于云端分列）。 */
export function readCompareLS(): CompareItem[] {
  return compareState.items;
}

/** 由 auth 层在登录态变化时调用：设置当前 uid。 */
export function setCompareUser(uid: string | null) {
  currentUid = uid;
}

/** 登录后由 auth 层调用：用云端数据覆盖本地内存与 localStorage。云端传入 {id,kind}[]。 */
export function applyCloudCompare(items: { id: string; kind?: CompareKind }[]) {
  const arr = (items || [])
    .map((x): CompareItem | null => {
      const id = typeof x === "string" ? x : x?.id;
      if (!id) return null;
      const kind = typeof x === "string" ? resolveKind(x) : x.kind ?? resolveKind(id);
      return { id, kind };
    })
    .filter((x): x is CompareItem => x !== null);
  compareState.items = arr;
  writeCompareLocalStorage(arr);
  emitCompare();
}

async function syncCloud() {
  if (!currentUid) return;
  const { saveCloudCollections } = await import("./user-data");
  // 从全量学校 / 幼儿园数据补充名字，云端存储 {id,name}[] 供后台分析
  const nameOf = buildCompareNameMap();
  const favItems = getFavoriteIds().map((e) => ({
    id: e.id,
    kind: e.kind,
    name: nameOf.get(e.id) ?? "",
  }));
  const cmpItems = compareState.items.map((e) => ({
    id: e.id,
    kind: e.kind,
    name: nameOf.get(e.id) ?? "",
  }));
  await saveCloudCollections({ favorites: favItems, compare: cmpItems });
  writeCompareLocalStorage(compareState.items);
}

/** 从前端全量学校 / 幼儿园列表构建 id→name 映射。 */
function buildCompareNameMap(): Map<string, string> {
  try {
    const m = new Map<string, string>();
    for (const s of getSchoolsSnapshot() || []) m.set(s.id, s.name);
    const ece = getEceSnapshot ? getEceSnapshot() : [];
    for (const s of ece || []) m.set(s.id, s.name);
    return m;
  } catch {
    return new Map();
  }
}

function toggleCompareState(id: string, kind: CompareKind): void {
  const idx = compareState.items.findIndex((e) => e.id === id && e.kind === kind);
  if (idx >= 0) {
    compareState.items = compareState.items.filter((_, i) => i !== idx);
  } else {
    if (compareState.items.length >= COMPARE_MAX) return;
    compareState.items = [...compareState.items, { id, kind }];
  }
  writeCompareLocalStorage(compareState.items);
  emitCompare();
  void syncCloud();
}

function removeCompareState(id: string): void {
  const next = compareState.items.filter((e) => e.id !== id);
  if (next.length === compareState.items.length) return;
  compareState.items = next;
  writeCompareLocalStorage(compareState.items);
  emitCompare();
  void syncCloud();
}

function clearCompareState(kind?: CompareKind): void {
  const next = kind ? compareState.items.filter((e) => e.kind !== kind) : [];
  if (next.length === compareState.items.length) return;
  compareState.items = next;
  writeCompareLocalStorage(compareState.items);
  emitCompare();
  void syncCloud();
}

/** 订阅心愿单列表（{id,kind} 数组），组件卸载自动退订。 */
export function useFavorites(): {
  favoriteIds: { id: string; kind: "school" | "ece" }[];
  toggleFavorite: (id: string, kind: "school" | "ece") => void;
  removeFavorite: (id: string, kind: "school" | "ece") => void;
  clearFavorites: () => void;
} {
  // 直接订阅外部 store：首帧即为真实值，避免「先空后填充」的级联渲染
  const favoriteIds = useSyncExternalStore(
    subscribeFavorites,
    getFavoriteIds,
    () => EMPTY_FAVORITES
  );

  return {
    favoriteIds,
    toggleFavorite: (id: string, kind: "school" | "ece") => toggleFavorite(id, kind),
    removeFavorite: (id: string, kind: "school" | "ece") => removeFavorite(id, kind),
    clearFavorites: () => clearFavorites(),
  };
}

/** 订阅对比列表（id 数组），组件卸载自动退订。 */
export function useCompare(): {
  compareIds: string[];
  isFull: boolean;
  toggleCompare: (id: string, kind: "school" | "ece") => void;
  removeCompare: (id: string) => void;
  clearCompare: (kind?: "school" | "ece") => void;
} {
  // 直接订阅外部 store：首帧即为真实值，避免「先空后填充」的级联渲染
  const compareIds = useSyncExternalStore(
    subscribeCompare,
    getCompareIds,
    () => EMPTY_COMPARE
  );

  return {
    compareIds,
    isFull: compareIds.length >= COMPARE_MAX,
    toggleCompare: (id: string, kind: "school" | "ece") => toggleCompareState(id, kind),
    removeCompare: (id: string) => removeCompareState(id),
    clearCompare: (kind?: "school" | "ece") => clearCompareState(kind),
  };
}

// 导出供 auth 初始化时绑定登录态切换入口
export { setFavoritesUser, applyCloudFavorites } from "./favorites";
