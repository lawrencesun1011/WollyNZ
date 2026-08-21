"use client";

// 进入网站即预热中小学数据（优先 PG、本地兜底）。无 UI。
import { useEffect } from "react";
import { preloadSchools } from "@/lib/schools-store";

export function SchoolsPreloader() {
  useEffect(() => {
    preloadSchools();
  }, []);
  return null;
}
