"use client";

/**
 * 申请数据模型（制式申请表）。
 *
 * 设计：模块级 pub/sub + localStorage + 云端 PostgREST（user_collections.applications jsonb）。
 * 登录后（uid 非空）每次变更增量 upsert 到云端；未登录仅落本地。
 * 状态（status）由系统驱动，用户不可改。
 */

import { useEffect, useState } from "react";
import {
  saveCloudApplication,
  deleteCloudApplication,
  fetchCloudApplications,
  fetchCloudProfile,
  saveCloudProfile,
  type UserProfile,
} from "./user-data";

export type ApplicationCategory = "school" | "ece";

/** 状态：draft 草稿（尚未生成邮件模板），generated 已生成邮件模板。游学开始时间已过则视为 closed（已结束）。 */
export type ApplicationStatus = "draft" | "generated" | "closed";

/** 游学开始时间（ms），无法解析时返回 null。exact 用 start；fuzzy 用 fuzzyStart 的中旬近似。 */
function studyStartMs(item: ApplicationItem): number | null {
  const p = item.studyPeriod;
  if (!p) return null;
  if (p.mode === "exact") {
    const s = p.start;
    if (s?.year) return new Date(s.year, (s.month || 1) - 1, s.day || 1).getTime();
  } else {
    const f = p.fuzzyStart;
    if (f?.year) {
      const off = f.tense === "early" ? 1 : f.tense === "mid" ? 15 : 28;
      return new Date(f.year, (f.month || 1) - 1, off).getTime();
    }
  }
  return null;
}

/** 已生成且游学开始时间已过 → 已结束；否则返回原状态。 */
export function getEffectiveStatus(item: ApplicationItem): ApplicationStatus {
  if (item.status === "generated") {
    const ms = studyStartMs(item);
    if (ms != null && Date.now() > ms) return "closed";
  }
  return item.status;
}

export type StudyTimeMode = "exact" | "fuzzy";

/** 精确日期：YYYY-MM-DD */
export interface ExactDate {
  year: number;
  month: number;
  day: number;
}

export type Tense = "early" | "mid" | "late";

/** 模糊时段：年/月/旬。 */
export interface FuzzyDate {
  year: number;
  month: number;
  tense: Tense;
}

export interface StudyPeriod {
  mode: StudyTimeMode;
  start?: ExactDate | null;
  end?: ExactDate | null;
  fuzzyStart?: FuzzyDate | null;
  fuzzyEnd?: FuzzyDate | null;
}

export interface IntendedSchool {
  id?: string;
  name: string;
  city?: string;
  email?: string; // 学校邮箱，用于邮件模板收件人
}

export interface ApplicationForm {
  email: string;
  parentTitle?: string; // 家长称呼，用于和学校沟通
  birthDates?: (ExactDate | null)[]; // 学生1..n 出生日期，至少 1 个
  province?: string;
  city?: string;
  studyPeriod?: StudyPeriod;
  intendedSchools: IntendedSchool[];
}

export interface ApplicationItem extends ApplicationForm {
  id: string;
  category: ApplicationCategory;
  status: ApplicationStatus; // 系统驱动，用户不可改
  appliedAt: string;
  updatedAt: string;
}

export const CATEGORY_META: Record<ApplicationCategory, { label: string }> = {
  school: { label: "中小学" },
  ece: { label: "幼儿园" },
};

export const TENSE_LABEL: Record<Tense, string> = {
  early: "上旬",
  mid: "中旬",
  late: "下旬",
};

/** ExactDate → YYYY-MM-DD（不确定补 01）。 */
export function exactToString(d?: ExactDate | null): string {
  if (!d || !d.year || !d.month) return "";
  const day = d.day || 1;
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 模糊时段 → 展示文本，如「2026年10月中旬」。 */
export function fuzzyToString(f?: FuzzyDate | null): string {
  if (!f || !f.year || !f.month) return "";
  return `${f.year}年${f.month}月${TENSE_LABEL[f.tense]}`;
}

/** StudyPeriod → 可读区间，如「2026年10月中旬 — 11月中旬」。 */
export function studyPeriodToString(p?: StudyPeriod): string {
  if (!p) return "—";
  if (p.mode === "exact") {
    const s = exactToString(p.start);
    const e = exactToString(p.end);
    if (!s && !e) return "—";
    return [s, e].filter(Boolean).join(" — ");
  }
  const s = fuzzyToString(p.fuzzyStart);
  const e = fuzzyToString(p.fuzzyEnd);
  if (!s && !e) return "—";
  return [s, e].filter(Boolean).join(" — ");
}

const LS_KEY = "wollyn:schools:applications";

let items: ApplicationItem[] = loadLS();
let uid: string | null = null;
const subs = new Set<(v: ApplicationItem[]) => void>();

function normalizeApplication(raw: unknown): ApplicationItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (!item.id || typeof item.id !== "string") return null;
  const category =
    item.category === "ece" ? "ece" : item.category === "school" ? "school" : null;
  if (!category) return null;
  const status: ApplicationStatus = item.status === "draft" ? "draft" : "generated";
  return { ...item, category, status } as ApplicationItem;
}

function loadLS(): ApplicationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : [])
      .map(normalizeApplication)
      .filter((a): a is ApplicationItem => a !== null);
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      /* 忽略 */
    }
  }
  subs.forEach((cb) => cb(items));
}

export function getApplications(): ApplicationItem[] {
  return items;
}

export function getApplication(id: string): ApplicationItem | undefined {
  return items.find((a) => a.id === id);
}

export function subscribeApplications(cb: (v: ApplicationItem[]) => void) {
  subs.add(cb);
  cb(items);
  return () => {
    subs.delete(cb);
  };
}

function newId(): string {
  return `app_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 当前登录用户 uid（供云端写入显式带 owner，通过 RLS with-check）。 */
export function getUid(): string | null {
  return uid;
}

let profileCache: UserProfile = {};

/** 读取已保存的省份/城市默认填充（来自最近一次申请）。 */
export function getSavedProfile(): UserProfile {
  return profileCache;
}

/** 新增一条申请。status 默认 generated（已生成邮件模板），可传 draft（草稿）。 */
export function addApplication(
  category: ApplicationCategory,
  form: ApplicationForm,
  status: ApplicationStatus = "generated"
): ApplicationItem {
  const now = new Date().toISOString();
  const item: ApplicationItem = {
    id: newId(),
    category,
    status,
    ...form,
    appliedAt: now,
    updatedAt: now,
  };
  items = [item, ...items];
  persist();
  // 仅正式提交时回写省份/城市到 profile（下次表单默认填充）
  if (status !== "draft" && form.province && form.city) {
    profileCache = { province: form.province, city: form.city };
    if (uid) {
      saveCloudProfile(profileCache).catch(() => {});
    } else if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "wollyn:schools:profile",
          JSON.stringify(profileCache)
        );
      } catch {
        /* 忽略 */
      }
    }
  }
  if (uid) saveCloudApplication(item).catch(() => {});
  return item;
}

/** 更新一条申请（草稿继续编辑、状态推进等）。 */
export function updateApplication(id: string, patch: Partial<ApplicationItem>): ApplicationItem | undefined {
  const idx = items.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  const updated: ApplicationItem = {
    ...items[idx],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  items = [updated, ...items.slice(0, idx), ...items.slice(idx + 1)];
  persist();
  if (updated.status !== "draft" && updated.province && updated.city) {
    profileCache = { province: updated.province, city: updated.city };
    if (uid) saveCloudProfile(profileCache).catch(() => {});
  }
  if (uid) saveCloudApplication(updated).catch(() => {});
  return updated;
}

export function removeApplication(id: string) {
  items = items.filter((a) => a.id !== id);
  persist();
  if (uid) deleteCloudApplication(id).catch(() => {});
}

/** 登录后设置 uid 并首合并：云端有则以云端为准，否则把本地申请上传云端。 */
export function setApplicationsUser(next: string | null) {
  uid = next;
  if (!next) return;
  Promise.all([fetchCloudApplications(), fetchCloudProfile()])
    .then(([cloud, profile]) => {
      if (cloud && cloud.length > 0) {
        items = cloud
          .map(normalizeApplication)
          .filter((a): a is ApplicationItem => a !== null);
        persist();
        subs.forEach((cb) => cb(items));
      } else if (items.length > 0) {
        items.forEach((it) => saveCloudApplication(it).catch(() => {}));
      }
      if (profile) profileCache = profile;
      else {
        // 未登录时本地可能缓存了 profile
        try {
          const raw = window.localStorage.getItem("wollyn:schools:profile");
          if (raw) profileCache = JSON.parse(raw);
        } catch {
          /* 忽略 */
        }
      }
    })
    .catch(() => {});
}

export function useApplications(): ApplicationItem[] {
  const [list, setList] = useState(items);
  useEffect(() => subscribeApplications(setList), []);
  return list;
}
