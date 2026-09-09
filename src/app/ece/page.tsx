import type { Metadata } from "next";
import { getEceFrontendAll } from "@/lib/data";
import { EceExplorer } from "@/components/ece/ece-explorer";

export const metadata: Metadata = {
  title: "幼儿园库 · GoalNZ",
  description:
    "按城市、学校类型、办学性质、公平指数 EQI 与是否接受 2 岁以下等条件筛选新西兰幼儿园，支持地图与对比。",
};

// 首屏 SSR 只直出前 100 所（SEO + 立即可用）；
// 全量数据由客户端 EcePreloader 预热进 store/localStorage 后无缝补全。
// 页面静态预渲染（无 force-dynamic），导航即秒出。
const SSR_SLICE = 100;

export default async function EcePage() {
  const all = await getEceFrontendAll();
  const initialSchools = all.slice(0, SSR_SLICE);
  return <EceExplorer initialSchools={initialSchools} />;
}
