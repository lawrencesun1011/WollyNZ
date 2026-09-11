# GoalNZ · 需求与技术文档

> 本文件是项目的**单一事实来源**，记录目标、技术选型、目录结构与部署方式。
> 架构或依赖发生调整时请同步更新。

---

## 1. 项目目标

面向**中国游学家庭**的新西兰教育机构信息查询网站：

- 核心能力是**学校库**：按地区、类型、教学语言、寄宿条件等维度筛选幼儿园与中小学
- 提供**游学攻略**长文内容（六个章节）
- 支持心愿单、对比、申请记录与住宿意向的**云端同步**

约束：

- 界面以**中文**呈现，机构名称保留**英文原文**（不翻译）
- 数据以新西兰政府开放数据（data.govt.nz，CC BY 4.0）为基础
- 少量图文内容由编辑手动低频维护

---

## 2. 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Next.js 16.3.2（App Router）+ TypeScript + React 19 |
| 样式 | Tailwind CSS 4（`@theme` 配置，无 tailwind.config） |
| 目录 | `src/` 为主目录，`@/*` → `./src/*` |
| 包管理 | npm |
| 渲染 | **静态导出**（`output: "export"`，无服务端运行时，因此没有 API Route） |
| 部署 | **Cloudflare Pages** `https://goalnz.pages.dev` |
| AI 代理 | **Cloudflare Worker** `workers/ai-proxy/`，转发 OpenRouter（`openrouter/free`） |
| 数据库 | **Supabase** PostgreSQL，项目 ref `orwqyvjkcqnswpjnoeux`，区域 `ap-southeast-1`（新加坡） |
| 认证 | Supabase Auth，**纯邮箱 6 位验证码 OTP**（无密码，首次登录即创建账号） |
| 邮件 | Supabase SMTP → **Resend** |
| 图标 | lucide-react |
| 地图 | MapLibre GL JS 5 + OpenFreeMap（免 key 矢量瓦片）；卫星图用 Esri World Imagery |
| 字体 | 正文 Inter / 苹方 / 微软雅黑（无衬线）；首页与攻略用 Noto Serif SC（衬线，本地打包） |

设计风格：暖白纸色 + 墨绿衬线的**编辑风（Editorial）**，内页为湖水蓝绿体系。

> **历史**：项目先后使用过 CloudBase、EdgeOne，现统一为 Cloudflare + Supabase。
> 旧架构遗留（Dockerfile、`cloudbase/` 目录等）已在 2026-09-12 的清理中移除，需要时可从 git 历史找回。

---

## 3. 数据源

来自 data.govt.nz 的 **Directory of educational institutions**（CC BY 4.0）。

### 3.1 拉取端点（CKAN Datastore dump）

| 分类 | Resource ID |
| --- | --- |
| 幼儿园（ECE） | `a9d65b07-8483-4b05-bdfd-d2abe4f38827` |
| 中小学 | `4b292323-9fcc-41f8-814b-3c7b19cf14b3` |

端点形如 `https://catalogue.data.govt.nz/datastore/dump/<resourceId>?format=json`。

### 3.2 数据流水线

```bash
npm run fetch:data            # scripts/fetch-data.mjs          拉取并清洗 -> data/
npm run prepare:static-data   # scripts/prepare-static-data.mjs 生成 public/api/*.json
npm run optimize:images       # scripts/optimize-images.mjs     assets-src/images -> public/images（WebP）
```

产物：

| 文件 | 说明 |
| --- | --- |
| `data/schools.json`、`data/ece.json` | 原始落盘 |
| `data/schools-frontend.json`、`data/ece-frontend.json` | 过滤派生，供前端直接使用 |
| `data/_meta.json` | 抓取时间与各源记录数 |
| `public/api/*.json` | 构建期生成，运行时由 `schools-store.ts` / `ece-store.ts` fetch（已 gitignore） |

数据为**手动低频更新**：跑 `fetch:data` → 提交 git → 重新构建部署。

---

## 4. 认证与用户数据

- 登录方式：**邮箱 6 位验证码**（Supabase OTP），无密码；首次登录自动创建账号
- 邮件模板含 `{{ .Token }}`，OTP 长度已配置为 6 位，与前端校验一致
- 数据表（均启用 RLS，`owner uuid DEFAULT auth.uid()`）：

| 表 | 用途 |
| --- | --- |
| `user_info` | 称呼 / 邮箱 / 省份 / 城市 |
| `user_collections` | 学校与幼儿园的心愿单、对比 |
| `applications` | 学校申请记录 |
| `accommodation_applications` | 住宿意向记录 |

- 前端通过 `@supabase/supabase-js` 直连 PostgREST（带 `apikey` + 用户 JWT），由 RLS 保证数据隔离
- 未登录时数据存 localStorage，登录后合并到云端

---

## 5. 攻略内容

攻略正文以 **Markdown** 编写，构建时解析：

```
content/guide/
  understand.md   了解游学
  schools.md      确定学校
  prepare.md      递交申请
  stay.md         住宿贴士
  packing.md      其它准备
  life.md         入学事项
```

- 文件顶部用 YAML frontmatter 声明 `label`（章节小标签）与 `title`（章节大标题）
- 正文支持：`##` / `###` 标题、段落、无序与有序列表、引用、分隔线、GFM 表格、`**粗体**`、链接、图片
- 图片仅支持项目内路径 `/images/guide/...`（白名单校验）
- 解析由 `src/lib/guide-markdown.ts` 完成，仍经 `parseGuideContent` 白名单校验

**改内容只需编辑对应 `.md` 文件，然后重新构建部署。**

---

## 6. AI 能力

- 「生成邮件模板」等 AI 功能经 Cloudflare Worker 代理调用，密钥不下发到浏览器
- Worker 位于 `workers/ai-proxy/`，密钥以 `AI_API_KEY` Secret 注入（运行时生效，改密钥无需重新构建）
- 模型走 OpenRouter 的 `openrouter/free` 免费路由；换供应商只需改 `AI_BASE_URL` / `AI_MODEL` 两个变量
- 生产环境校验 Supabase 登录态，避免代理被滥用

---

## 7. 目录结构

```
content/guide/*.md        攻略正文源文件（Markdown）
data/                     学校/幼儿园数据与抓取元数据
scripts/                  构建与数据脚本（见 3.2）
assets-src/images/        图片源文件（不部署）
docs/requirements.md      本文档
workers/ai-proxy/         Cloudflare Worker（AI 代理）
src/
  app/                    页面（静态导出）
  components/             组件（guide/ schools/ ece/ editorial/ auth/ 等）
  lib/                    数据、认证、工具与 Markdown 解析
public/
  api/                    构建期生成（gitignore）
  images/                 构建期生成的 WebP（gitignore）
```

---

## 8. 常用命令

```bash
npm run dev         # 本地开发
npm run build       # 构建（prebuild 会自动准备数据与图片）
npm run preview     # 用 wrangler 本地预览静态产物
npm run lint        # 代码检查
npm run fetch:data  # 更新学校/幼儿园数据

# 部署静态站点
npx wrangler pages deploy out --project-name=goalnz

# 部署 AI 代理 Worker
npx wrangler deploy -c workers/ai-proxy/wrangler.toml
```

> 在部分 IDE 内执行 `npm run build` 可能遇到批量删除保护误拦（清理 `.next` 时）。
> 先手动 `rm -rf .next` 再构建即可，这不是项目问题，CI / 云端构建不会触发。

---

## 9. 环境变量

见 `.env.example`（复制为 `.env.local` 后填写，`.env*` 已被 gitignore）：

- `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AI_PROXY_URL`
- Worker 侧：`AI_API_KEY`（Secret，不进仓库）

---

## 10. 后续待办（Backlog）

- [ ] 每日定时全量拉取数据（当前为手动执行 `fetch:data`）
- [ ] 机构详情独立路由页 `/schools/[id]`（当前为弹层，独立页更利于 SEO）
- [ ] 绑定自定义域名（当前使用 `goalnz.pages.dev`）
- [ ] 在 Resend 验证自有域名，替换测试发件人（当前只能发给注册邮箱）
- [ ] 中 / EN 语言切换
