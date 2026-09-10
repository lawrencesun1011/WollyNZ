import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GuidePage } from "@/components/guide/guide-page";
import { parseGuideContent } from "@/lib/guide-content";

export const metadata = {
  title: "游学攻略 · GoalNZ",
  description: "从了解游学到在地生活，六个章节陪你准备新西兰亲子游学。",
};

export default async function Page() {
  const raw = await readFile(join(process.cwd(), "public/content/guide.json"), "utf-8");
  const content = parseGuideContent(JSON.parse(raw));
  return <GuidePage initialContent={content} />;
}
