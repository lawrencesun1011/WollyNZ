"use client";

// 心愿单与对比的全局客户端状态（跨组件、跨页面共享）。
// 设计沿用项目既有的「模块级 pub/sub + localStorage」模式（见 favorites.ts / schools-store.ts），
// 使右上角心愿单浮层、学校卡片、地图 popup、对比栏读取同一数据源，天然实时同步。
// 登录后（currentUid  ＃非空）读写改为云端同步，以云端为准。
import { useEffect, useState } from "react";
import { getSchoolsSnapshot } from "./schools-store";
import {
  applyCloudFavorites,
  getFavoriteIds,
  setFavoritesUser,
  subscribeFavorites,
  toggleFavorite,
  removeFavorite,
  clearFavorites,
} from "./favorites";

const COMPARE_LS_KEY = "wollyn:schools:compare";
const COMPARE_MAX = 4;

type CompareListener = (ids: string[]) => void;

const compareState: {
  ids: string[];
  listeners: Set<CompareListener>;
} = {
  ids: readCompareLocalStorage(),
  listeners: new Set(),
};

// 当前登录用户 uid；null 表示未登录态，此时对比走 localStorage。
let currentUid: string | null = null;

function readCompareLocalStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeCompareLocalStorage(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPARE_LS_KEY, JSON.stringify(ids));
  } catch {
    // 忽略隐私模式等写入失败
  }
}

function emitCompare() {
  for (const l of compareState.listeners) l(compareState.ids);
}

export function subscribeCompare(cb: CompareListener): () => void {
  compareState.listeners.add(cb);
  return () => compareState.listeners.delete(cb);
}

export function getCompareIds(): string[] {
  return compareState.ids;
}

/** 供 favorites.ts 读取当前对比列表（用于云端合并）。 */
export function readCompareLS(): string[] {
  return compareState.ids;
}

/** 由 auth 层在登录态变化时调用：设置当前 uid。 */
export function setCompareUser(uid: string | null) {
  currentUid = uid;
}

/** 登录后由 auth 层调用：用云端数据覆盖本地内存与 localStorage。云端传入 {id,name}[]，本地仅取 id。 */
export function applyCloudCompare(items: { id: string; name?: string }[]) {
  const ids = (items || []).map((x) => x.id).filter(Boolean);
  compareState.ids = ids;
  writeCompareLocalStorage(ids);
  emitCompare();
}

async function syncCloud(ids: string[]) {
  if (!currentUid) return;
  const { saveCloudCollections } = await import("./user-data");
  // 从全量学校数据补充名字，云端存储 {id,name}[] 供后台分析
  const nameOf = buildCompareNameMap();
  const toItems = (idList: string[]) =>
    idList.map((id) => ({ id, name: nameOf.get(id) ?? "" }));
  const favItems = getFavoriteIds().map((e) => ({
    id: e.id,
    kind: e.kind,
    name: nameOf.get(e.id) ?? "",
  }));
  await saveCloudCollections(currentUid, {
    favorites: favItems,
    compare: toItems(ids),
  });
  writeCompareLocalStorage(ids);
}

/** 从前端全量学校列表构建 id→name 映射。 */
function buildCompareNameMap(): Map<string, string> {
  try {
    const all = getSchoolsSnapshot() || [];
    const m = new Map<string, string>();
    for (const s of all) m.set(s.id, s.name);
    return m;
  } catch {
    return new Map();
  }
}

function toggleCompareState(id: string): void {
  compareState.ids = compareState.ids.includes(id)
    ? compareState.ids.filter((x) => x !== id)
    : compareState.ids.length >= COMPARE_MAX
      ? compareState.ids
      : [...compareState.ids, id];
  writeCompareLocalStorage(compareState.ids);
  emitCompare();
  void syncCloud(compareState.ids);
}

function removeCompareState(id: string): void {
  if (!compareState.ids.includes(id)) return;
  compareState.ids = compareState.ids.filter((x) => x !== id);
  writeCompareLocalStorage(compareState.ids);
  emitCompare();
  void syncCloud(compareState.ids);
}

function clearCompareState(): void {
  if (compareState.ids.length === 0) return;
  compareState.ids = [];
  writeCompareLocalStorage(compareState.ids);
  emitCompare();
  void syncCloud(compareState.ids);
}

/** 订阅心愿单列表（{id,kind} 数组），组件卸载自动退订。 */
export function useFavorites(): {
  favoriteIds: { id: string; kind: "school" | "ece" }[];
  toggleFavorite: (id: string, kind: "school" | "ece") => void;
  removeFavorite: (id: string, kind: "school" | "ece") => void;
  clearFavorites: () => void;
} {
  // 首帧统一为空，避免 SSR / 客户端首渲染不一致导致 hydration 报错；
  // 客户端挂载后由下面的 effect 从全局状态同步真实收藏列表。
  const [favoriteIds, setFavoriteIds] = useState<{ id: string; kind: "school" | "ece" }[]>([]);

  useEffect(() => {
    setFavoriteIds(getFavoriteIds());
    return subscribeFavorites(setFavoriteIds);
  }, []);

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
  toggleCompare: (id: string) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
} {
  // 首帧统一为空，避免 hydration 不匹配；挂载后由 effect 同步真实对比列表。
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    setCompareIds(getCompareIds());
    return subscribeCompare(setCompareIds);
  }, []);

  return {
    compareIds,
    isFull: compareIds.length >= COMPARE_MAX,
    toggleCompare: (id: string) => toggleCompareState(id),
    removeCompare: (id: string) => removeCompareState(id),
    clearCompare: () => clearCompareState(),
  };
}

// 导出供 auth 初始化时绑定登录态切换入口
export { setFavoritesUser, applyCloudFavorites } from "./favorites";
