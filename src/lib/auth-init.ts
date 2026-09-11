"use client";

import { getSchoolsSnapshot } from "./schools-store";

/**
 * Auth 桥接：在客户端挂载一次，打通「登录态 ↔ 云端集合 ↔ 本地 pub/sub」。
 *
 * 注意：进站【不】自动登录。未登录时 user 为 null，小人区显示「登录」，
 * 心愿单走本地 localStorage 兜底；用户用邮箱登录后才真正登录并合并上云。
 *
 * 流程：
 * 1. 订阅 onUserChanged：
 *    - 正式 user → 设 favorites/compare 的 uid，首登合并 localStorage→云端，再以云端覆盖本地
 *    - 无 user → uid 置空，恢复 localStorage 兜底，并清空本地镜像
 *
 * 迁移说明：原 CloudBase 版本需处理「历史自动匿名登录」遗留 token（进站主动 signOut），
 * 换成 Supabase 后不存在匿名会话（未开启匿名登录），该分支已移除。
 */

import { useEffect } from "react";
import { onUserChanged, initSupabase, type AuthUser } from "./auth";
import {
  setFavoritesUser,
  setCompareUser,
  applyCloudFavorites,
  applyCloudCompare,
  clearFavoritesLocal,
  clearCompareLocal,
} from "./user-collections";
import { setApplicationsUser } from "./applications";
import { setAccommodationUser } from "./accommodation";
import { mergeLocalToCloudOnLogin, setCollectionsEmail } from "./user-data";

let bridgeStarted = false;

export function useAuthBridge() {
  useEffect(() => {
    if (bridgeStarted) return;
    bridgeStarted = true;

    initSupabase();

    const unsub = onUserChanged(async (user: AuthUser | null) => {
      if (user) {
        setFavoritesUser(user.uid);
        setCompareUser(user.uid);
        setApplicationsUser(user.uid);
        setAccommodationUser(user.uid);
        setCollectionsEmail(user.email ?? null);
        try {
          const cloud = await mergeLocalToCloudOnLogin(resolveSchoolName);
          if (cloud) {
            applyCloudFavorites(cloud.favorites);
            applyCloudCompare(cloud.compare);
          }
        } catch (e) {
          console.warn("[auth-init] 云端合并失败", e);
        }
      } else {
        // 登出 / 未登录：清空本地心愿单与对比镜像，避免上一个账号的数据残留在游客态
        setFavoritesUser(null);
        setCompareUser(null);
        setApplicationsUser(null);
        setAccommodationUser(null);
        clearFavoritesLocal();
        clearCompareLocal();
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
