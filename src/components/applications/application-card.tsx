"use client";

import { useState } from "react";
import { CalendarDays, Mail, Pencil, School, Trash2, Users, X } from "lucide-react";
import {
  getEffectiveStatus,
  studyPeriodToString,
  type ApplicationItem,
} from "@/lib/applications";
import { EmailTemplateModal } from "./email-template-modal";

interface Props {
  item: ApplicationItem;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ApplicationCard({ item, onRemove, onEdit }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const status = getEffectiveStatus(item);
  const statusBadge =
    status === "draft"
      ? { label: "草稿", cls: "border border-ink/20 bg-ink/5 text-ink-soft" }
      : status === "closed"
        ? { label: "已结束", cls: "border border-red-200 bg-red-100 text-red-700" }
        : { label: "已提交", cls: "border border-blue-200 bg-blue-100 text-blue-700" };

  return (
    <>
      <div className="animate-fade-up glass flex flex-col rounded-2xl border border-white/60 p-4 shadow-[--shadow-1]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-base font-semibold text-ink">
            {item.parentTitle || "未填写称呼"}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.cls}`}
          >
            {statusBadge.label}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.email || "—"}</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>{studyPeriodToString(item.studyPeriod)}</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <Users className="h-4 w-4 shrink-0" />
          <span>申请学生 {item.birthDates?.length || 0} 人</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <School className="h-4 w-4 shrink-0" />
          <span>申请学校 {item.intendedSchools?.length || 0} 所</span>
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
            <>
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                className="flex-1 rounded-lg border border-primary/20 py-2 text-sm text-primary transition-colors hover:bg-primary/5"
              >
                查看详情
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  aria-label="编辑"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 text-ink-soft transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </>
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

      {showEmail && (
        <EmailTemplateModal item={item} onClose={() => setShowEmail(false)} />
      )}
    </>
  );
}
