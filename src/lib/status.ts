/**
 * 状态语气（tone）——业务状态与视觉配色之间的唯一中间层。
 *
 * 业务侧（applications / accommodation）只声明「这条记录是什么语气」，
 * 具体配色统一在 `src/components/ui/status-badge.tsx` 里定义，
 * 避免各处再自己拼 className。
 */
export type StatusTone = "draft" | "active" | "muted";
