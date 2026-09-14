import type { MetadataRoute } from "next";

// 静态导出（output: "export"）下 metadata 路由必须显式声明为静态。
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/my-applications", "/my-accommodations"],
    },
    sitemap: "https://goalnz.com/sitemap.xml",
    host: "https://goalnz.com",
  };
}
