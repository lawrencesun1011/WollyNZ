import { getSchoolFrontendList, getDataMeta } from "@/lib/data";
import { SchoolsExplorer } from "@/components/schools/schools-explorer";

export const metadata = {
  title: "中小学学校库 · WollyNZ",
  description:
    "按地区、类型、公私立、寄宿、教学语言等条件筛选新西兰中小学，支持地图与对比。",
};

export default async function SchoolsPage() {
  const [schools, meta] = await Promise.all([
    getSchoolFrontendList(),
    getDataMeta(),
  ]);

  return (
    <SchoolsExplorer schools={schools} fetchedAt={meta?.fetchedAt ?? null} />
  );
}
