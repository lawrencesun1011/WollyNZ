"use client";

import { useState } from "react";
import { CalendarDays, Mail, Pencil, School, Trash2, Users } from "lucide-react";
import {
  APPLICATION_STATUS_META,
  getEffectiveStatus,
  studyPeriodToString,
  updateApplication,
  type ApplicationItem,
} from "@/lib/applications";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmailTemplateModal } from "./email-template-modal";

interface Props {
  item: ApplicationItem;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ApplicationCard({ item, onRemove, onEdit }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const status = getEffectiveStatus(item);
  const statusMeta = APPLICATION_STATUS_META[status];

  return (
    <>
      <div className="animate-fade-up flex flex-col rounded-surface border border-(--color-rule)/50 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-base font-semibold text-ink">
            {item.parentTitle || "未填写称呼"}
          </h3>
          <StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge>
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
          <span>申请学生 {item.students?.length || 0} 人</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <School className="h-4 w-4 shrink-0" />
          <span>申请学校 {item.intendedSchools?.length || 0} 所</span>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-stroke/60 pt-3">
          {status === "closed" ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="flex-1 rounded-control border border-(--color-rule)/50 py-2 text-sm text-ink transition-colors hover:bg-(--color-paper-hover)"
            >
              查看详情
            </button>
          ) : item.status === "draft" && onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(item.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-control bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Pencil className="h-3.5 w-3.5" />
              继续编辑
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                className="flex-1 rounded-control border border-(--color-rule)/50 py-2 text-sm text-ink transition-colors hover:bg-(--color-paper-hover)"
              >
                查看详情
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  aria-label="编辑"
                  className="flex h-9 w-9 items-center justify-center rounded-control border border-(--color-rule)/50 text-ink-soft transition-colors hover:bg-(--color-paper-hover) hover:text-ink"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          {status !== "closed" && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label="移除申请"
              className="flex h-9 w-9 items-center justify-center rounded-control border border-(--color-rule)/50 text-ink-soft transition-colors hover:bg-(--color-paper-hover) hover:text-(--color-accent)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showEmail && (
        <EmailTemplateModal
          item={item}
          onClose={(subject, body) => {
            updateApplication(item.id, { emailSubject: subject, emailBody: body });
            setShowEmail(false);
          }}
        />
      )}
    </>
  );
}
