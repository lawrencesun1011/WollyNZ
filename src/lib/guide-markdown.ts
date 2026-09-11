import { marked } from "marked";
import { safeLink, type GuideMark, type GuideNode } from "./guide-content";

/**
 * 攻略正文改用以 Markdown 编写（content/guide/<章节>.md），构建时转换成
 * guide-content.ts 定义的文档结构，再交给 parseGuideContent 做白名单校验。
 *
 * 好处：内容源文件是可读可 diff 的 Markdown，渲染管线与既有样式完全不变。
 */

/** 宽松的 token 视图：marked 的联合类型在逐字段窄化时过于繁琐，这里按需取值。 */
type Token = {
  type: string;
  text?: string;
  raw?: string;
  href?: string;
  title?: string | null;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  items?: Token[];
  tokens?: Token[];
  header?: { tokens?: Token[] }[];
  rows?: { tokens?: Token[] }[][];
};

export type GuideChapterMeta = { label: string; title: string };
export type ParsedMarkdown = { meta: Partial<GuideChapterMeta>; doc: GuideNode };

/** 解析文件顶层的 YAML frontmatter（只支持 `key: value` 形式，够用且无新依赖）。 */
export function splitFrontmatter(source: string): { meta: Record<string, string>; body: string } {
  const match = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  if (!match) return { meta: {}, body: source };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (/^["'].*["']$/.test(value)) value = value.slice(1, -1);
    if (key && value) meta[key] = value;
  }
  return { meta, body: source.slice(match[0].length) };
}

function textNodes(value: string, marks: GuideMark[]): GuideNode[] {
  // parseGuideContent 会拒绝空文本节点，这里必须过滤
  if (!value) return [];
  return [{ type: "text", text: value, ...(marks.length ? { marks } : {}) }];
}

/** 行内 token → text / hardBreak / image 节点。marks 沿嵌套累积。 */
function convertInline(tokens: Token[] = [], marks: GuideMark[] = []): GuideNode[] {
  const nodes: GuideNode[] = [];
  for (const token of tokens) {
    switch (token.type) {
      // 转义符与行内代码没有对应样式，退化为纯文本（escaped 时 text 已是字符本身）
      case "text": {
        if (token.tokens?.length) nodes.push(...convertInline(token.tokens, marks));
        else nodes.push(...textNodes(token.text ?? "", marks));
        break;
      }
      case "escape":
      case "codespan":
        nodes.push(...textNodes(token.text ?? "", marks));
        break;
      case "strong":
        nodes.push(...convertInline(token.tokens, [...marks, { type: "bold" }]));
        break;
      case "em":
        nodes.push(...convertInline(token.tokens, [...marks, { type: "italic" }]));
        break;
      case "del":
        nodes.push(...convertInline(token.tokens, [...marks, { type: "strike" }]));
        break;
      case "br":
        nodes.push({ type: "hardBreak" });
        break;
      case "link": {
        const href = token.href ?? "";
        // 链接不合法时保留文字、丢弃链接，避免因一个坏链接导致整章构建失败
        if (safeLink(href)) {
          nodes.push(...convertInline(token.tokens, [...marks, { type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } }]));
        } else {
          nodes.push(...convertInline(token.tokens, marks));
        }
        break;
      }
      case "image":
        nodes.push({ type: "image", attrs: { src: token.href ?? "", alt: token.text ?? "", title: token.title ?? null } });
        break;
      default: {
        if (token.tokens?.length) nodes.push(...convertInline(token.tokens, marks));
        else if (token.text) nodes.push(...textNodes(token.text, marks));
      }
    }
  }
  return nodes;
}

function tableRow(cells: { tokens?: Token[] }[] = [], kind: "tableHeader" | "tableCell"): GuideNode {
  return {
    type: "tableRow",
    content: cells.map(cell => ({
      type: kind,
      attrs: { colspan: 1, rowspan: 1, colwidth: null },
      content: [{ type: "paragraph", content: convertInline(cell.tokens) }],
    })),
  };
}

/** 列表项：首个节点必须是 paragraph，否则 parseGuideContent 会拒绝。 */
function listItemContent(item: Token): GuideNode[] {
  const blocks: GuideNode[] = [];
  let pending: GuideNode[] = [];
  const flush = () => {
    if (pending.length) {
      blocks.push({ type: "paragraph", content: pending });
      pending = [];
    }
  };
  for (const token of item.tokens ?? []) {
    if (token.type === "text" || token.type === "paragraph") {
      pending.push(...convertInline(token.tokens ?? [{ type: "text", text: token.text ?? "" }]));
      continue;
    }
    flush();
    blocks.push(...convertBlocks([token]));
  }
  flush();
  if (!blocks.length || blocks[0].type !== "paragraph") blocks.unshift({ type: "paragraph", content: [] });
  return blocks;
}

function convertBlocks(tokens: Token[] = []): GuideNode[] {
  const blocks: GuideNode[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "space":
      case "html":
        break; // HTML 直接丢弃，正文永不注入原始 HTML
      case "heading": {
        // parseGuideContent 只允许二级与三级标题
        const level = (token.depth ?? 2) <= 2 ? 2 : 3;
        blocks.push({ type: "heading", attrs: { level }, content: convertInline(token.tokens) });
        break;
      }
      case "paragraph": {
        const inline = convertInline(token.tokens);
        // 图片是块级节点，不能留在 paragraph 内；出现时把段落拆开
        let buffer: GuideNode[] = [];
        const flush = () => {
          if (buffer.length) {
            blocks.push({ type: "paragraph", content: buffer });
            buffer = [];
          }
        };
        for (const node of inline) {
          if (node.type === "image") {
            flush();
            blocks.push(node);
          } else {
            buffer.push(node);
          }
        }
        flush();
        break;
      }
      case "list": {
        const items = (token.items ?? []).map(item => ({ type: "listItem", content: listItemContent(item) }));
        if (!items.length) break;
        blocks.push({
          type: token.ordered ? "orderedList" : "bulletList",
          ...(token.ordered ? { attrs: { start: token.start && token.start > 0 ? Math.min(token.start, 1000) : 1 } } : {}),
          content: items,
        });
        break;
      }
      case "blockquote": {
        const content = convertBlocks(token.tokens);
        if (content.length) blocks.push({ type: "blockquote", content });
        break;
      }
      case "hr":
        blocks.push({ type: "horizontalRule" });
        break;
      case "table": {
        const header = tableRow(token.header, "tableHeader");
        const rows = (token.rows ?? []).map(row => tableRow(row, "tableCell"));
        if (header.content?.length) blocks.push({ type: "table", content: [header, ...rows] });
        break;
      }
      default: {
        if (token.tokens?.length) blocks.push(...convertBlocks(token.tokens));
      }
    }
  }
  return blocks;
}

/** 把一份 Markdown 章节解析成 frontmatter + 文档结构。 */
export function parseGuideMarkdown(source: string): ParsedMarkdown {
  const { meta, body } = splitFrontmatter(source);
  const doc: GuideNode = { type: "doc", content: convertBlocks(marked.lexer(body) as unknown as Token[]) };
  return { meta: meta as Partial<GuideChapterMeta>, doc };
}
