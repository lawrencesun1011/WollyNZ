import { getSchoolFrontendLocal, getDataMeta } from "@/lib/data";
import { SchoolsExplorer } from "@/components/schools/schools-explorer";

export const metadata = {
  title: "中小学学校库 · WollyNZ",
  description:
    "按地区、类型、公私立、寄宿、教学语言等条件筛选新西兰中小学，支持地图与对比。",
};

// 首屏直接用本地兜底文件秒开（~6ms），PG 数据由全局预热层后台拉取后无缝替换。
export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const [schools, meta] = await Promise.all([
    getSchoolFrontendLocal(),
    getDataMeta(),
  ]);

  return (
    <SchoolsExplorer
      initialSchools={schools}
      fetchedAt={meta?.fetchedAt ?? null}
    />
  );
}
