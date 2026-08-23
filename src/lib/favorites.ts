"use client";

// 心愿单（我的学校）客户端状态：localStorage 持久化兜底，登录后云端同步。
const LS_KEY = "wollyn:schools:favorites";

type Listener = (ids: string[]) => void;

const state: {
  ids: string[];
  listeners: Set<Listener>;
} = {
  ids: readLocalStorage(),
  listeners: new Set(),
};

// 当前登录用户 uid；null 表示未登录（含匿名未登录态），此时走 localStorage。
let currentUid: string | null = null;

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

/** 由 auth 层在登录态变化时调用：设置当前 uid（null=未登录）。 */
export function setFavoritesUser(uid: string | null) {
  currentUid = uid;
}

/** 登录后由 auth 层调用：用云端数据覆盖本地内存与 localStorage。 */
export function applyCloudFavorites(ids: string[]) {
  state.ids = ids;
  writeLocalStorage(ids);
  emit();
}

async function syncCloud(ids: string[]) {
  if (!currentUid) return;
  const { saveCloudCollections, userDataKeys } = await import("./user-data");
  const { readCompareLS } = await import("./user-collections");
  const cmp = readCompareLS();
  await saveCloudCollections(currentUid, { favorites: ids, compare: cmp });
  // 同步更新本地镜像
  writeLocalStorage(ids);
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
  void syncCloud(state.ids);
}

export function removeFavorite(id: string): void {
  if (!state.ids.includes(id)) return;
  state.ids = state.ids.filter((x) => x !== id);
  writeLocalStorage(state.ids);
  emit();
  void syncCloud(state.ids);
}

export function clearFavorites(): void {
  if (state.ids.length === 0) return;
  state.ids = [];
  writeLocalStorage(state.ids);
  emit();
  void syncCloud(state.ids);
}
