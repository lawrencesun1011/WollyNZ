import { Fragment, type ReactNode } from "react";
import { safeImage, safeLink, type GuideNode } from "@/lib/guide-content";
import styles from "./guide.module.css";

function renderNode(node: GuideNode, key: number): ReactNode {
  const content = node.content?.map(renderNode);
  switch (node.type) {
    case "text": {
      let text: ReactNode = node.text;
      for (const mark of node.marks || []) {
        if (mark.type === "bold") text = <strong>{text}</strong>;
        if (mark.type === "italic") text = <em>{text}</em>;
        if (mark.type === "underline") text = <u>{text}</u>;
        if (mark.type === "strike") text = <s>{text}</s>;
        if (mark.type === "link" && safeLink(mark.attrs?.href)) text = <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer">{text}</a>;
      }
      return <Fragment key={key}>{text}</Fragment>;
    }
    case "paragraph": return <p key={key}>{content?.length ? content : <br />}</p>;
    case "heading": return node.attrs?.level === 3 ? <h3 key={key}>{content}</h3> : <h2 key={key}>{content}</h2>;
    case "bulletList": return <ul key={key}>{content}</ul>;
    case "orderedList": return <ol key={key} start={Number(node.attrs?.start) || 1}>{content}</ol>;
    case "listItem": return <li key={key}>{content}</li>;
    case "blockquote": return <blockquote key={key}>{content}</blockquote>;
    case "hardBreak": return <br key={key} />;
    case "horizontalRule": return <hr key={key} />;
    case "table": {
      const columns = node.content?.[0]?.content?.flatMap(cell => Array.from({ length: Number(cell.attrs?.colspan) || 1 }, (_, index) => Array.isArray(cell.attrs?.colwidth) ? Number(cell.attrs.colwidth[index]) || undefined : undefined)) || [];
      const total = columns.every(Boolean) ? columns.reduce<number>((sum, width) => sum + (width || 0), 0) : undefined;
      return <div key={key} className={styles.tableScroll} tabIndex={0} role="region" aria-label="内容表格，可横向滚动"><table style={total ? { minWidth: total } : undefined}><colgroup>{columns.map((width, index) => <col key={index} style={width ? { width } : undefined} />)}</colgroup><tbody>{content}</tbody></table></div>;
    }
    case "tableRow": return <tr key={key}>{content}</tr>;
    case "tableHeader": return <th key={key} colSpan={Number(node.attrs?.colspan) || 1} rowSpan={Number(node.attrs?.rowspan) || 1}>{content}</th>;
    case "tableCell": return <td key={key} colSpan={Number(node.attrs?.colspan) || 1} rowSpan={Number(node.attrs?.rowspan) || 1}>{content}</td>;
    case "image": return safeImage(node.attrs?.src) ? <figure key={key}><img src={node.attrs.src} alt={String(node.attrs?.alt || "")} loading="lazy" />{(node.attrs.caption || node.attrs.title) ? <figcaption>{String(node.attrs.caption || node.attrs.title)}</figcaption> : null}</figure> : null;
    default: return <Fragment key={key}>{content}</Fragment>;
  }
}
export function GuideDocument({ doc }: { doc: GuideNode }) {
  return <div className={styles.prose}>{doc.content?.map(renderNode)}</div>;
}
