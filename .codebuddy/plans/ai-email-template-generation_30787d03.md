---
name: ai-email-template-generation
overview: 点击「生成邮件模板」后立即调用 CloudBase hy3 大模型生成英文邮件主题与正文并自动填入弹窗；弹窗底部「完成」左侧提供「重新生成」按钮，「完成」将用户编辑后的主题/正文以用户改动为准回写保存。
todos:
  - id: create-ai-generator
    content: 新增 ai-email-generator.ts，实现 buildAiEmailPrompt 拼装优化 prompt 与 parseAiEmailReply 容错解析 subject/body
    status: completed
  - id: extend-types
    content: 在 lib/applications.ts 的 ApplicationForm/ApplicationItem 新增 emailSubject、emailBody 可选字段
    status: completed
  - id: create-route
    content: 新增 POST /api/generate-email 路由，读 CLOUDBASE_APIKEY/ENV_ID 调 hy3 并做错误降级，用 [mcp:CloudBase AI ToolKit] 校验端点和密钥
    status: completed
    dependencies:
      - create-ai-generator
  - id: wire-modal
    content: 改造 email-template-modal：打开自动生成、loading/错误态、底部重新生成按钮、完成传回编辑值，用 [skill:cloudbase] 核对 AI 调用规范
    status: completed
    dependencies:
      - create-route
      - extend-types
  - id: wire-save
    content: 改造 application-form 与 application-card 的 onClose，接收 subject/body 后 updateApplication 保存
    status: completed
    dependencies:
      - wire-modal
---

## 产品概述

在申请学校（中小学/幼儿园）的「邮件模板」弹窗中接入 CloudBase 的 hy3 大模型。用户点击「生成邮件模板」后弹窗立即打开并自动调用 AI，根据用户填写的申请信息（家长称呼、省份/城市、孩子出生日期、计划游学时间、意向学校）生成英文邮件主题与正文，分别填入「邮件主题」「邮件正文」输入框，方便用户复制。

## 核心功能

- 点击「生成邮件模板」→ 弹窗打开 → 自动触发 AI 生成并填充主题与正文，无需用户再点按钮。
- 弹窗底部、「完成」按钮左侧提供「重新生成」按钮，可换一种写法或失败重试。
- 「完成」按钮带保存功能：用户可编辑主题/正文，点「完成」以用户改动为准保存到申请数据。
- 生成中显示 loading；失败给出可读错误提示并保留手动填写能力。
- 两处入口一致：申请表单「生成邮件模板」后、申请卡片查看已有申请时，打开弹窗均自动生成，且关闭时保存编辑结果。
- 调用 CloudBase AI（hy3 模型），生成结构化「主题 + 正文」。

## 技术栈

- 现有：Next.js 16（App Router）+ TypeScript + React 19 + Tailwind 4 + lucide-react。
- AI：CloudBase 大模型 HTTP API（`hy3` 模型），走服务端 Next.js API route 调用，避免把 `CLOUDBASE_APIKEY` 暴露到浏览器。

## 实现方式

采用「前端组件 → 服务端 API route → CloudBase AI」三层结构：

1. 前端 `EmailTemplateModal` 在挂载时（`useEffect`）自动调 `/api/generate-email`，把弹窗收到的 `item`（`ApplicationItem`）中与生成相关的字段（家长称呼、省份/城市、孩子出生日期、游学时间、意向学校名）发给服务端。
2. 服务端 route `POST /api/generate-email`：从环境变量读 `CLOUDBASE_ENV_ID`、`CLOUDBASE_APIKEY`，用 `buildAiEmailPrompt` 拼接优化后的英文生成 prompt，调 CloudBase `hy3` 的 chat/completions 接口。
3. 服务端用 `parseAiEmailReply` 解析模型返回的 JSON（`{subject, body}`），校验后返回 `{subject, body}`；异常时降级并返回可读错误。

关键决策与理由：

- **服务端调用而非浏览器 SDK**：`CLOUDBASE_APIKEY` 是服务端密钥，且用户明确指定用它；浏览器 `@cloudbase/js-sdk` 用 publishable key + 匿名鉴权，与用户意图不符。服务端 route 符合现有 `schools-all`/`ece-all` 的既有模式。
- **弹窗打开即自动触发**：`EmailTemplateModal` 用 `useEffect`（依赖 `item.id` 并加生成状态锁）挂载后自动调 AI，满足「点击生成邮件模板后立即调用」。
- **非流式 + JSON 结构化输出**：邮件内容短、无需流式；让模型只输出一个 JSON 对象，服务端解析后回填，前端处理简单稳定。
- **完成带保存**：`ApplicationForm`/`ApplicationItem` 新增顶层 `emailSubject?`、`emailBody?` 字段；`EmailTemplateModal` 的 `onClose(subject, body)` 把当前编辑值传回，调用方用 `updateApplication(id, { emailSubject, emailBody })` 持久化（以用户改动为准）。
- **复用现有工具**：`studyPeriodToString`/`exactToString`/`fuzzyToString` 已在 `applications.ts`，用于生成「计划游学时间」可读文本。

## 实现注意

- **密钥安全**：只读 `CLOUDBASE_APIKEY`、`CLOUDBASE_ENV_ID`（均非 NEXT_PUBLIC_），绝不能 import 到客户端或返回前端。
- **错误容错**：AI 偶发返回非 JSON/缺字段/网关超时，服务端 try/catch 降级：若返回纯文本则作为正文、主题留空；网络失败返回明确错误，前端内联提示。
- **Prompt 设计**：系统提示约束「输出纯英文、称呼通用（Dear Officer / To Whom It May Concern）、仅输出 JSON `{"subject":"...","body":"..."}`」；用户信息由服务端拼接，字段缺失给占位/省略，避免发送不存在的值。
- **防重复请求**：`useEffect` 以 `item.id` 为依赖并加状态锁（如 `loading || hasFilled`），避免重渲染重复调用；「重新生成」按钮显式重置后再次调用。
- **保存与初始值**：弹窗打开时若有已存的 `item.emailSubject`/`emailBody` 则作为输入框初始值（避免编辑后重开被覆盖）；点「完成」时以当前编辑值为准保存。
- **性能**：单次请求、非流式；服务端不加缓存（每次反映最新填写）；route 内不做额外 IO。
- **影响面**：只改邮件模板弹窗 + 新增一个 API route + 新增一个 lib 工具 + 扩展两个类型字段，不动申请数据流、不动其他页面。

## 架构设计

```mermaid
flowchart LR
  subgraph 前端
    A[EmailTemplateModal 打开] -->|useEffect 自动触发| B[POST /api/generate-email]
    B -->|{subject, body}| A
    A -->|重新生成按钮| B
    A -->|点完成 onClose(subject,body)| C[updateApplication 保存 emailSubject/emailBody]
  end
  B -->|读 CLOUDBASE_ENV_ID / CLOUDBASE_APIKEY| D[CloudBase AI hy3]
  D -->|choices[0].message.content JSON| B
  B -->|parseAiEmailReply 解析校验| A
```

## 目录结构

```
src/
├── app/api/generate-email/
│   └── route.ts                    # [NEW] POST：读 env、拼 prompt、调 hy3、解析返回、错误降级
├── lib/applications.ts             # [MODIFY] ApplicationForm/ApplicationItem 新增 emailSubject/emailBody 可选字段
└── components/applications/
    ├── email-template-modal.tsx    # [MODIFY] 打开自动生成 + loading/错误态 + 重新生成按钮 + 完成保存
    ├── ai-email-generator.ts       # [NEW] 纯函数：由 ApplicationItem 组装 prompt、解析模型 JSON
    ├── application-form.tsx        # [MODIFY] onClose 改为接收 subject/body 并 updateApplication 保存
    └── application-card.tsx        # [MODIFY] onClose 改为接收 subject/body 并 updateApplication 保存
```

- `route.ts`：服务端唯一接触 `CLOUDBASE_APIKEY` 处。接收申请信息 → 调 `buildAiEmailPrompt` 生成 prompt → `fetch` CloudBase 端点 → `parseAiEmailReply` 解析 JSON → 返回 `{subject, body}` 或错误。
- `ai-email-generator.ts`：导出 `buildAiEmailPrompt(item)` 与 `parseAiEmailReply(text)`。独立纯函数便于测试与两端复用。
- `email-template-modal.tsx`：props 改为 `{ item, onClose(subject, body) }`。挂载后自动调 `/api/generate-email`；loading 显示「正在生成邮件模板…」；成功 `setSubject/setBody`；失败内联错误。底部左侧「重新生成」、右侧「完成」（调 `onClose(subject, body)`）。
- `applications.ts`：类型新增两个可选字段（不影响既有数据结构与迁移逻辑）。
- `application-form.tsx` / `application-card.tsx`：`onClose` 接收 `(subject, body)` 后调 `updateApplication(item.id, { emailSubject: subject, emailBody: body })` 保存。

## 关键代码结构（接口定义）

```ts
// src/lib/applications.ts
export interface ApplicationForm {
  email: string;
  parentTitle?: string;
  birthDates?: (ExactDate | null)[];
  province?: string;
  city?: string;
  studyPeriod?: StudyPeriod;
  intendedSchools: IntendedSchool[];
  emailSubject?: string; // 邮件主题（AI 生成，可编辑，点完成保存）
  emailBody?: string;    // 邮件正文（AI 生成，可编辑，点完成保存）
}

// src/components/applications/ai-email-generator.ts
export function buildAiEmailPrompt(item: ApplicationItem): string;
export function parseAiEmailReply(text: string): { subject: string; body: string };

// EmailTemplateModal 新契约
// props: { item: ApplicationItem; onClose: (subject: string, body: string) => void }

// POST /api/generate-email 契约
// 请求 body: { item: ApplicationItem }
// 成功响应: { subject: string; body: string }
// 失败响应: { error: string }（HTTP 非 2xx）
```

## Agent Extensions

### Skill

- **cloudbase**
- 用途：作为 CloudBase AI 接入的官方准则参考，核对 CloudBase AI HTTP 端点、Authorization 头、`model=hy3`、请求/响应格式，保证实现严格符合 CloudBase 规范。
- 预期结果：`/api/generate-email` 调用的端点 `https://<ENV_ID>.api.tcloudbasegateway.com/v1/ai/cloudbase/chat/completions`、Bearer 鉴权、`model=hy3` 正确无误。

### MCP

- **CloudBase AI ToolKit**
- 用途：在联调阶段校验 `/api/generate-email` 调用的 CloudBase AI 端点与 `CLOUDBASE_APIKEY` 鉴权是否可用；必要时用 `envQuery(action=info)` 核对环境 ID，用 `queryLogs(action=searchLogs)` 排查 AI 调用报错。
- 预期结果：确认 hy3 模型端点与 API Key 有效；AI 调用异常时能定位并解决。