import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 新加坡环境不支持云托管（CloudBase Run），改为纯静态导出，部署到「静态托管」。
  // 注意：静态导出下 API Route（尤其 POST）不可用，数据接口改为构建期生成的静态 JSON。
  output: "export",
  // 静态托管没有图片优化服务（默认 loader 依赖 Node 服务端），必须关闭优化。
  images: { unoptimized: true },
};

export default nextConfig;
