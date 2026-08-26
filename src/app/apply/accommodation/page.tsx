"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useAuthBridge } from "@/lib/auth-init";
import { AccommodationForm } from "@/components/accommodations/accommodation-form";

function ApplyAccommodationInner() {
  const router = useRouter();
  const params = useSearchParams();
  const draftId = params.get("draft") || undefined;
  useAuthBridge();

  const title = draftId ? "编辑住宿意向" : "填写住宿意向";

  function back() {
    router.push("/my-accommodations");
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
            返回住宿意向
          </button>
        </div>

        <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm md:p-10">
          <p className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-ink-soft">
            提交您的需求后，我们会匹配合作的物业公司资源；如有合适房源，将主动与您联系。
          </p>
          <AccommodationForm
            draftId={draftId}
            onSubmitted={() => router.push("/my-accommodations")}
            onCancel={back}
          />
        </div>
      </div>
    </div>
  );
}

export default function ApplyAccommodationPage() {
  return (
    <Suspense fallback={null}>
      <ApplyAccommodationInner />
    </Suspense>
  );
}
