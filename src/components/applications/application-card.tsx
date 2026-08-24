"use client";

import { useState } from "react";
import { CalendarDays, GraduationCap, Trash2, X, Mail, User, Pencil } from "lucide-react";
import {
  STATUS_META,
  studyPeriodToString,
  exactToString,
  type ApplicationItem,
} from "@/lib/applications";

interface Props {
  item: ApplicationItem;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ApplicationCard({ item, onRemove, onEdit }: Props) {
  const [detail, setDetail] = useState(false);
  const status = STATUS_META[item.status];

  return (
    <>
      <div className="animate-fade-up glass flex flex-col rounded-2xl border border-white/60 p-4 shadow-[--shadow-1]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {item.intendedSchools.slice(0, 3).map((s) => (
                <span key={s.name} className="chip truncate max-w-[140px]">
                  {s.name}
                </span>
              ))}
              {item.intendedSchools.length > 3 && (
                <span className="text-xs text-ink-soft">+{item.intendedSchools.length - 3}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {item.province ? `${item.province} · ${item.city}` : "城市未填"}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-1.5 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {studyPeriodToString(item.studyPeriod)}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" />
            出生 {exactToString(item.birthDate) || "—"}
          </span>
          {item.assists.length > 0 && (
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              协助：{item.assists.join("、")}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-stroke/60 pt-3">
          {item.status === "draft" && onEdit ? (
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
            aria-label="移除申请"
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
            className="animate-fade-up relative max-h-[90vh] w-[440px] max-w-full overflow-y-auto rounded-3xl bg-white shadow-2xl scroll-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stroke/70 px-5 py-4">
              <h3 className="text-lg font-bold text-ink">申请详情</h3>
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
                <span className="flex items-center gap-1.5 text-ink"><Mail className="h-3.5 w-3.5" />{item.email}</span>
              </Row>
              <Row label="学生出生日期">{exactToString(item.birthDate) || "—"}</Row>
              <Row label="所在城市">{item.province ? `${item.province} · ${item.city}` : "—"}</Row>
              <Row label="计划游学时间">{studyPeriodToString(item.studyPeriod)}</Row>
              <Row label="意向学校">
                <div className="flex flex-wrap justify-end gap-1.5">
                  {item.intendedSchools.map((s) => (
                    <span key={s.name} className="chip">{s.name}</span>
                  ))}
                </div>
              </Row>
              <Row label="希望得到的协助">
                {item.assists.length ? item.assists.join("、") : "—"}
              </Row>
              <Row label="其他诉求">{item.notes || "—"}</Row>
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
