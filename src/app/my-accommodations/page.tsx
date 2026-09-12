"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Mail, History } from "lucide-react";
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
import { primaryBtnSmCls } from "@/components/form-ui";
import { EmptyState as UiEmptyState, LoadingState as UiLoadingState } from "@/components/ui/states";

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

  // 列表为空（未登录 / 空态）时，头部新建按钮与中间空态卡片按钮重复，故仅在已有意向时显示
  const showHeaderAdd = authReady && !!user && hasAny;

  function handleAdd() {
    router.push("/apply/accommodation");
  }

  return (
    <div className="accom-editorial min-h-screen bg-bg">
      <div className="mx-auto max-w-(--width-content) py-8 pb-16 px-(--page-gutter)">
      {/* 标题 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold leading-tight tracking-tight text-ink">
            我的住宿意向
          </h1>
          <p className="mt-2 text-lg text-ink-soft">
            管理您在新西兰的住宿意向，提交后我们将为您匹配合作物业房源
          </p>
        </div>
        {showHeaderAdd && (
          <button
            type="button"
            onClick={handleAdd}
            className={`${primaryBtnSmCls} shadow-md`}
          >
            <Plus className="h-4 w-4" />
            新建意向
          </button>
        )}
      </div>

      {/* 未登录：登录墙（与空态同款卡片，不展示意向列表）；邮箱验证放在新建意向流程中 */}
      {!authReady ? (
        <LoadingState />
      ) : !user ? (
        <LoginWall onAdd={handleAdd} />
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
              <UiEmptyState className="py-4">暂无已提交的意向</UiEmptyState>
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
        <span className="text-ink">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** 登录态恢复中：避免已登录用户闪一下空态 */
function LoadingState() {
  return <UiLoadingState label="正在确认登录状态…" className="mt-6 py-16" />;
}

/** 未登录时的墙：与空态同款卡片，保留“新建意向”按钮（走邮箱验证），不展示意向列表 */
function LoginWall({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="animate-fade-up mt-6 flex flex-col items-center gap-3 rounded-surface border border-dashed border-(--color-rule)/50 bg-white/60 px-6 py-16 text-center">
      <svg
        className="h-16 w-16 text-ink"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="6" y="14" width="52" height="36" rx="4" />
        <path d="M6 18l26 20 26-20" />
      </svg>
      <p className="text-2xl font-semibold text-ink">还没有住宿意向</p>
      <p className="max-w-sm text-lg text-ink-soft">
        填写住宿需求，我们会为您匹配合作的物业公司房源，如有合适房源将主动联系您。
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className={primaryBtnSmCls}
        >
          <Plus className="h-4 w-4" />
          新建意向
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="animate-fade-up mt-6 flex flex-col items-center gap-3 rounded-surface border border-dashed border-(--color-rule)/50 bg-white/60 px-6 py-16 text-center">
      <svg
        className="h-16 w-16 text-ink"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="6" y="14" width="52" height="36" rx="4" />
        <path d="M6 18l26 20 26-20" />
      </svg>
      <p className="text-2xl font-semibold text-ink">还没有住宿意向</p>
      <p className="max-w-sm text-lg text-ink-soft">
        填写住宿需求，我们会为您匹配合作的物业公司房源，如有合适房源将主动联系您。
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className={primaryBtnSmCls}
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
