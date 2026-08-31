"use client";

import { useCallback, useEffect, useState } from "react";
import { getSchoolsSnapshot } from "./schools-store";
import { getEceSnapshot } from "./ece-store";
import { readCompareLS } from "./user-collections";
import { saveCloudCollections } from "./user-data";

export type FavoriteKind = "school" | "ece";
export interface FavoriteEntry {
  id: string;
  kind: FavoriteKind;
}

const LS_KEY = "wollyn:schools:favorites";
export const FAV_TOPIC = "favorites";

const favSubs = new Set<(ids: FavoriteEntry[]) => void>();
const favState: { ids: FavoriteEntry[] } = { ids: [] };

// 兼容旧 string[] 与新 {id,kind}[] 两种格式
function readLocalStorage(): FavoriteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: FavoriteEntry[] = [];
    for (const it of parsed) {
      if (typeof it === "string") out.push({ id: it, kind: "school" });
      else if (it && typeof it.id === "string")
        out.push({ id: it.id, kind: it.kind === "ece" ? "ece" : "school" });
    }
    return out;
  } catch {
    return [];
  }
}

function writeLocalStorage(entries: FavoriteEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function emit() {
  for (const cb of favSubs) cb(favState.ids);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(FAV_TOPIC));
}

export function subscribeFavorites(cb: (ids: FavoriteEntry[]) => void): () => void {
  favSubs.add(cb);
  return () => favSubs.delete(cb);
}

// 登录态变化：替换当前登录用户，并应用云端收藏（如有）
export function setFavoritesUser(uid: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("wollyn:auth:uid", JSON.stringify(uid));
  } catch {
    /* ignore */
  }
}

async function syncCloud(entries: FavoriteEntry[]) {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __wollyFavUploading?: boolean }).__wollyFavUploading)
    return;
  (window as unknown as { __wollyFavUploading?: boolean }).__wollyFavUploading = true;
  try {
    const nameOf = new Map<string, string>();
    for (const s of getSchoolsSnapshot() || []) nameOf.set(s.id, s.name);
    for (const s of getEceSnapshot() || []) nameOf.set(s.id, s.name);
    const favorites = entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      name: nameOf.get(e.id) ?? "",
    }));
    const compare = readCompareLS().map((e) => ({
      id: e.id,
      kind: e.kind,
      name: nameOf.get(e.id) ?? "",
    }));
    await saveCloudCollections({ favorites, compare });
  } finally {
    (window as unknown as { __wollyFavUploading?: boolean }).__wollyFavUploading = false;
  }
}

export function toggleFavorite(id: string, kind: FavoriteKind) {
  const idx = favState.ids.findIndex((e) => e.id === id && e.kind === kind);
  const next =
    idx >= 0
      ? favState.ids.filter((_, i) => i !== idx)
      : [...favState.ids, { id, kind }];
  favState.ids = next;
  writeLocalStorage(next);
  emit();
  void syncCloud(next);
}

export function removeFavorite(id: string, kind: FavoriteKind) {
  const next = favState.ids.filter((e) => !(e.id === id && e.kind === kind));
  favState.ids = next;
  writeLocalStorage(next);
  emit();
  void syncCloud(next);
}

export function clearFavorites() {
  favState.ids = [];
  writeLocalStorage([]);
  emit();
  void syncCloud([]);
}

/** 清空某一类（中小学 / 幼儿园）的心愿单，不影响另一类。 */
export function removeFavoritesByKind(kind: FavoriteKind) {
  const next = favState.ids.filter((e) => e.kind !== kind);
  favState.ids = next;
  writeLocalStorage(next);
  emit();
  void syncCloud(next);
}

export function isFavorite(id: string, kind: FavoriteKind): boolean {
  return favState.ids.some((e) => e.id === id && e.kind === kind);
}

export function getFavoriteIds(): FavoriteEntry[] {
  return favState.ids;
}

// 从云端数据覆盖（登录 / 合并后）
export function applyCloudFavorites(items?: unknown) {
  const arr = Array.isArray(items) ? items : [];
  const entries: FavoriteEntry[] = [];
  for (const it of arr) {
    if (typeof it === "string") entries.push({ id: it, kind: "school" });
    else if (it && typeof it.id === "string")
      entries.push({ id: it.id, kind: it.kind === "ece" ? "ece" : "school" });
  }
  favState.ids = entries;
  writeLocalStorage(entries);
  emit();
}

// 初始化：从本地读取
if (typeof window !== "undefined") {
  favState.ids = readLocalStorage();
}

export function useFavorites() {
  const [ids, setIds] = useState<FavoriteEntry[]>(favState.ids);
  useEffect(() => subscribeFavorites(setIds), []);
  const toggle = useCallback((id: string, kind: FavoriteKind) => toggleFavorite(id, kind), []);
  const remove = useCallback((id: string, kind: FavoriteKind) => removeFavorite(id, kind), []);
  const clear = useCallback(() => clearFavorites(), []);
  const check = useCallback((id: string, kind: FavoriteKind) => isFavorite(id, kind), []);
  return {
    favoriteIds: ids,
    toggleFavorite: toggle,
    removeFavorite: remove,
    clearFavorites: clear,
    isFavorite: check,
  };
}
