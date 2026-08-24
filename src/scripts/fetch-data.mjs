// 全量拉取 data.govt.nz 中小学数据，清洗后落地到 data/ 目录（本地 JSON）。
// 用法：node src/scripts/fetch-data.mjs  （或 npm run fetch:data）
// 说明：
//   - CKAN datastore dump 的 records 为「按 fields 顺序的数组」，需按 fields 映射为对象。
//   - 生成 schools.json（原始）与 schools-frontend.json（前端过滤+派生后的 SchoolFrontend[]）。
//   - 本仓库不再使用 PostgreSQL，数据全部走本地 JSON（运行时由 src/lib/data.ts 读取）。
//   - 低频更新：手动运行本脚本 -> 生成文件 -> 提交 git -> 重新部署。
//   - 幼儿园（ECE）数据接入后续单独开发，本脚本暂不处理。

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

const SOURCE = {
  resourceId: "4b292323-9fcc-41f8-814b-3c7b19cf14b3",
  url: "https://catalogue.data.govt.nz/datastore/dump/4b292323-9fcc-41f8-814b-3c7b19cf14b3?format=json",
  label: "中小学",
};

const KEEP_SCHOOL_TYPE_KEYWORDS = [
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

// 幼儿园（ECE）数据接入：读取本地 data/ece.json（不联网）。
// 仅保留 Org_Type ∈ {Education & Care Service, Free Kindergarten} 且
// Authority ∈ {Privately owned, Community based} 的记录。
const KEEP_ECE_TYPE = ["Education & Care Service", "Free Kindergarten"];
const KEEP_ECE_AUTHORITY = {
  "Privately owned": "私立",
  "Community based": "公立",
};

// 幼儿园 EQI 档位：仅保留 1/2/3/4、>5、Not Applicable / Unknown（不适用）。
// 其余如 "New Service"、空、"N/A" 等一律丢弃（返回 undefined 由调用方过滤）。
function parseEceEqi(x) {
  if (x == null) return null; // 视为不适用
  const s = String(x).trim();
  if (s === "") return undefined; // 空 -> 丢弃
  if (/not applicable|unknown/i.test(s) || /^n\/a$/i.test(s)) return null; // 不适用
  if (/new service/i.test(s)) return undefined; // 其它值 -> 丢弃
  const m = s.match(/(\d+)/);
  if (!m) return undefined; // 非数字 -> 丢弃
  let n = Number(m[1]);
  if (s.includes(">")) n = 6; // >5 档
  if (n >= 1 && n <= 4) return n;
  if (n === 6) return 6; // >5
  return undefined; // 其它值 -> 丢弃
}

function buildEceFrontend(raw) {
  const typ = (raw.Org_Type || "").trim();
  if (!KEEP_ECE_TYPE.includes(typ)) return null;
  const authority = (raw.Authority || "").trim();
  if (!(authority in KEEP_ECE_AUTHORITY)) return null;

  const eqiVal = parseEceEqi(raw.Equity_Index);
  if (eqiVal === undefined) return null; // 其它 EQI 值 -> 丢弃

  const lat = toNumber(raw.Latitude);
  const lng = toNumber(raw.Longitude);
  if (lat === null || lng === null) return null;

  const under2 = toNumber(raw.Under_2s) ?? 0;
  const total = toNumber(raw.Total) ?? 0;

  return {
    id: raw.ECE_Id,
    name: (raw.Org_Name || "").trim(),
    type: typ,
    level: "",
    authority,
    authorityCN: KEEP_ECE_AUTHORITY[authority],
    gender: "",
    genderCN: "",
    boarding: "No",
    language: "",
    languageCN: "",
    enrolment: "",
    street: (raw.Add1_Line1 || "").trim(),
    suburb: (raw.Add1_Suburb || "").trim(),
    city: (raw.Add1_City || "").trim(),
    territorial: (raw.Territorial_Authority || "").trim(),
    region: (raw.Education_Region || "").trim(),
    urbanRural: (raw.Urban_Rural_Indicator || "").trim(),
    phone: "",
    email: "",
    roll: total,
    eqi: eqiVal,
    isolation: 0,
    european: toNumber(raw.European) ?? 0,
    maori: toNumber(raw["Māori"]) ?? 0,
    pacific: toNumber(raw.Pacific) ?? 0,
    asian: toNumber(raw.Asian) ?? 0,
    melaa: 0,
    other: toNumber(raw.Other) ?? 0,
    intl: 0,
    lat,
    lng,
    website: "",
    url: `/ece/${raw.ECE_Id}`,
    maxChildren: toNumber(raw.All_Children) ?? 0,
    maxUnder2: under2,
    acceptsUnder2: under2 > 0,
  };
}

// 中小学前端结构（与 SchoolFrontend 接口对齐）
function buildSchoolFrontend(raw) {
  const typ = raw.Org_Type || "";
  if (!KEEP_SCHOOL_TYPE_KEYWORDS.some((k) => typ.includes(k))) return null;
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

async function fetchSource() {
  console.log(`[schools] 拉取中: ${SOURCE.url}`);
  const res = await fetch(SOURCE.url);
  if (!res.ok) throw new Error(`[schools] HTTP ${res.status}`);
  const json = await res.json();
  const fields = json.fields.map((f) => f.id);
  const records = json.records.map((row) => {
    const obj = {};
    fields.forEach((field, i) => {
      obj[field] = row[i];
    });
    return obj;
  });
  console.log(`[schools] 记录数: ${records.length}`);
  return records;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const meta = { fetchedAt: new Date().toISOString(), sources: {} };

  const schoolRaw = await fetchSource();
  await writeFile(join(DATA_DIR, "schools.json"), JSON.stringify(schoolRaw));

  const frontend = schoolRaw
    .map(buildSchoolFrontend)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(
    join(DATA_DIR, "schools-frontend.json"),
    JSON.stringify(frontend)
  );
  console.log(`[schools] 前端过滤后: ${frontend.length} 所`);
  meta.sources.schools = {
    resourceId: SOURCE.resourceId,
    label: SOURCE.label,
    count: schoolRaw.length,
    frontendCount: frontend.length,
  };

  await writeFile(join(DATA_DIR, "_meta.json"), JSON.stringify(meta, null, 2));
  console.log(`完成。数据已写入 ${DATA_DIR}`);

  // ── ECE（幼儿园） ──
  try {
    const eceRaw = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(DATA_DIR, "ece.json"),
        "utf-8"
      )
    );
    const eceFrontend = eceRaw
      .map(buildEceFrontend)
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
    await writeFile(
      join(DATA_DIR, "ece-frontend.json"),
      JSON.stringify(eceFrontend)
    );
    console.log(`[ece] 前端过滤后: ${eceFrontend.length} 所`);
    meta.sources.ece = {
      resourceId: "ece.json",
      label: "幼儿园",
      count: eceRaw.length,
      frontendCount: eceFrontend.length,
    };
    await writeFile(join(DATA_DIR, "_meta.json"), JSON.stringify(meta, null, 2));
  } catch (e) {
    console.error("[ece] 生成失败（跳过）:", e.message);
  }
}

// 直接 `node` 运行（本地/CI）时自执行；作为模块被 import 时不自执行。
const isDirectRun =
  process.argv[1] && process.argv[1].endsWith("fetch-data.mjs");
if (isDirectRun) {
  main().catch((err) => {
    console.error("拉取失败:", err);
    process.exit(1);
  });
}

export { main };
