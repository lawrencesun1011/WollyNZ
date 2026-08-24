---
name: ece-favorites-applications
overview: 将心愿单与"我的申请"拆分为幼儿园（ECE）与中小学两个独立模块：心愿单按 kind 标记分别保存与分组管理；"我的申请"中 ECE Tab 复用中小学表单与草稿/进行中/历史分区，数据来源为幼儿园库。
todos:
  - id: upgrade-favorites-store
    content: 升级 favorites.ts 为 {id,kind}[]，toggle/remove 加 kind 并兼容旧 string[]
    status: completed
  - id: sync-user-collections-cloud
    content: 同步 user-data.ts 与 user-collections.ts 的 FavoriteItem/云端读写与 hook 暴露 kind
    status: completed
    dependencies:
      - upgrade-favorites-store
  - id: pass-kind-at-write-points
    content: 在 school-card/school-map/ece-card/ece-map 收藏写入处补 kind
    status: completed
    dependencies:
      - upgrade-favorites-store
  - id: split-favorites-popover
    content: 心愿单浮层拆幼儿园/中小学两子区，接 ECE 数据反查并按 category 去申请
    status: completed
    dependencies:
      - sync-user-collections-cloud
  - id: enable-ece-applications
    content: my-applications 移除 EcePlaceholder，ECE Tab 复用草稿/进行中/历史三区块
    status: completed
    dependencies:
      - split-favorites-popover
  - id: ece-apply-form
    content: apply 页面与 application-form 支持 category=ece，意向学校取自 ECE 库
    status: completed
    dependencies:
      - enable-ece-applications
  - id: verify-and-deploy
    content: 用 [mcp:CloudBase AI ToolKit] 预览验证 ECE 心愿单与申请链路，确认无回归
    status: completed
    dependencies:
      - ece-apply-form
---

## 用户需求

完善心愿单与"我的申请"中的幼儿园（ECE）模块，使幼儿园与中小学完全分开管理与呈现。

## 产品概述

当前心愿单只存纯 id 数组、不区分幼儿园/中小学，ECE 收藏项在浮层中无法反查名字；"我的申请"虽有 category 区分，但 ECE Tab 仅显示占位"即将上线"。需要把两套模块按数据来源真正拆分。

## 核心功能

1. 心愿单按来源分别保存：中小学收藏写 `kind:'school'`、幼儿园收藏写 `kind:'ece'`，互不串。
2. 我的心愿单浮层内部分"幼儿园""中小学"两个子模块分别展示与管理（移除、从心愿单发起申请均按各自 category）。
3. "我的申请"页面 ECE Tab 与中小学 Tab 完全一致：复用草稿 / 进行中 / 历史三区块、编辑、从心愿单发起申请，数据来源均为幼儿园库（`category:'ece'`）。
4. 收藏按钮（列表卡片、地图 popup）写入时自动带上所属 kind。
5. 旧 `string[]` 收藏数据兼容迁移，不丢历史数据。

## 技术栈

- 现有项目：Next.js（App Router）+ TypeScript + Tailwind CSS + CloudBase（localStorage 兜底 + 云端 `user_collections` / `applications` 表）。
- 复用既有模块：`favorites.ts` / `user-collections.ts` / `user-data.ts` / `favorites-popover.tsx` / `applications.ts` / `my-applications/page.tsx` / `application-form.tsx`，不新造轮子。

## 实现策略

### 1. 心愿单存储结构升级（按 kind 标记）

- `src/lib/favorites.ts`：
- 新增 `type FavoriteEntry = { id: string; kind: "school" | "ece" }`。
- `state.ids` 由 `string[]` 改为 `FavoriteEntry[]`；`toggleFavorite(id, kind)` 按 `(id,kind)` 去重切换；`removeFavorite(id, kind)`、`clearFavorites()`、`getFavoriteIds()`（返回 `FavoriteEntry[]`）、`isFavorite(id, kind)`、`applyCloudFavorites(items)` 同步新结构。
- 读取 localStorage 时兼容旧 `string[]`：旧 id 默认按 `kind:'school'` 处理（中小学数据为主，且 ECE 为新增），保证历史不丢。
- `syncCloud(entries)` 直接上传 `{id, kind, name}[]`。
- `src/lib/user-data.ts`：`FavoriteItem` 增加 `kind` 字段；`saveCloudCollections` / `fetchCloudCollections` / `mergeLocalToCloudOnLogin` 兼容旧 `{id,name}` 与新 `{id,kind,name}`（旧项默认 `kind:'school'`）。
- `src/lib/user-collections.ts`：`useFavorites()` 返回 `{ favoriteIds, favoriteEntries, toggleFavorite, removeFavorite, clearFavorites }`；`toggleFavorite`/`removeFavorite` 签名加 `kind` 参数，`school-card`/`ece-card`/`school-map`/`ece-map` 调用处补 `kind`。`useCompare`（对比）保持独立、不变。

### 2. 收藏按钮补 kind（4 个写入点）

- `schools/school-card.tsx`、`schools/school-map.tsx`：传 `kind:"school"`。
- `ece/ece-card.tsx`、`ece/ece-map.tsx`：传 `kind:"ece"`。
- popup 内 `onToggleFavoriteRef` 调用处需把 kind 一并传递（地图 popup 经 `window.__schoolMapActions.favorite(id)` 触发，需扩展动作携带 kind，或 popup 数据生成时附带 kind 属性）。

### 3. 心愿单浮层按 kind 分组

- `src/components/favorites-popover.tsx`：
- 拆为"幼儿园""中小学"两个子区（Section）。各区用 `favoriteEntries.filter(e=>e.kind===...)` 取 id 列表。
- 反查数据：中小学用现有 `useSchoolsList()`（schools-store）；幼儿园新增 `useEceList()`（或复用 `getEceFrontendAll` 客户端拉取 + 缓存），按 id 反查 `SchoolFrontend` 以显示名称/地址。
- 各区"去申请"按钮按 `category`（ece / school）跳 `/apply?category=...`；"移除"调 `removeFavorite(id, kind)`。
- 保持现有卡片 / 空状态 / 计数样式一致。

### 4. 我的申请 ECE Tab 打通

- `src/app/my-applications/page.tsx`：移除 `EcePlaceholder` 分支，ECE Tab 复用与中小学完全一致的三区块（drafts / active / history）渲染逻辑（已存在 `CATEGORY_META` 与 `ApplicationCategory`）。
- `src/lib/applications.ts`：已支持 `category:'ece'`，无需改结构；确认 `addApplication('ece', form, status)` 等写入口可用。
- `src/app/apply/page.tsx` + `application-form.tsx`：支持 `category=ece` 进入表单；意向学校选择器从幼儿园库（`getEceFrontendAll`）拉取，提交落到 `category:'ece'`。中小学分支保持不变。
- 从心愿单发起申请：浮层按子区 category 跳转（见第 3 点）。

## 性能与可靠性

- ECE 数据仅在浮层 / 申请表单按需反查，复用一次客户端拉取并缓存（避免每次渲染重复请求；参考 schools-store 模式加 `ece-store` 或模块级缓存）。
- 收藏切换为 O(n) 数组遍历，规模极小（用户级），无性能瓶颈。
- 旧数据兼容：读取端对 `string` 与 `object` 双格式兼容，写入端统一新格式，避免升级丢数据。
- 不改动中小学任何既有读写逻辑语义，仅扩展 kind 分支，控制回归面。

## 架构设计

```mermaid
graph TD
  A[收藏按钮 列表/地图] -->|toggleFavorite id,kind| B[favorites.ts 状态层]
  B -->|localStorage + 云端| C[user_collections.favorites {id,kind,name}]
  B -->|useFavorites| D[favorites-popover 浮层]
  D -->|按 kind 分组| E1[幼儿园子区 -> 反查 ECE 库]
  D -->|按 kind 分组| E2[中小学子区 -> 反查 schools-store]
  D -->|去申请 category| F[/apply?category=ece|school]
  F -->|application-form| G[applications.ts category=ece|school]
  G -->|云端 applications 表| H[my-applications 页面]
  H -->|ECE Tab 三区块| I[草稿/进行中/历史]
```

## 目录结构（受影响文件）

```
src/lib/
  ├─ favorites.ts          # [MODIFY] 结构改为 FavoriteEntry{id,kind}[]，toggle/remove 加 kind，兼容旧 string[]
  ├─ user-collections.ts    # [MODIFY] useFavorites 返回 entries，toggle/remove 暴露 kind
  ├─ user-data.ts           # [MODIFY] FavoriteItem 加 kind；云端读写兼容新旧格式
  ├─ applications.ts        # [确认/微改] 确保 addApplication('ece',...) 可用
  ├─ data.ts                # [复用] getEceFrontendAll 供浮层/表单反查
  └─ ece-store.ts           # [NEW] 模块级 ECE 前端数据缓存（同 schools-store 模式）
src/components/
  ├─ favorites-popover.tsx  # [MODIFY] 拆幼儿园/中小学两子区，接 ECE 反查与分类去申请
  ├─ schools/
  │   ├─ school-card.tsx     # [MODIFY] toggleFavorite 传 kind:"school"
  │   └─ school-map.tsx      # [MODIFY] popup 收藏传 kind:"school"
  └─ ece/
      ├─ ece-card.tsx        # [MODIFY] toggleFavorite 传 kind:"ece"
      └─ ece-map.tsx         # [MODIFY] popup 收藏传 kind:"ece"
src/app/
  ├─ my-applications/page.tsx  # [MODIFY] 移除 EcePlaceholder，ECE Tab 复用三区块
  └─ apply/page.tsx             # [确认/微改] 支持 category=ece 进入表单
src/components/applications/
  └─ application-form.tsx       # [MODIFY] 支持 category=ece，意向学校取自 ECE 库
```

## Agent Extensions

### MCP

- **CloudBase AI ToolKit**
- Purpose: 部署验证与云端 `user_collections` / `applications` 表读写联调（envQuery 查环境、静态托管预览）。
- Expected outcome: 完成后确认云端收藏/申请结构升级无破坏，预览站点 ECE 心愿单与申请链路正常。

### Skill

- **cloudbase**
- Purpose: 统一调用 CloudBase 能力（认证、数据库、静态托管），在需要部署/验证时作为统一入口。
- Expected outcome: 按既有 CloudBase 流程完成构建与预览，确保改动在真实环境可用。