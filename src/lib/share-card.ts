/**
 * 生成分享卡片截图的「离屏副本」。
 *
 * 深拷贝源节点 → 移除带 `.no-share` 的元素（关闭按钮、底部操作区、toast）→
 * 挂到视口外的容器中，让它仍然能套用页面 CSS 正常排版。
 *
 * 这样做的好处：
 * 1. 不改动真实 DOM，页面上的按钮不会闪一下；
 * 2. 按钮的占位空间被真正移除，图片底部不会有空白；
 * 3. 副本的 `h-full` 被重置为 auto，不会继承弹窗的固定高度。
 *
 * 用法：
 *   const clone = buildShareClone(cardRef.current!);
 *   try { ...toPng(clone)... } finally { clone.parentElement?.remove(); }
 */
export function buildShareClone(source: HTMLElement): HTMLElement {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${source.offsetWidth}px`,
    "pointer-events:none",
    "z-index:-1",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  Array.from(clone.querySelectorAll(".no-share")).forEach((el) => el.remove());
  clone.style.height = "auto";

  host.appendChild(clone);
  document.body.appendChild(host);
  return clone;
}
