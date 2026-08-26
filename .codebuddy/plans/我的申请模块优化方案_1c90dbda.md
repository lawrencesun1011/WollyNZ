---
name: 我的申请模块优化方案
overview: 把"我的申请"从"代提交/跟进状态"改为"生成邮件模板"工具：去掉状态概念，未登录时邮箱验证码解锁并自动注册，表单字段精简（家长称呼、多子女出生日期、取消选填），提交改为"生成邮件模板"弹窗（主题/收件人/正文可复制可编辑），查看详情复用同一弹窗。
design:
  architecture:
    framework: react
    component: shadcn
  styleKeywords:
    - Glassmorphism
    - 圆角卡片
    - 置灰未解锁态
    - 居中浮层弹窗
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 20px
      weight: 700
    subheading:
      size: 16px
      weight: 600
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#2B6CFF"
      - "#1E5AE8"
    background:
      - "#F5F7FB"
      - "#FFFFFF"
    text:
      - "#1A2233"
      - "#6B7280"
    functional:
      - "#16A34A"
      - "#DC2626"
      - "#F59E0B"
todos:
  - id: refactor-model
    content: 修改 applications.ts：去状态展示、扩展表单字段（家长称呼/多子女出生日期/意向学校email）、移除选填字段
    status: completed
  - id: build-email-modal
    content: 新建 email-template-modal.tsx 邮件模板弹窗（主题/收件人/正文可复制）
    status: completed
    dependencies:
      - refactor-model
  - id: rebuild-form
    content: 改造 application-form.tsx：邮箱验证解锁流程、字段调整、底部生成邮件模板弹窗
    status: completed
    dependencies:
      - refactor-model
      - build-email-modal
  - id: update-card
    content: 更新 application-card.tsx：去状态徽标、查看详情弹邮件模板、保留编辑删除
    status: completed
    dependencies:
      - build-email-modal
  - id: update-pages
    content: 调整 my-applications 与 apply 页面：平铺列表、跳转与弹窗联动
    status: completed
    dependencies:
      - rebuild-form
      - update-card
  - id: verify
    content: 本地构建与类型检查，验证未登录解锁与邮件模板生成流程
    status: completed
    dependencies:
      - update-pages
---

## 用户需求

将「我的申请」模块改为「生成邮件模板」工具：用户填写申请信息后，系统生成可复制到邮箱发送的邮件草稿，不再提交到后端审核流程。

## 产品概述

原申请流程（状态机 + 云端审核）下线，改为纯本地/云端草稿存储 + 邮件模板生成的轻量工具。未登录用户通过邮箱验证码顺便注册登录后即可解锁填写与保存。

## 核心功能

- 申请单去掉状态展示（不再有进行中/审核中/已录取等），卡片仅提供「查看详情」「编辑」「删除」三个操作。
- 未登录填写流程：必须填联系邮箱 → 点验证 → 输入验证码 → 确认，验证通过即注册并登录该账号，表单其余字段才解锁可填写，且表单内容自动保存到该账号。
- 表单字段调整：
- 联系邮箱下方新增「家长称呼」字段，小字提示「用于和学校沟通」。
- 「学生出生日期」改为「学生1出生日期」，并提供「+」按钮依次解锁学生2、3、4、5…出生日期，支持多子女。
- 移除所有选填部分（计划游学时间、希望得到的协助、其它备注、联系客服等）。
- 表单底部按钮「提交申请」改为「生成邮件模板」，点击弹出弹窗：邮件主题（可编辑、暂空）、收件人（按申请单意向学校邮箱拼接，无则留空）、邮件正文（可编辑、暂空）；三者均带复制按钮。
- 卡片「查看详情」同样弹出该邮件模板弹窗（只读/可复制）。

## 技术栈

- 框架：Next.js 16（App Router）+ React + TypeScript
- 样式：Tailwind CSS（沿用项目 glass/card/chip 设计令牌）
- 状态/存储：模块级 pub/sub + localStorage 兜底 + CloudBase PostgREST（前次已修 RLS owner 默认）
- 认证：CloudBase 邮箱验证码（`sendEmailCode` / `signInWithEmailCode` / `useAuthUser`，已就绪）

## 实现方案

### 总体策略

以最小改动复用现有数据层与认证层，仅改造「展示状态」「表单字段」「提交动作」「详情弹窗」四处，将"审核流程"语义切换为"邮件模板生成"。

### 关键技术决策

1. **状态字段处理**：保留 `ApplicationItem.status` 字段（不破坏存储结构、避免 orphan 旧数据），但：

- `applications.ts` 删除 `STATUS_META` 导出与 `ApplicationStatus` 多值，固定为单一内部值（如 `"archived"` 或不依赖该字段）。
- `application-card.tsx` 移除状态徽标；`my-applications/page.tsx` 移除 `drafts/active/history` 三段分组与 `isClosed`，改为按 tab 平铺全部申请单（幼儿园/中小学）。

2. **字段模型扩展**：

- `ApplicationForm` 新增 `parentTitle?: string`（家长称呼）。
- `birthDate` 改为 `birthDates: ExactDate[]`（学生1..N），UI 用 `+` 动态增减，最少1个最多5个。
- 移除 `studyPeriod`、`assists`、`notes`（及对应导入/存储）。
- `IntendedSchool` 增加 `email?: string`，在加入意向学校时从 `SchoolFrontend.email` / ECE 数据 `email` 带入，保证邮件模板收件人可不依赖再次反查。

3. **未登录解锁流程**（核心交互）：

- 在 `application-form.tsx` 内嵌「邮箱验证解锁区」：未登录且未验证时，仅邮箱与家长称呼可填，其余字段 `disabled` 置灰。
- 点「获取验证码」→ `sendEmailCode(email)`；输入验证码点「确认」→ `signInWithEmailCode` 成功后 `useAuthUser` 变为已登录，`user.email` 回填，表单其余字段解锁，并自动 `saveApplication`（归属该账号，走云端+本地）。
- 已登录用户（`user.email` 存在）直接进入填写，无需验证。

4. **生成邮件模板弹窗**（新组件 `email-template-modal.tsx`）：

- 入参：`item: ApplicationItem`（或当前 form 快照）。
- 计算收件人：`item.intendedSchools.map(s => s.email).filter(Boolean).join("; ")`。
- 主题/正文用 `textarea` 可编辑（受控 state，初始空），收件人为只读 `input`。
- 每个区块右侧「复制」按钮（`navigator.clipboard.writeText`）。
- 表单「生成邮件模板」与卡片「查看详情」均调用此弹窗（查看详情传已存 item，生成传当前 buildForm 结果）。

5. **提交动作改写**：

- `handleSubmit` / `handleSaveDraft` 合并为「生成邮件模板」：`validate()` 去掉时间/协助校验；通过后将当前表单 `saveApplication` 并弹出 `email-template-modal`。

### 性能与可靠性

- 字段增减仅本地 state 操作，无额外渲染开销；`intendedSchools` 预存 email 避免弹窗时全量遍历学校库。
- 验证码流程复用现有 `auth.ts`，不新增认证逻辑，避免引入新 bug。
- 表单未解锁时 `disabled` 字段不触发校验，降低误报。

### 注意事项（防回退）

- 不修改 `localStorage` 键 `wollyn:schools:applications`，旧数据照常读取（旧 status 字段被新 UI 忽略）。
- 保留 `saveApplication` / `saveLocalApplication` 现有云端+本地双写与 RLS owner 默认逻辑。
- `SchoolFrontend` 已有 `email` 字段（`src/lib/types.ts:20`），ECE 数据需确认同样含 email，否则按 name 回退留空。

## 实现备注

- 移除 `Section` 组件中的「选填」标签逻辑，所有保留字段视为必填或自然必填。
- `application-form.tsx` 中 `import` 清理：移除 `study-period` 相关 `DateRangeCalendar`、 `ASSIST_OPTIONS`、`TENSE_LABEL` 等不再使用部分。
- 详情弹窗不再展示「系统状态」「提交时间」等审核语义字段，改为展示表单关键信息（邮箱、家长称呼、学生出生日期列表、意向学校）。

## 架构设计

现有分层（数据层 `applications.ts` → UI 组件 `application-form/card` → 页面 `apply`/`my-applications`）保持不变，仅新增 `email-template-modal.tsx` 作为共享弹窗组件，被 form 与 card 共同引用。

## 目录结构

```
src/
├── lib/
│   └── applications.ts              # [MODIFY] 移除 STATUS_META/多值 ApplicationStatus；ApplicationForm 增 parentTitle、birthDates[]，去 studyPeriod/assists/notes；IntendedSchool 增 email；saveApplication 适配新字段；保留 status 字段但固定/忽略
├── components/
│   └── applications/
│       ├── application-form.tsx     # [MODIFY] 内嵌邮箱验证解锁区；字段改家长称呼+多子女出生日期；移除选填块；底部改"生成邮件模板"并弹窗
│       ├── application-card.tsx     # [MODIFY] 去状态徽标；操作改为 查看详情/编辑/删除；查看详情弹 email-template-modal
│       └── email-template-modal.tsx # [NEW] 邮件模板弹窗：主题(可编辑)/收件人(只读)/正文(可编辑) + 各自复制按钮
├── app/
│   ├── apply/page.tsx               # [MODIFY] 标题"编辑申请"保留；onDone 后弹窗而非仅返回
│   └── my-applications/page.tsx     # [MODIFY] 去三段分组与 isClosed；按 tab 平铺；新增/编辑跳转保留
```

## 设计风格

沿用项目现有 glassmorphism + 圆角卡片风格，保证与站点整体视觉一致。新增「邮箱验证解锁区」与「邮件模板弹窗」采用相同 glass 面板语言，弹窗为居中浮层（backdrop blur），字段置灰态使用 `bg-bg-soft text-ink-soft` 明确传达「未解锁」。

## 页面/组件区块设计

### 申请表单（application-form）

- 顶部邮箱验证解锁区（未登录时）：邮箱输入 + 「获取验证码」按钮；验证态显示验证码输入框 + 「确认」按钮，成功后出现「已验证」绿色小标。
- 字段区块：联系邮箱（必填）、家长称呼（小字提示）、学生1出生日期 + 「+」解锁更多学生、所在城市、意向学校（保留一键导入心愿单）。
- 底部：取消 / 生成邮件模板（主按钮）。
- 未解锁时除邮箱/家长称呼外所有输入 `disabled` 且置灰。

### 邮件模板弹窗（email-template-modal）

- 标题「邮件模板」。
- 区块1 邮件主题：可编辑 textarea + 复制按钮。
- 区块2 收件人：只读 input（邮箱分号分隔）+ 复制按钮。
- 区块3 邮件正文：可编辑 textarea + 复制按钮。
- 底部「完成」关闭按钮。
- 移动端自适应宽度，桌面端固定 max-w。

### 我的申请卡片（application-card）

- 去掉状态色块；顶部展示意向学校 chips；中部展示家长称呼/学生出生日期/城市；底部三按钮：查看详情、编辑、删除（图标）。