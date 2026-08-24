"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Sparkles, Clock, Inbox, Pencil } from "lucide-react";
import { useApplications, removeApplication, type ApplicationCategory } from "@/lib/applications";
import { ApplicationCard } from "@/components/applications/application-card";

type Tab = ApplicationCategory;

// 幼儿园在前、中小学在后
const TABS: { key: Tab; label: string }[] = [
  { key: "ece", label: "幼儿园" },
  { key: "school", label: "中小学" },
];

function isClosed(status: string) {
  return status === "accepted" || status === "rejected";
}

export default function MyApplicationsPage() {
  const all = useApplications();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ece");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(
    () => all.filter((a) => a.category === tab),
    [all, tab]
  );
  const drafts = filtered.filter((a) => a.status === "draft");
  const active = filtered.filter((a) => !isClosed(a.status) && a.status !== "draft");
  const history = filtered.filter((a) => isClosed(a.status));

  const ecePlaceholder = false;

  function handleAdd() {
    router.push(`/apply?category=${tab}`);
  }

  function handleEdit(id: string) {
    const it = all.find((a) => a.id === id);
    if (it) router.push(`/apply?category=${it.category}&editId=${id}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 标题 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">我的申请</h1>
          <p className="mt-1 text-sm text-ink-soft">
            管理您的孩子在新西兰的游学申请，实时查看流程进度
          </p>
        </div>
        {(
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[--shadow-1] transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            新增申请
          </button>
        )}
      </div>

      {/* 分类 Tab：幼儿园在前 */}
      <div className="mt-5 inline-flex rounded-2xl border border-stroke bg-white/70 p-1 text-sm shadow-[--shadow-1]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 transition-colors ${
              tab === t.key ? "bg-primary text-white" : "text-ink-soft hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 列表 / 空态 */}
      {!mounted ? null : (
        <div className="mt-6 space-y-8">
          {filtered.length === 0 ? (
            <EmptyState tab={tab} onAdd={handleAdd} />
          ) : (
            <>
              {/* 草稿（可继续编辑） */}
              {drafts.length > 0 && (
                <Section title={`草稿（${drafts.length}）`} icon={<Pencil className="h-4 w-4" />}>
                  <Grid>
                    {drafts.map((a) => (
                      <ApplicationCard
                        key={a.id}
                        item={a}
                        onRemove={removeApplication}
                        onEdit={handleEdit}
                      />
                    ))}
                  </Grid>
                </Section>
              )}

              {/* 进行中 */}
              <Section title={`进行中（${active.length}）`} icon={<Clock className="h-4 w-4" />}>
                {active.length === 0 ? (
                  <p className="text-sm text-ink-soft">暂无进行中的申请</p>
                ) : (
                  <Grid>
                    {active.map((a) => (
                      <ApplicationCard key={a.id} item={a} onRemove={removeApplication} />
                    ))}
                  </Grid>
                )}
              </Section>

              {/* 历史 */}
              {history.length > 0 && (
                <Section title={`历史申请（${history.length}）`} icon={<FileText className="h-4 w-4" />}>
                  <Grid>
                    {history.map((a) => (
                      <ApplicationCard key={a.id} item={a} onRemove={removeApplication} />
                    ))}
                  </Grid>
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  return (
    <div className="animate-fade-up mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-stroke bg-white/50 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Inbox className="h-7 w-7" />
      </div>
      <p className="text-base font-semibold text-ink">还没有申请记录</p>
      <p className="max-w-sm text-sm text-ink-soft">
        填写申请，我们会为你开启新西兰{tab === "ece" ? "幼儿园" : "中小学"}申请并跟进进度。
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          新增申请
        </button>
        <Link
          href={tab === "ece" ? "/ece" : "/schools"}
          className="flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          <Sparkles className="h-4 w-4" />
          去{tab === "ece" ? "幼儿园" : "学校库"}看看
        </Link>
      </div>
    </div>
  );
}
