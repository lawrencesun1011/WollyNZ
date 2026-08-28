---
name: ai-email-template-generation
overview: 点击「生成邮件模板」后立即调用 CloudBase hy3 大模型，用申请信息自动生成英文邮件主题与正文，填入邮件模板弹窗的两个输入框供复制。
todos:
  - id: create-ai-generator
    content: 新增 ai-email-generator.ts，实现 buildAiEmailPrompt 拼装优化 prompt 与 parseAiEmailReply 容错解析 subject/body
    status: pending
  - id: create-route
    content: 新增 POST /api/generate-email 路由，读 CLOUDBASE_APIKEY/ENV_ID 调 hy3 并做错误降级
    status: pending
    dependencies:
      - create-ai-generator
  - id: wire-modal
    content: 改造 email-template-modal：打开自动生成、loading/错误态、重新生成按钮，填入主题与正文
    status: pending
    dependencies:
      - create-route
---

## 产品概述

在申请学校（中小学/幼儿园）的「邮件模板」弹窗中，接入 CloudBase 的 hy3 大模型：用户点击「生成邮件模板」后弹窗立即打开，并自动调用 AI，根据用户填写的申请信息生成英文邮件主题与正文，分别填入「邮件主题」「邮件正文」两个输入框，方便用户直接复制。

## 核心功能

- 点击「生成邮件模板」→ 弹窗打开 → 自动触发 AI 生成（无需用户再点按钮），主题与正文自动填充。
- 自动收集用户已填信息（家长称呼、省份/城市、孩子出生日期、计划游学时间、意向学校名）作为生成依据。
- 调用 CloudBase AI（hy3 模型）生成英文邮件，返回结构化「主题 + 正文」，分别填入两个输入框。
- 生成中显示 loading 状态；失败给出可读错误提示并保留手动填写能力。
- 弹窗内提供「重新生成」按钮，可换一种写法或失败重试；主题与正文仍可手动编辑、复制。
- 两处入口一致：申请表单「生成邮件模板」后、以及申请卡片查看已有申请时打开弹窗，均自动生成。

## 技术栈

- 现有：Next.js 16（App Router）+ TypeScript + React 19 + Tailwind 4 + lucide-react。
- AI：CloudBase 大模型 HTTP API（`hy3` 模型），走服务端 Next.js API route 调用，避免把 `CLOUDBASE_APIKEY` 暴露到浏览器。

## 实现方式

采用「前端组件 → 服务端 API route → CloudBase AI」三层结构，点击生成后自动调用：

1. 前端 `EmailTemplateModal` 在挂载时（`useEffect`）自动发起 AI 生成请求，把弹窗收到的 `item`（`ApplicationItem`）中与生成相关的字段（家长称呼、省份/城市、孩子出生日期、游学时间、意向学校名）发给服务端。
2. 服务端新增 route `POST /api/generate-email`：从环境变量读取 `CLOUDBASE_ENV_ID` 与 `CLOUDBASE_APIKEY`，用 `buildAiEmailPrompt` 拼接优化后的英文生成 prompt，调用 CloudBase `hy3` 模型的 chat/completions 接口。
3. 服务端用 `parseAiEmailReply` 解析模型返回的 JSON（`{subject, body}`），校验后返回 `{subject, body}`；异常时降级并返回可读错误。

关键决策与理由：

- **服务端调用而非浏览器 SDK**：`CLOUDBASE_APIKEY` 是服务端密钥，且用户明确指定用它；浏览器 `@cloudbase/js-sdk` 用 publishable key + 匿名鉴权，与用户意图不符。服务端 route 符合现有 `schools-all`/`ece-all` 的既有模式。
- **弹窗打开即自动触发**：`EmailTemplateModal` 用 `useEffect`（依赖 `item.id`，防重复）在挂载后自动调 AI，满足「点击生成邮件模板后立即调用」。弹窗内保留「重新生成」按钮以支持重试/换写。
- **非流式 + JSON 结构化输出**：邮件内容短、无需流式；让模型只输出一个 JSON 对象，服务端解析后回填，前端处理简单稳定。
- **复用现有日期格式化工具**：`studyPeriodToString`/`exactToString`/`fuzzyToString` 已在 `applications.ts`，用于生成"计划游学时间"可读文本。

## 实现注意

- **密钥安全**：只读取 `CLOUDBASE_APIKEY`、`CLOUDBASE_ENV_ID`（均非 NEXT_PUBLIC_），绝不能 import 到客户端代码或返回给前端。
- **错误处理与容错**：AI 偶发返回非 JSON/缺字段/网关超时，服务端 try/catch 并降级：若返回纯文本则作为正文、主题留空；网络失败返回明确错误，前端内联提示。
- **Prompt 设计**：系统提示约束"输出纯英文、称呼通用（Dear Officer / To Whom It May Concern）、仅输出 JSON `{"subject":"...","body":"..."}`"；用户信息由服务端用申请字段拼接，字段缺失时给占位/省略，避免发送不存在的值。
- **防重复请求**：`useEffect` 以 `item.id` 为依赖并加 `generated` 状态，避免弹窗多次挂载/重渲染重复调用；重新生成按钮手动重置。
- **性能**：单次请求、非流式；服务端不加缓存（每次反映最新填写）；route 内不做额外 IO。
- **影响面**：只改邮件模板弹窗 + 新增一个 API route + 新增一个 lib 工具文件，不动申请数据流、不动其他页面。

## 架构设计

```mermaid
flowchart LR
  subgraph 前端
    A[EmailTemplateModal 打开] -->|useEffect 自动触发| B[POST /api/generate-email]
    B -->|{subject, body}| A
    A -->|重新生成按钮| B
  end
  B -->|读 CLOUDBASE_ENV_ID / CLOUDBASE_APIKEY| C[CloudBase AI hy3]
  C -->|choices[0].message.content JSON| B
  B -->|parseAiEmailReply 解析校验| A
```

## 目录结构

```
src/
├── app/api/generate-email/
│   └── route.ts                    # [NEW] POST：读 env、拼 prompt、调 hy3、解析返回、错误处理
└── components/applications/
    ├── email-template-modal.tsx    # [MODIFY] 打开即自动生成 + loading/错误态 + 「重新生成」按钮，填入 subject/body
    └── ai-email-generator.ts       # [NEW] 纯函数：由 ApplicationItem 组装 prompt、解析模型 JSON
```

- `route.ts`：服务端唯一接触 `CLOUDBASE_APIKEY` 的地方。接收申请信息 → 调 `buildAiEmailPrompt` 生成 prompt → `fetch` CloudBase 端点 → `parseAiEmailReply` 解析 JSON → 返回 `{subject, body}` 或错误。
- `ai-email-generator.ts`：导出 `buildAiEmailPrompt(item)`（拼中文信息 + 英文输出约束）与 `parseAiEmailReply(text)`（容错解析 `{subject, body}`）。独立纯函数便于测试与两端复用。
- `email-template-modal.tsx`：挂载后自动调 `/api/generate-email`，`item` 作为请求体；loading 时显示"正在生成邮件模板…"，成功 `setSubject/setBody`，失败内联错误提示；新增「重新生成」按钮。保留原手动编辑与复制能力。

## 关键代码结构（接口定义）

```ts
// src/components/applications/ai-email-generator.ts
export function buildAiEmailPrompt(item: ApplicationItem): string;
export function parseAiEmailReply(text: string): { subject: string; body: string };

// POST /api/generate-email 契约
// 请求 body: { item: ApplicationItem }
// 成功响应: { subject: string; body: string }
// 失败响应: { error: string }（HTTP 非 2xx）
```

## Agent Extensions

### Skill

- **cloudbase**
- 用途：作为 CloudBase AI 接入的官方准则参考（`ai-model-web`/`ai-model-nodejs` 中关于 hy3 调用方式、鉴权、错误码的说明），并核对 CloudBase AI HTTP 端点、Authorization 头、`model=hy3`、请求/响应格式，保证实现严格符合 CloudBase 规范。
- 预期结果：实现符合 CloudBase AI HTTP 调用规范，端点 `https://<ENV_ID>.api.tcloudbasegateway.com/v1/ai/cloudbase/chat/completions`、Bearer 鉴权、`model=hy3` 正确无误。

### MCP

- **CloudBase AI ToolKit**
- 用途：在联调阶段校验 `/api/generate-email` 所调用的 CloudBase AI 端点与 `CLOUDBASE_APIKEY` 鉴权是否可用；必要时用 `envQuery(action=info, envId=...)` 核对环境 ID，用 `queryLogs(action=searchLogs)` 排查 route 调用 AI 的报错日志。
- 预期结果：确认 hy3 模型端点与 API Key 有效；AI 调用异常时可从环境/日志侧定位并解决。