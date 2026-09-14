/**
 * www → 主域 301 跳转（Cloudflare Worker）。
 *
 * 背景：站点同时绑定了 `goalnz.com` 与 `www.goalnz.com`，两者内容相同，
 * 属于重复内容。此 Worker 挂在路由 `www.goalnz.com/*` 上，把 www 上的所有
 * 请求 301 永久跳转到主域 `goalnz.com`，保留原始路径与查询参数。
 *
 * 之所以用 Worker 而非 Redirect Rules：当前 Cloudflare API 令牌没有 Zone
 * 规则（rulesets）权限，而 Worker Route 有权限。若将来换成原生 Redirect
 * Rule，可删除本 Worker 与对应路由。
 *
 * 部署：npx wrangler deploy -c workers/www-redirect/wrangler.toml
 */

const CANONICAL_HOST = "goalnz.com";

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);

    // 已在主域上：原样返回，避免自我跳转循环。
    if (url.hostname === CANONICAL_HOST) {
      return new Response("ok", { status: 200 });
    }

    const target = new URL(url.pathname + url.search, `https://${CANONICAL_HOST}`);
    return Response.redirect(target.toString(), 301);
  },
};
