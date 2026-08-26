"use client";

import { useState } from "react";
import { Mail, MapPin, Pencil, Trash2, X } from "lucide-react";
import { CATEGORY_META, type ApplicationItem } from "@/lib/applications";
import { EmailTemplateModal } from "./email-template-modal";

interface Props {
  item: ApplicationItem;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ApplicationCard({ item, onRemove, onEdit }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const categoryLabel = CATEGORY_META[item.category].label;

  return (
    <>
      <div className="animate-fade-up glass flex flex-col rounded-2xl border border-white/60 p-4 shadow-[--shadow-1]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip border border-primary/20 bg-primary/5 text-primary">{categoryLabel}</span>
              {item.parentTitle ? (
                <span className="chip truncate max-w-[140px]">{item.parentTitle}</span>
              ) : null}
              {item.city ? (
                <span className="chip truncate max-w-[140px]">
                  <MapPin className="mr-1 h-3 w-3" />
                  {item.city}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {item.intendedSchools.slice(0, 3).map((s) => (
                <span key={s.name} className="chip truncate max-w-[140px]">
                  {s.name}
                </span>
              ))}
              {item.intendedSchools.length > 3 && (
                <span className="text-xs text-ink-soft">+{item.intendedSchools.length - 3}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {item.email || "—"}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-stroke/60 pt-3">
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
