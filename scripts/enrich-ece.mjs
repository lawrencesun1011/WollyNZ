// ECE（幼儿园）数据补全流水线 —— 【完全独立的实验脚本】
//
// 重要：本脚本不改动、不接入现有系统（src/scripts/fetch-data.mjs / data/ece-frontend.json）。
// 所有产物写入新的独立文件（ece-enrichment.json / ece-enriched.json / _ece_enrich_log.json），
// 待用户验收通过后再另行讨论如何与现有逻辑合并。
//
// 用法：
//   node scripts/enrich-ece.mjs --smoke                  拿 1 所学校做 API 冒烟验证（不写文件）
//   node scripts/enrich-ece.mjs --smoke --id=10254       指定学校做冒烟验证
//   node scripts/enrich-ece.mjs --fetch                  校验过滤口径（默认读 data/ece.json）
//   node scripts/enrich-ece.mjs --fetch --refetch        自行联网拉取（写入独立缓存）
//   node scripts/enrich-ece.mjs --run --limit=5          跑 5 所（增量，已有则跳过）
//   node scripts/enrich-ece.mjs --run --full             全量重跑（忽略已有，重新搜全部）
//   node scripts/enrich-ece.mjs --run --ids=10254,10001  只跑指定学校
//   node scripts/enrich-ece.mjs --run --dry-run          只列待跑清单，不调 API
//
// 环境变量（均可在项目根 .env.local 中配置）：
//   YUANBAO_API_KEY        必填，TokenHub 鉴权 key（只从环境读取，绝不落盘/进日志）
//   ECE_AI_BASE_URL       默认 https://tokenhub.tencentmaas.com/v1（广州，联网搜索仅支持广州）
//   ECE_AI_MODEL          默认 hy3
//   ECE_AI_SEARCH_SOURCE  默认 lite（轻量版）；可选 standard（标准版）
//   ECE_AI_REASONING      默认 no_think（实测比 low 快 4.5 倍且信息更全）
//   ECE_ENRICH_CONCURRENCY 默认 10（官方 QPS 上限 5；单请求约 7s，并发 10 时实际 QPS≈1.4，安全）

import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

// ────────────────────────────── 配置层 ──────────────────────────────

// 轻量加载 .env.local（Node 脚本不会自动加载它，那是 Next.js 的能力）。
// 规则：跳过注释与空行，去掉包裹引号；不覆盖已存在的 process.env。
async function loadEnvLocal() {
  const envPath = join(__dirname, "..", ".env.local");
  let text;
  try {
    text = await readFile(envPath, "utf-8");
  } catch {
    return; // 没有 .env.local 就完全依赖外部环境变量
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// 注意：CFG 在模块加载时读取 .env.local 之前，真实值需要在 main() 里 refreshCfg() 重新读一次
const CFG = {
  apiKey: "",
  baseUrl: "https://tokenhub.tencentmaas.com/v1",
  model: "hy3",
  searchSource: "lite",
  reasoning: "no_think",
  concurrency: 10,
};

function refreshCfg() {
  CFG.apiKey = process.env.YUANBAO_API_KEY?.trim() || "";
  CFG.baseUrl =
    process.env.ECE_AI_BASE_URL?.trim() || "https://tokenhub.tencentmaas.com/v1";
  CFG.model = process.env.ECE_AI_MODEL?.trim() || "hy3";
  CFG.searchSource = process.env.ECE_AI_SEARCH_SOURCE?.trim() || "lite";
  CFG.reasoning = process.env.ECE_AI_REASONING?.trim() || "no_think";
  CFG.concurrency = Number(process.env.ECE_ENRICH_CONCURRENCY || 10);
}

// ────────────────────────────── Prompt（已与用户核对定稿，改动需再核对） ──────────────────────────────

const PROMPT_SYSTEM = `你是新西兰早教（ECE）信息采集助手。请基于联网搜索结果，尽可能准确地采集指定幼儿园的公开信息。

严格要求：
1. 只能依据联网搜索到的、可核验的公开信息作答。找不到就返回 null。
   绝对禁止以下行为：
   - 用行业惯例、常见情况、合理推断、"通常为"来填补缺失值
     （例：只查到开门时间 07:30，绝不能自行推断关门时间 17:30，
      此时 openingHours 应整体返回 null）；
   - 用同名或相似机构的信息填充；
   - 凭机构名或地名猜测网址、邮箱（如 xxxx@gmail.com 这类未经证实的地址）。
   若一个字段只有部分被证实，整个字段返回 null，并在 note 中说明已证实的部分。
2. 只输出一个 JSON 对象。不要输出任何解释、前言，也不要 markdown 代码块标记（如 \`\`\`json）。
3. 新西兰同名、相似名的幼儿园很多，必须核对机构名、suburb、city、街道地址，
   确认为同一家后再采集；无法确认则相应字段返回 null。
4. 机构名可能含毛利语长音符号（如 Māori、Takiwā），请原样保留，不要改写。
5. 营业时间统一 24 小时制 "HH:MM-HH:MM"（如 "08:30-14:30"）；多个时段用 "; " 分隔。
6. 下面"已知值"是待核实的数据，请联网核实：若正确则原样返回；若发现更准确/更新的值则纠正并返回纠正后的值；
   若已知值为空，请直接搜索填入。若搜索不到，返回 null。
7. 输出 JSON 必须严格符合以下结构（缺失用 null，枚举只取给定值）：
{
  "phone": "<电话，含区号，如 +64 9 271 2321> 或 null",
  "email": "<邮箱> 或 null",
  "website": "<官网首页 URL，须以 http:// 或 https:// 开头> 或 null",
  "openingHours": "<如 08:30-14:30> 或 null",
  "providesMeals": "yes" | "no" | "unknown",
  "ecePolicy": {
    "provides20Hours": "yes" | "no" | "unknown",
    "summary": "<中文一句话：20小时免费ECE、是否接受WINZ补贴、收费要点等；无信息则空字符串>"
  },
  "holidayMode": {
    "mode": "Term-time only" | "Year-round" | "unknown",
    "summary": "<中文一句话：学期内/学校假期是否开放；无信息则空字符串>"
  },
  "confidence": "high" | "medium" | "low",
  "note": "<搜不到或存疑时，中文简述原因；正常则空字符串>"
}
8. 再次强调：宁可返回 null，也不要填一个"看起来合理"的值。
   每个非空字段都必须能在搜索结果中找到明确出处。
9. 字段补充说明：
   - providesMeals：未明确说明"园方供餐"即为 "no"。新西兰幼儿园普遍要求家长自备
     午餐（lunchbox），只有搜索结果明确写有 meals provided / 含餐 时才填 "yes"；
     仅提供点心（morning tea 等）也视为 "no"。
     （"无供餐说明 = no"属于行业事实，不算推测，可放心填写。）
   - ecePolicy.provides20Hours：只要机构提供免费 ECE 时段（20 小时或更多，
     例如 30 小时）即填 "yes"；明确说明不提供填 "no"；搜不到填 "unknown"。
     summary 中必须写明搜索到的实际小时数（如"提供 30 小时免费 ECE"），
     不要一律写成 20 小时。`;

const PROMPT_USER_TEMPLATE = `请采集以下新西兰幼儿园的公开信息：
- 机构名：{{name}}（ECE 编号 {{eceId}}，类型 {{type}}）
- 街道：{{street}}
-  suburb：{{suburb}}
- 城市：{{city}}
- 所属地区：{{territorial}} / {{region}}
- 已知电话（待核实）：{{knownPhone}}（为空表示无已知值，请直接搜索）
- 已知邮箱（待核实）：{{knownEmail}}（为空表示无已知值，请直接搜索）
- 官网域名线索（取自该园邮箱域名，可作搜索起点）：{{emailDomain}}（为空表示无线索）

可参考并直接采信的权威来源：该机构官网、新西兰教育部 ECE 目录（Education Counts /
Early Childhood Services Directory）、Kindello、Google Maps 商家主页等。
优先官网；官网没有相关信息时，上述其它权威来源的信息同样有效，无需因"非官网"而放弃。

搜索策略（重要）：
- 新西兰很多幼儿园隶属协会或联盟（如 Hutt City Kindergartens、Kidsfirst、
  Whānau Manaaki Kindergartens、Ruahine Kindergartens 等），分园通常没有独立域名，
  但在协会官网下有专属页面，常见 URL 形如 /page/<分园名>/、/kindergarten/<分园名>/、
  /centres/<分园名>/。请务必进入协会官网查找该分园的专属页面，
  不要仅因为协会首页没有直接列出就判定"无官网"。
- 分园专属页面上通常同时载有 Session Times（在园时段，即 openingHours）、
  地址、电话与邮箱，找到后一并采集。
- 若上面提供了"官网域名线索"，请优先进入该域名站内查找本园的专属页面，
  不要只停留在协会首页或列表页。
（注：确实不存在任何页面的幼儿园，website 返回 null 即可，不必强行寻找。）`;

// 从该园邮箱域名提取官网线索：协会/机构域名往往就是分园页面所在的站点。
// 免费邮箱（gmail 等）不含机构信息，直接忽略。
const FREE_MAIL_DOMAINS = [
  "gmail.com","googlemail.com","yahoo.com","yahoo.co.nz","hotmail.com","hotmail.co.nz",
  "outlook.com","live.com","msn.com","icloud.com","me.com","aol.com",
  "xtra.co.nz","protonmail.com","gmx.com","zoho.com","mail.com",
];
function emailDomainHint(email) {
  if (!email || !email.includes("@")) return "";
  const d = email.split("@")[1].trim().toLowerCase();
  if (!d || FREE_MAIL_DOMAINS.includes(d)) return "";
  return d;
}

function buildUserPrompt(s) {
  return PROMPT_USER_TEMPLATE.replace("{{name}}", s.name || "")
    .replace("{{eceId}}", String(s.id ?? ""))
    .replace("{{type}}", s.type || "")
    .replace("{{street}}", s.street || "")
    .replace("{{suburb}}", s.suburb || "")
    .replace("{{city}}", s.city || "")
    .replace("{{territorial}}", s.territorial || "")
    .replace("{{region}}", s.region || "")
    .replace("{{knownPhone}}", s.phone || "")
    .replace("{{knownEmail}}", s.email || "")
    .replace("{{emailDomain}}", emailDomainHint(s.email));
}

// ────────────────────────────── 模型调用 ──────────────────────────────

// 调用 TokenHub Chat Completions（开启联网搜索）。
// 说明：官方文档未提及 response_format，不能假设支持，因此做双通道：
//   先尝试带 response_format:{type:"json_object"}；若被拒则自动退回纯文本模式。
// 返回 { content, searchResults, usage, usedJsonMode }
async function callModel({ user, city }) {
  const url = `${CFG.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const buildBody = (jsonMode) => ({
    model: CFG.model,
    messages: [
      { role: "system", content: PROMPT_SYSTEM },
      { role: "user", content: user },
    ],
    // 联网搜索开关（Chat API 专用字段，见 TokenHub 联网搜索文档）
    web_search_options: {
      enable: true,
      search_source: CFG.searchSource,
      user_location: {
        type: "approximate",
        country: "NZ",
        city: city || "Auckland",
        timezone: "Pacific/Auckland",
      },
    },
    reasoning_effort: CFG.reasoning,
    stream: false,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  });

  const post = async (jsonMode) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CFG.apiKey}`,
        },
        body: JSON.stringify(buildBody(jsonMode)),
        signal: ctrl.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
      return JSON.parse(text);
    } finally {
      clearTimeout(timer);
    }
  };

  // 默认不使用 response_format：TokenHub 官方文档未提及该参数，
  // 实测传入后网关不报错、但模型产出 {"": ""} 畸形结果，属于"静默失效"，比报错更危险。
  // 如将来官方确认支持，可用 ECE_AI_JSON_MODE=1 开启。
  const jsonMode = process.env.ECE_AI_JSON_MODE === "1";
  const data = await post(jsonMode);

  const choice = data?.choices?.[0] || {};
  const msg = choice.message || {};
  return {
    content: msg.content ?? "",
    searchResults: msg.search_results || [],
    usage: data?.usage || {},
    usedJsonMode: jsonMode,
    finishReason: choice.finish_reason,
    error: data?.error || null,
  };
}

// 从模型返回文本中提取 JSON（兼容被 markdown 代码块包裹或带前后废话的情况）
function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ────────────────────────────── 冒烟验证（不写任何文件） ──────────────────────────────

async function smoke(idArg) {
  console.log("=== 冒烟验证（不写文件）===");
  console.log(`baseUrl : ${CFG.baseUrl}`);
  console.log(`model   : ${CFG.model}`);
  console.log(`搜索版本 : ${CFG.searchSource}`);
  console.log(`reasoning: ${CFG.reasoning}`);
  console.log(`apiKey   : ${CFG.apiKey ? "已配置(长度" + CFG.apiKey.length + ")" : "❌ 未配置"}`);
  if (!CFG.apiKey) {
    console.error("缺少 YUANBAO_API_KEY，请确认 .env.local 已配置。");
    process.exit(1);
  }

  const frontend = JSON.parse(
    await readFile(join(DATA_DIR, "ece-frontend.json"), "utf-8")
  );
  const school =
    (idArg && frontend.find((x) => String(x.id) === String(idArg))) || frontend[0];
  if (!school) {
    console.error("未找到可用于冒烟的学校。");
    process.exit(1);
  }

  console.log(`\n--- 目标学校 ---`);
  console.log(`${school.name}（id=${school.id}）`);
  console.log(`${school.street}, ${school.suburb}, ${school.city}`);
  console.log(`已知电话: ${school.phone || "(空)"}`);
  console.log(`已知邮箱: ${school.email || "(空)"}`);

  const user = buildUserPrompt(school);
  console.log(`\n--- 发起请求（开启联网搜索）---`);
  const t0 = Date.now();
  const { content, searchResults, usage, usedJsonMode, finishReason, error } =
    await callModel({
      user,
      city: school.city,
    });
  console.log(`耗时: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`JSON 模式: ${usedJsonMode ? "response_format" : "纯文本(默认)"}`);
  console.log(`finish_reason: ${finishReason}`);
  if (error) console.log(`响应 error 字段: ${JSON.stringify(error)}`);
  console.log(`usage 全文: ${JSON.stringify(usage)}`);

  console.log(`\n--- 搜索是否生效 ---`);
  console.log(`search_results 条数: ${searchResults.length}`);
  console.log(`web_search_call   : ${usage?.tool_usage?.web_search_call ?? "n/a"}`);
  searchResults.slice(0, 5).forEach((s) => {
    console.log(`  [${s.index}] ${s.site || ""} - ${s.name || s.url}`);
    console.log(`      ${s.url}`);
  });

  console.log(`\n--- 模型原始返回 ---`);
  console.log(content.slice(0, 1500));

  const parsed = extractJson(content);
  console.log(`\n--- 解析结果 ---`);
  if (!parsed) {
    console.log("❌ 无法解析为 JSON，需要调整 prompt 或解析逻辑");
  } else {
    console.log("✅ 解析成功：");
    console.log(JSON.stringify(parsed, null, 2));
  }
}

// ────────────────────────────── 拉取与过滤 ──────────────────────────────
// 复刻 src/scripts/fetch-data.mjs 的 ECE 过滤逻辑。
// 注意：不能 import 该文件（它有 isDirectRun 自执行 main()，import 会触发联网重写数据），
// 因此这里独立实现一份，并标注必须与 fetch-data.mjs 保持一致，合并阶段统一抽为共享模块。

const ECE_DUMP_URL =
  "https://catalogue.data.govt.nz/datastore/dump/a9d65b07-8483-4b05-bdfd-d2abe4f38827?format=json";

const KEEP_ECE_TYPE = ["Education & Care Service", "Free Kindergarten"];
const KEEP_ECE_AUTHORITY = {
  "Privately owned": "私立",
  "Community based": "公立",
};

function toNumber(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).replace(/,/g, "").trim();
  if (s === "" || s.toUpperCase() === "NA" || s.toUpperCase() === "N/A")
    return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

// 与 fetch-data.mjs 的 parseEceEqi 保持一致：undefined 表示丢弃，null 表示"不适用"
function parseEceEqi(x) {
  if (x == null) return null;
  const s = String(x).trim();
  if (s === "") return undefined;
  if (/not applicable|unknown/i.test(s) || /^n\/a$/i.test(s)) return null;
  if (/new service/i.test(s)) return undefined;
  const m = s.match(/(\d+)/);
  if (!m) return undefined;
  let n = Number(m[1]);
  if (s.includes(">")) n = 6;
  if (n >= 1 && n <= 4) return n;
  if (n === 6) return 6;
  return undefined;
}

// 拉取 CKAN dump（records 为二维数组），按 fields 映射为对象数组
async function fetchEceDump() {
  const res = await fetch(ECE_DUMP_URL);
  if (!res.ok) throw new Error(`[ece dump] HTTP ${res.status}`);
  const json = await res.json();
  const fields = json.fields.map((f) => f.id);
  return json.records.map((row) => {
    const obj = {};
    fields.forEach((field, i) => {
      obj[field] = row[i];
    });
    return obj;
  });
}

// 获取全量原始数据。默认复用 data/ece.json（与前端同源、口径一致、零额外请求）；
// 需要自行联网时用 --refetch，结果写入独立缓存文件，绝不覆盖 data/ece.json。
async function loadEceRaw(refetch) {
  if (refetch) {
    const rows = await fetchEceDump();
    const cachePath = join(DATA_DIR, ".ece-dump-cache.json");
    await writeFile(cachePath, JSON.stringify(rows));
    console.log(`[raw] 已联网拉取并写入独立缓存: ${cachePath}`);
    return rows;
  }
  return JSON.parse(await readFile(join(DATA_DIR, "ece.json"), "utf-8"));
}

// 过滤：与现有逻辑一致，并返回丢弃明细便于逐项比对
function filterEce(rows) {
  const dropped = { byType: {}, byAuthority: 0, byEqi: 0, byGeo: 0 };
  const kept = [];
  for (const r of rows) {
    const typ = (r.Org_Type || "").trim();
    if (!KEEP_ECE_TYPE.includes(typ)) {
      dropped.byType[typ] = (dropped.byType[typ] || 0) + 1;
      continue;
    }
    const authority = (r.Authority || "").trim();
    if (!(authority in KEEP_ECE_AUTHORITY)) {
      dropped.byAuthority += 1;
      continue;
    }
    const eqi = parseEceEqi(r.Equity_Index);
    if (eqi === undefined) {
      dropped.byEqi += 1;
      continue;
    }
    if (toNumber(r.Latitude) === null || toNumber(r.Longitude) === null) {
      dropped.byGeo += 1;
      continue;
    }
    kept.push(r);
  }
  return { kept, dropped };
}

// CLI: --fetch 校验过滤口径是否与现有逻辑完全一致
async function checkFetch(refetch) {
  const rows = await loadEceRaw(refetch);
  const { kept, dropped } = filterEce(rows);
  console.log(`原始记录: ${rows.length}`);
  console.log(`过滤保留: ${kept.length}`);
  console.log(`丢弃合计: ${rows.length - kept.length}`);
  console.log("\n--- 丢弃明细（按 Org_Type）---");
  Object.entries(dropped.byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\nAuthority 不匹配: ${dropped.byAuthority}`);
  console.log(`EQI 不可用      : ${dropped.byEqi}`);
  console.log(`经纬度无效      : ${dropped.byGeo}`);
}

// ────────────────────────────── 归一化与校验 ──────────────────────────────

// 电话归一化：同一号码的不同写法（09-271 2321 / +64 9 271 2321）应判定为一致，
// 否则会被误报成冲突。
function normalizePhone(v) {
  if (!v) return "";
  let s = String(v).toLowerCase().replace(/[\s\-()]/g, "");
  if (s.startsWith("+64")) s = "0" + s.slice(3);
  else if (s.startsWith("0064")) s = "0" + s.slice(4);
  return s;
}

function normalizeEmail(v) {
  return v ? String(v).trim().toLowerCase() : "";
}

// 字段合法性校验：非法值置 null 并标记 valid=false（用于降级置信度）
function validateField(name, v) {
  if (v === null || v === undefined || v === "") return { value: null, ok: true };
  const s = String(v).trim();
  switch (name) {
    case "website":
      return /^https?:\/\/\S+\.\S+/.test(s)
        ? { value: s, ok: true }
        : { value: null, ok: false };
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
        ? { value: s, ok: true }
        : { value: null, ok: false };
    case "phone":
      return /\d{6,}/.test(s.replace(/\D/g, ""))
        ? { value: s, ok: true }
        : { value: null, ok: false };
    case "openingHours":
      return /\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(s)
        ? { value: s, ok: true }
        : { value: null, ok: false };
    case "providesMeals": {
      const lower = s.toLowerCase();
      return ["yes", "no", "unknown"].includes(lower)
        ? { value: lower, ok: true }
        : { value: "unknown", ok: false };
    }
    default:
      return { value: s, ok: true };
  }
}

// 组装单字段结果：搜索值 + 原始值 + 冲突判定（电话/邮箱做归一化比较）
function makeField(name, searched, original) {
  const { value, ok } = validateField(name, searched);
  const orig = original ? String(original).trim() : null;
  let conflict = false;
  if (orig && value) {
    if (name === "phone")
      conflict = normalizePhone(orig) !== normalizePhone(value);
    else if (name === "email")
      conflict = normalizeEmail(orig) !== normalizeEmail(value);
    else conflict = orig !== String(value).trim();
  }
  return {
    value,
    original: orig,
    conflict,
    valid: ok,
    confidence: value ? (ok ? "medium" : "low") : null,
  };
}

// ────────────────────────────── 备用库读写 ──────────────────────────────

const ENRICH_PATH = join(DATA_DIR, "ece-enrichment.json");
const ENRICHED_PATH = join(DATA_DIR, "ece-enriched.json");
const LOG_PATH = join(DATA_DIR, "_ece_enrich_log.json");

// 原子写：先写 .tmp 再 rename，避免中断产生半截 JSON
async function writeJsonAtomic(path, data) {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, path);
}

async function loadJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return fallback;
  }
}

// ────────────────────────────── 搜索层 ──────────────────────────────

// 处理单所学校：调模型 → 解析 → 校验 → 冲突判定 → 返回备用库记录
async function processOne(raw, { keepRaw } = {}) {
  const school = {
    id: String(raw.ECE_Id),
    name: (raw.Org_Name || "").trim(),
    type: (raw.Org_Type || "").trim(),
    street: (raw.Add1_Line1 || "").trim(),
    suburb: (raw.Add1_Suburb || "").trim(),
    city: (raw.Add1_City || "").trim(),
    territorial: (raw.Territorial_Authority || "").trim(),
    region: (raw.Education_Region || "").trim(),
    phone: (raw.Telephone || "").trim(),
    email: (raw.Email || "").trim(),
  };

  const user = buildUserPrompt(school);
  let lastErr = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { content, usage } = await callModel({ user, city: school.city });
      const parsed = extractJson(content);
      if (!parsed) throw new Error("返回无法解析为 JSON");

      const fields = {
        phone: makeField("phone", parsed.phone, school.phone),
        email: makeField("email", parsed.email, school.email),
        website: makeField("website", parsed.website, ""),
        openingHours: makeField("openingHours", parsed.openingHours, ""),
        providesMeals: makeField("providesMeals", parsed.providesMeals, ""),
      };

      const p20 = String(parsed?.ecePolicy?.provides20Hours || "")
        .trim()
        .toLowerCase();
      const ecePolicy = {
        provides20Hours: ["yes", "no", "unknown"].includes(p20) ? p20 : "unknown",
        summary: String(parsed?.ecePolicy?.summary || "").trim(),
      };
      const hm = String(parsed?.holidayMode?.mode || "").trim();
      const holidayMode = {
        mode: ["Term-time only", "Year-round", "unknown"].includes(hm)
          ? hm
          : "unknown",
        summary: String(parsed?.holidayMode?.summary || "").trim(),
      };

      // 冲突明细：电话/邮箱（归一化后比较）+ 20小时ECE（与原始 20_Hrs_ECE 字段比对）
      const conflicts = [];
      if (fields.phone.conflict)
        conflicts.push({
          field: "phone",
          original: fields.phone.original,
          suggested: fields.phone.value,
        });
      if (fields.email.conflict)
        conflicts.push({
          field: "email",
          original: fields.email.original,
          suggested: fields.email.value,
        });
      const raw20 = String(raw["20_Hrs_ECE"] || "").trim();
      const mapped20 =
        raw20.toLowerCase() === "yes"
          ? "yes"
          : raw20.toLowerCase() === "no"
          ? "no"
          : null;
      if (
        mapped20 &&
        ecePolicy.provides20Hours !== "unknown" &&
        mapped20 !== ecePolicy.provides20Hours
      )
        conflicts.push({
          field: "provides20Hours",
          original: raw20,
          suggested: ecePolicy.provides20Hours,
        });

      return {
        record: {
          eceId: school.id,
          name: school.name,
          searchedAt: new Date().toISOString(),
          status: "ok",
          fields,
          ecePolicy,
          holidayMode,
          conflicts, // 冲突明细直接落在记录里，便于查看
          confidence: parsed.confidence || null,
          note: String(parsed.note || "").trim(),
          usage: { webSearchCalls: usage?.tool_usage?.web_search_call ?? 0 },
          ...(keepRaw ? { rawReply: content } : {}),
        },
      };
    } catch (e) {
      lastErr = e;
      const wait = 1000 * 2 ** (attempt - 1);
      console.log(
        `  [${school.id}] 第 ${attempt} 次失败：${e.message}，${wait}ms 后重试`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  return {
    record: {
      eceId: school.id,
      name: school.name,
      searchedAt: new Date().toISOString(),
      status: "failed",
      error: lastErr?.message || "未知错误",
    },
  };
}

// 简易并发池
async function runPool(items, limit, worker) {
  let idx = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (idx < items.length) {
        const i = idx++;
        await worker(items[i], i);
      }
    }
  );
  await Promise.all(runners);
}

// ────────────────────────────── 合并层 ──────────────────────────────

// 合并规则：
//   - 原有字段（phone/email）以原始值为准；原始为空才用搜索值补充
//   - 新增字段（website/openingHours/...）原始没有，直接采用搜索值
//   - 冲突一律保留原始值，冲突明细写入 conflicts 与日志
async function mergeAll(store, keptRows) {
  const out = keptRows.map((raw) => {
    const id = String(raw.ECE_Id);
    const rec = store[id];
    const item = {
      id,
      name: (raw.Org_Name || "").trim(),
      type: (raw.Org_Type || "").trim(),
      authority: (raw.Authority || "").trim(),
      street: (raw.Add1_Line1 || "").trim(),
      suburb: (raw.Add1_Suburb || "").trim(),
      city: (raw.Add1_City || "").trim(),
      territorial: (raw.Territorial_Authority || "").trim(),
      region: (raw.Education_Region || "").trim(),
      lat: toNumber(raw.Latitude),
      lng: toNumber(raw.Longitude),
      // 原有字段：取原始值
      phone: (raw.Telephone || "").trim(),
      email: (raw.Email || "").trim(),
      raw20HoursECE: (raw["20_Hrs_ECE"] || "").trim(),
      // 新增字段：原始没有，先给空值
      website: "",
      openingHours: "",
      providesMeals: "unknown",
      provides20Hours: "unknown",
      holidayMode: "unknown",
      ecePolicySummary: "",
      holidayModeSummary: "",
      // 补全状态与冲突
      enriched: false,
      enrichedAt: null,
      conflicts: [],
      note: "",
    };

    if (rec && rec.status === "ok") {
      item.enriched = true;
      item.enrichedAt = rec.searchedAt;
      item.conflicts = rec.conflicts || [];
      item.note = rec.note || "";
      // 缺失才补
      if (!item.phone && rec.fields.phone.value)
        item.phone = rec.fields.phone.value;
      if (!item.email && rec.fields.email.value)
        item.email = rec.fields.email.value;
      item.website = rec.fields.website.value || "";
      item.openingHours = rec.fields.openingHours.value || "";
      item.providesMeals = rec.fields.providesMeals.value || "unknown";
      item.provides20Hours = rec.ecePolicy?.provides20Hours || "unknown";
      item.holidayMode = rec.holidayMode?.mode || "unknown";
      item.ecePolicySummary = rec.ecePolicy?.summary || "";
      item.holidayModeSummary = rec.holidayMode?.summary || "";
    }
    return item;
  });
  await writeJsonAtomic(ENRICHED_PATH, out);
  return out;
}

// ────────────────────────────── 主运行 ──────────────────────────────

async function runEnrich({ limit, full, ids, dryRun, concurrency, keepRaw }) {
  if (!CFG.apiKey) {
    console.error("缺少 YUANBAO_API_KEY，请确认 .env.local 已配置。");
    process.exit(1);
  }

  const rows = await loadEceRaw(false);
  const { kept } = filterEce(rows);

  let targets = kept;
  if (ids) {
    const set = new Set(String(ids).split(",").map((s) => s.trim()));
    targets = kept.filter((r) => set.has(String(r.ECE_Id)));
  }

  const store = await loadJson(ENRICH_PATH, {});
  const pending = [];
  let skipped = 0;
  for (const r of targets) {
    const id = String(r.ECE_Id);
    if (!full && store[id] && store[id].status === "ok") {
      skipped += 1;
      continue;
    }
    pending.push(r);
  }
  if (limit) pending.splice(limit);

  console.log(
    `目标 ${targets.length} 所，跳过已有 ${skipped} 所，本次待处理 ${pending.length} 所（并发 ${concurrency}）`
  );

  if (dryRun || pending.length === 0) {
    pending.slice(0, 20).forEach((r) =>
      console.log(
        `  ${r.ECE_Id} - ${r.Org_Name}（${r.Add1_Suburb}, ${r.Add1_City}）`
      )
    );
    if (pending.length > 20) console.log(`  ... 共 ${pending.length} 所`);
    if (!dryRun) await mergeAll(store, kept);
    return;
  }

  const log = {
    startedAt: new Date().toISOString(),
    conflicts: [],
    failures: [],
    skipped,
    totalSearchCalls: 0,
  };
  let done = 0;
  const t0 = Date.now();

  await runPool(pending, concurrency, async (raw) => {
    const { record } = await processOne(raw, { keepRaw });
    store[record.eceId] = record;
    done += 1;

    if (record.status === "ok") {
      log.totalSearchCalls += record.usage?.webSearchCalls || 0;
      if (record.conflicts?.length) {
        record.conflicts.forEach((c) =>
          log.conflicts.push({ eceId: record.eceId, name: record.name, ...c })
        );
      }
    } else {
      log.failures.push({
        eceId: record.eceId,
        name: record.name,
        error: record.error,
      });
    }

    const flag = record.conflicts?.length
      ? ` ⚠冲突×${record.conflicts.length}`
      : "";
    console.log(
      `[${done}/${pending.length}] ${record.eceId} ${record.name} → ${record.status}${flag}`
    );

    // 每 10 所落盘一次，支持断点续跑
    if (done % 10 === 0) await writeJsonAtomic(ENRICH_PATH, store);
  });

  await writeJsonAtomic(ENRICH_PATH, store);
  await mergeAll(store, kept);

  log.finishedAt = new Date().toISOString();
  log.durationSec = Math.round((Date.now() - t0) / 1000);
  log.processed = pending.length;
  await writeJsonAtomic(LOG_PATH, log);

  console.log(
    `\n完成：成功 ${pending.length - log.failures.length}，失败 ${log.failures.length}，跳过 ${skipped}`
  );
  console.log(
    `搜索调用累计 ${log.totalSearchCalls} 次，冲突 ${log.conflicts.length} 处`
  );
  console.log(`耗时 ${log.durationSec}s`);
  console.log(
    `产物：${ENRICH_PATH}\n      ${ENRICHED_PATH}\n      ${LOG_PATH}`
  );
}

// ────────────────────────────── 确定性探测（网络直连，不消耗大模型 API） ──────────────────────────────
// 背景：模型靠搜索引擎找页面，进不了协会官网的深层分园页（如 /page/avalon/ 客观存在却搜不到）。
// 而邮箱域名已经直接给出了协会官网域名，可以按 "<域名>/page/<slug>/" 这类模式直接探测。
// 这一层用于补强大模型结果：命中率高、成本为零，且营业时间（Session Times）通常就写在分园页上。

// 从机构名生成 slug 候选（"Sun Valley Kindergarten" → sun-valley 等）
function slugCandidates(name) {
  const base = String(name || "").toLowerCase().trim();
  const stripped = base
    .replace(/\bkindergarten(s)?\b/g, "")
    .replace(/\bpreschool(s)?\b/g, "")
    .replace(/\bearly learning (centre|center)\b/g, "")
    .replace(/\bnursery\b/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const toSlug = (s) =>
    s
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  const out = new Set();
  const s1 = toSlug(stripped);
  const s2 = toSlug(base.replace(/[^a-z0-9\s-]/g, ""));
  if (s1) out.add(s1);
  if (s2) out.add(s2);
  const words = s1.split("-");
  if (words.length > 1) out.add(words.slice(1).join("-")); // 去掉可能的协会名前缀
  return [...out].filter(Boolean);
}

const URL_PATTERNS = [
  (d, s) => `https://${d}/page/${s}/`,
  (d, s) => `https://www.${d}/page/${s}/`,
  (d, s) => `https://${d}/kindergarten/${s}/`,
  (d, s) => `https://www.${d}/kindergarten/${s}/`,
  (d, s) => `https://${d}/centres/${s}/`,
  (d, s) => `https://${d}/${s}/`,
];

// 从 HTML 提取 Session Times（营业时间），归一化为 HH:MM-HH:MM
function extractSessionTimes(html) {
  if (!html) return null;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");
  // 注意：这里必须用 . 而不是 [^.]，否则遇到 "8.30am" 的小数点会被截断，导致抓不到时段
  const near =
    text.match(/session\s*times?\s*:?\s*(.{0,160})/i) ||
    text.match(/opening\s*hours?\s*:?\s*(.{0,160})/i) ||
    text.match(/\bhours?\s*:?\s*(.{0,160})/i);
  const scope = near ? near[1] : text;
  const t = scope.match(
    /(\d{1,2}[.:]?\d{0,2}\s*(?:am|pm)?)\s*(?:[–—-]|\bto\b)\s*(\d{1,2}[.:]?\d{0,2}\s*(?:am|pm)?)/i
  );
  if (!t) return null;
  const norm = (x) => {
    const s = x.trim().toLowerCase().replace(/\s+/g, "").replace(/\./g, ":");
    const hm = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
    if (!hm) return null;
    let h = Number(hm[1]);
    const mi = hm[2] || "00";
    if (hm[3] === "pm" && h < 12) h += 12;
    if (hm[3] === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${mi}`;
  };
  const a = norm(t[1]);
  const b = norm(t[2]);
  return a && b ? `${a}-${b}` : null;
}

async function probeUrl(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ECEDataEnricher/1.0)",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html/i.test(ct)) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 对单所幼儿园做确定性探测：返回 { url, hours, domain }
async function probeOne(r, { delayMs = 250 } = {}) {
  const domain = emailDomainHint((r.Email || "").trim());
  if (!domain) return { domain: null, url: null, hours: null };
  const slugs = slugCandidates(r.Org_Name);
  const key = String(r.Org_Name || "")
    .toLowerCase()
    .split(/\s+/)[0];

  for (const s of slugs) {
    for (const mk of URL_PATTERNS) {
      const url = mk(domain, s);
      const html = await probeUrl(url);
      await sleep(delayMs); // 控制频率，避免给对方站点造成压力
      if (!html) continue;
      if (key && !html.toLowerCase().includes(key)) continue; // 确认是该园页面
      return { domain, url, hours: extractSessionTimes(html) };
    }
  }
  return { domain, url: null, hours: null };
}

// CLI: --probe 验证确定性探测的命中率（只读网络，不写文件）
async function runProbe({ domain, limit, delayMs = 250 }) {
  const rows = await loadEceRaw(false);
  const { kept } = filterEce(rows);
  let targets = kept.filter((r) => {
    const d = emailDomainHint((r.Email || "").trim());
    return d && (!domain || d === domain);
  });
  if (limit) targets = targets.slice(0, limit);

  console.log(
    `确定性探测：目标 ${targets.length} 所（域名=${domain || "全部协会域名"}，延迟 ${delayMs}ms）`
  );

  let hitPage = 0;
  let hitHours = 0;
  for (const r of targets) {
    const { url, hours } = await probeOne(r, { delayMs });
    if (url) hitPage += 1;
    if (hours) hitHours += 1;
    console.log(
      `${url ? "✅" : "❌"} ${r.ECE_Id} ${r.Org_Name}${
        url ? " → " + url + (hours ? "  ⏰" + hours : "  (页面无时段)") : ""
      }`
    );
  }
  console.log(
    `\n结果：命中分园页 ${hitPage}/${targets.length}（${((hitPage / targets.length) * 100).toFixed(0)}%），` +
      `其中提取到营业时间 ${hitHours} 所（${((hitHours / targets.length) * 100).toFixed(0)}%）`
  );
}

// ────────────────────────────── CLI ──────────────────────────────

async function main() {
  await loadEnvLocal();
  // .env.local 加载完成后统一刷新配置（CFG 在模块加载时还读不到它）
  refreshCfg();

  const argv = process.argv.slice(2);
  const get = (name) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  const has = (name) => argv.includes(`--${name}`);

  if (has("smoke")) {
    await smoke(get("id"));
    return;
  }

  if (has("fetch")) {
    await checkFetch(has("refetch"));
    return;
  }

  if (has("probe")) {
    await runProbe({
      domain: get("domain"),
      limit: Number(get("limit") || 0) || null,
      delayMs: Number(get("delay") || 250),
    });
    return;
  }

  if (has("run")) {
    await runEnrich({
      limit: get("limit") ? Number(get("limit")) : null,
      full: has("full"),
      ids: get("ids"),
      dryRun: has("dry-run"),
      concurrency: Number(get("concurrency") || CFG.concurrency),
      keepRaw: has("keep-raw"),
    });
    return;
  }

  console.log("已实现模式：");
  console.log("  --smoke                  API 冒烟验证（1 所学校，不写文件）");
  console.log("  --fetch                  拉取与过滤校验（默认读 data/ece.json）");
  console.log("  --fetch --refetch        自行联网拉取（写入独立缓存，不动 ece.json）");
  console.log("  --run --limit=5          跑 5 所（增量）");
  console.log("  --run --full             全量重跑（忽略已有）");
  console.log("  --run --ids=10254,10001   只跑指定学校");
  console.log("  --run --dry-run          只列清单不调 API");
}

main().catch((err) => {
  console.error("执行失败:", err?.message || err);
  process.exit(1);
});
