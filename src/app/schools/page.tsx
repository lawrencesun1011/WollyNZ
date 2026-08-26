import { getSchoolFrontendAll, getDataMeta } from "@/lib/data";
import { SchoolsExplorer } from "@/components/schools/schools-explorer";

export const metadata = {
  title: "中小学学校库 · GoalNZ",
  description:
    "按地区、类型、公私立、寄宿、教学语言等条件筛选新西兰中小学，支持地图与对比。",
};

// SSR 首屏直接走 PG（带 60s 服务端缓存 + 分页补全）；
// 客户端 mount 后由 SchoolsPreloader 复用同一条 API 做后台刷新。
export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const [schools, meta] = await Promise.all([
    getSchoolFrontendAll(),
    getDataMeta(),
  ]);

  return (
    <SchoolsExplorer
      initialSchools={schools}
      fetchedAt={meta?.fetchedAt ?? null}
    />
  );
}
