"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Sparkles, Inbox, Pencil, Mail, History, LogIn } from "lucide-react";
import { useApplications, removeApplication, getEffectiveStatus, type ApplicationCategory } from "@/lib/applications";
import { ApplicationCard } from "@/components/applications/application-card";
import { useAuthUser, useAuthReady } from "@/lib/auth";
import { useAuthBridge } from "@/lib/auth-init";

type Tab = ApplicationCategory;

// 幼儿园在前、中小学在后
const TABS: { key: Tab; label: string }[] = [
  { key: "ece", label: "幼儿园" },
  { key: "school", label: "中小学" },
];

function MyApplicationsInner() {
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get("tab") === "school" ? "school" : "ece";
  const all = useApplications();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const user = useAuthUser();
  const authReady = useAuthReady();
  useAuthBridge();

  const filtered = useMemo(
    () => all.filter((a) => a.category === tab),
    [all, tab]
  );
  const drafts = filtered.filter((a) => getEffectiveStatus(a) === "draft");
  const generated = filtered.filter((a) => getEffectiveStatus(a) === "generated");
  const history = filtered.filter((a) => getEffectiveStatus(a) === "closed");

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
          <h1 className="text-2xl font-bold text-ink">我的学校申请</h1>
          <p className="mt-1 text-sm text-ink-soft">
            管理您在新西兰的游学申请，可生成邮件模板直接联系学校
          </p>
        </div>
        {user && (
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

      {/* 列表 / 空态：仅登录态可见（含草稿）；未登录显示登录墙 */}
      {!authReady ? (
        <LoadingState />
      ) : !user ? (
        <LoginWall desc="登录后即可查看你的学校申请记录（含草稿）。新建申请时也需要先验证邮箱。" />
      ) : (
        <div className="mt-6 space-y-8">
          {filtered.length === 0 || (drafts.length === 0 && generated.length === 0 && history.length === 0) ? (
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

              {/* 已提交 */}
              <Section title={`已提交（${generated.length}）`} icon={<Mail className="h-4 w-4" />}>
                {generated.length === 0 ? (
                  <p className="text-sm text-ink-soft">暂无已生成的申请</p>
                ) : (
                  <Grid>
                    {generated.map((a) => (
                      <ApplicationCard key={a.id} item={a} onRemove={removeApplication} onEdit={handleEdit} />
                    ))}
                  </Grid>
                )}
              </Section>

              {/* 历史（已结束） */}
              {history.length > 0 && (
                <Section title={`历史（${history.length}）`} icon={<History className="h-4 w-4" />}>
                  <Grid>
                    {history.map((a) => (
                      <ApplicationCard key={a.id} item={a} onRemove={removeApplication} onEdit={handleEdit} />
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

/** 未登录时的登录引导（不展示任何本地记录，含草稿） */
function LoginWall({ desc }: { desc: string }) {
  return (
    <div className="animate-fade-up mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-stroke bg-white/50 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <LogIn className="h-7 w-7" />
      </div>
      <p className="text-base font-semibold text-ink">登录后查看</p>
      <p className="max-w-sm text-sm text-ink-soft">{desc}</p>
      <Link
        href="/login"
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
      >
        <Mail className="h-4 w-4" />
        注册 / 登录
      </Link>
    </div>
  );
}

/** 登录态恢复中：此时不能判定为未登录，避免已登录用户闪一下登录墙 */
function LoadingState() {
  return (
    <div className="mt-6 flex items-center justify-center py-16 text-sm text-ink-soft">
      正在确认登录状态…
    </div>
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
        填写申请，我们会为你生成邮件模板，方便直接联系新西兰{tab === "ece" ? "幼儿园" : "中小学"}。
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
          去找{tab === "ece" ? "幼儿园" : "中小学"}看看
        </Link>
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <MyApplicationsInner />
    </Suspense>
  );
}
