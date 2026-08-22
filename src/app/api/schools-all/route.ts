import { NextResponse } from "next/server";
import { getSchoolFrontendAll } from "@/lib/data";

// 客户端首屏渲染后，后台续拉剩余学校批次（补全 1000 条之后的数据）。
// 服务端带 60s 内存缓存，避免重复打 PG 网关。
export async function GET() {
  const list = await getSchoolFrontendAll();
  console.log(`[schools-all] 返回 ${list.length} 条学校数据`);
  return NextResponse.json(list, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
