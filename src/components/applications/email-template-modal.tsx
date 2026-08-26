"use client";

import { useState } from "react";
import { Check, Copy, Mail, X } from "lucide-react";
import type { ApplicationItem } from "@/lib/applications";

function buildRecipients(item: ApplicationItem): { text: string; hasEmail: boolean } {
  const emails = item.intendedSchools
    .map((s) => s.email)
    .filter((e): e is string => !!e && e.trim().length > 0);
  return { text: emails.join(", "), hasEmail: emails.length > 0 };
}

export function EmailTemplateModal({
  item,
  onClose,
}: {
  item: ApplicationItem;
  onClose: () => void;
}) {
  const recipients = buildRecipients(item);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    const value = text ?? "";
    if (!value.trim()) return;
    const done = () => {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(done);
    } else {
      done();
    }
  }

  return (
    <div
      className="animate-overlay fixed inset-0 z-[1200] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-fade-up relative max-h-[90vh] w-[560px] max-w-full overflow-y-auto rounded-3xl bg-white shadow-2xl scroll-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stroke/70 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Mail className="h-5 w-5 text-primary" />
            邮件模板
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* 邮件主题 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">邮件主题</span>
              <CopyButton onClick={() => copy(subject, "subject")} active={copied === "subject"} />
            </div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="（待填写，例如：新西兰插班游学申请 — 学生姓名）"
              className="input"
            />
          </div>

          {/* 收件人 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">收件人（意向学校邮箱）</span>
              <CopyButton onClick={() => copy(recipients.text, "to")} active={copied === "to"} />
            </div>
            <textarea readOnly value={recipients.text} rows={2} className="input resize-none" />
            {!recipients.hasEmail && (
              <p className="mt-1 text-xs text-warning">
                未获取到意向学校邮箱，请手动补充收件人后再发送。
              </p>
            )}
          </div>

          {/* 邮件正文 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">邮件正文</span>
              <CopyButton onClick={() => copy(body, "body")} active={copied === "body"} />
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="（待填写，可粘贴学校申请要点：学生信息、游学时间、意向学校等）"
              className="input resize-none"
            />
          </div>

          <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-ink-soft">
            主题与正文均可编辑；复制后粘贴到您的邮箱发送即可。我们会持续补充学校邮箱与模板内容。
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-stroke/70 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="复制"
      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors ${
        active
          ? "border-success/30 bg-success/10 text-success"
          : "border-stroke/70 text-ink-soft hover:border-primary/40 hover:text-primary"
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {active ? "已复制" : "复制"}
    </button>
  );
}
