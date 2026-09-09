// 临时性能打点：在浏览器控制台输出「找学校」页面各阶段耗时，定位慢在拉数据还是渲染地图。
// 用完即删（连同各调用点）。所有日志前缀 [找学校性能]，便于控制台筛选。
let start: number | null = null;

const PREFIX = "[找学校性能]";

function ensureStart() {
  if (start === null && typeof performance !== "undefined") {
    start = performance.now();
  }
  return start;
}

/** 以首次调用为基准，打印相对耗时 + 绝对耗时。extra 可附带说明（如数据条数）。 */
export function perfMark(label: string, extra?: string) {
  if (typeof window === "undefined") return;
  const s = ensureStart();
  const now = performance.now();
  const parts = [
    PREFIX,
    label,
    `+${Math.round(now - (s ?? now))}ms`,
    `(总 ${Math.round(now)}ms)`,
  ];
  if (extra) parts.push(extra);
  // eslint-disable-next-line no-console
  console.log(parts.join(" "));
}

/** 打印一个已测得的独立耗时（如服务端 SSR 拉取耗时，不在客户端时间轴上）。 */
export function perfValue(label: string, ms: number, extra?: string) {
  if (typeof window === "undefined") return;
  const parts = [PREFIX, label, `${ms}ms`];
  if (extra) parts.push(extra);
  // eslint-disable-next-line no-console
  console.log(parts.join(" "));
}
