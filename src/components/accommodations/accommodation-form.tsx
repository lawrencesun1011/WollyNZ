"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Loader2, Mail, MapPin, Save, Send } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuthUser, sendEmailCode, signInWithEmailCode } from "@/lib/auth";
import type { ExactDate } from "@/lib/applications";
import { DateRangeCalendar } from "@/components/applications/date-range-calendar";
import {
  ACCOMMODATION_NEEDS_OPTIONS,
  addAccommodation,
  getAccommodationById,
  updateAccommodation,
  type AccommodationForm,
  type AccommodationItem,
} from "@/lib/accommodation";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PROPERTY_TYPE_OPTIONS = [
  { value: "House", label: "独立住房 House" },
  { value: "Townhouse", label: "联排别墅 Townhouse" },
  { value: "Apartment", label: "公寓 Apartment" },
];

const BEDROOM_OPTIONS = ["1+", "2+", "3+", "4+", "5+", "6+"];
const BATHROOM_OPTIONS = ["1+", "2+", "3+", "4+"];
const ADULT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const CHILD_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const CHILD_AGE_OPTIONS = [
  "<1",
  ...Array.from({ length: 17 }, (_, i) => String(i + 1)),
];

function selectCls(extra = "") {
  return `w-full appearance-none rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors hover:border-primary/40 focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft disabled:opacity-70 ${extra}`;
}

function inputCls(error?: string) {
  return cn(
    "w-full rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft disabled:opacity-70",
    error && "border-error"
  );
}

function Field({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-error">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

function SectionTitle({
  title,
  required,
}: {
  title: string;
  required?: boolean;
}) {
  return (
    <h3 className="flex items-center gap-1 text-sm font-semibold text-primary">
      {title}
      {required ? (
        <span className="text-error">*</span>
      ) : (
        <span className="text-xs font-normal text-ink-soft">（选填）</span>
      )}
    </h3>
  );
}

function todayDate(): ExactDate {
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() };
}

function isoToExact(s: string): ExactDate {
  if (!s || !s.includes("-")) return todayDate();
  const [y, m, d] = s.split("-").map(Number);
  return { year: y || todayDate().year, month: m || 1, day: d || 1 };
}

function exactToIso(e: ExactDate): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${e.year}-${p(e.month)}-${p(e.day)}`;
}

function fmtExact(e: ExactDate): string {
  return `${e.year}年${e.month}月${e.day}日`;
}

function nextDay(d: ExactDate): ExactDate {
  const n = new Date(d.year, d.month - 1, d.day + 1);
  return { year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() };
}

function formatDate(d: string) {
  if (!d) return "";
  const t = new Date(d);
  return `${t.getFullYear()}年${t.getMonth() + 1}月${t.getDate()}日`;
}

function StatusLabel({ status }: { status: AccommodationItem["status"] }) {
  const map: Record<string, string> = {
    draft: "草稿",
    submitted: "已提交",
    processing: "处理中",
    completed: "已完成",
  };
  return <span>{map[status] ?? status}</span>;
}

interface FormState extends AccommodationForm {
  needs: string[];
  notes: string;
}

const EMPTY: FormState = {
  email: "",
  name: "",
  moveInDate: "",
  moveOutDate: "",
  adults: 1,
  children: 0,
  childAges: [],
  bedrooms: "1+",
  bathrooms: "1+",
  budgetMin: 500,
  budgetMax: 1500,
  area: "",
  propertyTypes: PROPERTY_TYPE_OPTIONS.map((o) => o.value),
  needs: [],
  notes: "",
};

function normalizeDraft(it: AccommodationItem): FormState {
  return {
    email: it.email ?? "",
    name: it.name ?? "",
    moveInDate: it.moveInDate ?? "",
    moveOutDate: it.moveOutDate ?? "",
    adults: it.adults ?? 1,
    children: it.children ?? 0,
    childAges: it.childAges ?? [],
    bedrooms: it.bedrooms ?? "1+",
    bathrooms: it.bathrooms ?? "1+",
    budgetMin: it.budgetMin ?? 500,
    budgetMax: it.budgetMax ?? 1500,
    area: it.area ?? "",
    propertyTypes: it.propertyTypes?.length
      ? it.propertyTypes
      : PROPERTY_TYPE_OPTIONS.map((o) => o.value),
    needs: it.needs ?? [],
    notes: it.notes ?? "",
  };
}

interface AccommodationFormProps {
  draftId?: string | null;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export function AccommodationForm({
  draftId,
  onSubmitted,
  onCancel,
}: AccommodationFormProps) {
  const router = useRouter();
  const user = useAuthUser();
  const locked = useMemo(() => !user?.email, [user?.email]);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editItem, setEditItem] = useState<AccommodationItem | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [calRange, setCalRange] = useState<{ start: ExactDate; end: ExactDate }>({
    start: { year: 0, month: 0, day: 0 },
    end: { year: 0, month: 0, day: 0 },
  });

  function openCal() {
    const t = todayDate();
    const start = form.moveInDate ? isoToExact(form.moveInDate) : t;
    const end = form.moveOutDate ? isoToExact(form.moveOutDate) : nextDay(t);
    setCalRange({ start, end });
    setCalOpen(true);
  }

  // 邮箱验证（注册 / 登录）
  const [email, setEmail] = useState("");
  const [needAuth, setNeedAuth] = useState(false);
  const [code, setCode] = useState("");
  const [codeSending, setCodeSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [authError, setAuthError] = useState("");
  const codeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载草稿 / 预填登录邮箱
  useEffect(() => {
    async function load() {
      if (draftId) {
        const it = await getAccommodationById(draftId);
        if (it) {
          setEditItem(it);
          setForm(normalizeDraft(it));
          setEmail(user?.email ?? it.email ?? "");
        }
      } else {
        setForm((prev) => ({ ...prev, email: user?.email ?? "" }));
        setEmail(user?.email ?? "");
      }
      setErrors({});
      setNeedAuth(false);
      setCode("");
      setAuthError("");
      setSubmitting(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, user?.email]);

  // 验证码发送后 60s 冷却
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

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setChildrenCount(n: number) {
    setField("children", n);
    setForm((prev) => {
      const ages = prev.childAges.slice(0, n);
      while (ages.length < n) ages.push("");
      return { ...prev, childAges: ages };
    });
  }

  function togglePropertyType(value: string) {
    setForm((prev) => {
      const has = prev.propertyTypes.includes(value);
      const next = has
        ? prev.propertyTypes.filter((v) => v !== value)
        : [...prev.propertyTypes, value];
      return { ...prev, propertyTypes: next };
    });
  }

  function toggleNeed(value: string) {
    setForm((prev) => {
      const has = prev.needs.includes(value);
      const next = has
        ? prev.needs.filter((v) => v !== value)
        : [...prev.needs, value];
      return { ...prev, needs: next };
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      (user?.email || email).trim()
    );
    if (!emailOk) e.email = "请输入有效邮箱";
    if (!form.name.trim()) e.name = "请填写联系人姓名";
    if (!form.moveInDate) e.moveInDate = "请选择入住时间";
    if (!form.moveOutDate) e.moveOutDate = "请选择退房时间";
    else if (form.moveOutDate <= form.moveInDate)
      e.moveOutDate = "退房时间需晚于入住时间";
    if (!form.adults || form.adults < 1) e.adults = "请填写成人数";
    if (form.children > 0) {
      const ages = form.childAges.slice(0, form.children);
      if (ages.length < form.children || ages.some((a) => a === "")) {
        e.childAges = "请填写所有儿童年龄";
      }
    }
    if (!form.bedrooms) e.bedrooms = "请选择卧室数";
    if (!form.bathrooms) e.bathrooms = "请选择洗手间数";
    if (!form.budgetMin || form.budgetMin <= 0)
      e.budget = "请填写预算下限";
    if (!form.budgetMax || form.budgetMax <= 0)
      e.budgetMax = "请填写预算上限";
    else if (form.budgetMax <= form.budgetMin)
      e.budget = "预算上限应高于下限";
    if (!form.area.trim()) e.area = "请填写意向区域";
    if (!form.propertyTypes.length)
      e.propertyTypes = "请至少选择一种房屋类型";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function buildForm(): AccommodationForm {
    return {
      email: user?.email?.trim() || email.trim(),
      name: form.name.trim(),
      moveInDate: form.moveInDate,
      moveOutDate: form.moveOutDate,
      adults: form.adults,
      children: form.children,
      childAges:
        form.children > 0 ? form.childAges.slice(0, form.children) : [],
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      budgetMin: form.budgetMin,
      budgetMax: form.budgetMax,
      area: form.area.trim(),
      propertyTypes: form.propertyTypes,
      needs: form.needs.length ? form.needs : undefined,
      notes: form.notes.trim() || undefined,
    };
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

  async function handleSubmit() {
    setAuthError("");
    if (!validate()) return;
    if (!user?.email) {
      setAuthError("需先验证邮箱并登录");
      return;
    }
    setSubmitting(true);
    const payload = buildForm();
    try {
      let item: AccommodationItem | undefined;
      if (draftId) {
        item = updateAccommodation(draftId, payload, "submitted");
      } else {
        item = addAccommodation(payload, "submitted");
      }
      if (item) {
        setSaved(true);
        setTimeout(() => onSubmitted?.(), 700);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSaveDraft() {
    setAuthError("");
    if (!user?.email) {
      setAuthError("需先验证邮箱并登录");
      return;
    }
    const payload = buildForm();
    let item: AccommodationItem | undefined;
    if (draftId) {
      item = updateAccommodation(draftId, payload, "draft");
    } else {
      item = addAccommodation(payload, "draft");
    }
    if (item) {
      onSubmitted?.();
    }
  }

  useEffect(() => {
    if (saved) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [saved]);

  if (saved) {
    return (
      <div className="space-y-6 rounded-2xl border border-stroke bg-bg p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <Check className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-ink">住宿意向已提交</h3>
        <p className="text-sm text-ink-soft">
          我们的住宿顾问会尽快通过邮件与您联系。
        </p>
        <button
          type="button"
          onClick={() => router.push("/my-accommodations")}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          查看我的住宿意向
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">住宿需求</h2>
          {editItem && (
            <span className="text-xs text-ink-soft">
              当前状态：
              <span className="ml-1 font-medium text-primary">
                <StatusLabel status={editItem.status} />
              </span>
              {editItem.appliedAt && (
                <span className="ml-2">创建于 {formatDate(editItem.appliedAt)}</span>
              )}
            </span>
          )}
        </div>

        {/* 联系邮箱 */}
        <div className="space-y-2.5">
          <SectionTitle title="联系邮箱" required />
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                disabled={!!user?.email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="用于接收申请进度与住宿顾问沟通"
                className={inputCls(errors.email)}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-error">{errors.email}</p>
              )}
            </div>
            {!user?.email && (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={codeSending || cooldown > 0}
                className="mt-0.5 shrink-0 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {codeSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : cooldown > 0 ? (
                  `${cooldown}s`
                ) : (
                  "验证"
                )}
              </button>
            )}
          </div>
          {!user?.email && (
            <p className="text-xs text-ink-soft">
              需先验证邮箱才能填写表单，验证即自动完成注册 / 登录。
            </p>
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
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "确认"
                  )}
                </button>
              </div>
              {authError && (
                <p className="mt-2 text-xs text-error">{authError}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-5">
          {/* 联系人姓名 */}
          <Field label="联系人姓名" required error={errors.name}>
            <input
              value={form.name}
              disabled={locked}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="如：张三 / San Zhang"
              className={inputCls(errors.name)}
            />
          </Field>

          {/* 入住 / 退房时间 */}
          <Field
            label="入住 - 退房时间"
            required
            error={errors.moveInDate || errors.moveOutDate}
          >
            <div className="relative">
              <button
                type="button"
                disabled={locked}
                onClick={openCal}
                className={cn(
                  inputCls(errors.moveInDate || errors.moveOutDate ? "border-error" : ""),
                  "flex items-center justify-between text-left"
                )}
              >
                <span>
                  {form.moveInDate && form.moveOutDate ? (
                    `${fmtExact(isoToExact(form.moveInDate))} — ${fmtExact(isoToExact(form.moveOutDate))}`
                  ) : (
                    <span className="text-ink-soft">选择入住 - 退房时间</span>
                  )}
                </span>
                <CalendarDays className="h-4 w-4 shrink-0 text-ink-soft" />
              </button>

              {calOpen && !locked && (
                <div className="absolute left-0 right-0 z-30 mt-2">
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setCalOpen(false)}
                  />
                  <div className="relative z-30 rounded-2xl border border-stroke bg-white p-4 shadow-xl">
                    <DateRangeCalendar
                      start={calRange.start}
                      end={calRange.end}
                      onChange={(r) => {
                        setCalRange(r);
                        setField("moveInDate", exactToIso(r.start));
                        setField("moveOutDate", exactToIso(r.end));
                      }}
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCalOpen(false)}
                        className="rounded-xl border border-stroke px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-primary/5"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Field>

          {/* 成人数 / 儿童数 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="成人数" required error={errors.adults}>
              <select
                value={form.adults}
                disabled={locked}
                onChange={(e) => setField("adults", Number(e.target.value))}
                className={selectCls(errors.adults ? "border-error" : "")}
              >
                {ADULT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} 位成人
                  </option>
                ))}
              </select>
            </Field>
            <Field label="儿童数" required error={errors.children}>
              <select
                value={form.children}
                disabled={locked}
                onChange={(e) =>
                  setChildrenCount(Number(e.target.value))
                }
                className={selectCls(errors.children ? "border-error" : "")}
              >
                {CHILD_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} 位儿童
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* 儿童年龄 */}
          {form.children > 0 && (
            <div className="space-y-2.5 rounded-2xl border border-stroke bg-white p-4">
              <SectionTitle title="儿童年龄" required />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: form.children }, (_, i) => (
                  <Field
                    key={i}
                    label={`儿童${i + 1}`}
                    required
                    error={i === 0 ? errors.childAges : undefined}
                  >
                    <select
                      value={form.childAges[i] ?? ""}
                      disabled={locked}
                      onChange={(e) => {
                        const ages = [...form.childAges];
                        ages[i] = e.target.value;
                        setField("childAges", ages);
                      }}
                      className={selectCls(
                        errors.childAges ? "border-error" : ""
                      )}
                    >
                      <option value="">请选择</option>
                      {CHILD_AGE_OPTIONS.map((age) => (
                        <option key={age} value={age}>
                          {age} 岁
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            </div>
          )}

          {/* 卧室数 / 洗手间数 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="卧室数" required error={errors.bedrooms}>
              <select
                value={form.bedrooms}
                disabled={locked}
                onChange={(e) => setField("bedrooms", e.target.value)}
                className={selectCls(errors.bedrooms ? "border-error" : "")}
              >
                {BEDROOM_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v} 卧室
                  </option>
                ))}
              </select>
            </Field>
            <Field label="洗手间数" required error={errors.bathrooms}>
              <select
                value={form.bathrooms}
                disabled={locked}
                onChange={(e) => setField("bathrooms", e.target.value)}
                className={selectCls(errors.bathrooms ? "border-error" : "")}
              >
                {BATHROOM_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v} 洗手间
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* 预算范围 */}
          <div className="space-y-2.5">
            <SectionTitle title="预算范围（周租金 NZD）" required />
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                step={50}
                value={form.budgetMin}
                disabled={locked}
                onChange={(e) => setField("budgetMin", e.target.value)}
                placeholder="下限"
                className={inputCls(errors.budget)}
              />
              <span className="shrink-0 text-ink-soft">—</span>
              <input
                type="number"
                min={0}
                step={50}
                value={form.budgetMax}
                disabled={locked}
                onChange={(e) => setField("budgetMax", e.target.value)}
                placeholder="上限"
                className={inputCls(errors.budgetMax || errors.budget)}
              />
            </div>
            {(errors.budget || errors.budgetMax) && (
              <p className="text-xs text-error">
                {errors.budget || errors.budgetMax}
              </p>
            )}
          </div>

          {/* 意向区域 */}
          <Field
            label="意向区域"
            required
            error={errors.area}
            hint="可填写目标学校附近、片区或城市方位"
          >
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                value={form.area}
                disabled={locked}
                onChange={(e) => setField("area", e.target.value)}
                placeholder="如：xxx school附近，奥克兰北岸，..."
                className={cn(inputCls(errors.area), "pl-9")}
              />
            </div>
          </Field>

          {/* 房屋类型 */}
          <div className="space-y-2.5">
            <SectionTitle title="房屋类型" required />
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPE_OPTIONS.map((opt) => {
                const selected = form.propertyTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={locked}
                    onClick={() => togglePropertyType(opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-stroke bg-white text-ink hover:border-primary/40"
                    )}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {errors.propertyTypes && (
              <p className="text-xs text-error">{errors.propertyTypes}</p>
            )}
          </div>

          {/* 其它可选需求 */}
          <div className="space-y-2.5">
            <SectionTitle title="其它需求" />
            <div className="flex flex-wrap gap-2">
              {ACCOMMODATION_NEEDS_OPTIONS.map((need) => {
                const selected = form.needs.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    disabled={locked}
                    onClick={() => toggleNeed(need)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-stroke bg-white text-ink hover:border-primary/40"
                    )}
                  >
                    {need}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 补充说明 */}
          <div className="space-y-2.5">
            <SectionTitle title="补充说明" />
            <textarea
              value={form.notes}
              disabled={locked}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="其它需要说明的情况，如宠物、停车、学区偏好等"
              rows={4}
              className="w-full resize-none rounded-xl border border-stroke bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary disabled:bg-bg-soft disabled:text-ink-soft disabled:opacity-70"
            />
          </div>
        </div>

      {/* 底部按钮 */}
      <div className="flex items-center gap-3 px-1 py-2">
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
          className="flex items-center gap-1.5 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          保存草稿
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={locked || submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <Send className="h-4 w-4" />
          提交住宿意向
        </button>
      </div>

      {authError && (
        <p className="text-center text-xs text-error">{authError}</p>
      )}
    </div>
  );
}
