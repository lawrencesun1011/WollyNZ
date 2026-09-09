"use client";

// 进入网站即预热幼儿园数据（优先接口、本地兜底）。无 UI。
import { useEffect } from "react";
import { preloadEce } from "@/lib/ece-store";

export function EcePreloader() {
  useEffect(() => {
    preloadEce();
  }, []);
  return null;
}
