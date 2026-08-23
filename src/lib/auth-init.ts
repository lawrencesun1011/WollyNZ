"use client";

import { getSchoolsSnapshot } from "./schools-store";

/**
 * Auth 桥接：在客户端挂载一次，打通「登录态 ↔ 云端集合 ↔ 本地 pub/sub」。
 *
 * 注意：进站【不】自动匿名登录。未登录时 user 为 null，小人区显示「注册/登录」，
 * 心愿单走本地 localStorage 兜底；用户用邮箱登录后才真正登录并合并上云。
 *
 * 为兼容历史：SDK 可能从 localStorage 恢复出匿名 token（之前进站自动匿名登录遗留），
 * 这种情况下首帧主动 signOut() 清掉，让 user 回到 null。
 *
 * 流程：
 * 1. 订阅 onUserChanged：
 *    - 匿名 user → signOut() 清掉（回到 null 走下面分支）
 *    - 正式 user → 设 favorites/compare 的 uid，首登合并 localStorage→云端，再以云端覆盖本地
 *    - 无 user → uid 置空，恢复 localStorage 兜底
 */

import { useEffect } from "react";
import {
  onUserChanged,
  getLoginStateRaw,
  signOut,
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

    // 进站清理历史匿名 token（之前自动匿名登录遗留）：匿名态不视为登录，
    // 但残留 token 会占用云端匿名 uid，这里主动登出清掉。
    getLoginStateRaw()
      .then((raw: any) => {
        const u = raw?.user;
        if (u && (u.loginType === "ANONYMOUS" || !u.email)) {
          return signOut();
        }
      })
      .catch(() => {});

    const unsub = onUserChanged(async (user: AuthUser | null) => {
      if (user) {
        setFavoritesUser(user.uid);
        setCompareUser(user.uid);
        try {
          const cloud = await mergeLocalToCloudOnLogin(user.uid, resolveSchoolName);
          if (cloud) {
            applyCloudFavorites(cloud.favorites);
            applyCloudCompare(cloud.compare);
          }
        } catch (e) {
          console.warn("[auth-init] 云端合并失败", e);
        }
      } else {
        // 登出 / 未登录：恢复本地兜底
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

/** 从前端全量学校列表查询名字，供首登合并时补充到云端 {id,name}[]。 */
function resolveSchoolName(id: string): string | undefined {
  try {
    const all = getSchoolsSnapshot() || [];
    return all.find((s: { id: string; name: string }) => s.id === id)?.name;
  } catch {
    return undefined;
  }
}
