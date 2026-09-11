import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GuidePage } from "@/components/guide/guide-page";
import { chapterIds, parseGuideContent, type ChapterId, type GuideChapter } from "@/lib/guide-content";
import { parseGuideMarkdown } from "@/lib/guide-markdown";

export const metadata = {
  title: "游学攻略 · GoalNZ",
  description: "从了解游学到在地生活，六个章节陪你准备新西兰亲子游学。",
};

/**
 * 读取 content/guide/<id>.md：
 * - 顶部 frontmatter 提供章节的 label / title
 * - 正文（Markdown）转成文档结构
 * 改内容只需编辑对应的 .md 文件。
 */
async function loadChapter(id: ChapterId): Promise<GuideChapter> {
  const source = await readFile(join(process.cwd(), "content", "guide", `${id}.md`), "utf-8");
  const { meta, doc } = parseGuideMarkdown(source);
  if (!meta.label || !meta.title) throw new Error(`content/guide/${id}.md 缺少 frontmatter 的 label / title`);
  return { id, label: meta.label, title: meta.title, doc };
}

export default async function Page() {
  // 仍走一次 parseGuideContent，沿用既有的白名单校验与结构约束
  const chapters = await Promise.all(chapterIds.map(loadChapter));
  return <GuidePage initialContent={parseGuideContent({ version: 1, chapters })} />;
}
