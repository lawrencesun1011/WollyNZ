"use client";

/**
 * 浏览器端直接调用 CloudBase AI 网关生成邮件模板。
 *
 * 背景：新加坡环境不支持云托管，站点改为静态导出（output: "export"），
 * 运行时没有 Node 进程，原 /api/generate-email（POST）无法被导出，线上会 404。
 *
 * CloudBase AI 网关同时支持两种鉴权（见 ai_model OpenAPI）：
 *   - JWTAuth：Bearer <登录用户的 access token>
 *   - APIKey ：TC3-HMAC-SHA256 签名
 * 因此改由前端直连网关，token 取自已登录用户的会话，不再需要服务端保存密钥。
 *
 * 实测（新加坡环境）可用组合：provider=cloudbase、model=hy3。
 */

import { getAccessToken } from "./auth";
import {
  buildAiEmailPrompt,
  parseAiEmailReply,
} from "@/components/applications/ai-email-generator";
import type { ApplicationItem } from "./applications";

/** 已在环境实测通过的模型；hunyuan-v3 分组会返回 EXCEED_TOKEN_QUOTA_LIMIT。 */
const AI_MODEL = "hy3";

interface AiChatResponse {
  choices?: { message?: { content?: string } }[];
}

function aiEndpoint(): string {
  const envId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID!;
  return `https://${envId}.api.tcloudbasegateway.com/v1/ai/cloudbase/chat/completions`;
}

/**
 * 生成英文邮件模板（主题 + 正文）。失败时抛错，由调用方展示。
 * 未登录（拿不到 token）直接抛错——匿名用户对 AI 无调用权限。
 */
export async function generateEmailWithAi(
  item: ApplicationItem,
  signal?: AbortSignal
): Promise<{ subject: string; body: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error("请先登录后再生成邮件");

  const { system, user } = buildAiEmailPrompt(item);

  let res: Response;
  try {
    res = await fetch(aiEndpoint(), {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        stream: false,
        temperature: 1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    throw new Error("网络请求失败，请检查网络后重试");
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // 超配额/未授权等场景给更明确的提示
    if (res.status === 429 || errText.includes("EXCEED_TOKEN_QUOTA_LIMIT")) {
      throw new Error("AI 用量已超配额，请稍后再试或检查资源包");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("当前账号无 AI 调用权限，请重新登录后重试");
    }
    throw new Error(`AI 服务调用失败（${res.status}）`);
  }

  const data = (await res.json()) as AiChatResponse;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI 返回内容为空");
  }

  const { subject, body } = parseAiEmailReply(content);
  if (!subject && !body) throw new Error("AI 返回格式无法解析");
  return { subject, body };
}
