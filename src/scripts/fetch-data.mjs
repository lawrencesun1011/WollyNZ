// 全量拉取 data.govt.nz 教育机构数据，清洗后落地到 src/data/ 目录。
// 用法：node src/scripts/fetch-data.mjs  （或 npm run fetch:data）
// 说明：
//   - CKAN datastore dump 的 records 为「按 fields 顺序的数组」，需按 fields 映射为对象。
//   - 每日凌晨由定时任务调用，实现全量更新。
//   - 中小学额外生成 schools-frontend.json：按参考 csv-to-json.py 规则过滤
//     （类型/公私立/Open/有坐标）并派生前端友好字段。

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

// 自动加载 .env.local（若存在），把 CLOUDBASE_* 注入 process.env。
const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocalPath = join(__dirname, "..", "..", ".env.local");
if (existsSync(envLocalPath)) {
  try {
    const text = await readFile(envLocalPath, "utf-8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
    console.log("[env] 已加载 .env.local");
  } catch (e) {
    console.warn("[env] 加载 .env.local 失败:", e.message);
  }
}

const DATA_DIR = join(__dirname, "..", "..", "data");

// 通过 CloudBase PostgREST 网关直连 PostgreSQL（public schema）。
// node-sdk 的 app.rdb() 会把 envId 当 schema 导致无法访问，故直接使用 REST gateway。
const ENV_ID = process.env.CLOUDBASE_ENV_ID || "";
const API_KEY = process.env.CLOUDBASE_API_KEY || "";
const PG_BASE = `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest`;
const PG_ENABLED = Boolean(ENV_ID && API_KEY);

async function pgRequest(path, method, body, extraHeaders) {
  const res = await fetch(`${PG_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`PG ${method} ${path} 失败 ${res.status}: ${msg}`);
  }
  return res;
}

// camelCase 前端字段 -> snake_case 物理列
const SCHOOL_COLUMN_MAP = {
  id: "id", name: "name", type: "type", level: "level", authority: "authority",
  authorityCN: "authority_cn", gender: "gender", genderCN: "gender_cn",
  boarding: "boarding", language: "language", languageCN: "language_cn",
  enrolment: "enrolment", street: "street", suburb: "suburb", city: "city",
  territorial: "territorial", region: "region", urbanRural: "urban_rural",
  phone: "phone", email: "email", roll: "roll", eqi: "eqi", isolation: "isolation",
  european: "european", maori: "maori", pacific: "pacific", asian: "asian",
  melaa: "melaa", other: "other", intl: "intl", lat: "lat", lng: "lng",
  website: "website", url: "url",
};

// 整数列（对应表中 integer 类型），写入前统一清洗为整数或 null
const INT_COLS = new Set([
  "roll", "eqi", "european", "maori", "pacific",
  "asian", "melaa", "other", "intl",
]);

// 小数/实数列（如 isolation 偏远度指数 0~1 之间），保留小数原值
const NUM_COLS = new Set(["isolation"]);

function cleanInt(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

function cleanNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toSnakeRow(frontend) {
  const row = {};
  for (const [key, col] of Object.entries(SCHOOL_COLUMN_MAP)) {
    const val = frontend[key] ?? null;
    if (INT_COLS.has(col)) row[col] = cleanInt(val);
    else if (NUM_COLS.has(col)) row[col] = cleanNum(val);
    else row[col] = val;
  }
  return row;
}

async function syncRaw(table, records) {
  if (!PG_ENABLED) return;
  // 全量覆盖：先删后插
  await pgRequest(`/${table}`, "DELETE", null);
  const rows = records.map((r) => ({ id: String(r.School_Id ?? r.id ?? r._id), payload: r }));
  for (let i = 0; i < rows.length; i += 500) {
    await pgRequest(`/${table}`, "POST", rows.slice(i, i + 500));
  }
  console.log(`[pg] ${table} 已写入 ${rows.length} 条`);
}

async function syncSchools(frontend) {
  if (!PG_ENABLED) return;
  const rows = frontend.map(toSnakeRow);
  // upsert：按 id 冲突时更新（PostgREST 需 Prefer: resolution=merge-duplicates 才触发 on_conflict）
  for (let i = 0; i < rows.length; i += 500) {
    await pgRequest(
      `/schools?on_conflict=id`,
      "POST",
      rows.slice(i, i + 500),
      { Prefer: "resolution=merge-duplicates,return=minimal" }
    );
  }
  console.log(`[pg] schools 已 upsert ${rows.length} 条`);
}

const SOURCES = {
  ece: {
    resourceId: "a9d65b07-8483-4b05-bdfd-d2abe4f38827",
    url: "https://catalogue.data.govt.nz/datastore/dump/a9d65b07-8483-4b05-bdfd-d2abe4f38827?format=json",
    label: "幼儿园（早期儿童服务机构）",
  },
  schools: {
    resourceId: "4b292323-9fcc-41f8-814b-3c7b19cf14b3",
    url: "https://catalogue.data.govt.nz/datastore/dump/4b292323-9fcc-41f8-814b-3c7b19cf14b3?format=json",
    label: "中小学",
  },
};

const KEEP_TYPE_KEYWORDS = [
  "Composite",
  "Contributing",
  "Primary",
  "Secondary",
  "Intermediate",
];
const LEVEL_MAP = [
  ["Composite", "贯通制"],
  ["Intermediate", "初中"],
  ["Contributing", "小学"],
  ["Primary", "小学"],
  ["Secondary", "高中"],
];
const KEEP_AUTHORITY = {
  "Private : Fully Registered": "私立",
  State: "公立",
  "State : Integrated": "公立整合",
};
const GENDER_CN = {
  "Boys School": "男校",
  "Boys/Senior Co-Ed": "男校/高年级混校",
  "Co-Educational": "男女混校",
  "Girls School": "女校",
  "Primary Co-Ed/Secondary Boys": "小学混校 / 中学男校",
  "Primary Co-Ed/Secondary Girls": "小学混校 / 中学女校",
};
const LANGUAGE_CN = {
  "All students taught in English/other setting": "全英语教学",
  "Some students taught in te reo Māori": "部分毛利语教学",
  "All students taught in te reo Māori": "全毛利语教学",
  "Some students taught in a Pacific language": "部分太平洋岛国语言教学",
  "Some students taught in te reo Māori or a Pacific language":
    "部分毛利语或太平洋岛国语言教学",
};

function detectLevel(typ) {
  for (const [key, lvl] of LEVEL_MAP) {
    if (typ && typ.includes(key)) return lvl;
  }
  return "";
}

function toNumber(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).replace(/,/g, "").trim();
  if (s === "" || s.toUpperCase() === "NA" || s.toUpperCase() === "N/A")
    return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function buildSchoolFrontend(raw) {
  const typ = raw.Org_Type || "";
  if (!KEEP_TYPE_KEYWORDS.some((k) => typ.includes(k))) return null;
  const level = detectLevel(typ);
  if (!level) return null;

  const authority = raw.Authority;
  if (!(authority in KEEP_AUTHORITY)) return null;
  if (raw.Status !== "Open") return null;

  const lat = toNumber(raw.Latitude);
  const lng = toNumber(raw.Longitude);
  if (lat === null || lng === null) return null;

  const boardingRaw = raw.BoardingFacilities || "";
  const boarding = boardingRaw.startsWith("Y") ? "Yes" : "No";
  const roll = toNumber(raw.Total) ?? 0;

  return {
    id: raw.School_Id,
    name: (raw.Org_Name || "").trim(),
    type: typ,
    level,
    authority,
    authorityCN: KEEP_AUTHORITY[authority],
    gender: raw.CoEd_Status || "",
    genderCN: GENDER_CN[raw.CoEd_Status] || "",
    boarding,
    language: (raw.Language_of_Instruction || "").trim(),
    languageCN: LANGUAGE_CN[(raw.Language_of_Instruction || "").trim()] || "",
    enrolment: (raw.Enrolment_Scheme || "").trim(),
    street: (raw.Add1_Line1 || "").trim(),
    suburb: (raw.Add1_Suburb || "").trim(),
    city: (raw.Add1_City || "").trim(),
    territorial: (raw.Territorial_Authority || "").trim(),
    region: (raw.Education_Region || "").trim(),
    urbanRural: (raw.Urban_Rural_Indicator || "").trim(),
    phone: (raw.Telephone || "").trim(),
    email: (raw.Email || "").trim(),
    roll,
    eqi: toNumber(raw.EQi_Index) ?? null,
    isolation: toNumber(raw.Isolation_Index) ?? null,
    european: toNumber(raw.European) ?? 0,
    maori: toNumber(raw["Māori"]) ?? 0,
    pacific: toNumber(raw.Pacific) ?? 0,
    asian: toNumber(raw.Asian) ?? 0,
    melaa: toNumber(raw.MELAA) ?? 0,
    other: toNumber(raw.Other) ?? 0,
    intl: toNumber(raw.International) ?? 0,
    lat,
    lng,
    website: (raw.URL || "").trim(),
    url: `/schools/${raw.School_Id}`,
  };
}

async function fetchSource(key, source) {
  console.log(`[${key}] 拉取中: ${source.url}`);
  const res = await fetch(source.url);
  if (!res.ok) throw new Error(`[${key}] HTTP ${res.status}`);
  const json = await res.json();
  const fields = json.fields.map((f) => f.id);
  const records = json.records.map((row) => {
    const obj = {};
    fields.forEach((field, i) => {
      obj[field] = row[i];
    });
    return obj;
  });
  console.log(`[${key}] 记录数: ${records.length}`);
  return records;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const meta = { fetchedAt: new Date().toISOString(), sources: {} };

  const eceRecords = await fetchSource("ece", SOURCES.ece);
  await writeFile(join(DATA_DIR, "ece.json"), JSON.stringify(eceRecords));
  await syncRaw("ece_raw", eceRecords);
  meta.sources.ece = {
    resourceId: SOURCES.ece.resourceId,
    label: SOURCES.ece.label,
    count: eceRecords.length,
  };

  const schoolRaw = await fetchSource("schools", SOURCES.schools);
  await writeFile(join(DATA_DIR, "schools.json"), JSON.stringify(schoolRaw));
  await syncRaw("schools_raw", schoolRaw);

  const frontend = schoolRaw
    .map(buildSchoolFrontend)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(
    join(DATA_DIR, "schools-frontend.json"),
    JSON.stringify(frontend)
  );
  await syncSchools(frontend);
  console.log(`[schools] 前端过滤后: ${frontend.length} 所`);
  meta.sources.schools = {
    resourceId: SOURCES.schools.resourceId,
    label: SOURCES.schools.label,
    count: schoolRaw.length,
    frontendCount: frontend.length,
  };

  await writeFile(join(DATA_DIR, "_meta.json"), JSON.stringify(meta, null, 2));
  console.log(`完成。数据已写入 ${DATA_DIR}`);
}

// 直接 `node` 运行（本地/CI）时自执行；作为模块被云函数 import 时不自执行。
const isDirectRun =
  process.argv[1] && process.argv[1].endsWith("fetch-data.mjs");
if (isDirectRun) {
  main().catch((err) => {
    console.error("拉取失败:", err);
    process.exit(1);
  });
}

export { main };
