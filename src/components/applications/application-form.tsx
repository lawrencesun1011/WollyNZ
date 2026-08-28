"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Mail, Heart, Layers, Save, Send, X, Plus } from "lucide-react";
import {
  addApplication,
  updateApplication,
  getApplication,
  getSavedProfile,
  TENSE_LABEL,
  type ApplicationCategory,
  type ApplicationForm,
  type ApplicationItem,
  type ExactDate,
  type FuzzyDate,
  type IntendedSchool,
  type StudyTimeMode,
  type Tense,
} from "@/lib/applications";
import { getUserInfo, ensureUserInfo } from "@/lib/user-info";
import { DateRangeCalendar } from "./date-range-calendar";
import { useFavorites } from "@/lib/user-collections";
import { PROVINCES, citiesOf, SELF_CITY_PROVINCES } from "@/lib/regions";
import { getSchoolsSnapshot, subscribeSchools } from "@/lib/schools-store";
import { getEceSnapshot, loadEceSnapshot } from "@/lib/ece-store";
import type { SchoolFrontend } from "@/lib/types";
import { useAuthUser, sendEmailCode, signInWithEmailCode } from "@/lib/auth";
import { EmailTemplateModal } from "./email-template-modal";

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
  return `w-full appearance-none rounded-xl border border-stroke bg-white/80 px-3 py-2.5 text-sm text-ink outline-none transition-colors hover:border-primary/40 focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft disabled:opacity-70 ${extra}`;
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
  const ms =
    new Date(b.year, b.month - 1, b.day).getTime() -
    new Date(a.year, a.month - 1, a.day).getTime();
  return ms <= 0 ? 0 : Math.round(ms / (1000 * 60 * 60 * 24));
}

function todayDate(): { year: number; month: number; day: number } {
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() };
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
  const locked = !user?.email; // 未登录（未验证邮箱）时锁定除邮箱外的所有字段

  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [parentTitle, setParentTitle] = useState("");
  const [birthDates, setBirthDates] = useState<(ExactDate | null)[]>([
    { year: CUR_YEAR - 8, month: 1, day: 1 },
  ]);
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
  const [schoolSuggest, setSchoolSuggest] = useState<SchoolFrontend[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schoolSuggestOpen, setSchoolSuggestOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 邮箱验证（注册/登录）
  const [needAuth, setNeedAuth] = useState(false);
  const [code, setCode] = useState("");
  const [codeSending, setCodeSending] = useState(false);
  const [authError, setAuthError] = useState("");

  const [generatedItem, setGeneratedItem] = useState<ApplicationItem | null>(null);

  const [schoolsData, setSchoolsData] = useState<SchoolFrontend[]>([]);

  // 意向学校数据源：幼儿园从 ECE 库（异步）拉取，中小学从 schools-store 拉取。
  // 用 state 而非 ref，确保数据到达后组件重新渲染、联想与导入跟随更新。
  useEffect(() => {
    if (ece) {
      const snap = getEceSnapshot();
      if (snap) {
        setSchoolsData(snap);
        return;
      }
      let active = true;
      void loadEceSnapshot().then((d) => {
        if (active) setSchoolsData(d ?? []);
      });
      return () => {
        active = false;
      };
    }
    setSchoolsData(getSchoolsSnapshot() ?? []);
    return subscribeSchools((d) => setSchoolsData(d ?? []));
  }, [ece]);

  // 验证码发送后 60s 冷却，避免用户反复点击（与登录页一致）
  useEffect(() => {
    if (cooldown <= 0) {
      if (codeTimer.current) clearInterval(codeTimer.current);
      return;
    }
    codeTimer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (codeTimer.current) clearInterval(codeTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (codeTimer.current) clearInterval(codeTimer.current);
    };
  }, [cooldown]);

  // 挂载时初始化：草稿编辑载入 / 预填
  useEffect(() => {
    if (editId) {
      const it = getApplication(editId);
      if (it) {
        setEmail(user?.email ?? it.email);
        setParentTitle(it.parentTitle ?? "");
        setBirthDates(
          it.birthDates && it.birthDates.length
            ? it.birthDates
            : [{ year: CUR_YEAR - 8, month: 1, day: 1 }]
        );
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
      }
    } else {
      setEmail(user?.email ?? "");
      const saved = getSavedProfile();
      const applyRegion = (p: string, c: string) => {
        if (p) {
          setProvince(p);
          setCity(SELF_CITY_PROVINCES[p] ?? c ?? "");
        }
      };
      applyRegion(saved.province, saved.city);
      // 从 user_info 补充基础信息（称呼 / 省份 / 城市），仅填补缺失字段
      if (user?.uid) {
        getUserInfo(user.uid)
          .then((ui) => {
            if (!ui) return;
            if (!saved.province) applyRegion(ui.province, ui.city);
            if (ui.name) setParentTitle((t) => t || ui.name);
          })
          .catch(() => {});
      }
    }
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
    return (schoolsData ?? [])
      .filter((s) => s.name.toLowerCase().startsWith(q) && !schools.some((x) => x.name === s.name))
      .slice(0, 6);
  }, [schoolInput, schools]);

  const childWord = ece ? "孩子" : "学生";
  const studentTitle = (n: number) => `${childWord}${n}出生日期`;

  function validate(): boolean {
    const e: Record<string, string> = {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) e.email = "请输入有效邮箱";
    if (!parentTitle.trim()) e.parentTitle = "请填写家长称呼";
    if (!province || !city) e.city = "请选择所在城市";
    if (schools.length === 0) e.schools = "请至少填写一所意向学校";

    // 学生1 出生日期：不得晚于今天，最早往前推 18 年
    const t = todayDate();
    const b0 = birthDates[0];
    if (!b0 || !b0.year) {
      e.birth = "请填写学生1出生日期";
    } else {
      const bDate = new Date(b0.year, (b0.month || 1) - 1, b0.day || 1);
      const today = new Date(t.year, t.month - 1, t.day);
      const earliest = new Date(t.year - 18, t.month - 1, t.day);
      if (bDate > today) e.birth = "出生日期不得晚于今天";
      else if (bDate < earliest) e.birth = "出生日期最早可往前推 18 年";
    }

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
      parentTitle: parentTitle.trim() || undefined,
      birthDates,
      province,
      city,
      studyPeriod,
      intendedSchools: schools,
    };
  }

  function finish(id?: string) {
    onDone?.(id ?? "");
  }

  async function handleSendCode() {
    setAuthError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAuthError("请先输入有效邮箱");
      return;
    }
    try {
      setCodeSending(true);
      await sendEmailCode(email.trim());
      setNeedAuth(true);
      setCooldown(60);
    } catch (err: any) {
      setAuthError(err?.message || "发送验证码失败");
    } finally {
      setCodeSending(false);
    }
  }

  async function handleConfirm() {
    setAuthError("");
    try {
      setSubmitting(true);
      await signInWithEmailCode(email.trim(), code.trim());
      // 登录成功后 user 更新 → locked 解除，表单解锁
    } catch (err: any) {
      setAuthError(err?.message || "验证失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerate() {
    if (!validate()) return;
    setAuthError("");
    const form = buildForm();
    form.email = user?.email?.trim() || email.trim();
    let item: ApplicationItem | undefined;
    if (editId) {
      item = updateApplication(editId, { ...form, status: "generated" });
    } else {
      item = addApplication(category, form, "generated");
    }
    if (item) {
      if (user?.uid) {
        ensureUserInfo(user.uid, {
          name: parentTitle.trim(),
          province: province.trim(),
          city: city.trim(),
        }).catch(() => {});
      }
      setGeneratedItem(item);
    }
  }

  async function handleSaveDraft() {
    setAuthError("");
    const form = buildForm();
    form.email = user?.email?.trim() || email.trim();
    let id = "";
    if (editId) {
      const updated = updateApplication(editId, { ...form, status: "draft" });
      id = updated?.id ?? editId;
    } else {
      const item = addApplication(category, form, "draft");
      id = item.id;
    }
    if (user?.uid) {
      ensureUserInfo(user.uid, {
        name: parentTitle.trim(),
        province: province.trim(),
        city: city.trim(),
      }).catch(() => {});
    }
    finish(id);
  }

  function addSchool(s: { id?: string; name: string; city?: string; email?: string }) {
    const n = s.name.trim();
    if (!n || schools.some((x) => x.name === n)) return;
    setSchools((p) => [...p, { id: s.id, name: n, city: s.city, email: s.email }]);
    setSchoolInput("");
    setSchoolSuggest([]);
    setSchoolSuggestOpen(false);
  }

  function removeSchool(name: string) {
    setSchools((p) => p.filter((s) => s.name !== name));
  }

  function importFavorites() {
    if (schools.length > 0) return;
    const map = new Map((schoolsData ?? []).map((s) => [s.id, s]));
    favoriteIds
      .filter((e) => e.kind === (ece ? "ece" : "school"))
      .forEach((e) => {
        const s = map.get(e.id);
        if (s) addSchool({ id: s.id, name: s.name, city: [s.suburb, s.city].filter(Boolean).join(", ") || undefined, email: s.email });
      });
  }

  function updateBirth(idx: number, patch: Partial<ExactDate>) {
    setBirthDates((p) =>
      p.map((b, i) => {
        if (i !== idx) return b;
        const base = b ?? { year: CUR_YEAR - 8, month: 1, day: 1 };
        return { ...base, ...patch };
      })
    );
  }

  function addStudent() {
    setBirthDates((p) => [...p, { year: CUR_YEAR - 8, month: 1, day: 1 }]);
  }

  function removeStudent(idx: number) {
    setBirthDates((p) => p.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      {/* ① 联系邮箱 + 验证（未登录时锁定其余字段） */}
      <Section title="联系邮箱" required>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <input
              value={email}
              disabled={!!user?.email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="用于接收申请进度与学校沟通"
              className={`w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft ${
                errors.email ? "border-error" : ""
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
          </div>
          {!user?.email && (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={codeSending || cooldown > 0}
              className="mt-0.5 shrink-0 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {codeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : cooldown > 0 ? `${cooldown}s` : "验证"}
            </button>
          )}
        </div>
        {!user?.email && (
          <p className="mt-1 text-xs text-ink-soft">需先验证邮箱才能填写表单，验证即自动完成注册 / 登录。</p>
        )}

        {needAuth && !user?.email && (
          <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm text-ink">
              <Mail className="h-4 w-4 text-primary" />
              验证码已发送至 <span className="font-medium">{email}</span>
            </p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder="请输入 6 位验证码"
                className="w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || code.trim().length === 0}
                className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "确认"}
              </button>
            </div>
            {authError && <p className="mt-2 text-xs text-error">{authError}</p>}
          </div>
        )}
      </Section>

      {/* ② 家长称呼 */}
      <Section title="家长英语称呼" required>
        <input
          value={parentTitle}
          disabled={locked}
          onChange={(e) => setParentTitle(e.target.value)}
          placeholder="如：Peter / San Zhang"
          className={`w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft ${
            errors.parentTitle ? "border-error" : ""
          }`}
        />
        <p className="mt-1 text-xs text-ink-soft">用于和学校沟通</p>
        {errors.parentTitle && <p className="mt-1 text-xs text-error">{errors.parentTitle}</p>}
      </Section>

      {/* ③ 学生出生日期（可添加多名） */}
      <div className="space-y-3">
        {birthDates.map((bd, idx) => (
          <Section key={idx} title={studentTitle(idx + 1)} required={idx === 0}>
            <div className="flex items-center gap-2">
              <div className="grid flex-1 grid-cols-3 gap-2">
                <select
                  className={selectCls(errors.birth ? "border-error" : "")}
                  value={bd?.year ?? CUR_YEAR - 8}
                  disabled={locked}
                  onChange={(e) => updateBirth(idx, { year: +e.target.value })}
                >
                  {BIRTH_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y} 年
                    </option>
                  ))}
                </select>
                <select
                  className={selectCls(errors.birth ? "border-error" : "")}
                  value={bd?.month ?? 1}
                  disabled={locked}
                  onChange={(e) => updateBirth(idx, { month: +e.target.value })}
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m} 月
                    </option>
                  ))}
                </select>
                <select
                  className={selectCls(errors.birth ? "border-error" : "")}
                  value={bd?.day ?? 1}
                  disabled={locked}
                  onChange={(e) => updateBirth(idx, { day: +e.target.value })}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d} 日
                    </option>
                  ))}
                </select>
              </div>
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => removeStudent(idx)}
                  disabled={locked}
                  aria-label="移除该学生"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stroke/70 text-ink-soft transition-colors hover:bg-error/5 hover:text-error disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {idx === 0 && errors.birth && <p className="mt-1 text-xs text-error">{errors.birth}</p>}
          </Section>
        ))}
        {birthDates.length < 5 && (
          <button
            type="button"
            onClick={addStudent}
            disabled={locked}
            className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> 添加学生{`（${birthDates.length + 1}）`}
          </button>
        )}
      </div>

      {/* ④ 所在城市 */}
      <Section title="所在城市" required>
        <div className="grid grid-cols-2 gap-2">
          <select
            className={selectCls(errors.city ? "border-error" : "")}
            value={province}
            disabled={locked}
            onChange={(e) => {
              const p = e.target.value;
              setProvince(p);
              const self = SELF_CITY_PROVINCES[p];
              setCity(self ?? "");
            }}
          >
            <option value="">省份</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            className={selectCls(errors.city ? "border-error" : "")}
            value={city}
            disabled={locked || !province || !!SELF_CITY_PROVINCES[province]}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">城市</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {errors.city && <p className="text-xs text-error">{errors.city}</p>}
      </Section>

      {/* ⑤ 游学时间 */}
      <Section title="计划游学时间" required>
        <div className="mb-2 inline-flex rounded-xl border border-stroke p-1 text-sm">
          {(["exact", "fuzzy"] as StudyTimeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTimeMode(m)}
              disabled={locked}
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
              onClick={() => !locked && setCalendarOpen((v) => !v)}
              disabled={locked}
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
                <div className="fixed inset-0 z-20" onClick={() => setCalendarOpen(false)} />
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
                <select className={selectCls()} value={fzStart.year} disabled={locked} onChange={(e) => setFzStart({ ...fzStart, year: +e.target.value })}>
                  {START_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select className={selectCls()} value={fzStart.month} disabled={locked} onChange={(e) => setFzStart({ ...fzStart, month: +e.target.value })}>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m} 月
                    </option>
                  ))}
                </select>
                <select className={selectCls()} value={fzStart.tense} disabled={locked} onChange={(e) => setFzStart({ ...fzStart, tense: e.target.value as Tense })}>
                  {TENSES.map((t) => (
                    <option key={t} value={t}>
                      {TENSE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span className="text-ink-soft">—</span>
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-1">
                <select className={selectCls()} value={fzEnd.year} disabled={locked} onChange={(e) => setFzEnd({ ...fzEnd, year: +e.target.value })}>
                  {END_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select className={selectCls()} value={fzEnd.month} disabled={locked} onChange={(e) => setFzEnd({ ...fzEnd, month: +e.target.value })}>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m} 月
                    </option>
                  ))}
                </select>
                <select className={selectCls()} value={fzEnd.tense} disabled={locked} onChange={(e) => setFzEnd({ ...fzEnd, tense: e.target.value as Tense })}>
                  {TENSES.map((t) => (
                    <option key={t} value={t}>
                      {TENSE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ⑥ 意向学校 */}
      <Section title={ece ? "意向幼儿园" : "意向学校"} required>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={schoolInput}
              disabled={locked}
              onChange={(e) => {
                setSchoolInput(e.target.value);
                setSchoolSuggest(suggest);
                setSchoolSuggestOpen(true);
              }}
              onFocus={() => {
                setSchoolSuggest(suggest);
                setSchoolSuggestOpen(true);
              }}
              placeholder="输入学校名，会出现相关候选"
              className={`w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary ${
                errors.schools ? "border-error" : ""
              }`}
            />
            {schoolSuggestOpen && suggest.length > 0 && (
              <div className="absolute left-0 right-0 top-[48px] z-20 max-h-52 overflow-y-auto rounded-xl border border-stroke bg-white shadow-lg scroll-thin">
                {suggest.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={locked}
                    onClick={() => addSchool({ id: s.id, name: s.name, city: [s.suburb, s.city].filter(Boolean).join(", ") || undefined, email: s.email })}
                    className="block w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-primary/5 disabled:opacity-50"
                  >
                    {s.name}
                    <span className="ml-2 text-xs text-ink-soft">
                      {[s.suburb, s.city].filter(Boolean).join(", ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={importFavorites}
            disabled={locked}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
          >
            <Heart className="h-4 w-4" />
            一键导入心愿单
          </button>
        </div>
        {schools.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {schools.map((s) => (
              <span
                key={s.name}
                className="chip flex items-center gap-1.5 border border-primary/20 bg-primary/5 text-primary"
              >
                <Layers className="h-3 w-3" />
                {s.name}
                <button
                  type="button"
                  onClick={() => removeSchool(s.name)}
                  disabled={locked}
                  className="text-primary/60 hover:text-error disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.schools && <p className="text-xs text-error">{errors.schools}</p>}
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
          disabled={locked || submitting}
          className="flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          保存草稿
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={locked || submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          生成邮件模板
        </button>
      </div>

      {generatedItem && (
        <EmailTemplateModal
          item={generatedItem}
          onClose={() => {
            const id = generatedItem.id;
            setGeneratedItem(null);
            finish(id);
          }}
        />
      )}
    </div>
  );
}
