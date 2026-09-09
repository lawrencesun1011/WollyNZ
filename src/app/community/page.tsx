import type { Metadata } from "next";
import { CommunityContent } from "@/components/community-content";

export const metadata: Metadata = {
  title: "加入家长社群 · GoalNZ",
  description: "和同行的家长交流新西兰游学准备、选校思路与生活经验。成长这一页，我们一起翻开。",
};

export default function CommunityPage() {
  return <CommunityContent />;
}
