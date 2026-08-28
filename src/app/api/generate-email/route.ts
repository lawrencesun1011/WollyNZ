import { NextResponse } from "next/server";
import type { ApplicationItem } from "@/lib/applications";
import {
  buildAiEmailPrompt,
  parseAiEmailReply,
} from "@/components/applications/ai-email-generator";

const AI_ENDPOINT = (envId: string) =>
  `https://${envId}.api.tcloudbasegateway.com/v1/ai/cloudbase/chat/completions`;

/**
 * 生成英文邮件模板（主题 + 正文）。
 * 服务端唯一接触 CLOUDBASE_APIKEY 的地方：读取环境变量 → 组装 prompt → 调 CloudBase hy3 → 解析 JSON。
 */
export async function POST(req: Request) {
  let body: { item?: ApplicationItem };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体解析失败" }, { status: 400 });
  }
  const item = body?.item;
  if (!item || typeof item !== "object") {
    return NextResponse.json({ error: "缺少申请信息" }, { status: 400 });
  }

  const envId = process.env.CLOUDBASE_ENV_ID?.trim();
  const apiKey = process.env.CLOUDBASE_APIKEY?.trim();
  if (!envId || !apiKey) {
    return NextResponse.json(
      { error: "服务端未配置 CLOUDBASE_ENV_ID / CLOUDBASE_APIKEY" },
      { status: 500 }
    );
  }

  const { system, user } = buildAiEmailPrompt(item);

  try {
    const res = await fetch(AI_ENDPOINT(envId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "hy3",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
        temperature: 1,
        // 开启深度思考：Chat Completions 协议用 reasoning_effort（hy3 默认不思考，需显式开启）
        // reasoning_effort: "low",
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[generate-email] AI 网关错误", res.status, errText.slice(0, 300));
      return NextResponse.json(
        { error: `AI 服务调用失败（${res.status}）` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "AI 返回内容为空" }, { status: 502 });
    }

    const { subject, body } = parseAiEmailReply(content);
    if (!subject && !body) {
      return NextResponse.json({ error: "AI 返回格式无法解析" }, { status: 502 });
    }
    return NextResponse.json({ subject, body });
  } catch (err) {
    console.error("[generate-email] 调用失败", err);
    return NextResponse.json({ error: "AI 服务调用失败，请稍后重试" }, { status: 500 });
  }
}
