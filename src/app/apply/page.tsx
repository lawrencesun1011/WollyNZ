"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { ApplicationForm } from "@/components/applications/application-form";
import type { ApplicationCategory } from "@/lib/applications";

function ApplyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("category");
  const editId = params.get("editId") ?? undefined;
  const category: ApplicationCategory = raw === "ece" ? "ece" : "school";
  const title = editId ? "编辑申请" : category === "ece" ? "幼儿园申请" : "中小学申请";

  function back() {
    router.push("/my-applications");
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-5xl px-6 py-8 md:px-10 md:py-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-ink md:text-2xl">{title}</h1>
          </div>
          <button
            type="button"
            onClick={back}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            返回我的申请
          </button>
        </div>

        <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm md:p-10">
          <ApplicationForm
            category={category}
            editId={editId}
            onDone={() => back()}
            onCancel={back}
          />
        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={null}>
      <ApplyInner />
    </Suspense>
  );
}
