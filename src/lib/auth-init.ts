"use client";

/**
 * Auth 桥接：在客户端挂载一次，打通「登录态 ↔ 云端集合 ↔ 本地 pub/sub」。
 *
 * 流程：
 * 1. 进站 ensureAnonymous() —— 自动匿名兜底（未登录也有 uid，可上云收藏）。
 * 2. onUserChanged 订阅：
 *    - 有用户 → 设 favorites/compare 的 uid，首登合并 localStorage→云端，再以云端覆盖本地。
 *    - 无用户（登出）→ uid 置空，恢复 localStorage 兜底。
 */

import { useEffect } from "react";
import {
  ensureAnonymous,
  onUserChanged,
  type AuthUser,
  initCloudBase,
} from "./auth";
import {
  setFavoritesUser,
  setCompareUser,
  applyCloudFavorites,
  applyCloudCompare,
} from "./user-collections";
import { mergeLocalToCloudOnLogin } from "./user-data";

let bridgeStarted = false;

export function useAuthBridge() {
  useEffect(() => {
    if (bridgeStarted) return;
    bridgeStarted = true;

    initCloudBase();

    // 进站匿名兜底
    ensureAnonymous().catch(() => {});

    const unsub = onUserChanged(async (user: AuthUser | null) => {
      if (user) {
        setFavoritesUser(user.uid);
        setCompareUser(user.uid);
        try {
          const cloud = await mergeLocalToCloudOnLogin(user.uid);
          if (cloud) {
            applyCloudFavorites(cloud.favorites);
            applyCloudCompare(cloud.compare);
          }
        } catch (e) {
          console.warn("[auth-init] 云端合并失败", e);
        }
      } else {
        // 登出：恢复本地兜底
        setFavoritesUser(null);
        setCompareUser(null);
      }
    });

    return () => {
      unsub();
      bridgeStarted = false;
    };
  }, []);
}
