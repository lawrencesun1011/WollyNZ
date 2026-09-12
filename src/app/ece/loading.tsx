import { LoadingState } from "@/components/ui/states";

export default function EceLoading() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center">
      <LoadingState />
    </div>
  );
}
