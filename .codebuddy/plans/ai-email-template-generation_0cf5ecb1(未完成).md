---
name: ai-email-template-generation
overview: 在申请表单生成邮件模板时，接入 CloudBase 的 hy3 大模型，根据用户填写的信息自动生成英文邮件主题与正文，并回填到邮件模板弹窗的两个输入框中供复制。
todos:
  - id: create-ai-generator
    content: 新增 ai-email-generator.ts，实现由 ApplicationItem 拼装 prompt 与容错解析 subject/body
    status: pending
  - id: create-route
    content: 新增 POST /api/generate-email 路由，读 CLOUDBASE_APIKEY/ENV_ID 调 hy3 并做错误处理
    status: pending
    dependencies:
      - create-ai-generator
  - id: wire-modal
    content: 改造 email-template-modal，加 AI 生成按钮、loading 与错误提示，填入主题和正文框
    status: pending
    dependencies:
      - create-route
---

## 产品概述

在申请学校（中小学/幼儿园）的「邮件模板」弹窗中，新增 AI 一键生成英文邮件功能：用户点击按钮后，后端用用户填写的申请信息组装 prompt，调用 CloudBase 的 `hy3` 大模型，生成英文邮件主题与正文，自动填入「邮件主题」「邮件正文」两个输入框，方便用户直接复制。

## 核心功能

- 在邮件模板弹窗内新增「AI 生成邮件」按钮，支持中小学与幼儿园两种申请。
- 自动收集用户已填信息（家长称呼、省份/城市、孩子出生日期、计划游学时间、意向学校）作为生成依据。
- 调用 CloudBase AI（hy3 模型）生成英文邮件，返回结构化「主题 + 正文」，分别填入两个输入框。
- 生成中显示 loading 状态，失败给出可读错误提示；已生成内容可再次点击重新生成。
- 主题与正文均可编辑，沿用现有复制按钮，方便用户复制使用。

## 技术栈

- 现有：Next.js 16（App Router）+ TypeScript + React 19 + Tailwind 4 + lucide-react。
- AI：CloudBase 大模型 HTTP API（`hy3`），走服务端 Next.js API route 调用，避免把 `CLOUDBASE_APIKEY` 暴露到浏览器。

## 实现方式

采用「前端组件 → 服务端 API route → CloudBase AI」三层结构：

1. 前端 `EmailTemplateModal` 增加「AI 生成」按钮，把弹窗收到的 `item`（`ApplicationItem`）中与生成相关的字段（家长称呼、省份/城市、孩子出生日期、游学时间、意向学校名）发给服务端。
2. 服务端新增 route `POST /api/generate-email`：从环境变量读取 `CLOUDBASE_ENV_ID` 与 `CLOUDBASE_APIKEY`，拼接优化后的英文生成 prompt，调用 CloudBase `hy3` 模型的 chat/completions 接口。
3. 服务端解析模型返回的 JSON（`{subject, body}`），校验后返回 `{subject, body}`；异常时返回可读错误。

关键决策与理由：

- **服务端调用而非浏览器 SDK**：`CLOUDBASE_APIKEY` 是服务端密钥，且用户明确指定用它；浏览器 `@cloudbase/js-sdk` 用的是 publishable key + 匿名鉴权，与用户意图不符。服务端 route 符合现有 `schools-all`/`ece-all` 的既有模式。
- **非流式 + JSON 结构化输出**：邮件模板内容较短，无需流式；让模型只输出一个 JSON 对象，服务端解析后回填，前端处理简单稳定。
- **复用现有日期格式化工具**：`studyPeriodToString`/`exactToString`/`fuzzyToString` 已在 `applications.ts`，服务端 route 直接引用生成"计划游学时间"可读文本。

## 实现注意

- **密钥安全**：只读取 `CLOUDBASE_APIKEY`、`CLOUDBASE_ENV_ID`（均非 NEXT_PUBLIC），绝不能 import 到客户端代码或返回给前端。
- **错误处理与容错**：AI 偶发返回非 JSON / 缺字段 / 网关超时，服务端需 try/catch 并降级：若返回的是纯文本而非 JSON，把全文作为正文、主题留空或给出默认；网络失败返回明确错误信息，前端 toast/内联提示。
- **Prompt 设计**：系统提示约束"输出纯英文、称呼通用（Dear Officer / To Whom It May Concern）、仅输出 JSON `{"subject":"...","body":"..."}`"；用户信息部分由服务端用申请字段拼接，字段缺失时给占位/省略，避免发送不存在的值。
- **性能**：单次请求、非流式；服务端不加缓存（每次生成结果应反映最新填写），避免在 route 中做额外 IO。
- **影响面**：只改邮件模板弹窗 + 新增一个 API route + 新增一个 lib 工具文件，不动申请数据流、不动其他页面。

## 架构设计

```mermaid
flowchart LR
  subgraph 前端
    A[EmailTemplateModal] -->|点击 AI 生成| B[POST /api/generate-email]
    B -->|{subject, body}| A
  end
  B -->|读取 CLOUDBASE_ENV_ID / CLOUDBASE_APIKEY| C[CloudBase AI hy3]
  C -->|choices[0].message.content JSON| B
  B -->|解析校验| A
```

## 目录结构

```
src/
├── app/api/generate-email/
│   └── route.ts                    # [NEW] POST 处理：读 env、拼 prompt、调 hy3、解析返回、错误处理
└── components/applications/
    ├── email-template-modal.tsx    # [MODIFY] 新增「AI 生成邮件」按钮 + loading/错误态，填入 subject/body
    └── ai-email-generator.ts       # [NEW] 纯函数：由 ApplicationItem 组装 prompt、解析模型 JSON，供 route 与前端复用
```

新增文件说明：

- `route.ts`：服务端唯一接触 `CLOUDBASE_APIKEY` 的地方。负责：接收申请信息 → 调 `buildAiEmailRequest` 生成 prompt → `fetch` CloudBase 端点 → `parseAiEmailReply` 解析 JSON → 返回 `{subject, body}` 或错误。
- `ai-email-generator.ts`：导出 `buildAiEmailPrompt(item)`（拼中文信息 + 英文输出约束）与 `parseAiEmailReply(text)`（容错解析 `{subject, body}`）。独立成纯函数便于单元测试与两端复用。

修改文件说明：

- `email-template-modal.tsx`：在主题/正文上方新增「AI 生成」按钮区域；点击调 `fetch('/api/generate-email',{method:'POST',body:JSON.stringify({item})})`；loading 禁用按钮 + 旋转图标；成功 `setSubject/setBody`；失败内联错误提示。保留原手动填写与复制能力。

## 关键代码结构（接口定义）

```ts
// src/components/applications/ai-email-generator.ts
export function buildAiEmailPrompt(item: ApplicationItem): string;
export function parseAiEmailReply(text: string): { subject: string; body: string };

// POST /api/generate-email 请求/响应契约
// 请求 body: { item: ApplicationItem }
// 成功响应: { subject: string; body: string }
// 失败响应: { error: string }（HTTP 非 2xx）
```

## Agent Extensions

### MCP

- **CloudBase AI ToolKit**
- 用途：用于确认 CloudBase 环境的 AI 模型能力与 API Key 有效性（可先 `envQuery` 核对环境 ID、按需确认 `ai_model` 相关 HTTP API 端点），并在联调阶段校验 `/api/generate-email` 所调用的 CloudBase AI 端点与鉴权是否可用。
- 预期结果：确认 `hy3` 模型端点 `https://<ENV_ID>.api.tcloudbasegateway.com/v1/ai/cloudbase/chat/completions` 可用、API Key 有效，问题定位时可从环境/日志侧辅助排查。

### Skill

- **cloudbase**
- 用途：作为 CloudBase AI 接入的官方准则参考（`ai-model-web`/`ai-model-nodejs` 中关于 hy3 调用方式、鉴权、错误码的说明），保证按 CloudBase 规范实现，避免踩坑。
- 预期结果：实现严格符合 CloudBase AI HTTP 调用规范（端点、Authorization 头、model=hy3、请求/响应格式），并通过 skill 中风险清单自查。