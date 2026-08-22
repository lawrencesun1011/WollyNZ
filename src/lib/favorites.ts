"use client";

// 心愿单（我的学校）客户端状态：localStorage 持久化，跨会话保留。
const LS_KEY = "wollyn:schools:favorites";

type Listener = (ids: string[]) => void;

const state: {
  ids: string[];
  listeners: Set<Listener>;
} = {
  ids: readLocalStorage(),
  listeners: new Set(),
};

function readLocalStorage(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalStorage(ids: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch {
    // 忽略隐私模式等写入失败
  }
}

function emit() {
  for (const l of state.listeners) l(state.ids);
}

export function subscribeFavorites(cb: Listener): () => void {
  state.listeners.add(cb);
  return () => state.listeners.delete(cb);
}

export function getFavoriteIds(): string[] {
  return state.ids;
}

export function isFavorite(id: string): boolean {
  return state.ids.includes(id);
}

export function toggleFavorite(id: string): void {
  state.ids = state.ids.includes(id)
    ? state.ids.filter((x) => x !== id)
    : [...state.ids, id];
  writeLocalStorage(state.ids);
  emit();
}

export function removeFavorite(id: string): void {
  if (!state.ids.includes(id)) return;
  state.ids = state.ids.filter((x) => x !== id);
  writeLocalStorage(state.ids);
  emit();
}

export function clearFavorites(): void {
  if (state.ids.length === 0) return;
  state.ids = [];
  writeLocalStorage(state.ids);
  emit();
}
