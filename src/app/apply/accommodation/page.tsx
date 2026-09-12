"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
            返回住宿意向
          </button>
        </div>

        <div className="rounded-surface border border-(--color-rule)/50 bg-white p-6 shadow-sm md:p-10">
          <p className="mb-6 rounded-surface border border-(--color-rule)/40 bg-white px-4 py-3 text-sm text-ink-soft">
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
