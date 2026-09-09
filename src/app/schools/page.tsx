import { getSchoolFrontendAll } from "@/lib/data";
import { SchoolsExplorer } from "@/components/schools/schools-explorer";

export const metadata = {
  title: "中小学学校库 · GoalNZ",
  description:
    "按地区、类型、公私立、寄宿、教学语言等条件筛选新西兰中小学，支持地图与对比。",
};

// 首屏 SSR 只直出前 100 所（SEO + 立即可用，避免 2465 所全量序列化导致 hydration 卡顿）；
// 全量数据由客户端 SchoolsPreloader 预热进 store/localStorage 后无缝补全。
// 页面静态预渲染（无 force-dynamic），导航即秒出。
const SSR_SLICE = 100;

export default async function SchoolsPage() {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : 0;
  const all = await getSchoolFrontendAll();
  const initialSchools = all.slice(0, SSR_SLICE);
  const serverFetchMs = Math.round(
    (typeof performance !== "undefined" ? performance.now() : 0) - t0
  );

  return (
    <SchoolsExplorer
      initialSchools={initialSchools}
      fetchedAt={null}
      serverFetchMs={serverFetchMs}
    />
  );
}
