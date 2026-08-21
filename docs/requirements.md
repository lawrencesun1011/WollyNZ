# NZ 游学库 · 需求文档

> 本文件为项目的**单一事实来源（Single Source of Truth）**。
> 每次与开发交互后都会增量更新，记录需求、决策与变更。

---

## 1. 项目目标

构建一个**面向中国游学家庭**的新西兰教育机构信息查询网站，核心能力是**学校库**——
用户可按地区、类型、教学语言、寄宿条件等维度筛选幼儿园与中小学。

- 界面以**中文**呈现，机构名称保留**英文原文**（不翻译）。
- 数据以新西兰政府开放数据（data.govt.nz，CC BY 4.0）为基础。
- 少量图文内容（图片、介绍文本）由编辑手动低频维护。

---

## 2. 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Next.js 15（App Router）+ TypeScript + React 19 |
| 样式 | Tailwind CSS 4（`@theme` 配置，无 tailwind.config） |
| 目录 | `src/` 为主目录，`@/*` → `./src/*` |
| 包管理 | npm |
| 部署 | **EdgeOne Makers**（支持 Next.js 构建产物） |
| 图标 | lucide-react |
| 地图 | Leaflet 1.9 + leaflet.markercluster（OSM 免费瓦片） |
| 图表 | Chart.js 4（类型饼图 / 地区柱图） |

设计风格：**新西兰自然风 + Glassmorphism 轻玻璃 + 清新渐变（teal 主色 #0E7C7B/#1B9AAA/#2BB1A8）**，Premium 且响应式。

---

## 3. 数据源

数据来自 data.govt.nz 的 **Directory of educational institutions** 数据集
（Package ID：`c1923d33-e781-46c9-9ea1-d9b850082be4`，CC BY 4.0）。

### 3.1 全量拉取端点（CKAN Datastore dump）

每日凌晨**全量拉取一次**更新。

| 分类 | Resource ID | JSON 拉取端点 |
| --- | --- | --- |
| 幼儿园（ECE） | `a9d65b07-8483-4b05-bdfd-d2abe4f38827` | `https://catalogue.data.govt.nz/datastore/dump/a9d65b07-8483-4b05-bdfd-d2abe4f38827?format=json` |
| 中小学 | `4b292323-9fcc-41f8-814b-3c7b19cf14b3` | `https://catalogue.data.govt.nz/datastore/dump/4b292323-9fcc-41f8-814b-3c7b19cf14b3?format=json` |

> 端点常量已落地于 `lib/data-sources.ts`，定时全量更新逻辑后续接入。

### 3.2 幼儿园（ECE）资源关键字段

`ECE_Id`、`Org_Name`、`Org_Type`、`Definition`、`Authority`、`Telephone`、
`Email`、`Add1_Line1`、`Add1_Suburb`、`Add1_City`、`Latitude`、`Longitude`、
`Territorial_Authority`、`Regional_Council`、`Education_Region`、
`20_Hrs_ECE`、`Total`、`European`/`Māori`/`Pacific`/`Asian`/`Other`、`Roll_Date`。

### 3.3 中小学资源关键字段

`School_Id`、`Org_Name`、`Telephone`、`Email`、`URL`、`Add1_Suburb`、`Add1_City`、
`Urban_Rural_Indicator`、`Org_Type`、`Authority`、`Territorial_Authority`、
`Regional_Council`、`Education_Region`、`Latitude`、`Longitude`、`Total`、
`European`/`Māori`/`Pacific`/`Asian`/`MELAA`/`Other`/`International`、
`BoardingFacilities`、`Language_of_Instruction`、`Status`、`DateSchoolOpened`。

### 3.4 其他数据

图片、文本介绍等由编辑**手动低频维护**（来源待定，后续补充）。

---

## 4. 本期范围（第 1 期：项目搭建 + 落地页 mock）

- [x] Next.js + TS + Tailwind + shadcn/ui 工程脚手架与配置文件。
- [x] 根布局 + 毛玻璃吸顶导航 + 页脚。
- [x] 落地页（`/`）：Hero 主视觉 + **学校库入口模块**（幼儿园 / 中小学分类卡片，hover 动效 + 路由跳转）+ 关于区块。
- [x] 占位列表页 `/ece`、`/schools`（"数据接入中"提示，预留筛选栏与列表栅格）。
- [x] 数据层类型与常量：`lib/types.ts`、`lib/data-sources.ts`。
- [x] 需求文档 `docs/requirements.md`。

### 3.5 真实数据接入（已落地）

- [x] `scripts/fetch-data.mjs`：全量拉取两个 CKAN Datastore JSON 端点，按 `fields`
      顺序将数组记录映射为对象数组，落地到 `data/ece.json`、`data/schools.json`，
      并生成 `data/_meta.json`（抓取时间 + 各源记录数）。
- [x] `lib/institutions.ts`：服务端读取本地数据（`getEceList` / `getSchoolList` / `getDataMeta`），
      定义 `EceRecord` / `SchoolRecord` 接口，页面在服务端组件读取，不进客户端 bundle。
- [x] `package.json` 增加 `fetch:data` 脚本（`npm run fetch:data`）。
- [x] `/ece`、`/schools` 占位页升级为真实数据列表（机构卡片网格 + 数据更新时间戳 + 样例前 60 条）。
- [x] `.gitignore` 忽略 `/data`（由定时任务生成，不入库）。
- **实测结果**：ECE 4371 条、Schools 2578 条，均 HTTP 200 拉取成功，构建通过。

本期**不实现**：每日定时触发（EdgeOne 定时函数/cron 接线）、前端筛选与搜索交互、
详情页、手动维护数据后台、中/EN 切换。

---

## 5. 目录结构（当前）

```
src/
  app/
    layout.tsx              根布局（毛玻璃导航 + 页脚）
    globals.css             Tailwind 4 @theme + glass/地图等自定义类
    page.tsx                落地页（hero + 学校库入口 + 关于）
    ece/page.tsx            幼儿园占位页
    schools/page.tsx        中小学页（服务端读数据 -> SchoolsExplorer）
  components/
    site-header.tsx / site-footer.tsx
    schools/
      schools-explorer.tsx  客户端根组件（状态/过滤/排序/对比编排）
      stats-bar.tsx         顶部统计（总数/公立/私立/平均EQI）
      filter-bar.tsx        筛选栏（搜索/学段/公私立/寄宿/城乡/类型/语言/地区）
      toolbar.tsx           排序 + 网格/列表视图切换 + 计数
      school-card.tsx / school-card-list.tsx
      school-modal.tsx      详情弹层（含族裔条形图）
      ethnic-bar.tsx        族裔占比进度条
      compare-bar.tsx       底部对比条
      school-map.tsx        Leaflet 地图（dynamic ssr:false，聚类/联动）
      charts.tsx            Chart.js 学段饼图 + 地区柱图
  lib/
    types.ts                SchoolFrontend / Filters / Stats 等类型
    data.ts                 getSchoolFrontendList / getDataMeta（读 data/）
    filters.ts              过滤/排序/统计/族裔/配色工具
    data-sources.ts         数据源 resourceId 与 JSON 端点常量
  scripts/
    fetch-data.mjs          全量拉取 + 中小学清洗过滤，输出 data/*.json
  types/
    leaflet-markercluster.d.ts   markercluster 类型声明
data/                        （gitignore 忽略，由 fetch:data 生成）
  schools-frontend.json     过滤后前端数据（约 2465 所）
  schools.json / ece.json   原始落盘
  _meta.json                抓取时间与来源
docs/
  requirements.md           本需求文档
```

---

## 6. 后续待办（Backlog）

- [ ] 每日凌晨定时全量拉取（EdgeOne 定时函数/cron 调用 fetch:data，落盘 data/）。
- [ ] 幼儿园列表页 `/ece`：复用中小学的筛选/地图/图表组件，接 ECE 前端数据。
- [ ] 机构详情独立路由页 `/schools/[id]`（当前为弹层，后续可做 SEO 友好页）。
- [ ] 手动维护的图文内容管理方案（图片、介绍文本）。
- [ ] 中 / EN 语言切换。
- [ ] EdgeOne Makers 部署配置与流水线。

---

## 7. 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-08-19 | 初始化需求文档；确认技术栈、语言（中文为主）、落地页范围（学校库入口）、需求文档形式（docs/requirements.md）；完成项目搭建与落地页 mock。 |
| 2026-08-19 | 真实拉取数据：新增 `scripts/fetch-data.mjs`，落地 data/ 本地数据（ECE 4371 + Schools 2578 条），`/ece`、`/schools` 升级为真实数据列表，.gitignore 忽略 /data。 |
| 2026-08-19 | 项目被重置为 Next.js 15 + React 19 + Tailwind 4（src/ 脚手架）。在 src/ 上重建：清理旧 app/ 与冲突配置；中小学页 `/schools` 完整复现参考 schools.html（统计区、筛选栏、排序、网格/列表、详情弹层+族裔图、对比条、Leaflet 地图、Chart.js 图表）；fetch 脚本增加中小学清洗过滤生成 schools-frontend.json（2465 所）；删除旧失效 cron 端点；更新需求文档。构建通过。 |
