import type { Metadata } from "next";
import { getEceFrontendAll } from "@/lib/data";
import { EceExplorer } from "@/components/ece/ece-explorer";

export const metadata: Metadata = {
  title: "幼儿园库 · GoalNZ",
  description:
    "按城市、学校类型、办学性质、公平指数 EQI 与是否接受 2 岁以下等条件筛选新西兰幼儿园，支持地图与对比。",
};

// 幼儿园（ECE）库页面：服务端读取本地预清洗 JSON，SSR 首屏直出。
export const dynamic = "force-dynamic";

export default async function EcePage() {
  const all = await getEceFrontendAll();
  return <EceExplorer initialSchools={all} />;
}
