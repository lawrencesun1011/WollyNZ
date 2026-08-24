---
name: ece-explorer
overview: 开发幼儿园（ECE）库页面，复用中小学 schools 模块结构，但数据源来自 data/ece.json，筛选/卡片/详情字段按 ECE 字段映射。
todos:
  - id: add-types
    content: types.ts 新增 EceFrontend 接口（对齐 SchoolFrontend，含学校类型/办学性质/学生/eqi/最大人数/最大2岁以下/接受2岁以下）
    status: completed
  - id: add-data
    content: data.ts 新增 getEceFrontendAll 读取 ece-frontend.json；新增 api/ece-all/route.ts
    status: completed
    dependencies:
      - add-types
  - id: extend-script
    content: fetch-data.mjs 新增 ECE 清洗（Org_Type 过滤、Authority 中文映射、Equity_Index 解析、Under_2s/All_Children/Total 映射），生成 ece-frontend.json 与 _meta
    status: completed
    dependencies:
      - add-types
  - id: ece-filter
    content: filters.ts 新增 ECE 筛选常量（学校类型/办学性质/接受2岁以下）与 applyFilters 支持；复制并改造 filter-bar 为 ece/filter-bar
    status: completed
    dependencies:
      - add-types
  - id: ece-card
    content: 复制 school-card 为 ece/school-card，标签改为学校类型、办学性质、学生(Total)、EQI
    status: completed
    dependencies:
      - add-types
  - id: ece-modal
    content: 复制 school-modal 为 ece/school-modal，详情字段改为 ECE（学校类型/办学性质/在校人数/EQI/最大人数/最大2岁以下/族裔），保留官网/ERO/分享
    status: completed
    dependencies:
      - add-types
  - id: ece-map
    content: 复制 school-map 为 ece/school-map，popup 标签与卡片一致，marker 按学校类型着色，图例改为学校类型
    status: completed
    dependencies:
      - ece-card
      - ece-modal
  - id: ece-explorer-page
    content: 新建 ece-explorer 与 app/ece/page.tsx，组装热门地区+筛选+列表+地图+详情，串联 ECE 数据
    status: completed
    dependencies:
      - add-data
      - ece-filter
      - ece-card
      - ece-modal
      - ece-map
  - id: verify
    content: 运行 fetch-data.mjs 生成数据，启动校验 ECE 页面渲染、筛选、地图与详情字段正确
    status: completed
    dependencies:
      - extend-script
      - ece-explorer-page
---

## 产品概述

开发「幼儿园（ECE）库」页面，复用中小学学校库（schools）的整体结构与交互，但数据来源于 `data/ece.json`，并按 ECE 字段重新映射筛选项、列表卡片标签与详情字段。

## 核心功能

1. 热门地区 + 筛选栏：与中小学一致；筛选项改为「城市、学校类型（仅 Education & Care Service / Free Kindergarten）、办学性质（仅 Privately owned=私立、Community based=公立）、公平指数 EQI、接受 2 岁以下（是/否，由 Under_2s>0 判断）」。
2. 列表卡片：标签改为「学校类型、办学性质、学生（Total）、EQI」。其余交互（心愿、详情、对比）与中小学一致。
3. 地图 popup：与卡片标签保持一致（学校类型、办学性质、学生、EQI）；marker 颜色按「学校类型」着色（替代学段着色）。
4. 详情：学校类型、办学性质、在校人数（Total）、EQI、最大人数（All_Children）、最大 2 岁以下人数（Under_2s）、族裔分布、官网、ERO、分享（与中小学一致）。

## 技术栈

- 沿用现有项目栈：Next.js（App Router，Server Component 首屏 + Client 组件交互）、TypeScript、Tailwind CSS、Leaflet 地图。
- 数据：本地 JSON（`data/ece.json` 原始 + 新增 `data/ece-frontend.json` 预清洗），服务端读取并加 60s 内存缓存，与中小学 `getSchoolFrontendAll` 同模式。

## 实现方案

为降低对中小学模块（schools）的回归风险并保持模块纯净，采用「复制独立组件 + 复用类型与工具」策略：

- 新增 `EceFrontend` 类型，结构与 `SchoolFrontend` 对齐（`src/lib/types.ts` 新增），ECE 用不到的字段（gender/boarding/language/isolation/intl/melaa）置占位/0，保证卡片、详情、地图组件可直接复用。
- 扩展 `src/scripts/fetch-data.mjs`：新增 ECE 清洗逻辑，从 `data/ece.json` 生成 `data/ece-frontend.json`（解析 `Equity_Index` 为数字、`Authority` 映射为「公立/私立」、`Org_Type` 透传、计算 `acceptsUnder2 = Under_2s>0`），并落 `_meta.json` 的 ece 来源信息。
- `src/lib/data.ts` 新增 `getEceFrontendAll()`（读 `ece-frontend.json`，带缓存）。
- 新增 `src/app/api/ece-all/route.ts`（与 `schools-all` 同构，供首屏后续拉补全）。
- 新增 `src/app/ece/page.tsx`（Server Component，读 `getEceFrontendAll` 后传给 `EceExplorer`，复用 `SchoolsPreloader` 的预热思路或本页单独加载）。
- 复制 `schools-explorer` 为 `src/components/ece/ece-explorer.tsx`，复制 `filter-bar`、`school-card`、`school-map`、`school-modal` 为 `src/components/ece/*`，并改字段映射：
- 筛选：`filter-bar` 改为 ECE 筛选项（城市、学校类型双选、办学性质双选、EQI 区间、接受2岁以下是/否）；保留热门地区结构（城市名来自 ECE 数据）。
- 卡片：`school-card` 标签改为「学校类型、办学性质、学生(Total)、EQI」。
- 详情：`school-modal` 的 `SchoolDetailCard` 字段替换为 ECE 字段（学校类型、办学性质、在校人数、EQI、最大人数、最大2岁以下人数、族裔）；官网/ERO/分享逻辑保持不变（ECE 无官网，官网按钮按 `website` 为空处理）。
- 地图：`school-map` 的 popup 标签与卡片一致；marker 着色改用「学校类型→颜色」映射，图例对应改为学校类型。

## 性能与可靠性

- 复用 `SchoolsPreloader` 的本地 JSON 预热机制（或 ece 独立预热），首屏 SSR 直接出数据，避免白屏。
- `ece-frontend.json` 为预清洗结果（约 4000 条），运行时零转换、只读；筛选/排序在客户端内存完成，沿用现有 `applyFilters/applySort`。
- 地图 marker 聚合阈值与中小学一致（200），避免大批量点渲染卡顿。

## 执行要点

- `Equity_Index` 形如 `"EQI 3"`，需 `toNumber` 解析为数字 3；空值/“Not Applicable” 视为 null。
- `Org_Type` 仅保留 `Education & Care Service` 与 `Free Kindergarten` 两种（过滤其它如 Playcentre、Te Kōhanga Reo 等）。
- `Authority`：空值过滤掉；`Privately owned→私立`、`Community based→公立`。
- 卡片/详情中「学生/在校人数」使用 `Total`；「最大人数」使用 `All_Children`；「最大2岁以下人数」使用 `Under_2s`。
- 族裔字段仅 `European/Māori/Pacific/Asian/Other`（无 MELAA/intl），详情族裔分布图复用现有 `ETHNIC_DISPLAY` 配置并去掉 MELAA/国际生项。