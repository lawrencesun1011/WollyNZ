"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, Sparkles, Mail, Loader2, Heart, Layers, X } from "lucide-react";
import {
  addApplication,
  updateApplication,
  getApplication,
  getSavedProfile,
  ASSIST_OPTIONS,
  TENSE_LABEL,
  type ApplicationCategory,
  type ApplicationForm,
  type ExactDate,
  type FuzzyDate,
  type IntendedSchool,
  type StudyTimeMode,
  type Tense,
} from "@/lib/applications";
import { DateRangeCalendar } from "./date-range-calendar";
import { useFavorites } from "@/lib/user-collections";
import { PROVINCES, citiesOf, SELF_CITY_PROVINCES } from "@/lib/regions";
import { getSchoolsSnapshot, subscribeSchools } from "@/lib/schools-store";
import { getEceSnapshot, loadEceSnapshot } from "@/lib/ece-store";
import type { SchoolFrontend } from "@/lib/types";
import { useAuthUser, sendEmailCode, signInWithEmailCode } from "@/lib/auth";

const MONTHS: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS: number[] = Array.from({ length: 31 }, (_, i) => i + 1);
const TENSES: Tense[] = ["early", "mid", "late"];

// 出生年份：今年 → 今年-18，降序（近的在上）
const CUR_YEAR = new Date().getFullYear();
const BIRTH_YEARS: number[] = Array.from({ length: 19 }, (_, i) => CUR_YEAR - i);
// 开始年份：仅今年、明年
const START_YEARS: number[] = [CUR_YEAR, CUR_YEAR + 1];
// 结束年份：今年、明年、后年
const END_YEARS: number[] = [CUR_YEAR, CUR_YEAR + 1, CUR_YEAR + 2];

function selectCls(extra = "") {
  return `w-full appearance-none rounded-xl border border-stroke bg-white/80 px-3 py-2.5 text-sm text-ink outline-none transition-colors hover:border-primary/40 focus:border-primary ${extra}`;
}

function Section({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <h3 className="flex items-center gap-1 text-sm font-semibold text-primary">
        {title}
        {required ? (
          <span className="text-error">*</span>
        ) : (
          <span className="text-xs font-normal text-ink-soft">（选填）</span>
        )}
      </h3>
      {children}
    </div>
  );
}

function nights(a: ExactDate, b: ExactDate) {
  if (a.year === 0) return 0;
  const ms = new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime();
  return ms <= 0 ? 0 : Math.round(ms / (1000 * 60 * 60 * 24));
}

export function ApplicationForm({
  category,
  editId,
  onDone,
  onCancel,
}: {
  category: ApplicationCategory;
  editId?: string;
  onDone?: (id: string) => void;
  onCancel?: () => void;
}) {
  const user = useAuthUser();
  const { favoriteIds } = useFavorites();
  const ece = category === "ece";

  const [email, setEmail] = useState("");
  const [birth, setBirth] = useState<ExactDate>({ year: CUR_YEAR - 8, month: 1, day: 1 });
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [timeMode, setTimeMode] = useState<StudyTimeMode>("exact");
  const [exStart, setExStart] = useState<ExactDate>(() => {
    const t = todayDate();
    return { year: t.year, month: t.month, day: t.day };
  });
  const [exEnd, setExEnd] = useState<ExactDate>(() => {
    const t = todayDate();
    const next = new Date(t.year, t.month - 1, t.day + 1);
    return { year: next.getFullYear(), month: next.getMonth() + 1, day: next.getDate() };
  });
  const [fzStart, setFzStart] = useState<FuzzyDate>({ year: CUR_YEAR, month: 7, tense: "mid" });
  const [fzEnd, setFzEnd] = useState<FuzzyDate>({ year: CUR_YEAR, month: 8, tense: "mid" });
  const [schoolInput, setSchoolInput] = useState("");
  const [schools, setSchools] = useState<IntendedSchool[]>([]);
  const [assists, setAssists] = useState<string[]>([]);
  const [otherAssist, setOtherAssist] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schoolSuggest, setSchoolSuggest] = useState<SchoolFrontend[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [needAuth, setNeedAuth] = useState(false);
  const [code, setCode] = useState("");
  const [codeSending, setCodeSending] = useState(false);
  const [authError, setAuthError] = useState("");

  const schoolsRef = useRef<SchoolFrontend[]>([]);

  // 意向学校数据源：幼儿园从 ECE 库拉取，中小学从 schools-store 拉取
  useEffect(() => {
    if (ece) {
      if (!getEceSnapshot()) void loadEceSnapshot();
      schoolsRef.current = getEceSnapshot() ?? [];
      return;
    }
    schoolsRef.current = getSchoolsSnapshot() ?? [];
    return subscribeSchools((d) => (schoolsRef.current = d ?? []));
  }, [ece]);

  // 挂载时初始化：草稿编辑载入 / 预填
  useEffect(() => {
    if (editId) {
      const it = getApplication(editId);
      if (it) {
        setEmail(user?.email ?? it.email);
        setBirth(it.birthDate ?? { year: CUR_YEAR - 8, month: 1, day: 1 });
        setProvince(it.province ?? "");
        setCity(it.city ?? "");
        setTimeMode(it.studyPeriod?.mode ?? "fuzzy");
        if (it.studyPeriod?.mode === "exact") {
          setExStart(it.studyPeriod.start ?? { year: CUR_YEAR, month: 7, day: 1 });
          setExEnd(it.studyPeriod.end ?? { year: CUR_YEAR, month: 8, day: 1 });
        } else {
          setFzStart(it.studyPeriod?.fuzzyStart ?? { year: CUR_YEAR, month: 7, tense: "mid" });
          setFzEnd(it.studyPeriod?.fuzzyEnd ?? { year: CUR_YEAR, month: 8, tense: "mid" });
        }
        setSchools(it.intendedSchools ?? []);
        const loadedAssists = it.assists ?? [];
        const other = loadedAssists.find((a) => a.startsWith("其它："));
        setAssists(other ? loadedAssists.filter((a) => a !== other) : loadedAssists);
        setOtherAssist(other ? other.slice("其它：".length) : "");
        setNotes(it.notes ?? "");
      }
    } else {
      setEmail(user?.email ?? "");
      const saved = getSavedProfile();
      if (saved.province) {
        setProvince(saved.province);
        const self = SELF_CITY_PROVINCES[saved.province];
        setCity(self ?? saved.city ?? "");
      }
    }
    // 自动导入心愿单作为意向学校初值（编辑模式除外）
    if (!editId) importFavorites();
    setErrors({});
    setNeedAuth(false);
    setCode("");
    setAuthError("");
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, user]);

  const cityOptions = useMemo(() => (province ? citiesOf(province) : []), [province]);

  const suggest = useMemo(() => {
    const q = schoolInput.trim().toLowerCase();
    if (!q) return [];
    return (schoolsRef.current ?? [])
      .filter((s) => s.name.toLowerCase().startsWith(q) && !schools.some((x) => x.name === s.name))
      .slice(0, 6);
  }, [schoolInput, schools]);

  const categoryLabel = category === "ece" ? "幼儿园" : "中小学";
  const editing = !!editId;

  function todayDate(): { year: number; month: number; day: number } {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() };
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) e.email = "请输入有效邮箱";
    if (!province || !city) e.city = "请选择所在城市";
    if (schools.length === 0) e.schools = "请至少填写一所意向学校";

    // 出生日期：不得晚于今天，且最早可往前推 18 年
    const t = todayDate();
    const bDate = new Date(birth.year, birth.month - 1, birth.day);
    const today = new Date(t.year, t.month - 1, t.day);
    const earliest = new Date(t.year - 18, t.month - 1, t.day);
    if (bDate > today) e.birth = "出生日期不得晚于今天";
    else if (bDate < earliest) e.birth = "出生日期最早可往前推 18 年";

    if (timeMode === "exact") {
      const { year, month, day } = exStart;
      if (
        year < t.year ||
        (year === t.year && month < t.month) ||
        (year === t.year && month === t.month && day < t.day)
      ) {
        e.time = "开始时间不得早于今天";
      }
      if (!e.time && exStart.year > CUR_YEAR + 1) {
        e.time = "开始年份只能选择今年或明年";
      }
      if (!e.time && exEnd.year > CUR_YEAR + 2) {
        e.time = "结束年份只能选择今年、明年或后年";
      }
      const startDate = new Date(exStart.year, exStart.month - 1, exStart.day);
      const endDate = new Date(exEnd.year, exEnd.month - 1, exEnd.day);
      if (!e.time && endDate <= startDate) {
        e.time = "结束时间需晚于开始时间";
      }
    } else {
      const { year, month } = fzStart;
      if (year < t.year || (year === t.year && month < t.month)) {
        e.time = "开始时间不得早于今天";
      }
      const ti = TENSES.indexOf(fzStart.tense);
      const tei = TENSES.indexOf(fzEnd.tense);
      if (
        !e.time &&
        (fzEnd.year < fzStart.year ||
          (fzEnd.year === fzStart.year && fzEnd.month < fzStart.month) ||
          (fzEnd.year === fzStart.year && fzEnd.month === fzStart.month && tei <= ti))
      ) {
        e.time = "结束时间需晚于开始时间";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function buildForm(): ApplicationForm {
    const studyPeriod: ApplicationForm["studyPeriod"] =
      timeMode === "exact"
        ? { mode: "exact", start: exStart, end: exEnd }
        : { mode: "fuzzy", fuzzyStart: fzStart, fuzzyEnd: fzEnd };
    return {
      email: email.trim(),
      birthDate: birth,
      province,
      city,
      studyPeriod,
      intendedSchools: schools,
      assists: [
        ...assists,
        ...(assists.includes("其它") && otherAssist.trim() ? [`其它：${otherAssist.trim()}`] : []),
      ],
      notes: notes.trim() || undefined,
    };
  }

  async function save(status: "draft" | "submitted", authedEmail?: string) {
    const form = buildForm();
    if (authedEmail) form.email = authedEmail;
    let id: string;
    if (editing && editId) {
      const updated = updateApplication(editId, { ...form, status });
      id = updated?.id ?? editId;
    } else {
      const item = addApplication(category, form, status);
      id = item.id;
    }
    onDone?.(id);
  }

  async function handleSubmit() {
    if (!validate()) return;
    setAuthError("");
    if (user?.email) {
      await save("submitted", user.email);
      return;
    }
    if (!needAuth) {
      try {
        setCodeSending(true);
        await sendEmailCode(email.trim());
        setNeedAuth(true);
      } catch (err: any) {
        setAuthError(err?.message || "发送验证码失败");
      } finally {
        setCodeSending(false);
      }
      return;
    }
    try {
      setSubmitting(true);
      await signInWithEmailCode(email.trim(), code.trim());
      await save("submitted", email.trim());
    } catch (err: any) {
      setAuthError(err?.message || "验证失败");
    } finally {
      setSubmitting(false);
    }
  }

  // 保存草稿：不校验，未登录也能存（草稿需邮箱标识，未登录用表单邮箱，可空）
  async function handleSaveDraft() {
    setAuthError("");
    if (user?.email) {
      await save("draft", user.email);
      return;
    }
    if (!needAuth) {
      try {
        setCodeSending(true);
        await sendEmailCode(email.trim());
        setNeedAuth(true);
      } catch (err: any) {
        setAuthError(err?.message || "发送验证码失败");
      } finally {
        setCodeSending(false);
      }
      return;
    }
    try {
      setSubmitting(true);
      await signInWithEmailCode(email.trim(), code.trim());
      await save("draft", email.trim());
    } catch (err: any) {
      setAuthError(err?.message || "验证失败");
    } finally {
      setSubmitting(false);
    }
  }

  function addSchool(name: string, city?: string) {
    const n = name.trim();
    if (!n || schools.some((s) => s.name === n)) return;
    setSchools((p) => [...p, { name: n, city }]);
    setSchoolInput("");
    setSchoolSuggest([]);
  }

  function removeSchool(name: string) {
    setSchools((p) => p.filter((s) => s.name !== name));
  }

  function importFavorites() {
    if (schools.length > 0) return;
    const map = new Map((schoolsRef.current ?? []).map((s) => [s.id, s]));
    favoriteIds
      .filter((e) => e.kind === (ece ? "ece" : "school"))
      .forEach((e) => {
        const s = map.get(e.id);
        if (s) addSchool(s.name, [s.suburb, s.city].filter(Boolean).join("") || undefined);
      });
  }

  function toggleAssist(a: string) {
    setAssists((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  }

  return (
    <div className="space-y-5">
      {needAuth && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm text-ink">
            <Mail className="h-4 w-4 text-primary" />
            {editing ? "验证邮箱以保存" : "验证邮箱即完成注册 / 登录"}
          </p>
          <p className="mb-2 text-sm text-ink-soft">
            验证码已发送至 <span className="font-medium text-ink">{email}</span>
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder="请输入 6 位验证码"
            className="w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          {authError && <p className="mt-2 text-xs text-error">{authError}</p>}
        </div>
      )}

      {/* ① 联系邮箱 */}
      <Section title="联系邮箱" required>
        <input
          value={email}
          disabled={!!user?.email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="用于接收申请进度"
          className={`w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft ${
            errors.email ? "border-error" : ""
          }`}
        />
        {errors.email && <p className="text-xs text-error">{errors.email}</p>}
      </Section>

      {/* ② 学生出生日期 */}
      <Section title="学生出生日期" required>
        <div className="grid grid-cols-3 gap-2">
          <select className={selectCls()} value={birth.year} onChange={(e) => setBirth({ ...birth, year: +e.target.value })}>
            {BIRTH_YEARS.map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
          <select className={selectCls()} value={birth.month} onChange={(e) => setBirth({ ...birth, month: +e.target.value })}>
            {MONTHS.map((m) => <option key={m} value={m}>{m} 月</option>)}
          </select>
          <select className={selectCls()} value={birth.day} onChange={(e) => setBirth({ ...birth, day: +e.target.value })}>
            {DAYS.map((d) => <option key={d} value={d}>{d} 日</option>)}
          </select>
        </div>
        {errors.birth && <p className="text-xs text-error">{errors.birth}</p>}
      </Section>

      {/* ③ 所在城市 */}
      <Section title="所在城市" required>
        <div className="grid grid-cols-2 gap-2">
          <select
            className={`${selectCls()} ${errors.city ? "border-error" : ""}`}
            value={province}
            onChange={(e) => {
              const p = e.target.value;
              setProvince(p);
              const self = SELF_CITY_PROVINCES[p];
              setCity(self ?? "");
            }}
          >
            <option value="">省份</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            className={`${selectCls()} ${errors.city ? "border-error" : ""}`}
            value={city}
            disabled={!province || !!SELF_CITY_PROVINCES[province]}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">城市</option>
            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {errors.city && <p className="text-xs text-error">{errors.city}</p>}
      </Section>

      {/* ④ 游学时间 */}
      <Section title="计划游学时间" required>
        <div className="mb-2 inline-flex rounded-xl border border-stroke p-1 text-sm">
          {(["exact", "fuzzy"] as StudyTimeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTimeMode(m)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                timeMode === m ? "bg-primary text-white" : "text-ink-soft hover:text-primary"
              }`}
            >
              {m === "exact" ? "精确时间" : "模糊时段"}
            </button>
          ))}
        </div>

        {errors.time && <p className="text-xs text-error">{errors.time}</p>}

        {timeMode === "exact" ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarOpen((v) => !v)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors hover:border-primary/40 focus:border-primary ${
                errors.time ? "border-error" : "border-stroke"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{`${exStart.year}年${exStart.month}月${exStart.day}日`}</span>
                <span className="text-ink-soft">—</span>
                <span>{`${exEnd.year}年${exEnd.month}月${exEnd.day}日`}</span>
              </span>
              <span className="text-xs text-ink-soft">
                {nights(exStart, exEnd) > 0 ? `${nights(exStart, exEnd)} 天` : ""}
              </span>
            </button>

            {calendarOpen && (
              <div className="absolute left-0 right-0 z-30 mt-2">
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setCalendarOpen(false)}
                />
                <div className="relative z-30 rounded-2xl border border-stroke bg-white p-4 shadow-xl">
                  <DateRangeCalendar
                    start={exStart}
                    end={exEnd}
                    maxYear={CUR_YEAR + 2}
                    onChange={(range) => {
                      setExStart(range.start);
                      setExEnd(range.end);
                    }}
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCalendarOpen(false)}
                      className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      确认
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-1">
                <select className={selectCls()} value={fzStart.year} onChange={(e) => setFzStart({ ...fzStart, year: +e.target.value })}>{START_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                <select className={selectCls()} value={fzStart.month} onChange={(e) => setFzStart({ ...fzStart, month: +e.target.value })}>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                <select className={selectCls()} value={fzStart.tense} onChange={(e) => setFzStart({ ...fzStart, tense: e.target.value as Tense })}>{TENSES.map((t) => <option key={t} value={t}>{TENSE_LABEL[t]}</option>)}</select>
              </div>
            </div>
            <span className="text-ink-soft">—</span>
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-1">
                <select className={selectCls()} value={fzEnd.year} onChange={(e) => setFzEnd({ ...fzEnd, year: +e.target.value })}>{END_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                <select className={selectCls()} value={fzEnd.month} onChange={(e) => setFzEnd({ ...fzEnd, month: +e.target.value })}>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                <select className={selectCls()} value={fzEnd.tense} onChange={(e) => setFzEnd({ ...fzEnd, tense: e.target.value as Tense })}>{TENSES.map((t) => <option key={t} value={t}>{TENSE_LABEL[t]}</option>)}</select>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ⑤ 意向学校 */}
      <Section title="意向学校" required>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={schoolInput}
              onChange={(e) => {
                setSchoolInput(e.target.value);
                setSchoolSuggest(suggest);
              }}
              onFocus={() => setSchoolSuggest(suggest)}
              placeholder="输入学校名，会出现相关候选"
              className={`w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary ${errors.schools ? "border-error" : ""}`}
            />
            {schoolSuggest.length > 0 && (
              <div className="absolute left-0 right-0 top-[48px] z-20 max-h-52 overflow-y-auto rounded-xl border border-stroke bg-white shadow-lg scroll-thin">
                {schoolSuggest.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addSchool(s.name, [s.suburb, s.city].filter(Boolean).join("") || undefined)}
                    className="block w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-primary/5"
                  >
                    {s.name}
                    <span className="ml-2 text-xs text-ink-soft">{[s.suburb, s.city].filter(Boolean).join(", ")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={importFavorites}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <Heart className="h-4 w-4" />
            一键导入心愿单
          </button>
        </div>
        {schools.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {schools.map((s) => (
              <span key={s.name} className="chip flex items-center gap-1.5 border border-primary/20 bg-primary/5 text-primary">
                <Layers className="h-3 w-3" />
                {s.name}
                <button type="button" onClick={() => removeSchool(s.name)} className="text-primary/60 hover:text-error">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.schools && <p className="text-xs text-error">{errors.schools}</p>}
      </Section>

      {/* ⑥ 希望得到的协助 */}
      <Section title="希望得到的协助">
        <div className="grid grid-cols-2 gap-2">
          {ASSIST_OPTIONS.map((a) => {
            const on = assists.includes(a);
            return (
              <label
                key={a}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  on ? "border-primary bg-primary/5 text-primary" : "border-stroke text-ink-soft hover:border-primary/40"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    on ? "border-primary bg-primary text-white" : "border-stroke"
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => toggleAssist(a)}
                />
                {a}
              </label>
            );
          })}
        </div>
        {assists.includes("其它") && (
          <input
            value={otherAssist}
            onChange={(e) => setOtherAssist(e.target.value)}
            placeholder="请填写其它需要的协助"
            className="mt-2 w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
        )}
      </Section>

      {/* ⑦ 其它备注 */}
      <Section title="其它备注">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="例如：希望同校有中文辅导、特定课程偏好等"
          className="w-full resize-none rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
      </Section>

      {/* 联系客服 */}
      <Section title="联系客服">
        <div className="flex items-start gap-4 rounded-2xl border border-stroke bg-white p-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-bg-soft">
            <Image
              src="/images/wechat-qr.png"
              alt="客服微信二维码"
              fill
              className="object-contain"
            />
          </div>
          <div className="space-y-1 text-sm text-ink-soft">
            <p className="font-medium text-ink">扫码添加客服微信</p>
            <p>咨询申请细节、获取更及时的反馈与进度提醒。</p>
            <p className="text-xs">二维码图片路径：public/images/wechat-qr.png</p>
          </div>
        </div>
      </Section>

      {/* 底部三态 */}
      <div className="flex items-center gap-3 border-t border-stroke/70 px-1 py-6">
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="rounded-xl px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-primary/5"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={submitting}
          className="rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
        >
          {codeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存草稿"}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {needAuth ? "验证并提交" : "提交申请"}
        </button>
      </div>
    </div>
  );
}
