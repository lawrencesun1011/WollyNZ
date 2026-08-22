"use client";

// 心愿单与对比的全局客户端状态（跨组件、跨页面共享）。
// 设计沿用项目既有的「模块级 pub/sub + localStorage」模式（见 favorites.ts / schools-store.ts），
// 使右上角心愿单浮层、学校卡片、地图 popup、对比栏读取同一数据源，天然实时同步。
import { useEffect, useState } from "react";
import {
  getFavoriteIds,
  toggleFavorite,
  removeFavorite,
  clearFavorites,
  subscribeFavorites,
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

function subscribeCompare(cb: CompareListener): () => void {
  compareState.listeners.add(cb);
  return () => compareState.listeners.delete(cb);
}

function getCompareIds(): string[] {
  return compareState.ids;
}

function toggleCompareState(id: string): void {
  compareState.ids = compareState.ids.includes(id)
    ? compareState.ids.filter((x) => x !== id)
    : compareState.ids.length >= COMPARE_MAX
      ? compareState.ids
      : [...compareState.ids, id];
  writeCompareLocalStorage(compareState.ids);
  emitCompare();
}

function removeCompareState(id: string): void {
  if (!compareState.ids.includes(id)) return;
  compareState.ids = compareState.ids.filter((x) => x !== id);
  writeCompareLocalStorage(compareState.ids);
  emitCompare();
}

function clearCompareState(): void {
  if (compareState.ids.length === 0) return;
  compareState.ids = [];
  writeCompareLocalStorage(compareState.ids);
  emitCompare();
}

/** 订阅心愿单列表（id 数组），组件卸载自动退订。 */
export function useFavorites(): {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => void;
} {
  // 首帧统一为空，避免 SSR / 客户端首渲染不一致导致 hydration 报错；
  // 客户端挂载后由下面的 effect 从全局状态同步真实收藏列表。
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteIds(getFavoriteIds());
    return subscribeFavorites(setFavoriteIds);
  }, []);

  return {
    favoriteIds,
    toggleFavorite: (id: string) => toggleFavorite(id),
    removeFavorite: (id: string) => removeFavorite(id),
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
