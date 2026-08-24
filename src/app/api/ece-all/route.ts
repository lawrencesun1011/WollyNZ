import { NextResponse } from "next/server";
import { getEceFrontendAll } from "@/lib/data";

// 与 /api/schools-all 同构：返回 ECE 全量前端 JSON，供首屏后续拉取/补全。
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schools = await getEceFrontendAll();
    return NextResponse.json({ schools });
  } catch (e) {
    console.error("[api/ece-all] 失败:", e);
    return NextResponse.json({ schools: [] }, { status: 500 });
  }
}
