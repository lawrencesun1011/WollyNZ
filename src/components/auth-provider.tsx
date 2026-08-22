"use client";

import { useAuthBridge } from "@/lib/auth-init";

/** 挂载一次 Auth 桥接（登录态 ↔ 云端集合 ↔ 本地 pub/sub）。 */
export function AuthProvider() {
  useAuthBridge();
  return null;
}
