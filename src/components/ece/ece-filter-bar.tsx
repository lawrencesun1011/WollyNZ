"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { SchoolFrontend, Filters } from "@/lib/types";
import { uniqueSorted } from "@/lib/filters";
import { Search, X, ChevronDown } from "lucide-react";
import { NorthIslandIcon } from "@/components/schools/north-island-icon";
import { SouthIslandIcon } from "@/components/schools/south-island-icon";

interface Props {
  schools: SchoolFrontend[];
  filters: Filters;
  onChange: (f: Filters) => void;
  onClear: () => void;
  active: boolean;
}

/* ── 热门地区数据（与中小学共用，城市名映射至 ECE 英文 city） ── */
const HOT_REGIONS = {
  north: {
    label: "北岛",
    labelEn: "NORTH ISLAND",
    cities: [
      "奥克兰",
      "奥克兰-北岸",
      "奥克兰-东区",
      "奥克兰-中区",
      "汉密尔顿",
      "惠灵顿",
      "陶朗加",
      "北帕默斯顿",
    ],
  },
  south: {
    label: "南岛",
    labelEn: "SOUTH ISLAND",
    cities: ["基督城", "皇后镇", "但尼丁"],
  },
};

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
    "Flat Bush", "Howick", "Howick South", "Howick West", "Pakuranga", "Shelly Park",
  ],
  "奥克兰-中区": [
    "Auckland CBD", "Balmoral", "Blockhouse Bay", "Ellerslie", "Epsom",
    "Freemans Bay", "Glen Innes", "Glendowie", "Grafton", "Greenlane",
    "Grey Lynn", "Herne Bay", "Hillsborough", "Kingsland", "Kohimarama",
    "Lynfield", "Meadowbank", "Mount Albert", "Mt Albert", "Mount Eden",
    "Mount Roskill", "Mount Wellington", "Mt Wellington", "Newmarket",
    "Newton", "One Tree Hill", "Onehunga", "Orakei", "Panmure", "Parnell",
    "Penrose", "Point Chevalier", "Ponsonby", "Remuera", "Royal Oak",
    "Sandringham", "St Heliers", "Stonefields", "Three Kings", "Waterview",
    "Western Springs", "Westmere",
  ],
};

const ECE_TYPE_OPTIONS = [
  { value: "", label: "全部" },
  { value: "Education & Care Service", label: "日托幼教中心" },
  { value: "Free Kindergarten", label: "公立幼儿园" },
];

const ECE_AUTHORITY_OPTIONS = [
  { value: "", label: "全部" },
  { value: "私立", label: "私立" },
  { value: "公立", label: "公立" },
];

const ECE_EQI_OPTIONS = [
  { value: "", label: "全部" },
  { value: "gt5", label: ">5 · 资源充足" },
  { value: "4", label: "4 · 资源较充足" },
  { value: "3", label: "3 · 需要一定支持" },
  { value: "2", label: "2 · 需要较高支持" },
  { value: "1", label: "1 · 需要很高支持" },
  { value: "na", label: "不适用" },
];

const ECE_UNDER2_OPTIONS = [
  { value: "", label: "全部" },
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
];

const filterBtn =
  "inline-flex items-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2 text-sm text-ink-soft transition-all hover:border-stroke hover:text-ink outline-none cursor-pointer select-none whitespace-nowrap";

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

export function EceFilterBar({ schools, filters, onChange, onClear, active }: Props) {
  const cities = useMemo(() => uniqueSorted(schools, "city"), [schools]);

  function setField<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function handleHotCity(cityCN: string) {
    const isOn = filters.hotRegion === cityCN;
    if (cityCN in SUBURB_REGIONS) {
      onChange({
        ...filters,
        hotRegion: isOn ? "" : cityCN,
        cities: [],
        suburbs: isOn ? [] : SUBURB_REGIONS[cityCN],
      });
    } else {
      const cityEn = CITY_MAP[cityCN] || cityCN;
      onChange({
        ...filters,
        hotRegion: isOn ? "" : cityCN,
        suburbs: [],
        cities: isOn ? [] : [cityEn],
      });
    }
  }

  const activeHot = filters.hotRegion || "";

  return (
    <div className="rounded-2xl border border-stroke bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 sm:items-center">
            <span className="hidden shrink-0 rounded-xl bg-primary/5 p-1.5 ring-1 ring-primary/10 sm:block">
              <NorthIslandIcon size={40} />
            </span>
            <div className="min-w-0">
              <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                {HOT_REGIONS.north.label}{" "}
                <span className="font-normal normal-case tracking-normal text-caption">{HOT_REGIONS.north.labelEn}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {HOT_REGIONS.north.cities.map((city) => {
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

        <div className="space-y-4">
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

          <div className="flex flex-wrap items-center gap-3">
            <FilterCity cities={filters.cities} allCities={cities} onChange={(v) => onChange({ ...filters, hotRegion: "", suburbs: [], cities: v })} />

            <FilterSelect
              label="学校类型"
              options={ECE_TYPE_OPTIONS}
              value={filters.types[0] ?? ""}
              onChange={(v) => setField("types", v ? [v] : [])}
              onClear={() => setField("types", [])}
            />

            <FilterSelect
              label="办学性质"
              options={ECE_AUTHORITY_OPTIONS}
              value={filters.authorities[0] ?? ""}
              onChange={(v) => setField("authorities", v ? [v] : [])}
              onClear={() => setField("authorities", [])}
              helpText="公立（Community based）：由社区委员会运营；私立（Privately owned）：私人营利性机构。"
            />

            <FilterSelect
              label="公平指数（EQI）"
              options={ECE_EQI_OPTIONS}
              value={filters.eqi}
              onChange={(v) => setField("eqi", v)}
              onClear={() => setField("eqi", "")}
              helpText={"替代了以前的 Decile 10 分制，是一项依据学生家庭经济情况得出的经费划拨参考指标，不等同于机构质量。"}
            />

            <FilterSelect label="接受 2 岁以下" options={ECE_UNDER2_OPTIONS} value={filters.under2} onChange={(v) => setField("under2", v)} onClear={() => setField("under2", "")} />
          </div>
        </div>
      </div>
    </div>
  );
}
