---
name: logout-confirm-dialog
overview: 为顶栏「我的」菜单的「退出登录」增加确认弹窗（取消 / 退出登录）。确认后执行 signOut，待本地用户数据被 auth 桥接清空后，刷新回首页「/」。复用项目既有的纸色实底 + 圆角描边风格，新建一个可复用的 ConfirmDialog 组件。数据清理逻辑（clearFavoritesLocal/clearCompareLocal）已由 auth-init 在登录态变 null 时自动完成，本次无需改动。
design:
  architecture:
    framework: react
  styleKeywords:
    - 纸色实底
    - 居中模态
    - 大圆角
    - 统一描边
    - 不透明
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 16px
      weight: 600
    subheading:
      size: 14px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#2e9e8c"
    background:
      - "#f9f6f0"
      - "#000000"
    text:
      - "#102e2c"
      - "#5b6b68"
    functional:
      - "#EF4444"
      - "#2e9e8c"
todos:
  - id: create-confirm-dialog
    content: 新建 src/components/ui/confirm-dialog.tsx 通用确认弹窗（纸色实底、圆角描边、pending 禁用）
    status: completed
  - id: wire-user-menu-logout
    content: 改造 user-menu.tsx：退出按钮打开确认弹窗，新增 confirmOpen/signingOut 与 handleLogout（signOut 后跳首页）
    status: completed
    dependencies:
      - create-confirm-dialog
  - id: verify-build
    content: 构建/lint 校验无报错，走查确认与取消分支
    status: completed
    dependencies:
      - wire-user-menu-logout
---

## 用户需求

点「我的」菜单中的「退出登录」时，先弹出确认框（文案「确认退出登录？」，选项「取消」/「退出登录」）；仅当点击「退出登录」才真正退出。退出完成且本地用户数据清空后，自动刷新回首页「/」。

## 产品概述

为顶栏账户菜单的退出登录增加二次确认，避免误操作；退出后回到首页，并以游客态干净重渲染（本地心愿单/对比镜像已清空，云端账号数据保留）。

## 核心功能

- 退出登录触发确认弹窗，含「取消」「退出登录」两个操作。
- 取消：关闭弹窗，保持登录态不变。
- 确认：执行退出登录，等待本地数据清空，随后硬刷新回首页。
- 通用确认弹窗组件，后续删除申请等场景可复用。

## 技术栈

- 框架：Next.js 16 App Router + React 19 + TypeScript
- 样式：Tailwind CSS（沿用项目既有 token：bg-paper / border-stroke / shadow-xl / rounded-2xl，不使用 glass 透明）
- 图标：lucide-react（退出按钮沿用 LogOut）

## 实现方案

复用项目已有的登录态桥接与数据清理链路，仅新增一个通用确认弹窗组件，并把 user-menu 的退出逻辑改为「先确认、后退出、再跳首页」：

1. **新增通用 ConfirmDialog 组件**（`src/components/ui/confirm-dialog.tsx`）

- Props：`open`、`title`、`description?`、`confirmText?`、`cancelText?`、`pending?`、`onConfirm`、`onCancel`。
- 结构：全屏遮罩 `fixed inset-0 z-[2000] flex items-center justify-center bg-black/40`（点击遮罩触发 onCancel），居中卡片 `bg-paper rounded-2xl border border-stroke shadow-xl p-5`，标题 + 可选描述 + 右侧两个按钮。
- 交互：`pending` 为真时禁用两个按钮并显示加载态，防止重复提交；非 pending 时「取消」与遮罩点击关闭。
- 入场动画沿用项目已有 `animate-popover` / `animate-fade-up` 之一（与近期两弹窗一致）。

2. **改造 user-menu.tsx 的退出流程**

- 新增状态 `confirmOpen`、`signingOut`。
- 「退出登录」按钮 `onClick` 改为 `setOpen(false); setConfirmOpen(true)`（先收起菜单再弹确认框，避免双层浮层叠加）。
- `handleLogout`：`setSigningOut(true)` → `await signOut()` → `window.location.assign("/")`。
依据：`signOut()`（auth.ts:312）内部 `await a.signOut()` 后同步 `emitUser(null)`；auth-init.ts:61 的 `onUserChanged(null)` 分支会同步执行 `clearFavoritesLocal()`/`clearCompareLocal()` 等本地清理，故 `await signOut()` resolve 时本地数据已清空。随后硬刷新到首页，确保以游客态重新渲染、无残留登录态。
- 渲染 `<ConfirmDialog open={confirmOpen} title="确认退出登录？" confirmText="退出登录" cancelText="取消" pending={signingOut} onCancel={() => setConfirmOpen(false)} onConfirm={handleLogout} />`。

## 实现要点

- 不改动 `auth.ts` / `auth-init.ts` / `favorites.ts`：本地数据清理逻辑已存在且正确（云端数据不删除，符合既有设计）。
- 弹窗卡片必须不透明（bg-paper），与近期统一过的心愿单/我的弹窗风格一致，避免再出现透明透底问题。
- `window.location.assign("/")` 满足「刷新回首页」的硬刷新语义；相比 `router.push` 能彻底重置页面级状态。

## 架构设计

- 新增组件与现有弹窗解耦，作为通用 UI 原语放在 `src/components/ui/`，不引入新依赖、不新增全局样式 token。
- user-menu 仅作为使用方，职责清晰：菜单交互 vs 确认弹窗 vs 退出副作用分离。

## 目录结构

```
src/
├── components/
│   ├── ui/
│   │   └── confirm-dialog.tsx   # [NEW] 通用确认弹窗。props: open/title/description?/confirmText?/cancelText?/pending?/onConfirm/onCancel。遮罩+居中纸色卡片，pending 禁用按钮，点击遮罩或取消关闭。
│   └── auth/
│       └── user-menu.tsx        # [MODIFY] 退出按钮改为打开确认弹窗；新增 confirmOpen/signingOut 状态与 handleLogout（signOut 后 window.location.assign("/")）；渲染 ConfirmDialog。
```

## 设计风格

新式、克制、与项目既有弹窗统一。确认弹窗采用居中卡片式模态，背景半透明遮罩（bg-black/40）聚焦视线；卡片使用纸色实底（bg-paper）、大圆角（rounded-2xl）、统一描边（border-stroke）与阴影（shadow-xl），不使用任何透明/毛玻璃，避免装饰叶片透底。

## 页面/组件区块设计（确认弹窗）

- 遮罩层：fixed inset-0，z-[2000]，flex 居中，bg-black/40，点击空白关闭。
- 卡片：bg-paper rounded-2xl border border-stroke shadow-xl p-5 w-full max-w-sm，animate-fade-up 入场。
- 标题区：「确认退出登录？」text-base font-semibold text-ink。
- 操作区（卡片底部右对齐）：「取消」次级按钮（hover:bg-primary/5 text-ink-soft），「退出登录」主按钮（bg-error/10 text-error，pending 时 disabled + opacity），两按钮间距 gap-2。