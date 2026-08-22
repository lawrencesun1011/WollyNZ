import { NextResponse } from "next/server";
import { getSchoolFrontendAll } from "@/lib/data";
import { PG_GATEWAY_BASE } from "@/lib/pg";

// 客户端首屏渲染后，后台续拉剩余学校批次（补全 1000 条之后的数据）。
// 服务端带 60s 内存缓存，避免重复打 PG 网关。
export async function GET() {
  const envId = process.env.CLOUDBASE_ENV_ID || "";
  const keyLen = (process.env.CLOUDBASE_PUBLISHABLE_KEY || "").length;

  // 诊断模式：通过 ?diag=1 把环境信息一并返回，浏览器直接看到，省去翻容器日志
  const diag = { envId, keyLen, gateway: PG_GATEWAY_BASE };

  let list: unknown[] = [];
  let error: string | null = null;
  let rawProbe: unknown = null;
  let probeError: string | null = null;
  try {
    list = await getSchoolFrontendAll();
  } catch (e) {
    error = (e as Error).message;
  }

  // 直接裸查 schools 表前 3 行，确认表是否存在、有无数据
  try {
    const probeUrl = `${PG_GATEWAY_BASE}/schools?limit=3`;
    const r = await fetch(probeUrl, {
      headers: { Authorization: `Bearer ${process.env.CLOUDBASE_PUBLISHABLE_KEY}` },
    });
    rawProbe = { status: r.status, body: r.status === 200 ? await r.json() : await r.text() };
  } catch (e) {
    probeError = (e as Error).message;
  }

  return NextResponse.json(
    { diag, count: list.length, error, sample: list.slice(0, 2), rawProbe, probeError },
    { headers: { "Cache-Control": "no-store" } }
  );
}