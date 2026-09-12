"use client";

import { saveCloudAccommodation, fetchCloudAccommodation } from "./user-data";
import type { StatusTone } from "./status";

export type AccommodationStatus = "draft" | "submitted" | "closed" | "deleted";

/** 状态文案 + 语气（tone）；具体配色由 `components/ui/status-badge.tsx` 统一决定。 */
export const ACCOMMODATION_STATUS_META: Record<
  AccommodationStatus,
  { label: string; tone: StatusTone }
> = {
  draft: { label: "草稿", tone: "draft" },
  submitted: { label: "已提交", tone: "active" },
  closed: { label: "已结束", tone: "muted" },
  deleted: { label: "已删除", tone: "muted" },
};

/** 已提交后超过入住开始时间 30 天视为已结束。 */
export function getEffectiveStatus(item: AccommodationItem): AccommodationStatus {
  if (item.status === "submitted") {
    const start = item.moveInDate
      ? new Date(item.moveInDate).getTime()
      : new Date(item.appliedAt).getTime();
    const expiredAt = start + 30 * 24 * 60 * 60 * 1000;
    if (Date.now() > expiredAt) return "closed";
  }
  return item.status;
}

/** 是否为“进行中”（已提交且未过期）。 */
export function isActiveAccommodation(s: AccommodationStatus): boolean {
  return s === "submitted";
}

export const ACCOMMODATION_NEEDS_OPTIONS = [
  "家具齐全",
  "可养宠物",
  "有停车位",
  "高速网络",
  "近学校",
  "近公交",
  "独立出入",
  "带花园",
];

export interface AccommodationForm {
  email: string; // 联系邮箱
  name: string; // 联系人姓名
  moveInDate: string; // 大致入住时间（YYYY-MM-DD）
  moveOutDate: string; // 大致退房时间（YYYY-MM-DD）
  hasValidVisa?: boolean | null; // 入住期间是否具有合法签证（是/否）
  adults: number; // 成人数
  children: number; // 儿童数
  childAges: string[]; // 每个儿童的年龄（<1, 1..17）
  bedrooms: string; // 卧室数（1+ .. 6+）
  bathrooms: string; // 洗手间数（1+ .. 4+）
  budgetMin: number; // 周租金预算下限（NZD）
  budgetMax: number; // 周租金预算上限（NZD）
  area: string; // 意向区域
  propertyTypes: string[]; // 房屋类型（多选）
  needs?: string[]; // 其它可选需求（图片标签）
  notes?: string; // 补充说明
}

export interface AccommodationItem extends AccommodationForm {
  id: string;
  status: AccommodationStatus;
  appliedAt: string;
  updatedAt: string;
}

const LS_KEY = "goalnz:accommodation";

interface State {
  items: AccommodationItem[];
  uid: string | null;
  loaded: boolean;
}

const state: State = { items: [], uid: null, loaded: false };
const subs = new Set<() => void>();

function emit() {
  subs.forEach((cb) => cb());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state.items));
  } catch {
    /* ignore */
  }
}

function loadLocal() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    state.items = raw ? (JSON.parse(raw) as AccommodationItem[]) : [];
  } catch {
    state.items = [];
  }
}

export function subscribeAccommodation(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function getAccommodation(): AccommodationItem[] {
  return state.items;
}

export function getAccommodationById(id: string): AccommodationItem | undefined {
  return state.items.find((i) => i.id === id);
}

/** 登录态切换：登录后拉取云端并覆盖本地；登出后退回本地兜底。 */
export function setAccommodationUser(uid: string | null) {
  const changed = state.uid !== uid;
  state.uid = uid;
  loadLocal();
  if (uid) {
    fetchCloudAccommodation()
      .then((cloud) => {
        if (cloud && cloud.length > 0) {
          state.items = cloud;
          persist();
          emit();
        } else {
          // 云端为空：把本地草稿推上去
          state.items.forEach((it) => saveCloudAccommodation(it).catch(() => {}));
        }
      })
      .catch(() => {});
  }
  if (changed) emit();
  state.loaded = true;
}

export function addAccommodation(form: AccommodationForm, status: AccommodationStatus): AccommodationItem {
  const now = new Date().toISOString();
  const item: AccommodationItem = {
    ...form,
    id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status,
    appliedAt: now,
    updatedAt: now,
  };
  state.items = [item, ...state.items];
  persist();
  emit();
  if (state.uid) saveCloudAccommodation(item).catch(() => {});
  return item;
}

export function updateAccommodation(id: string, patch: Partial<AccommodationForm>, status?: AccommodationStatus) {
  let updated: AccommodationItem | undefined;
  state.items = state.items.map((it) => {
    if (it.id !== id) return it;
    updated = { ...it, ...patch, status: status ?? it.status, updatedAt: new Date().toISOString() };
    return updated;
  });
  persist();
  emit();
  if (updated && state.uid) saveCloudAccommodation(updated).catch(() => {});
  return updated;
}

/**
 * 删除住宿意向（软删除）：数据库保留留档，仅把状态置为 deleted，不再真正删除行。
 * 前端按状态过滤，deleted 项不会展示，但审核后台可按 status 筛选到。
 */
export function removeAccommodation(id: string) {
  let updated: AccommodationItem | undefined;
  state.items = state.items.map((it) => {
    if (it.id !== id) return it;
    updated = { ...it, status: "deleted", updatedAt: new Date().toISOString() };
    return updated;
  });
  persist();
  emit();
  // 软删除：云端保留留档，仅把状态更新为 deleted（不再调用 DELETE 真正删行）
  if (updated && state.uid) saveCloudAccommodation(updated).catch(() => {});
}

/** 登录合并：用云端数据覆盖本地。 */
export function applyCloudAccommodation(items: AccommodationItem[]) {
  state.items = items;
  persist();
  emit();
}

export function resetAccommodation() {
  state.items = [];
  persist();
  emit();
}
