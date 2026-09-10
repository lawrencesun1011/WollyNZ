import type { GuideContent } from "./guide-content";

type ModelContext = { registerTool: (tool: {
  name: string; title: string; description: string; inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
}, options: { signal: AbortSignal }) => void | Promise<void> };

export function registerGuideReading(getContent: () => GuideContent) {
  const context = (document as Document & { modelContext?: ModelContext }).modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(context.registerTool({
      name: "read_guide_chapter", title: "阅读游学攻略章节",
      description: "读取 GoalNZ 攻略中一个章节的正文和参考来源，不修改内容或切换页面。",
      inputSchema: { type: "object", properties: { chapterId: { type: "string", enum: ["understand", "schools", "prepare", "stay", "packing", "life"] } }, required: ["chapterId"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 1 || !("chapterId" in input)) throw new Error("请提供一个有效的章节 ID。");
        const data = getContent(), chapter = data.chapters.find(item => item.id === input.chapterId);
        if (!chapter) throw new Error("找不到这个章节。");
        return { ...chapter, updatedAt: data.updatedAt };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
  } catch { lifecycle.abort(); }
  return () => lifecycle.abort();
}
