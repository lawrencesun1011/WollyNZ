export const chapterIds = ["understand", "schools", "prepare", "stay", "packing", "life"] as const;
export type ChapterId = (typeof chapterIds)[number];
export type GuideMark = { type: string; attrs?: Record<string, unknown> };
export type GuideNode = { type: string; text?: string; attrs?: Record<string, unknown>; marks?: GuideMark[]; content?: GuideNode[] };
export type GuideChapter = { id: ChapterId; label: string; title: string; doc: GuideNode; sources: { title: string; url: string }[] };
export type GuideContent = { version: 1; updatedAt: string; chapters: GuideChapter[] };

export function safeLink(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 2048 || /[\s\\\u0000-\u001f]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value) || /^#[\w-]+$/.test(value)) return true;
  try { return ["https:", "http:", "mailto:"].includes(new URL(value).protocol); } catch { return false; }
}
export function safeImage(value: unknown): value is string {
  return typeof value === "string" && /^\/images\/guide\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:webp|png|jpe?g)$/i.test(value) && !value.includes("..");
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("内容格式不正确。");
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number, required = true): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error("文字为空或超过长度限制。");
  return value;
}
const children: Record<string, string[]> = {
  doc: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "table", "image"],
  paragraph: ["text", "hardBreak"], heading: ["text", "hardBreak"],
  bulletList: ["listItem"], orderedList: ["listItem"],
  listItem: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "image", "table", "horizontalRule"],
  blockquote: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "image", "table", "horizontalRule"],
  table: ["tableRow"], tableRow: ["tableCell", "tableHeader"],
  tableCell: ["paragraph", "heading", "bulletList", "orderedList", "image", "blockquote", "table", "horizontalRule"],
  tableHeader: ["paragraph", "heading", "bulletList", "orderedList", "image", "blockquote", "table", "horizontalRule"],
};
// Whitelist and rebuild every node; stored JSON is never injected as HTML.
export function parseGuideContent(input: unknown): GuideContent {
  const data = record(input);
  if (data.version !== 1 || !Array.isArray(data.chapters) || data.chapters.length !== 6) throw new Error("攻略必须包含六个章节。");
  let count = 0;
  function node(input: unknown, depth = 0): GuideNode {
    if (++count > 30000 || depth > 16) throw new Error("内容过多或嵌套太深。");
    const raw = record(input), type = string(raw.type, 32), result: GuideNode = { type };
    if (![...Object.keys(children), "text", "hardBreak", "horizontalRule", "image"].includes(type)) throw new Error(`不支持的内容：${type}`);
    const attrs = raw.attrs == null ? {} : record(raw.attrs);
    if (type === "text") {
      result.text = string(raw.text, 20000, false);
      if (!result.text.length) throw new Error("文字节点不能为空。");
      if (raw.marks != null) {
        if (!Array.isArray(raw.marks) || raw.marks.length > 5) throw new Error("文字样式不正确。");
        result.marks = raw.marks.map((m: unknown) => {
          const mark = record(m), kind = string(mark.type, 20);
          if (!["bold", "italic", "underline", "strike", "link"].includes(kind)) throw new Error("不支持的文字样式。");
          if (kind !== "link") return { type: kind };
          const href = record(mark.attrs).href;
          if (!safeLink(href)) throw new Error("链接地址不安全或格式不正确。");
          return { type: kind, attrs: { href, target: "_blank", rel: "noopener noreferrer" } };
        });
      }
    }
    if (type === "heading") {
      if (attrs.level !== 2 && attrs.level !== 3) throw new Error("正文标题仅支持二级和三级。");
      result.attrs = { level: attrs.level };
    }
    if (type === "orderedList") result.attrs = { start: Number.isInteger(attrs.start) && Number(attrs.start) > 0 ? Math.min(Number(attrs.start), 1000) : 1 };
    if (type === "tableCell" || type === "tableHeader") {
      const span = (v: unknown) => {
        if (v == null) return 1;
        if (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 100) throw new Error("表格合并范围必须在 1–100 之间。");
        return Number(v);
      };
      const colspan = span(attrs.colspan), rowspan = span(attrs.rowspan);
      if (attrs.colwidth != null && (!Array.isArray(attrs.colwidth) || attrs.colwidth.length !== colspan || attrs.colwidth.some(v => !Number.isInteger(v) || Number(v) < 0 || Number(v) > 3000))) throw new Error("表格列宽不正确。");
      result.attrs = { colspan, rowspan, colwidth: attrs.colwidth ?? null };
    }
    if (type === "image") {
      if (!safeImage(attrs.src)) throw new Error("请先上传图片；只支持项目中的 PNG、JPEG 和 WebP 图片。");
      result.attrs = { src: attrs.src, alt: typeof attrs.alt === "string" ? string(attrs.alt, 500, false) : "", title: typeof attrs.title === "string" ? string(attrs.title, 500, false) : null };
      if (typeof attrs.caption === "string") result.attrs.caption = string(attrs.caption, 500, false);
    }
    if (children[type]) {
      if (raw.content != null && !Array.isArray(raw.content)) throw new Error("正文结构不正确。");
      result.content = ((raw.content || []) as unknown[]).map(v => node(v, depth + 1));
      if (result.content.some(v => !children[type].includes(v.type))) throw new Error("正文层级不正确。");
      if (!["paragraph", "heading", "tableRow"].includes(type) && !result.content.length) throw new Error("正文结构不能留空。");
      if (type === "listItem" && result.content[0]?.type !== "paragraph") throw new Error("列表项需要以段落开始。");
      if (type === "table") {
        if (result.content.length > 200) throw new Error("单张表格最多支持 200 行。");
        const grid: boolean[][] = result.content.map(() => []);
        result.content.forEach((row, rowIndex) => {
          let column = 0;
          row.content?.forEach(cell => {
            while (grid[rowIndex][column]) column++;
            const cols = Number(cell.attrs?.colspan), rows = Number(cell.attrs?.rowspan);
            if (rowIndex + rows > grid.length || column + cols > 100) throw new Error("表格合并范围超出边界。");
            for (let r = rowIndex; r < rowIndex + rows; r++) for (let c = column; c < column + cols; c++) {
              if (grid[r][c]) throw new Error("表格单元格存在重叠。");
              grid[r][c] = true;
            }
            column += cols;
          });
        });
        const width = grid[0].length;
        if (grid.some(row => row.length !== width || Array.from({ length: width }, (_, i) => row[i]).some(v => !v))) throw new Error("表格各行列数不一致。");
      }
    }
    return result;
  }
  const chapters = data.chapters.map((c: unknown, index: number): GuideChapter => {
    const chapter = record(c);
    if (chapter.id !== chapterIds[index]) throw new Error("章节顺序不正确。");
    const doc = node(chapter.doc);
    if (doc.type !== "doc") throw new Error("正文缺少文档节点。");
    if (!Array.isArray(chapter.sources) || chapter.sources.length > 30) throw new Error("来源列表不正确。");
    return { id: chapterIds[index], label: string(chapter.label, 20), title: string(chapter.title, 120), doc, sources: chapter.sources.map((s: unknown) => {
      const source = record(s);
      if (!safeLink(source.url) || !/^https?:/.test(source.url)) throw new Error("来源链接不正确。");
      return { title: string(source.title, 160), url: source.url };
    }) };
  });
  const updatedAt = string(data.updatedAt, 40);
  if (Number.isNaN(Date.parse(updatedAt))) throw new Error("更新日期不正确。");
  return { version: 1, updatedAt, chapters };
}
