/**
 * GoalNZ AI 代理（Cloudflare Worker）。
 *
 * 背景：站点为纯静态导出（output: "export"）部署在 Cloudflare Pages，
 * 运行时没有 Node 进程，浏览器不能直连第三方 AI —— 那会把供应商 API Key
 * 明文下发给所有人。因此由本 Worker 在边缘做代理：持有 Key、转发请求、回传结果。
 *
 * 协议：OpenAI 兼容（POST {base}/chat/completions）。OpenRouter / DeepSeek /
 * 智谱 / 通义 / 硅基流动等均兼容此格式，更换供应商只需改环境变量
 * AI_BASE_URL 与 AI_MODEL，本文件与前端代码都不需要改动。
 *
 * 当前默认接入 OpenRouter 免费路由：
 *   AI_BASE_URL = https://openrouter.ai/api/v1
 *   AI_MODEL    = openrouter/free
 * 该路由会在当前可用的免费模型中自动择优（成本 0，上下文 200K）。
 * 请求体刻意只带 model / stream / messages —— 免费模型种类繁杂，多余参数
 * （temperature、max_tokens 等）可能被其中某个模型拒绝而直接 400。
 *
 * 路由：
 *   POST /          请求体 { messages: [{role, content}, ...] }
 *                   响应   { content: string } 或 { error: string }
 *   GET  /health    健康检查，返回 { ok, model }
 *
 * 环境变量（Cloudflare Dashboard → Workers → Settings → Variables and Secrets）：
 *   AI_BASE_URL       供应商 base，例如 https://openrouter.ai/api/v1
 *   AI_API_KEY        供应商密钥（必须设为 Secret/加密）
 *   AI_MODEL          模型名，例如 openrouter/free
 *   ALLOWED_ORIGINS   允许的前端来源，逗号分隔；留空则只放行本地开发地址
 *   AI_APP_URL        可选，站点地址，作为 HTTP-Referer 回传给 OpenRouter
 *   SUPABASE_URL      可选，配合下一项启用登录校验
 *   SUPABASE_ANON_KEY 可选；配置后强制校验 Authorization 里的用户 JWT
 */

interface Env {
  AI_BASE_URL: string;
  AI_API_KEY: string;
  AI_MODEL: string;
  ALLOWED_ORIGINS?: string;
  AI_APP_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

/** 未配置 ALLOWED_ORIGINS 时的兜底白名单：本地开发地址。 */
const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function resolveOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const configured = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // 本地开发地址始终放行；线上域名通过 ALLOWED_ORIGINS 追加
  const allowList = [...DEFAULT_ORIGINS, ...configured];
  return allowList.includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

/**
 * 校验调用者身份。
 * 未配置 Supabase 时直接放行（本地开发 / 迁移过渡期）；
 * 配置后要求携带有效的用户 JWT，避免代理被匿名滥用。
 */
async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return true;
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  try {
    const res = await fetch(
      `${env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`,
      {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

const aiProxy = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = resolveOrigin(request, env);

    // CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const { pathname } = new URL(request.url);

    if (pathname === "/health") {
      return jsonResponse({ ok: true, model: env.AI_MODEL }, 200, origin);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "仅支持 POST" }, 405, origin);
    }

    if (!env.AI_BASE_URL || !env.AI_API_KEY) {
      return jsonResponse(
        { error: "AI 代理未配置（缺少 AI_BASE_URL / AI_API_KEY）" },
        500,
        origin
      );
    }

    if (!(await isAuthorized(request, env))) {
      return jsonResponse({ error: "未登录或登录态已失效" }, 401, origin);
    }

    let payload: { messages?: unknown };
    try {
      payload = (await request.json()) as { messages?: unknown };
    } catch {
      return jsonResponse({ error: "请求体不是合法 JSON" }, 400, origin);
    }

    const messages = Array.isArray(payload?.messages) ? payload.messages : null;
    if (!messages || messages.length === 0) {
      return jsonResponse({ error: "缺少 messages" }, 400, origin);
    }

    let upstream: Response;
    try {
      upstream = await fetch(
        `${env.AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.AI_API_KEY}`,
            "Content-Type": "application/json",
            // OpenRouter 用这两个头标识调用来源（可选，用于应用归属与排行）
            "X-Title": "GoalNZ",
            ...(env.AI_APP_URL ? { "HTTP-Referer": env.AI_APP_URL } : {}),
          },
          body: JSON.stringify({
            model: env.AI_MODEL,
            stream: false,
            messages,
          }),
        }
      );
    } catch (e) {
      console.error("[ai-proxy] upstream fetch failed", e);
      return jsonResponse({ error: "AI 供应商网络请求失败" }, 502, origin);
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("[ai-proxy] upstream error", upstream.status, detail);
      const message =
        upstream.status === 401 || upstream.status === 403
          ? "AI 供应商鉴权失败，请检查 API Key"
          : upstream.status === 402
            ? "AI 供应商额度不足（免费额度可能已用完）"
            : upstream.status === 429
              ? "AI 请求过于频繁或当日免费额度已用完，请稍后再试"
              : `AI 调用失败（${upstream.status}）`;
      return jsonResponse({ error: message }, 502, origin);
    }

    const data = (await upstream.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
    } | null;

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return jsonResponse({ error: "AI 返回内容为空" }, 502, origin);
    }

    return jsonResponse({ content }, 200, origin);
  },
};

export default aiProxy;
