---
name: editorial-restyle-accommodation-pages
overview: 将 /my-accommodations 与 /apply/accommodation 两个页面（及其专属的表单/卡片组件）从湖水蓝绿风格改为与首页、找住宿、加入社群一致的「编辑风」视觉：纸色背景、衬线字体、墨绿/朱红配色、编辑风按钮。复用 globals.css 中已有的 .guide-page token 重映射思路，以最小、低风险改动实现。
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
  - id: add-editorial-scope
    content: 在 globals.css 新增 .accom-editorial 作用域：重映射 token 为编辑风调色板，并覆盖主按钮渐变与 7px 圆角
    status: completed
  - id: restyle-apply-page
    content: 改造 /apply/accommodation 页面：根加作用域类，标题与返回链接改编辑风
    status: completed
    dependencies:
      - add-editorial-scope
  - id: restyle-my-page
    content: 改造 /my-accommodations 页面：根加作用域类，标题、新建按钮、空态、分区标题改编辑风并统一内容宽度
    status: completed
    dependencies:
      - add-editorial-scope
  - id: verify-build
    content: 构建并启动 dev，核对两页背景、字体、主按钮、分隔线与参考页一致，表单/卡片随作用域自动换肤
    status: completed
    dependencies:
      - restyle-apply-page
      - restyle-my-page
---

## 用户需求

将 `/my-accommodations`（我的住宿意向）与 `/apply/accommodation`（填写住宿意向）两个页面的视觉风格，与首页、找住宿、加入社群等「编辑风」页面保持一致，重点统一按钮、字体、颜色。

## 核心特征

- 背景采用暖白纸色（#f9f6f0），而非当前的湖水蓝绿背景（#eef6f4）。
- 全页使用衬线字体（Noto Serif SC），与参考页一致。
- 主色由湖绿（#287e6e）改为深湖绿（#16433a），主按钮呈现深湖绿渐变 + 7px 圆角（同 .primary-button）。
- 文字/分隔线采用墨绿（#102e2c / #06262b）与规则线色（#789491）。
- 主操作按钮（提交住宿意向、新建意向、查看我的意向等）与返回/次级操作（返回链接）视觉上对齐编辑风。
- 表单（AccommodationForm）与卡片（AccommodationCard）内部无需逐行改写，通过作用域换肤自动跟随。

## 技术栈

- 框架：Next.js 16（App Router）+ React 19 + TypeScript
- 样式：Tailwind v4（@theme token）+ 全局 CSS（globals.css）+ CSS Module（参考 accommodation.module.css）
- 既有模式：globals.css 的 `.guide-page` 已在作用域内将湖水蓝绿 token 重映射为编辑风调色板，使既有 Tailwind 颜色类无需逐处改写即整体换色——本方案复用同一机制。

## 实现方案

### 总体策略：作用域 token 重映射（低风险、可维护）

新建 `.accom-editorial` 作用域类，挂载到两个页面的根容器。在该作用域内重映射 CSS 变量（--color-primary / --color-ink / --color-ink-soft / --color-stroke / --color-bg / --color-bg-soft / --color-error / --color-success 等）为编辑风调色板，并施加纸色背景与衬线字体。这样页面及其专属组件（accommodation-form.tsx、accommodation-card.tsx）中既有的 `bg-primary` / `text-primary` / `border-stroke` / `bg-bg` 等 Tailwind 颜色类会**自动整体换色**，无需改写近千行表单代码。

### 关键决策与理由

1. **不逐控件改写长表单**：accommodation-form.tsx 约 930 行、accommodation-card.tsx 含详情弹层，全部替换类名成本高且易错；token 重映射以极小的全局改动换取一致视觉，符合 DRY/YAGNI。
2. **主按钮渐变与圆角覆盖**：作用域内再加 `.accom-editorial .bg-primary { background-image: 编辑风渐变; border-radius: 7px; }` 与对应 hover，使 `bg-primary` 按钮从纯色圆角变为编辑风深绿渐变 7px 圆角；`.bg-primary` 在两页中仅用于真实按钮，不影响输入框/图标底纹。
3. **保留 lucide 图标**：图标随 `currentColor` 自动跟随重映射后的文字色，无需替换图标库。
4. **范围边界**：仅改两个住宿相关页面；`apply/page.tsx`（学校/幼儿园申请）不在本次范围，school/ece 体系维持湖水蓝绿。

### 性能与可靠性

- 仅新增一个 CSS 作用域与少量类名，无运行时开销、无额外请求。
- 改动集中在 1 个全局样式文件 + 2 个页面文件，回滚简单；表单/卡片组件零改动，降低回归风险。
- 沿用 `.guide-page` 已验证的 token 重映射手法，行为可预期。

## 实现要点（执行细节）

- **globals.css**：在 `.guide-page` 附近新增 `.accom-editorial` 块，重映射上述 token 并设置 `background: var(--color-paper); color:#102e2c; font-family: var(--font-editorial);`；追加 `.accom-editorial .bg-primary` 的渐变与 7px 圆角覆盖（含 hover）。
- **apply/accommodation/page.tsx**：根 div 加 `accom-editorial`；h1 改为衬线墨绿并适度放大；「返回住宿意向」由圆角按钮改为编辑风下划线文字链接（保留 ChevronLeft/ArrowLeft）。
- **my-accommodations/page.tsx**：根 div 加 `accom-editorial`；h1 衬线墨绿放大；「新建意向」沿用 `bg-primary`（作用域自动变编辑风主按钮）；LoginWall/EmptyState 卡片改为纸色 + 规则线描边；Section 标题随作用域变衬线墨绿；内容容器最大宽度对齐 `content-width`（≤1280px）。
- **accommodation-form.tsx / accommodation-card.tsx**：不修改，随作用域换肤。

## 架构与目录

```
src/app/globals.css                    # [MODIFY] 新增 .accom-editorial 作用域（token 重映射 + 主按钮渐变/圆角覆盖）
src/app/apply/accommodation/page.tsx   # [MODIFY] 根加作用域类；标题、返回链接改编辑风
src/app/my-accommodations/page.tsx     # [MODIFY] 根加作用域类；标题、新建按钮、空态、分区标题改编辑风并统一内容宽度
src/components/accommodations/         # 不改动（随作用域自动换肤）
```

## 设计语言对齐（编辑风 / Editorial）

将两页从「湖水蓝绿」切换为与首页、找住宿、加入社群一致的编辑风视觉：暖白纸色背景、Noto Serif SC 衬线字体、墨绿文字、规则线分隔，主按钮为深湖绿渐变 + 7px 圆角，次级操作为带下划线的文字链接。表单与卡片沿用同一套编辑风调色板，形成统一的「纸感 + 衬线 + 墨绿/朱红」家族化界面。