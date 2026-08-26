"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Inbox, Pencil } from "lucide-react";
import { useAuthBridge } from "@/lib/auth-init";
import {
  getAccommodation,
  isActiveAccommodation,
  removeAccommodation,
  subscribeAccommodation,
  type AccommodationItem,
} from "@/lib/accommodation";
import { AccommodationCard } from "@/components/accommodations/accommodation-card";

function MyAccommodationsInner() {
  const router = useRouter();
  const [items, setItems] = useState<AccommodationItem[]>([]);
  useAuthBridge();

  useEffect(() => {
    const sync = () => setItems([...getAccommodation()]);
    sync();
    return subscribeAccommodation(sync);
  }, []);

  const drafts = useMemo(() => items.filter((i) => i.status === "draft"), [items]);
  const active = useMemo(() => items.filter((i) => isActiveAccommodation(i.status)), [items]);
  const history = useMemo(() => items.filter((i) => i.status === "closed"), [items]);
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
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[--shadow-1] transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          新建意向
        </button>
      </div>

      {/* 列表 / 空态 */}
      {!hasAny ? (
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

          {active.length > 0 && (
            <Section title={`进行中（${active.length}）`} icon={<Inbox className="h-4 w-4" />}>
              <Grid>
                {active.map((it) => (
                  <AccommodationCard key={it.id} item={it} onRemove={(id) => removeAccommodation(id)} />
                ))}
              </Grid>
            </Section>
          )}

          {history.length > 0 && (
            <Section title={`历史（${history.length}）`} icon={<Inbox className="h-4 w-4" />}>
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
