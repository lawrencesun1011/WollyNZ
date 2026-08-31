"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Inbox, Pencil, Mail, History, LogIn } from "lucide-react";
import { useAuthBridge } from "@/lib/auth-init";
import { useAuthUser, useAuthReady } from "@/lib/auth";
import {
  getAccommodation,
  getEffectiveStatus,
  removeAccommodation,
  subscribeAccommodation,
  type AccommodationItem,
} from "@/lib/accommodation";
import { AccommodationCard } from "@/components/accommodations/accommodation-card";

function MyAccommodationsInner() {
  const router = useRouter();
  const [items, setItems] = useState<AccommodationItem[]>([]);
  const user = useAuthUser();
  const authReady = useAuthReady();
  useAuthBridge();

  useEffect(() => {
    const sync = () => setItems([...getAccommodation()]);
    sync();
    return subscribeAccommodation(sync);
  }, []);

  const drafts = useMemo(() => items.filter((i) => getEffectiveStatus(i) === "draft"), [items]);
  const active = useMemo(() => items.filter((i) => getEffectiveStatus(i) === "submitted"), [items]);
  const history = useMemo(() => items.filter((i) => getEffectiveStatus(i) === "closed"), [items]);
  const hasAny = items.length > 0;

  function handleAdd() {
    router.push("/apply/accommodation");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 标题 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">我的住宿意向</h1>
          <p className="mt-1 text-sm text-ink-soft">
            管理您在新西兰的住宿意向，提交后我们将为您匹配合作物业房源
          </p>
        </div>
        {user && (
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[--shadow-1] transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            新建意向
          </button>
        )}
      </div>

      {/* 列表 / 空态：仅登录态可见（含草稿）；未登录显示登录墙 */}
      {!authReady ? (
        <LoadingState />
      ) : !user ? (
        <LoginWall desc="登录后即可查看你的住宿意向记录（含草稿）。提交住宿意向时也需要先验证邮箱。" />
      ) : !hasAny ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <div className="mt-6 space-y-8">
          {drafts.length > 0 && (
            <Section title={`草稿（${drafts.length}）`} icon={<Pencil className="h-4 w-4" />}>
              <Grid>
                {drafts.map((it) => (
                  <AccommodationCard
                    key={it.id}
                    item={it}
                    onRemove={(id) => removeAccommodation(id)}
                    onEdit={(id) => router.push(`/apply/accommodation?draft=${id}`)}
                  />
                ))}
              </Grid>
            </Section>
          )}

          {/* 已提交 */}
          <Section title={`已提交（${active.length}）`} icon={<Mail className="h-4 w-4" />}>
            {active.length === 0 ? (
              <p className="text-sm text-ink-soft">暂无已提交的意向</p>
            ) : (
              <Grid>
                {active.map((it) => (
                  <AccommodationCard key={it.id} item={it} onRemove={(id) => removeAccommodation(id)} />
                ))}
              </Grid>
            )}
          </Section>

          {history.length > 0 && (
            <Section title={`历史（${history.length}）`} icon={<History className="h-4 w-4" />}>
              <Grid>
                {history.map((it) => (
                  <AccommodationCard key={it.id} item={it} onRemove={(id) => removeAccommodation(id)} />
                ))}
              </Grid>
            </Section>
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="animate-fade-up mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-stroke bg-white/50 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Inbox className="h-7 w-7" />
      </div>
      <p className="text-base font-semibold text-ink">还没有住宿意向</p>
      <p className="max-w-sm text-sm text-ink-soft">
        填写住宿需求，我们会为您匹配合作的物业公司房源，如有合适房源将主动联系您。
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          新建意向
        </button>
      </div>
    </div>
  );
}

export default function MyAccommodationsPage() {
  return (
    <Suspense fallback={null}>
      <MyAccommodationsInner />
    </Suspense>
  );
}
