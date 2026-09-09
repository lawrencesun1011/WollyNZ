import { Loader2 } from "lucide-react";

export default function EceLoading() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-3 text-ink-soft">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">加载中…</p>
    </div>
  );
}
