"use client";

import { useState } from "react";
import { Baby, Bath, Bed, CalendarDays, CircleDollarSign, Home, Mail, Pencil, Trash2, Users, X } from "lucide-react";
import {
  ACCOMMODATION_STATUS_META,
  getEffectiveStatus,
  type AccommodationItem,
} from "@/lib/accommodation";

function formatDate(d: string) {
  if (!d) return "";
  const t = new Date(d);
  return `${t.getFullYear()}年${t.getMonth() + 1}月${t.getDate()}日`;
}

interface Props {
  item: AccommodationItem;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function AccommodationCard({ item, onRemove, onEdit }: Props) {
  const [detail, setDetail] = useState(false);
  const status = ACCOMMODATION_STATUS_META[getEffectiveStatus(item)];

  return (
    <>
      <div className="animate-fade-up glass flex flex-col rounded-2xl border border-white/60 p-4 shadow-[--shadow-1]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-base font-semibold text-ink">
            {item.name || "未填写称呼"}
          </h3>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.email || "—"}</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>
            {item.moveInDate && item.moveOutDate
              ? `${formatDate(item.moveInDate)} — ${formatDate(item.moveOutDate)}`
              : "入住时间未填"}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <Users className="h-4 w-4 shrink-0" />
          <span>{item.adults ?? "—"} 成人</span>
          <span>·</span>
          <Baby className="h-4 w-4 shrink-0" />
          <span>{item.children ?? "—"} 儿童</span>
        </div>

        <div className="mt-2 flex items-center gap-3 text-sm text-ink-soft">
          <span className="flex items-center gap-2">
            <Bed className="h-4 w-4 shrink-0" />
            {item.bedrooms || "—"} 卧室
          </span>
          <span>·</span>
          <span className="flex items-center gap-2">
            <Bath className="h-4 w-4 shrink-0" />
            {item.bathrooms || "—"} 洗手间
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <CircleDollarSign className="h-4 w-4 shrink-0" />
          <span>${item.budgetMin ?? "—"}-${item.budgetMax ?? "—"}/周</span>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-stroke/60 pt-3">
          {getEffectiveStatus(item) === "draft" && onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(item.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Pencil className="h-3.5 w-3.5" />
              继续编辑
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDetail(true)}
              className="flex-1 rounded-lg border border-primary/20 py-2 text-sm text-primary transition-colors hover:bg-primary/5"
            >
              查看详情
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label="移除意向"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 text-ink-soft transition-colors hover:bg-error/5 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {detail && (
        <div
          className="animate-overlay fixed inset-0 z-[1200] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={() => setDetail(false)}
        >
          <div
            className="animate-fade-up relative max-h-[90vh] w-[460px] max-w-full overflow-y-auto rounded-3xl bg-white shadow-2xl scroll-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stroke/70 px-5 py-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                <Home className="h-5 w-5 text-primary" />
                住宿意向详情
              </h3>
              <button
                type="button"
                onClick={() => setDetail(false)}
                aria-label="关闭"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5 text-sm">
              <Row label="系统状态">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </Row>
              <Row label="联系邮箱">
                <span className="flex items-center gap-1.5 text-ink">
                  <Mail className="h-3.5 w-3.5" />
                  {item.email || "—"}
                </span>
              </Row>
              {item.name && <Row label="联系人">{item.name}</Row>}
              <Row label="入住 / 退房">
                {item.moveInDate && item.moveOutDate
                  ? `${formatDate(item.moveInDate)} — ${formatDate(item.moveOutDate)}`
                  : "—"}
              </Row>
              <Row label="人数">
                {item.adults != null ? `${item.adults} 成人` : "—"}
                {item.children != null && item.children > 0
                  ? ` · ${item.children} 儿童`
                  : ""}
              </Row>
              {item.children != null && item.children > 0 && item.childAges && item.childAges.length > 0 && (
                <Row label="儿童年龄">{item.childAges.slice(0, item.children).join("、")} 岁</Row>
              )}
              <Row label="卧室 / 洗手间">
                {item.bedrooms ? `${item.bedrooms} 卧室` : "—"}
                {item.bathrooms ? ` · ${item.bathrooms} 洗手间` : ""}
              </Row>
              <Row label="周租金预算">
                {item.budgetMin != null && item.budgetMax != null
                  ? `NZD ${item.budgetMin} — ${item.budgetMax}`
                  : "—"}
              </Row>
              <Row label="意向区域">{item.area || "—"}</Row>
              <Row label="房屋类型">
                {item.propertyTypes && item.propertyTypes.length
                  ? item.propertyTypes.join("、")
                  : "—"}
              </Row>
              <Row label="其它需求">{item.needs && item.needs.length ? item.needs.join("、") : "—"}</Row>
              <Row label="补充说明">{item.notes || "—"}</Row>
              <Row label="提交时间">{new Date(item.appliedAt).toLocaleString("zh-CN")}</Row>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stroke/50 pb-3 last:border-0">
      <span className="shrink-0 text-ink-soft">{label}</span>
      <span className="text-right text-ink">{children}</span>
    </div>
  );
}
