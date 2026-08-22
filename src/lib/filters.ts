import type { SchoolFrontend, Filters, SortKey } from "./types";

export const LEVELS = ["小学", "初中", "高中", "贯通制"];
export const BOARDING = ["Yes", "No"];
export const URBAN_RURAL = ["Urban", "Rural"];

/* ── 学校类型树（对齐原项目 TYPE_GROUPS，子节点 value 为精确 type 值） ── */
export const TYPE_GROUPS = [
  { label: "综合学校", value: "Composite", keywords: ["Composite"] },
  { label: "完全小学", value: "Full Primary", keywords: ["Full Primary"] },
  { label: "贡献小学", value: "Contributing", keywords: ["Contributing"] },
  { label: "中学 / 高中", value: "Secondary", keywords: ["Secondary"] },
  { label: "初中", value: "Intermediate", keywords: ["Intermediate"] },
];

/* ── 办学性质树（对齐原项目 AUTHORITY_GROUPS） ── */
export const AUTHORITY_GROUPS = [
  { label: "公立", value: "State", keywords: ["State", "公立"] },
  { label: "私立", value: "Private", keywords: ["Private", "私立"] },
  { label: "公立整合", value: "Integrated", keywords: ["Integrated", "公立整合"] },
];

/* 判断学校 type 是否在选中列表中（支持精确值和关键字） */
function typeMatches(s: SchoolFrontend, selectedTypes: string[]): boolean {
  return selectedTypes.some((t) => s.type === t || s.type.includes(t));
}

/* 判断学校 authority 是否在选中列表中（按 authorityCN 中文分类匹配） */
function authorityMatches(s: SchoolFrontend, selectedAuths: string[]): boolean {
  return selectedAuths.includes(s.authorityCN);
}

export interface Stats {
  total: number;
  publicCount: number;
  privateCount: number;
  eqiAvg: number;
}

export function computeStats(list: SchoolFrontend[]): Stats {
  const total = list.length;
  let publicCount = 0;
  let eqiSum = 0;
  for (const s of list) {
    if (s.authorityCN !== "私立") publicCount += 1;
    eqiSum += s.eqi || 0;
  }
  return {
    total,
    publicCount,
    privateCount: total - publicCount,
    eqiAvg: total ? Math.round(eqiSum / total) : 0,
  };
}

export function uniqueSorted(list: SchoolFrontend[], key: keyof SchoolFrontend) {
  const set = new Set<string>();
  for (const s of list) {
    const v = s[key];
    if (typeof v === "string" && v) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function emptyFilters(): Filters {
  return {
    keyword: "",
    types: [],
    levels: [],
    cities: [],
    suburbs: [],
    hotRegion: "",
    authorities: [],
    urbanRural: [],
    boarding: [],
    languages: [],
    eqi: "",
    isolation: "",
    intl: "",
  };
}

export function hasActiveFilters(f: Filters): boolean {
  return (
    f.keyword.trim() !== "" ||
    f.types.length > 0 ||
    f.levels.length > 0 ||
    f.cities.length > 0 ||
    f.suburbs.length > 0 ||
    f.authorities.length > 0 ||
    f.urbanRural.length > 0 ||
    f.boarding.length > 0 ||
    f.languages.length > 0 ||
    f.eqi !== "" ||
    f.isolation !== "" ||
    f.intl !== ""
  );
}

/* ── 数值区间匹配（对齐原项目 passEqi / passIso 的档位） ── */
function inRange(value: number | undefined, range: string): boolean {
  if (!range) return true;
  if (value == null) return false;
  switch (range) {
    case "lte420":
      return value <= 420;
    case "421-480":
      return value >= 421 && value <= 480;
    case "481-550":
      return value >= 481 && value <= 550;
    case "gte551":
      return value >= 551;
    case "lte0.3":
      return value <= 0.3;
    case "0.3-1":
      return value > 0.3 && value <= 1;
    case "1-3":
      return value > 1 && value <= 3;
    case "gt3":
      return value > 3;
    default:
      return true;
  }
}

function matches(s: SchoolFrontend, f: Filters): boolean {
  if (f.keyword.trim()) {
    const k = f.keyword.trim().toLowerCase();
    const hay = `${s.name} ${s.city} ${s.suburb} ${s.territorial}`.toLowerCase();
    if (!hay.includes(k)) return false;
  }
  if (f.types.length && !typeMatches(s, f.types)) return false;
  if (f.levels.length && !f.levels.includes(s.level)) return false;
  // 城市：cities 命中 或 suburbs 命中 任一即满足
  // 注意：suburbs 仅用于奥克兰子区，须同时限定 city === "Auckland"，
  // 避免其它地区（如惠灵顿 Lower Hutt 的 Belmont）的同名 suburb 误匹配
  if (f.cities.length || f.suburbs.length) {
    const cityOk = f.cities.length ? f.cities.includes(s.city) : false;
    const suburbOk =
      f.suburbs.length && s.city === "Auckland"
        ? f.suburbs.includes(s.suburb)
        : false;
    if (!cityOk && !suburbOk) return false;
  }
  if (f.authorities.length && !authorityMatches(s, f.authorities)) return false;
  if (f.urbanRural.length && !f.urbanRural.includes(s.urbanRural)) return false;
  if (f.boarding.length && !f.boarding.includes(s.boarding)) return false;
  if (f.languages.length && !f.languages.includes(s.language)) return false;
  if (f.eqi && !inRange(s.eqi, f.eqi)) return false;
  if (f.isolation && !inRange(s.isolation, f.isolation)) return false;
  if (f.intl === "yes" && (s.intl || 0) <= 0) return false;
  if (f.intl === "no" && (s.intl || 0) > 0) return false;
  return true;
}

export function applyFilters(
  list: SchoolFrontend[],
  f: Filters
): SchoolFrontend[] {
  return list.filter((s) => matches(s, f));
}

export function applySort(
  list: SchoolFrontend[],
  sort: SortKey
): SchoolFrontend[] {
  const arr = [...list];
  switch (sort) {
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "eqi":
      return arr.sort((a, b) => (a.eqi || 9999) - (b.eqi || 9999));
    case "roll":
      return arr.sort((a, b) => (b.roll || 0) - (a.roll || 0));
    default:
      return arr;
  }
}

export const ETHNIC_FIELDS = [
  { key: "european", label: "欧洲裔", color: "#5BA3C4" },
  { key: "maori", label: "毛利裔", color: "#3E9C8C" },
  { key: "pacific", label: "太平洋岛裔", color: "#9CCBBD" },
  { key: "asian", label: "亚裔", color: "#F59E0B" },
  { key: "melaa", label: "MELAA", color: "#6366F1" },
  { key: "other", label: "其他", color: "#94A3B8" },
  { key: "intl", label: "国际生", color: "#DC2626" },
] as const;

export function ethnicTotals(s: SchoolFrontend): {
  label: string;
  color: string;
  value: number;
  pct: number;
}[] {
  const sum =
    ETHNIC_FIELDS.reduce((acc, f) => acc + (s[f.key] as number), 0) || 1;
  return ETHNIC_FIELDS.map((f) => {
    const value = s[f.key] as number;
    return {
      label: f.label,
      color: f.color,
      value,
      pct: Math.round((value / sum) * 100),
    };
  });
}

/* 学段 → 形状 + 颜色（对齐原项目 levelShape 第499-506行） */
export function levelColor(level: string): string {
  switch (level) {
    case "小学":
      return "#2e7ed4"; // 蓝
    case "初中":
      return "#e0392b"; // 红
    case "高中":
      return "#8e44ad"; // 紫
    case "贯通制":
      return "#9c6b3f"; // 棕
    default:
      return "#8e44ad";
  }
}

/* ── EQI / 偏远度 数值 → 中文释义（对齐筛选器档位标签） ── */
export function eqiLabel(value: number | undefined): string | null {
  if (value == null) return null;
  if (value <= 420) return "资源较充足";
  if (value <= 480) return "需要一定支持";
  if (value <= 550) return "需要较高支持";
  return "需要很高支持";
}

export function isolationLabel(value: number | undefined): string | null {
  if (value == null) return null;
  if (value <= 0.3) return "便利";
  if (value <= 1) return "相对便利";
  if (value <= 3) return "相对偏远";
  return "很偏远";
}

export type MarkerShape = "circle" | "diamond" | "square" | "hexagon";

export function levelShape(level: string): { shape: MarkerShape; color: string } {
  switch (level) {
    case "小学":
      return { shape: "circle", color: "#2e7ed4" };
    case "初中":
      return { shape: "diamond", color: "#2E9E8C" };
    case "高中":
      return { shape: "square", color: "#8e44ad" };
    case "贯通制":
      return { shape: "hexagon", color: "#9c6b3f" };
    default:
      return { shape: "square", color: "#8e44ad" };
  }
}
