import type { Metadata } from "next";
import { AccommodationContent } from "@/components/accommodation-content";

export const metadata: Metadata = {
  title: "找住宿 · GoalNZ",
  description: "了解新西兰家庭住宿匹配流程，整理地区、预算与入住安排，为一家人的成长体验做好准备。",
};

export default function AccommodationPage() {
  return <AccommodationContent />;
}
