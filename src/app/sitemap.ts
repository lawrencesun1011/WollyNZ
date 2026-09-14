import type { MetadataRoute } from "next";

// 静态导出（output: "export"）下 metadata 路由必须显式声明为静态。
export const dynamic = "force-static";

/** 站点主域：与 layout 的 metadataBase 保持一致。 */
const BASE_URL = "https://goalnz.com";

/** 公开可收录页面（登录态页面 /my-* 不纳入）。 */
const ROUTES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "schools", priority: 0.9 },
  { path: "ece", priority: 0.9 },
  { path: "guide", priority: 0.9 },
  { path: "accommodation", priority: 0.8 },
  { path: "apply", priority: 0.7 },
  { path: "apply/accommodation", priority: 0.6 },
  { path: "community", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority }) => ({
    url: path ? `${BASE_URL}/${path}` : BASE_URL,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
