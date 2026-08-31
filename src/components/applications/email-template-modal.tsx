"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail, RefreshCw, X } from "lucide-react";
import type { ApplicationItem } from "@/lib/applications";

function buildRecipients(item: ApplicationItem): { text: string; hasEmail: boolean } {
  const emails = item.intendedSchools
    .map((s) => s.email)
    .filter((e): e is string => !!e && e.trim().length > 0);
  return { text: emails.join(", "), hasEmail: emails.length > 0 };
}

interface Props {
  item: ApplicationItem;
  /** 关闭时回传当前主题/正文（以用户改动为准，由调用方保存）。 */
  onClose: (subject: string, body: string) => void;
}

export function EmailTemplateModal({ item, onClose }: Props) {
  const recipients = buildRecipients(item);
  const [subject, setSubject] = useState(item.emailSubject ?? "");
  const [body, setBody] = useState(item.emailBody ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function generateEmail(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
        signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "生成失败，请稍后重试");
      setSubject(data.subject ?? "");
      setBody(data.body ?? "");
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setError((e as { message?: string })?.message || "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  // 打开弹窗且无已保存内容时自动生成邮件。
  // 这是「挂载即网络请求」的有意副作用：结果来自异步 API，无法用 state 派生替代；
  // 在不引入数据获取层（SWR / React Query 等）的前提下，保留 effect 触发是唯一合理做法。
  useEffect(() => {
    if (item.emailSubject || item.emailBody) return;
    const ctrl = new AbortController();
    // 挂载即网络请求：结果来自异步 API，无法用 state 派生替代
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void generateEmail(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

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
      onClick={() => onClose(subject, body)}
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
            onClick={() => onClose(subject, body)}
            aria-label="关闭"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* 生成状态提示 */}
          {loading && (
            <p className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在生成邮件模板…
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-error/5 px-3 py-2 text-xs text-error">{error}</p>
          )}

          {/* 邮件主题 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">邮件主题</span>
              <CopyButton onClick={() => copy(subject, "subject")} active={copied === "subject"} />
            </div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="（AI 生成中…可手动填写，例如：新西兰插班游学申请）"
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
            <p className="mt-1 text-xs text-red-500">
              重要！请不要直接群发邮件，QQ邮箱请开启右上角“<strong className="font-bold">分别发送</strong>”， 163邮箱请开启右上角“<strong className="font-bold">群发单显</strong>”，其它邮箱请使用类似功能
            </p>
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
              placeholder="（AI 生成中…可手动填写）"
              className="input resize-none"
            />
          </div>

          <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs font-bold text-black">
            主题与正文由 AI 生成，请仔细检查是否符合预期，可直接编辑修改；确认后复制粘贴到您的邮箱发送即可。
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-stroke/70 px-5 py-4">
          <button
            type="button"
            onClick={() => void generateEmail()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-primary/20 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            重新生成
          </button>
          <button
            type="button"
            onClick={() => onClose(subject, body)}
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
