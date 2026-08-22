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
  let probePub: unknown = null; // 用 publishable key 试
  let probeApi: unknown = null; // 用 api key 试
  let probeError: string | null = null;

  try {
    list = await getSchoolFrontendAll();
  } catch (e) {
    error = (e as Error).message;
  }

  const probeUrl = `${PG_GATEWAY_BASE}/schools?limit=3`;
  const pk = process.env.CLOUDBASE_PUBLISHABLE_KEY || "";
  const ak = process.env.CLOUDBASE_API_KEY || "";

  try {
    const r = await fetch(probeUrl, { headers: { Authorization: `Bearer ${pk}` } });
    probePub = { status: r.status, body: r.status === 200 ? await r.json() : await r.text() };
  } catch (e) {
    probeError = (e as Error).message;
  }
  try {
    const r = await fetch(probeUrl, { headers: { Authorization: `Bearer ${ak}` } });
    probeApi = { status: r.status, body: r.status === 200 ? await r.json() : await r.text() };
  } catch (e) {
    probeError = (e as Error).message;
  }

  return NextResponse.json(
    {
      diag: { ...diag, apiKeyLen: ak.length },
      count: list.length,
      error,
      probePub,
      probeApi,
      probeError,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}