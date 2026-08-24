"use client";

import type { SchoolFrontend } from "./types";

// 与 schools-store 一致：模块级缓存 ECE 前端数据，按需从 /api/ece-all 拉取一次。
let eceCache: SchoolFrontend[] | null = null;
let ecePromise: Promise<SchoolFrontend[] | null> | null = null;

export function getEceSnapshot(): SchoolFrontend[] | null {
  return eceCache;
}

export async function loadEceSnapshot(): Promise<SchoolFrontend[] | null> {
  if (eceCache) return eceCache;
  if (ecePromise) return ecePromise;
  ecePromise = fetch("/api/ece-all")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const arr =
        data && Array.isArray(data.schools)
          ? (data.schools as SchoolFrontend[])
          : null;
      eceCache = arr;
      return arr;
    })
    .catch(() => null)
    .finally(() => {
      ecePromise = null;
    });
  return ecePromise;
}
