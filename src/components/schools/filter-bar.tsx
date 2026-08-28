"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { SchoolFrontend, Filters } from "@/lib/types";
import { uniqueSorted } from "@/lib/filters";
import { Search, X, ChevronDown } from "lucide-react";
import { NorthIslandIcon } from "./north-island-icon";
import { SouthIslandIcon } from "./south-island-icon";

interface Props {
  schools: SchoolFrontend[];
  filters: Filters;
  onChange: (f: Filters) => void;
  onClear: () => void;
  active: boolean;
}

/* ── 热门地区数据 ── */
const HOT_REGIONS = {
  north: {
    label: "北岛",
    labelEn: "NORTH ISLAND",
    cities: [
      "奥克兰",
      "汉密尔顿",
      "惠灵顿",
      "陶朗加",
      "北帕默斯顿",
    ],
    aucklandChildren: [
      "奥克兰-北岸",
      "奥克兰-东区",
      "奥克兰-中区",
      "奥克兰-南区",
      "奥克兰-西区",
      "奥克兰-其它",
    ],
  },
  south: {
    label: "南岛",
    labelEn: "SOUTH ISLAND",
    cities: ["基督城", "皇后镇", "但尼丁"],
  },
};

/* 中文城市名 → 数据英文 city（多个中文可映射到同一英文） */
const CITY_MAP: Record<string, string> = {
  奥克兰: "Auckland",
  汉密尔顿: "Hamilton",
  惠灵顿: "Wellington",
  陶朗加: "Tauranga",
  北帕默斯顿: "Palmerston North",
  基督城: "Christchurch",
  皇后镇: "Queenstown",
  但尼丁: "Dunedin",
};

/* 奥克兰子区（北岸 / 东区 / 中区）→ 用 suburb 字段匹配 */
const SUBURB_REGIONS: Record<string, string[]> = {
  "奥克兰-北岸": [
    "Albany", "Bayswater-Auckland", "Beach Haven", "Belmont", "Birkdale",
    "Birkenhead", "Browns Bay", "Castor Bay", "Devonport", "Forrest Hill",
    "Glenfield", "Greenhithe", "Hillcrest", "Mairangi Bay", "Milford",
    "Murrays Bay", "Northcote", "Oteha", "Paremoremo", "Pinehill",
    "Rosedale", "Stanley Point", "Takapuna", "Takapuna North", "Torbay",
  ],
  "奥克兰-东区": [
    "Botany Downs", "Bucklands Beach", "Dannemora", "East Tamaki", "Farm Cove",
    "Flat Bush", "Howick", "Howick South", "Howick West", "Pakuranga", "Pakuranga Heights", "Shelly Park",
  ],
  "奥克兰-中区": [
    "Auckland CBD", "Balmoral", "Ellerslie", "Epsom",
    "Freemans Bay", "Glen Innes", "Glendowie", "Grafton", "Greenlane",
    "Grey Lynn", "Herne Bay", "Hillsborough", "Kingsland", "Kohimarama",
    "Lynfield", "Meadowbank", "Mount Albert", "Mt Albert", "Mount Eden",
    "Mount Roskill", "Mount Wellington", "Mt Wellington", "Newmarket",
    "Newton", "New Windsor", "One Tree Hill", "Onehunga", "Orakei", "Panmure", "Parnell",
    "Penrose", "Point Chevalier", "Ponsonby", "Remuera", "Royal Oak",
    "Sandringham", "St Heliers", "Stonefields", "Three Kings", "Waterview",
    "Western Springs", "Westmere",
  ],
  "奥克兰-南区": [
    "Clendon Park", "Favona", "Hingaia", "Mangere", "Mangere Bridge", "Mangere East",
    "Manukau Central", "Manukau City", "Mangere Central", "Manurewa", "Otahuhu", "Otara", "Papakura",
    "Papatoetoe", "Randwick Park", "Takanini", "Wattle Downs",
    "Weymouth", "Wiri",
  ],
  "奥克兰-西区": [
    "Avondale", "Blockhouse Bay", "Glen Eden", "Glendene", "Green Bay", "Henderson", "Kelston",
    "Laingholm", "Massey", "New Lynn", "Oratia", "Ranui", "Te Atatu",
    "Te Atatu Peninsula", "Te Atatu South", "Te Atatu North", "Titirangi", "West Harbour",
    "Westgate", "Hobsonville", "Hobsonville Point", "Whenuapai",
  ],
  "奥克兰-其它": [],
};

/* ── EQI / Isolation / 国际生选项 ── */
const EQI_OPTIONS = [
  { value: "", label: "全部" },
  { value: "lte420", label: "≤420 · 资源较充足" },
  { value: "421-480", label: "421-480 · 需要一定支持" },
  { value: "481-550", label: "481-550 · 需要较高支持" },
  { value: "gte551", label: "≥551 · 需要很高支持" },
];

const ISOLATION_OPTIONS = [
  { value: "", label: "全部" },
  { value: "lte0.3", label: "≤0.3 · 便利" },
  { value: "0.3-1", label: "0.3-1 · 相对便利" },
  { value: "1-3", label: "1-3 · 相对偏远" },
  { value: "gt3", label: ">3 · 很偏远" },
];

const INTL_OPTIONS = [
  { value: "", label: "全部" },
  { value: "yes", label: "有国际生" },
  { value: "no", label: "无国际生" },
];

/* ── 树形数据类型 ── */
interface TreeNode {
  label: string;
  value: string;
  children?: TreeNode[];
}

const TYPE_TREE: TreeNode[] = [
  {
    label: "小学",
    value: "Primary",
    children: [
      { label: "普通小学（1–6年级）", value: "Contributing" },
      { label: "完整小学（1–8年级）", value: "Full Primary" },
    ],
  },
  {
    label: "初中",
    value: "Intermediate",
    children: [{ label: "初中（7–8年级）", value: "Intermediate" }],
  },
  {
    label: "中学 / 高中",
    value: "Secondary",
    children: [
      { label: "标准高中（9–13年级）", value: "Secondary (Year 9-15)" },
      { label: "完整中学（7–13年级）", value: "Secondary (Year 7-13)" },
      { label: "低年级中学（7–10年级）", value: "Secondary (Year 7-10)" },
      { label: "高年级中学（11–13年级）", value: "Secondary (Year 11-15)" },
    ],
  },
  {
    label: "一贯制学校",
    value: "Composite",
    children: [
      { label: "一贯制学校（1–13年级）", value: "Composite" },
      { label: "一贯制学校（1–10年级）", value: "Composite (Year 1-10)" },
      { label: "一贯制学校（7–10年级）", value: "Restricted Composite (Year 7-10)" },
    ],
  },
];

const AUTHORITY_TREE: TreeNode[] = [
  {
    label: "公立",
    value: "公立",
    children: [
      { label: "公立", value: "公立" },
      { label: "公立整合", value: "公立整合" },
    ],
  },
  {
    label: "私立",
    value: "私立",
    children: [{ label: "私立", value: "私立" }],
  },
];

/* ═══════════════════════════════════════════
   筛选下拉组件（参考图样式：Label: Value ▼）
   ═══════════════════════════════════════════ */

/* 统一筛选按钮样式（参考图的 pill 样式） */
const filterBtn =
  "inline-flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-ink-soft transition-all hover:border-stroke hover:text-ink outline-none cursor-pointer select-none whitespace-nowrap";

/* ── 字段说明小问号（hover 弹出 tooltip） ── */
function FilterHelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-stroke text-[10px] font-semibold text-caption transition-colors group-hover:border-primary group-hover:text-primary">
        ?
      </span>
      <span className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 hidden w-80 max-w-[80vw] whitespace-pre-line break-words rounded-lg bg-primary px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

/* ── 搜索框 ── */
function FilterSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 ${value ? "border-primary/40 ring-1 ring-primary/10" : ""}`}>
      <Search className="h-4 w-4 shrink-0 text-caption" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索：名称 / 地点 / 关键词"
        className="min-w-[180px] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-caption/70"
      />
      {value && (
        <X className="h-3.5 w-3.5 cursor-pointer text-caption hover:text-ink-soft" onClick={() => onChange("")} />
      )}
    </div>
  );
}

/* ── 下拉选择器（城市/单选） ── */
function FilterSelect({
  label,
  options,
  value,
  onChange,
  onClear,
  helpText,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  helpText?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOpt = options.find((o) => o.value === value);
  const displayValue = selectedOpt?.label || "全部";
  const hasValue = !!value;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`${filterBtn} ${hasValue ? "border-primary/30 text-primary font-medium" : ""}`}>
        {helpText && <FilterHelpTip text={helpText} />}
        <span className="text-xs text-caption">{label}</span>
        <span>{displayValue}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {hasValue && onClear && (
          <X className="h-3 w-3.5 ml-0.5 cursor-pointer text-caption hover:text-error" onClick={(e) => { e.stopPropagation(); onClear(); }} />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] max-h-[260px] overflow-y-auto rounded-xl border border-stroke bg-white py-1 shadow-lg">
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={`block w-full px-4 py-2 text-left text-sm ${o.value === value ? "bg-primary/8 font-medium text-primary" : "text-ink-soft hover:bg-bg-soft"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 城市搜索+选择 ── */
function FilterCity({
  cities,
  allCities,
  onChange,
}: {
  cities: string[];
  allCities: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayText = cities.length === 1 ? cities[0] : "";
  const filteredCities = query ? allCities.filter((c) => c.toLowerCase().includes(query.toLowerCase())) : allCities;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`${filterBtn} ${cities.length > 0 ? "border-primary/30 text-primary font-medium" : ""}`}>
        <span className="text-xs text-caption">城市</span>
        <span>{cities.length > 0 ? displayText : "任意"}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {cities.length > 0 && (
          <X className="h-3 w-3.5 ml-0.5 cursor-pointer text-caption hover:text-error" onClick={(e) => { e.stopPropagation(); onChange([]); }} />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[240px] overflow-hidden rounded-xl border border-stroke bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-stroke px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-caption" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索城市..." autoFocus
              className="w-full bg-transparent text-sm outline-none placeholder:text-caption/70" />
          </div>
          <div className="max-h-[220px] overflow-y-auto p-1.5">
            {filteredCities.map((c) => (
              <button key={c} type="button" onClick={() => { onChange([c]); setQuery(""); setOpen(false); }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${cities.includes(c) ? "bg-primary/8 font-medium text-primary" : "text-ink-soft hover:bg-bg-soft"}`}
              >
                {c}
              </button>
            ))}
            {filteredCities.length === 0 && <p className="px-3 py-2 text-sm text-caption">无匹配</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 树形多选下拉 ── */
function TreeFilter({
  tree,
  selected,
  onChange,
  label,
  helpText,
}: {
  tree: TreeNode[];
  selected: string[];
  onChange: (vals: string[]) => void;
  label: string;
  helpText?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function isSelected(val: string) { return selected.includes(val); }
  function isAll(node: TreeNode) { return node.children ? node.children.every((c) => isSelected(c.value)) : false; }
  function isPartial(node: TreeNode) { return node.children ? node.children.some((c) => isSelected(c.value)) && !isAll(node) : false; }

  function toggleLeaf(val: string) {
    onChange(isSelected(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  }
  function toggleParent(node: TreeNode) {
    if (!node.children) return;
    if (isAll(node)) {
      onChange(selected.filter((v) => !node.children!.some((c) => c.value === v)));
    } else {
      onChange([...new Set([...selected, ...node.children.map((c) => c.value)])]);
    }
  }

  let summaryText = "任意";
  if (selected.length > 0) {
    const labels: string[] = [];
    for (const node of tree) {
      if (!node.children) continue;
      const sel = node.children.filter((c) => isSelected(c.value));
      if (sel.length === node.children.length) labels.push(node.label);
      else sel.forEach((c) => labels.push(c.label.replace(/（.*）/g, "").trim()));
    }
    summaryText = [...new Set(labels)].slice(0, 2).join(", ") + (labels.length > 2 ? ` 等${selected.length}项` : "");
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`${filterBtn} ${selected.length > 0 ? "border-primary/30 text-primary font-medium" : ""}`}>
        {helpText && <FilterHelpTip text={helpText} />}
        <span className="text-xs text-caption">{label}</span>
        <span className="truncate max-w-[100px]">{summaryText}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {selected.length > 0 && (
          <X className="h-3 w-3.5 ml-0.5 cursor-pointer text-caption hover:text-error" onClick={(e) => { e.stopPropagation(); onChange([]); }} />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-[320px] min-w-[260px] overflow-y-auto rounded-xl border border-stroke bg-white p-4 shadow-lg">
          {tree.map((parent) => (
            <div key={parent.value} className="mb-4 last:mb-0">
              <label className="flex cursor-pointer items-center gap-2.5 py-1 font-semibold text-sm text-primary">
                <input type="checkbox" checked={isAll(parent)}
                  ref={(el) => { if (el) el.indeterminate = isPartial(parent); }}
                  onChange={() => toggleParent(parent)}
                  className="h-4 w-4 rounded border-stroke accent-primary" />
                {parent.label}
              </label>
              {parent.children && (
                <div className="ml-6 mt-1 space-y-1">
                  {parent.children.map((child) => (
                    <label key={child.value} className="flex cursor-pointer items-center gap-2.5 py-0.5 text-sm text-ink-soft">
                      <input type="checkbox" checked={isSelected(child.value)} onChange={() => toggleLeaf(child.value)}
                        className="h-4 w-4 rounded border-stroke accent-primary" />
                      {child.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 奥克兰 suburb 多选（区）── */
function FilterDistrict({
  options,
  suburbs,
  onChange,
  disabled,
  groups,
}: {
  options: string[];
  suburbs: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  groups?: { label: string; suburbs: string[] }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(sub: string) {
    if (suburbs.includes(sub)) {
      onChange(suburbs.filter((s) => s !== sub));
    } else {
      onChange([...suburbs, sub]);
    }
  }

  function toggleGroup(subs: string[]) {
    const allOn = subs.length > 0 && subs.every((s) => suburbs.includes(s));
    if (allOn) onChange(suburbs.filter((s) => !subs.includes(s)));
    else onChange([...new Set([...suburbs, ...subs])]);
  }

  const summary =
    suburbs.length === 0
      ? disabled
        ? "请先选城市"
        : "任意"
      : suburbs.slice(0, 2).join("、") + (suburbs.length > 2 ? ` 等${suburbs.length}个` : "");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        title={disabled ? "请先选择城市" : undefined}
        className={`${filterBtn} ${suburbs.length > 0 ? "border-primary/30 text-primary font-medium" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span className="text-xs text-caption">区</span>
        <span className="max-w-[150px] truncate">{summary}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {suburbs.length > 0 && (
          <X
            className="h-3 w-3.5 ml-0.5 cursor-pointer text-caption hover:text-error"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          />
        )}
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-[240px] overflow-auto rounded-xl border border-stroke bg-white p-2 shadow-lg">
          {groups ? (
            groups.map((g) => {
              const allOn = g.suburbs.length > 0 && g.suburbs.every((s) => suburbs.includes(s));
              const someOn = g.suburbs.some((s) => suburbs.includes(s));
              return (
                <div key={g.label} className="mb-1.5 last:mb-0">
                  <label className="flex cursor-pointer items-center gap-2 px-1 py-1">
                    <input
                      type="checkbox"
                      checked={allOn}
                      ref={(el) => { if (el) el.indeterminate = !allOn && someOn; }}
                      onChange={() => toggleGroup(g.suburbs)}
                      className="h-4 w-4 rounded border-stroke accent-primary"
                    />
                    <span className="text-xs font-semibold text-primary">{g.label}</span>
                    <span className="text-[11px] text-caption">{g.suburbs.length}</span>
                  </label>
                  <div className="pl-3">
                    {g.suburbs.map((sub) => (
                      <label key={sub} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-ink-soft">
                        <input
                          type="checkbox"
                          checked={suburbs.includes(sub)}
                          onChange={() => toggle(sub)}
                          className="h-4 w-4 rounded border-stroke accent-primary"
                        />
                        {sub}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            options.map((sub) => (
              <label key={sub} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={suburbs.includes(sub)}
                  onChange={() => toggle(sub)}
                  className="h-4 w-4 rounded border-stroke accent-primary"
                />
                {sub}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════ */
export function FilterBar({ schools, filters, onChange, onClear, active }: Props) {
  const cities = useMemo(() => uniqueSorted(schools, "city"), [schools]);
  // 区跟随城市：未选城市时列出全部 suburb，选中城市后只列该城市的 suburb
  const suburbOptions = useMemo(
    () =>
      uniqueSorted(
        schools.filter((s) => !filters.cities.length || filters.cities.includes(s.city)),
        "suburb"
      ),
    [schools, filters.cities]
  );

  // 奥克兰-其它：属于奥克兰、但不在北岸/东区/中区/南区/西区 的其余 suburb
  const aucklandOtherSuburbs = useMemo(() => {
    const named = new Set(Object.values(SUBURB_REGIONS).flat());
    return Array.from(
      new Set(
        schools
          .filter((s) => s.city === "Auckland" && !named.has(s.suburb))
          .map((s) => s.suburb)
      )
    ).sort();
  }, [schools]);

  // 城市为奥克兰时，区下拉按子区分组：北岸、东区、中区、南区、西区、其它
  const aucklandGroups = useMemo(() => {
    if (filters.cities.length !== 1 || filters.cities[0] !== "Auckland") return undefined;
    const named = new Set(Object.values(SUBURB_REGIONS).flat());
    const opts = new Set(suburbOptions);
    const order = ["奥克兰-北岸", "奥克兰-东区", "奥克兰-中区", "奥克兰-南区", "奥克兰-西区", "奥克兰-其它"];
    return order
      .map((region) => ({
        label: region.replace("奥克兰-", ""),
        suburbs: (
          region === "奥克兰-其它"
            ? [...opts].filter((s) => !named.has(s))
            : SUBURB_REGIONS[region].filter((s) => opts.has(s))
        ).sort(),
      }))
      .filter((g) => g.suburbs.length > 0);
  }, [filters.cities, suburbOptions]);

  function setField<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  /* 热门地区点击（单选）：子区用 suburb 匹配，普通城市用 city 匹配 */
  function handleHotCity(cityCN: string) {
    const isOn = filters.hotRegion === cityCN;
    if (cityCN in SUBURB_REGIONS) {
      // 奥克兰子区（含"其它"）：按 suburb 筛选，并锁定城市为奥克兰
      const list = cityCN === "奥克兰-其它" ? aucklandOtherSuburbs : SUBURB_REGIONS[cityCN];
      onChange({
        ...filters,
        hotRegion: isOn ? "" : cityCN,
        cities: isOn ? [] : ["Auckland"],
        suburbs: isOn ? [] : list,
      });
    } else {
      // 普通城市：按 city 筛选
      const cityEn = CITY_MAP[cityCN] || cityCN;
      onChange({
        ...filters,
        hotRegion: isOn ? "" : cityCN,
        suburbs: [],
        cities: isOn ? [] : [cityEn],
      });
    }
  }

  /* 当前选中的热门地区中文标签（用于回显高亮） */
  const activeHot = filters.hotRegion || "";
  const [expandedAuckland, setExpandedAuckland] = useState(false);
  const aucklandRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (aucklandRef.current && !aucklandRef.current.contains(e.target as Node)) setExpandedAuckland(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="rounded-2xl border border-stroke bg-white p-5 shadow-sm">
      <div className="space-y-4">
        {/* ── 热门地区（北岛一行、南岛一行） ── */}
        <div className="flex flex-col gap-4">
          {/* 北岛 */}
          <div className="flex gap-3 sm:items-center">
            <span className="hidden shrink-0 rounded-xl bg-primary/5 p-1.5 ring-1 ring-primary/10 sm:block">
              <NorthIslandIcon size={40} />
            </span>
            <div className="min-w-0">
              <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                {HOT_REGIONS.north.label}{" "}
                <span className="font-normal normal-case tracking-normal text-caption">{HOT_REGIONS.north.labelEn}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {HOT_REGIONS.north.cities.map((city) => {
                  if (city === "奥克兰") {
                    const isChild = activeHot.startsWith("奥克兰-");
                    const label = isChild ? activeHot : "奥克兰";
                    const on = activeHot === "奥克兰" || isChild;
                    return (
                      <div key="auckland-group" className="relative" ref={aucklandRef}>
                        <button type="button"
                          onClick={() => setExpandedAuckland((v) => !v)}
                          className={`inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                            on
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-stroke bg-white text-black hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {label}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedAuckland ? "rotate-180" : ""}`} />
                        </button>
                        {expandedAuckland && (
                          <div className="absolute left-0 top-full z-50 mt-1 w-[170px] rounded-xl border border-stroke bg-white p-2 shadow-lg">
                            <button type="button"
                              onClick={() => { handleHotCity("奥克兰"); setExpandedAuckland(false); }}
                              className={`mb-1 block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-all ${
                                activeHot === "奥克兰" ? "bg-primary/10 text-primary" : "text-black hover:bg-primary/5 hover:text-primary"
                              }`}
                            >
                              全部奥克兰
                            </button>
                            <div className="my-1 h-px bg-stroke" />
                            {HOT_REGIONS.north.aucklandChildren.map((child) => {
                              const cOn = activeHot === child;
                              return (
                                <button key={child} type="button"
                                  onClick={() => { handleHotCity(child); setExpandedAuckland(false); }}
                                  className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-all ${
                                    cOn ? "bg-primary/10 text-primary" : "text-black hover:bg-primary/5 hover:text-primary"
                                  }`}
                                >
                                  {child.replace("奥克兰-", "")}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const on = activeHot === city;
                  return (
                    <button key={city} type="button" onClick={() => handleHotCity(city)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-stroke bg-white text-black hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 南岛 */}
          <div className="flex gap-3 sm:items-center">
            <span className="hidden shrink-0 rounded-xl bg-primary/5 p-1.5 ring-1 ring-primary/10 sm:block">
              <SouthIslandIcon size={40} />
            </span>
            <div className="min-w-0">
              <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                {HOT_REGIONS.south.label}{" "}
                <span className="font-normal normal-case tracking-normal text-caption">{HOT_REGIONS.south.labelEn}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {HOT_REGIONS.south.cities.map((city) => {
                  const isOn = activeHot === city;
                  return (
                    <button key={city} type="button" onClick={() => handleHotCity(city)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        isOn
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-stroke bg-white text-black hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 筛选栏 ── */}
        <div className="space-y-4">
          {/* 第一行：搜索 + 清空筛选 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <FilterSearch value={filters.keyword} onChange={(v) => setField("keyword", v)} />
            </div>
            <button
              type="button"
              onClick={onClear}
              disabled={!active}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                active
                  ? "border border-stroke text-ink-soft hover:border-error hover:text-error"
                  : "cursor-not-allowed border border-transparent text-caption"
              }`}
            >
              <X className="h-3.5 w-3.5" />
              清空筛选
            </button>
          </div>

          {/* 第二行：筛选条件 */}
          <div className="flex flex-wrap items-center gap-3">
            <FilterCity cities={filters.cities} allCities={cities} onChange={(v) => onChange({ ...filters, hotRegion: "", suburbs: [], cities: v })} />

            <FilterDistrict
              options={suburbOptions}
              groups={aucklandGroups}
              suburbs={filters.suburbs}
              disabled={filters.cities.length === 0}
              onChange={(v) => onChange({ ...filters, hotRegion: "", suburbs: v })}
            />

            <TreeFilter tree={TYPE_TREE} selected={filters.types} onChange={(vals) => setField("types", vals)} label="学校类型" />

            <TreeFilter
              tree={AUTHORITY_TREE}
              selected={filters.authorities}
              onChange={(vals) => setField("authorities", vals)}
              label="办学性质"
              helpText="公立整合（State: Integrated）：原本是私立学校，通常具有宗教背景，或特殊教学理念，后来被整合进国家公立教育体系。"
            />

            <FilterSelect
              label="公平指数（EQI）"
              options={EQI_OPTIONS}
              value={filters.eqi}
              onChange={(v) => setField("eqi", v)}
              onClear={() => setField("eqi", "")}
              helpText={"替代了以前的 Decile 10 分制，是一项依据学生经济情况得出的经费划拨参考指标，不等同于学校质量。\n注：仅对公立学校生效。"}
            />

            <FilterSelect
              label="偏远度"
              options={ISOLATION_OPTIONS}
              value={filters.isolation}
              onChange={(v) => setField("isolation", v)}
              onClear={() => setField("isolation", "")}
              helpText={"根据学校和最近的\"小型\"、\"中型\"和\"大型\"人口中心的距离计算得出。\n注：仅对公立学校生效。"}
            />

            <FilterSelect label="国际生" options={INTL_OPTIONS} value={filters.intl} onChange={(v) => setField("intl", v)} onClear={() => setField("intl", "")} />
          </div>
        </div>
      </div>
    </div>
  );
}
