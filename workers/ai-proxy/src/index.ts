/**
 * GoalNZ AI 代理（Cloudflare Worker）。
 *
 * 背景：站点为纯静态导出（output: "export"）部署在 Cloudflare Pages，
 * 运行时没有 Node 进程，浏览器不能直连第三方 AI —— 那会把供应商 API Key
 * 明文下发给所有人。因此由本 Worker 在边缘做代理：持有 Key、转发请求、回传结果。
 *
 * 供应商链（按顺序依次尝试，前一个失败自动降级到下一个）：
 *   1. Agnes AI     AGNES_BASE_URL / AGNES_API_KEY / AGNES_MODEL
 *   2. OpenRouter   OPENROUTER_BASE_URL / OPENROUTER_API_KEY / OPENROUTER_MODEL
 *
 * 所有供应商都是 OpenAI 兼容（POST {base}/chat/completions）。要新增一个兜底
 * 供应商，只需在 PROVIDER_ORDER 里加一个前缀，并配好对应的三个环境变量，
 * 本文件其余逻辑不用改（顺序即优先级）。
 *
 * 失败的判定：网络异常、超时、非 2xx 响应、返回内容为空 —— 都算失败并降级。
 *
 * 请求体刻意只带 model / stream / messages —— 免费模型种类繁杂，多余参数
 * （temperature、max_tokens 等）可能被其中某个模型拒绝而直接 400。
 *
 * 路由：
 *   POST /          请求体 { messages: [{role, content}, ...] }
 *                   响应   { content: string } 或 { error: string }
 *   GET  /health    健康检查，返回已配置的供应商链
 *
 * 环境变量（Cloudflare Dashboard → Workers → Settings → Variables and Secrets）：
 *   {PREFIX}_BASE_URL   供应商 base，如 https://apihub.agnes-ai.com/v1
 *   {PREFIX}_API_KEY    供应商密钥（务必设为 Secret/加密）
 *   {PREFIX}_MODEL      模型名，如 agnes-3.0-flash
 *   ALLOWED_ORIGINS     允许的前端来源，逗号分隔；留空则只放行本地开发地址
 *   AI_APP_URL          可选，站点地址，作为 HTTP-Referer 回传供应商
 *   SUPABASE_URL        可选，配合下一项启用登录校验
 *   SUPABASE_ANON_KEY   可选；配置后强制校验 Authorization 里的用户 JWT
 */

/** 供应商环境变量前缀，按尝试顺序排列（顺序即优先级）。 */
const PROVIDER_ORDER = ["AGNES", "OPENROUTER"] as const;

/** 单个供应商的超时（毫秒）；超时即降级到下一个。 */
const PROVIDER_TIMEOUT_MS = 25_000;

interface Env {
  ALLOWED_ORIGINS?: string;
  AI_APP_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** 供应商变量按 {PREFIX}_BASE_URL / _API_KEY / _MODEL 命名。 */
  [key: string]: string | undefined;
}

/** 一个已配置齐全的供应商。 */
interface Provider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

type ProviderResult =
  | { ok: true; content: string }
  | { ok: false; status: number; detail: string };

/** 读取环境变量并去除首尾空白；缺失时返回空串。 */
function readEnv(env: Env, key: string): string {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 收集已配置齐全的供应商（base / key / model 三者缺一即视为未启用），
 * 顺序与 PROVIDER_ORDER 一致。
 */
function buildProviders(env: Env): Provider[] {
  const providers: Provider[] = [];
  for (const prefix of PROVIDER_ORDER) {
    const baseUrl = readEnv(env, `${prefix}_BASE_URL`);
    const apiKey = readEnv(env, `${prefix}_API_KEY`);
    const model = readEnv(env, `${prefix}_MODEL`);
    if (baseUrl && apiKey && model) {
      providers.push({ name: prefix.toLowerCase(), baseUrl, apiKey, model });
    }
  }
  return providers;
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
  const supabaseUrl = readEnv(env, "SUPABASE_URL");
  const supabaseAnonKey = readEnv(env, "SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return true;

  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 调用单个供应商。任何异常都收敛为 { ok: false } 交回调用方决定是否降级，
 * 不在这里抛错，避免中断整条链。
 */
async function callProvider(
  provider: Provider,
  messages: unknown,
  appUrl: string
): Promise<ProviderResult> {
  try {
    const res = await fetch(
      `${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
          // OpenRouter 等用它标识调用来源（可选，用于应用归属与排行）
          "X-Title": "GoalNZ",
          ...(appUrl ? { "HTTP-Referer": appUrl } : {}),
        },
        body: JSON.stringify({
          model: provider.model,
          stream: false,
          messages,
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, status: res.status, detail };
    }

    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
    } | null;

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return { ok: false, status: 502, detail: "empty content" };
    }

    return { ok: true, content };
  } catch (e) {
    // 网络异常 / 超时（AbortError）等统一视为失败
    return { ok: false, status: 0, detail: String(e) };
  }
}

/** 把供应商返回的状态码翻译成面向用户的中文提示。 */
function describeFailure(status: number): string {
  if (status === 401 || status === 403) return "AI 供应商鉴权失败";
  if (status === 402) return "AI 供应商额度不足（免费额度可能已用完）";
  if (status === 429) return "AI 请求过于频繁或免费额度已用完，请稍后再试";
  if (status === 0) return "AI 供应商网络请求失败";
  return `AI 调用失败（${status}）`;
}

const aiProxy = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = resolveOrigin(request, env);

    // CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const { pathname } = new URL(request.url);
    const providers = buildProviders(env);

    if (pathname === "/health") {
      return jsonResponse(
        {
          ok: true,
          providers: providers.map((p) => ({ name: p.name, model: p.model })),
        },
        200,
        origin
      );
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "仅支持 POST" }, 405, origin);
    }

    if (providers.length === 0) {
      return jsonResponse(
        { error: "AI 代理未配置（缺少供应商环境变量）" },
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

    const appUrl = readEnv(env, "AI_APP_URL");

    // 依次尝试供应商，第一个成功即返回
    let lastStatus = 0;
    for (const [index, provider] of providers.entries()) {
      const result = await callProvider(provider, messages, appUrl);

      if (result.ok) {
        if (index > 0) {
          console.warn(`[ai-proxy] 主供应商失败，已降级到 ${provider.name}`);
        }
        return jsonResponse({ content: result.content }, 200, origin);
      }

      lastStatus = result.status;
      console.error(
        `[ai-proxy] ${provider.name} 失败`,
        result.status,
        result.detail
      );
    }

    // 所有供应商都失败
    return jsonResponse({ error: describeFailure(lastStatus) }, 502, origin);
  },
};

export default aiProxy;
