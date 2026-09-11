"use client";

/**
 * 浏览器端经 Cloudflare Worker 代理调用第三方 AI，生成邮件模板。
 *
 * 背景：站点为纯静态导出（output: "export"），浏览器里没有可信环境保存
 * 供应商 API Key（放前端等于公开）。因此改由 workers/ai-proxy 这个
 * Cloudflare Worker 在边缘持有 Key、转发请求，前端只与它对话。
 *
 * 协议：Worker 采用 OpenAI 兼容透传（{ messages } → { content }），
 * 更换模型供应商只需改 Worker 的环境变量（AI_BASE_URL / AI_MODEL），
 * 本文件与前端代码都无需改动。
 *
 * 鉴权：携带当前登录用户的 access token；Worker 侧在配置了
 * SUPABASE_URL / SUPABASE_ANON_KEY 时会强制校验该 JWT。
 */

import { getAccessToken } from "./auth";
import {
  buildAiEmailPrompt,
  parseAiEmailReply,
} from "@/components/applications/ai-email-generator";
import type { ApplicationItem } from "./applications";

/** Worker 代理地址；未配置时直接报错，避免静默请求到错误地址。 */
function proxyEndpoint(): string {
  const url = process.env.NEXT_PUBLIC_AI_PROXY_URL;
  if (!url) {
    throw new Error("AI 代理未配置（缺少 NEXT_PUBLIC_AI_PROXY_URL）");
  }
  return url.replace(/\/+$/, "");
}

interface AiProxyResponse {
  content?: string;
  error?: string;
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
    res = await fetch(proxyEndpoint(), {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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

  const data = (await res.json().catch(() => null)) as AiProxyResponse | null;

  if (!res.ok) {
    // Worker 已在服务端把供应商错误翻译为中文提示，这里优先透传
    if (data?.error) throw new Error(data.error);
    if (res.status === 401 || res.status === 403) {
      throw new Error("当前账号无 AI 调用权限，请重新登录后重试");
    }
    if (res.status === 429) {
      throw new Error("AI 用量已超配额，请稍后再试");
    }
    throw new Error(`AI 服务调用失败（${res.status}）`);
  }

  const content = data?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI 返回内容为空");
  }

  const { subject, body } = parseAiEmailReply(content);
  if (!subject && !body) throw new Error("AI 返回格式无法解析");
  return { subject, body };
}
