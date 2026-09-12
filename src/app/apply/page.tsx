"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
    router.push(`/my-applications?tab=${category}`);
  }

  return (
    <div className="accom-editorial min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-(--width-form) py-8 md:py-12 px-(--page-gutter)">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-h1 font-bold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          <button
            type="button"
            onClick={back}
            className="flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-(--color-accent)"
          >
            <ChevronLeft className="h-4 w-4" />
            返回学校申请
          </button>
        </div>

        <div className="rounded-surface border border-(--color-rule)/50 bg-white p-6 shadow-sm md:p-10">
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
