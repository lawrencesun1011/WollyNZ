"use client";

import { saveCloudAccommodation, fetchCloudAccommodation, deleteCloudAccommodation } from "./user-data";

export type AccommodationStatus =
  | "draft"
  | "submitted"
  | "matching"
  | "recommended"
  | "closed";

export const ACCOMMODATION_STATUS_META: Record<
  AccommodationStatus,
  { label: string; className: string }
> = {
  draft: { label: "草稿", className: "bg-ink/10 text-ink-soft" },
  submitted: { label: "已提交", className: "bg-primary/10 text-primary" },
  matching: { label: "匹配中", className: "bg-amber-100 text-amber-700" },
  recommended: { label: "已推荐房源", className: "bg-emerald-100 text-emerald-700" },
  closed: { label: "已结束", className: "bg-ink/10 text-ink-soft" },
};

/** 是否为“进行中”状态（参与匹配/已推荐）。 */
export function isActiveAccommodation(s: AccommodationStatus): boolean {
  return s === "submitted" || s === "matching" || s === "recommended";
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

export function removeAccommodation(id: string) {
  state.items = state.items.filter((it) => it.id !== id);
  persist();
  emit();
  if (state.uid) deleteCloudAccommodation(id).catch(() => {});
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
