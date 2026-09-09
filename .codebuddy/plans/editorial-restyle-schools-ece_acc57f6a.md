---
name: editorial-restyle-schools-ece
overview: 将 /schools（中小学）与 /ece（幼儿园）两个学校库/发现页及其全部组件（筛选栏、卡片、地图、详情/对比弹层）从湖水蓝绿风格改为与首页、住宿、学校申请、登录页一致的「编辑风」视觉：纸色背景、衬线字体、墨绿/朱红配色、编辑风渐变按钮。复用 globals.css 已有的 .accom-editorial token 重映射思路，以最小、低风险改动实现；并对地图 UI（popup / 聚合气泡 / 小羊图标）做同风格重着色。
design:
  architecture:
    framework: react
  styleKeywords:
    - Editorial 编辑风
    - 暖白纸色
    - 衬线字体
    - 墨绿
    - 规则线
    - 深湖绿渐变按钮
  fontSystem:
    fontFamily: Noto Serif SC
    heading:
      size: 28-34px
      weight: 700
    subheading:
      size: 20-23px
      weight: 600
    body:
      size: 16-18px
      weight: 400
  colorSystem:
    primary:
      - "#16433a"
      - "#163e35"
      - "#123d34"
    background:
      - "#f9f6f0"
    text:
      - "#102e2c"
      - "#3a554e"
      - "#6c7a75"
    functional:
      - "#789491"
      - "#b44427"
      - "#5bab8e"
todos:
  - id: add-discovery-scope
    content: 在 globals.css 新增 .discovery-editorial 作用域（token 重映射 + 主按钮渐变/圆角）与地图 UI 重着色规则
    status: completed
  - id: apply-scope
    content: 将 discovery-editorial 作用域类挂到 schools-explorer 与 ece-explorer 根 div
    status: completed
    dependencies:
      - add-discovery-scope
  - id: fix-hardcoded-colors
    content: 修正两处 filter-bar 的 text-black→text-ink、HOT 角标改编辑风警告色，以及 school-card/ece-card 标题 text-black→text-ink
    status: completed
    dependencies:
      - add-discovery-scope
  - id: recolor-island-icons
    content: 将 north/south island 图标硬编码湖绿改为编辑风绿
    status: completed
    dependencies:
      - add-discovery-scope
  - id: build-verify
    content: 构建并启动 dev，核对 /schools 与 /ece 背景、字体、主色、地图 popup/聚合配色与参考页一致
    status: completed
    dependencies:
      - apply-scope
      - fix-hardcoded-colors
      - recolor-island-icons
---

## 用户需求

将 `/schools`（中小学库）与 `/ece`（幼儿园库）两个发现页及其全部组件（筛选栏、卡片、地图、详情/对比弹层）从「湖水蓝绿」风格改为与首页、住宿、学校申请、登录页一致的「编辑风 / Editorial」视觉：暖白纸色背景、衬线字体、墨绿/朱红配色、深湖绿渐变主按钮与规则线描边。

## 核心特征

- 页面背景由湖白 `#eef6f4` 变为暖白纸色 `#f9f6f0`，全页字体切换为 Noto Serif SC 衬线。
- 主色由湖绿 `#287e6e` 变为深湖绿 `#16433a`，主按钮呈现深绿渐变 + 7px 圆角（与 `.primary-button` 一致）。
- 文字/描边采用墨绿（`#102e2c`/`#3a554e`/`#6c7a75`）与规则线色（`#789491`）。
- 地图相关结构 UI（popup 卡片、聚合气泡、popup 按钮、标题文字、小羊图标）由湖绿改编辑风绿；按学段/族裔的语义色保留以维持辨识度。
- 筛选栏、卡片、弹层、对比栏大量 Tailwind 颜色类经作用域 token 重映射自动整体换肤，无需逐控件改写。
- 仅修正少量硬编码色（如 `text-black` 筛选 pill、HOT 角标、`text-black` 卡片标题、小羊岛屿图标硬编码湖绿），使其随编辑风跟随。

## 技术栈

- 框架：Next.js 16（App Router）+ React 19 + TypeScript
- 样式：Tailwind v4（`@theme` token）+ 全局 CSS（`globals.css`）+ 既有 `.accom-editorial` 作用域 token 重映射模式
- 组件：学校库为自研 explorer 体系（`SchoolsExplorer`/`EceExplorer`），复用 `../schools/toolbar` 等组件

## 实现方案

### 总体策略：新增 `.discovery-editorial` 作用域，复用 token 重映射手法

在 `globals.css` 新增 `.discovery-editorial` 作用域（内容复制自已验证的 `.accom-editorial`：重映射 `--color-primary`/`--color-ink`/`--color-stroke`/`--color-bg`/`--color-error` 等 token，并施加纸色背景与衬线字体；追加 `.discovery-editorial .bg-primary` 深绿渐变与 7px 圆角覆盖）。将该作用域类挂到两个 explorer 根 `div` 后，其内部所有 `bg-primary`/`text-ink`/`border-stroke`/`bg-bg`/`bg-bg-soft`/`text-primary`/`bg-primary/8` 等 Tailwind 颜色类即整体换色。该手法与住宿页完全一致，改动小、回归风险低、零运行时开销。

### 地图 UI 重着色（作用于全局类，按作用域限定）

地图由 `school-map.tsx`/`ece-map.tsx` 动态加载，popup 与 marker 挂载在 map 容器内、位于作用域内，故 `.discovery-editorial .school-popup ...` 等选择器可命中。在作用域内将全局 `.school-popup`/`.popup-card__title`/`.popup-chip`/`.popup-btn--solid`/`.map-cluster--*` 的硬编码湖绿（`#2e9e8c` 系列）重着色为编辑风绿（`#16433a` 系列）；hover 琥珀高亮 `#f2a541` 与按学段语义色（蓝/琥珀/紫/棕）保留以维持交互与辨识。

### 关键决策与理由

1. **不逐控件改写**：两个 explorer 体系含筛选栏、卡片、地图、弹层等大量组件，全部替换类名成本高且易错；token 重映射以极小全局改动换取一致视觉，符合 DRY/YAGNI。
2. **独立作用域而非复用 `.accom-editorial`**：两页文案/语义独立，新建 `.discovery-editorial` 便于维护与按需扩展地图 UI 覆盖，不影响住宿页。
3. **语义色保留**：学段/族裔配色是数据可视化语义，跨风格保持一致更利于用户辨识，仅对品牌/结构色做编辑风重着色。
4. **范围边界**：仅改 `/schools`、`/ece` 两页体系；不动 `/my-applications`、`/apply`、`/login`（已完成）、住宿页（`.accom-editorial`）；不改动地图数据源与交互逻辑，只改视觉类与少量 CSS。

### 性能与可靠性

- 仅新增一个 CSS 作用域 + 少量 className 修正，无运行时开销、无额外请求。
- 作用域 CSS 命中动态地图 DOM（popup/cluster 在作用域容器内），换肤可预期。
- 沿用 `.accom-editorial` 已验证的 token 重映射机制，行为可预期，回滚简单。

## 实现要点（执行细节）

- **globals.css**：新增 `.discovery-editorial` 块（复制 `.accom-editorial` 的 token 重映射与主按钮渐变/圆角覆盖），追加 `.discovery-editorial .school-popup / .popup-card__title / .popup-chip / .popup-btn--solid / .map-cluster--*` 的重着色规则（语义 hover 色与学段色不改）。
- **schools-explorer.tsx / ece-explorer.tsx**：根 `div` 的 `className="min-h-screen bg-bg"` 加 `discovery-editorial`。
- **filter-bar.tsx / ece-filter-bar.tsx**：热门地区/子区 pill 的 `text-black`（约 7 处）改为 `text-ink`；HOT 角标 `bg-red-500` 改为编辑风警告色 `bg-[#b44427]`。
- **school-card.tsx / ece-card.tsx**：标题 `text-black` 改为 `text-ink`。
- **north-island-icon.tsx / south-island-icon.tsx**：硬编码湖绿 `fill="#3e9c8c" stroke="#2b7a6c"` 改为编辑风绿 `#16433a`/`#5bab8e`。
- **构建 + dev 自测**：核对两页背景变纸色、字体变衬线、主色变深绿、地图 popup/聚合气泡配色统一、筛选/卡片/弹层随作用域换肤。

## 架构与目录

```
src/app/globals.css                         # [MODIFY] 新增 .discovery-editorial 作用域（token 重映射 + 主按钮渐变/圆角覆盖）+ 地图 UI 重着色规则
src/components/schools/schools-explorer.tsx # [MODIFY] 根 div 加 discovery-editorial 作用域类
src/components/ece/ece-explorer.tsx         # [MODIFY] 根 div 加 discovery-editorial 作用域类
src/components/schools/filter-bar.tsx       # [MODIFY] text-black→text-ink；HOT 角标改编辑风警告色
src/components/ece/ece-filter-bar.tsx       # [MODIFY] 同上
src/components/schools/school-card.tsx      # [MODIFY] 标题 text-black→text-ink
src/components/ece/ece-card.tsx             # [MODIFY] 标题 text-black→text-ink
src/components/schools/north-island-icon.tsx# [MODIFY] 硬编码湖绿改编辑风绿
src/components/schools/south-island-icon.tsx# [MODIFY] 硬编码湖绿改编辑风绿
```

其余组件（toolbar、school-modal、compare-*/、map、stats-bar 等）不改动，随作用域自动换肤。

## 设计风格

复用站点已定稿的「编辑风 / Editorial（Storybook）」体系，与首页、住宿、学校申请、登录页完全一致：暖白纸色背景（`#f9f6f0`）+ Noto Serif SC 衬线字体 + 墨绿文字（`#102e2c`）+ 规则线描边（`#789491`）+ 深湖绿渐变主按钮（7px 圆角）。两页整体由湖水蓝绿切换为纸感编辑风，形成统一的「纸感 + 衬线 + 墨绿/朱红」家族化界面。

## 关键区块

- **顶栏筛选区**：白底规则线描边卡片，筛选 pill/下拉选中态为深湖绿描边+浅绿底，未选中为墨绿文字，随作用域自动换肤。
- **左列表 + 右地图双栏**：列表/地图面板白底 + 规则线描边，圆角保持克制（rounded-2xl）；地图底图切换、图例、聚合气泡配色统一为编辑风绿。
- **学校/幼儿园卡片**：标题墨绿衬线，chips 浅绿底深绿字，收藏心形保留红，详情/对比按钮深绿渐变。
- **地图 popup 详情卡**：标题墨绿、tag 浅绿底深绿字、操作按钮深绿渐变 + 规则线次级按钮，与卡片语言一致。
- **对比栏 / 对比弹层**：主色深绿，背景/描边随作用域统一。