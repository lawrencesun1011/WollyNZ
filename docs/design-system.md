# GoalNZ · 设计系统规范（v1 草案）

> **定位**：本文档只写「**规则与决策**」——什么事情该怎么做、什么时候用哪个。
> 具体的**数值**以 `src/app/globals.css` 的 `@theme` token 为唯一事实来源，本文档只引用变量名，**不复制数值**，避免两处不同步。
>
> **改动流程**：改数值 → 改 `@theme`；改规则 → 改本文档；新增复用样式 → 加进 `src/components/ui/`，禁止在页面里手拼。

---

## 0. 设计原则

站点并存两种**氛围**，这是有意保留的：

| | **Editorial（编辑风）** | **Lake（湖水蓝绿）** |
|---|---|---|
| 适用 | 首页、游学攻略、住宿、社群、登录/申请/我的 | 找学校、找幼儿园、地图、数据类内页 |
| 底色 | 米纸 `--color-paper` | 湖白 `--color-bg` |
| 字体 | 衬线（标题/叙事） | 无衬线（功能） |
| 强调 | 朱红 `--color-accent` | 湖水绿 `--color-primary` |

**核心约束**：两种氛围**只允许在两个维度上不同** —— ① 色板 ② 标题字体。
**其余全部共享同一套原子**：字号刻度、间距节奏、圆角、按钮尺寸、阴影阶梯、层级、状态反馈、断点。

> 现状问题：目前两种氛围各自造了按钮、圆角、阴影（见 globals.css 里 `.guide-page` / `.accom-editorial` 靠重映射 token "整页换色"）。规范落地后，这些作用域重映射应逐步退化为**只重定义色板**，不再重定义按钮等组件。

---

## 1. 字体

### 1.1 两个字体族（均已自托管）

| Token | 字体族 | 用途 |
|---|---|---|
| `--font-editorial` | `Noto Serif SC` + 宋体回退 | **叙事**：标题 / 品牌 / 刊物装饰 |
| `--font-sans` | `Noto Sans SC` + 无衬线回退 | **其余一切**（body 默认） |

加载方式：`src/app/layout.tsx` 用 `@fontsource` 引入两族的 400 / 500 / 600 / 700。

### 1.2 场景分工（核心规则）

> **一句话：衬线只负责「讲故事」（标题/品牌/刊物装饰），无衬线负责「给你用」（正文/控件/元信息）。**

| 层 | 字体 | 具体元素 |
|---|---|---|
| **品牌** | **衬线** | Logo、页脚品牌名 |
| **大标题** | **衬线** | `h1` / `h2`（Hero / 页面 / 区块大标题） |
| **刊物装饰** | **衬线** | 眉标 `eyebrow`、编号 / 章号、引语 |
| **小标题** | **无衬线** | **`h3` 及以下**（表单区块标题、卡片小标题）—— 它们与字段标签同级，若用衬线会出现「同一张表单里标签黑体、小标题宋体」的割裂 |
| — | — | — |
| **正文与说明** | **无衬线** | 段落、列表、卡片描述、提示文案 |
| **全部控件** | **无衬线** | 按钮、导航链接、输入框、下拉、筛选器、标签页 |
| **元信息 / 标签** | **无衬线** | chip、徽章、状态、日期、表格、卡片元信息 |
| **数字** | **无衬线** + `tabular-nums` | 价格、评分、计数、编号 |

**为什么正文用无衬线**：中文衬线在小字号下笔画细、发虚，长文与控件的可读性明显不如黑体；而标题字号大，衬线的刊物感反而成为品牌记忆点。这也是「编辑风」的通行做法。

### 1.3 实现方式（禁止「整页切换」）

❌ **禁止**在页面作用域类（`.editorial` / `.guide-page` / `.accom-editorial` / module `.page`）上写 `font-family` —— 那会把**正文、按钮、表单、导航链接**一并变成衬线（本项目此前正是如此：登录页输入框、页眉导航都是宋体）。

✅ 只给**标题层**声明衬线，其余继承 body 的无衬线栈：

```css
/* globals.css */
.editorial h1, .editorial h2, .editorial h3,
.guide-page h1, .guide-page h2, .guide-page h3,
.accom-editorial h1, .accom-editorial h2, .accom-editorial h3,
.guide-article h1, .guide-article h2, .guide-article h3 {
  font-family: var(--font-editorial);
}
```

CSS 模块内的独立页面（住宿 / 社群）用 `.page h1, .page h2, .page h3 { font-family: var(--font-editorial); }`。

**刊物装饰元素**（眉标 / 编号 / 品牌名）各自单独声明衬线，例如 `.hero-eyebrow`、`.entry-number`、`.footer-brand`。

### 1.4 禁止项

- ❌ 组件里硬编码 `font-family`（一律用 `var(--font-sans)` / `var(--font-editorial)`）
- ❌ 新增第三个字体族（数字不再单独用 Georgia，改用 `tabular-nums`）
- ❌ 在控件（按钮 / 输入框 / 导航链接 / 菜单项）上使用衬线

---

## 2. 字号刻度

统一为一条刻度（token 化），**禁止再写任意值 `text-[Npx]`**：

| 类 | 值 | 用途 |
|---|---|---|
| `text-2xs` | 12px | 角标 / 极小标签 |
| `text-xs` | 13px | 说明 / 标签 |
| `text-sm` | 15px | 辅助正文 |
| `text-base` | 16px | 正文基准 |
| `text-lg` | 18px | 小标题 / 强调 |
| `text-xl` | 20px | 区块标题 |
| `text-2xl` | 24px | 页面标题 |
| `text-3xl` | 30px | 大标题 |
| `text-h2` | `clamp(22px, 2.8vw, 32px)` | 区块标题 |
| `text-h1` | `clamp(28px, 3.6vw, 42px)` | 页面 / 文章主标题 |
| `text-hero` | `clamp(48px, 5vw, 68px)` | 首屏大标题（首页 / 攻略 / 住宿 / 社群） |
| `text-lead` | `clamp(16px, 1.6vw, 20px)` | **Hero 导语**（标题下的第三行 / 说明行）—— 首页 `.hero-description`、住宿 `.description`、社群 `.description`、攻略 `.heroDescription` 共用一条曲线，**禁止各自再写 px 降级** |

**实施状态**：
- 已清零全站 `text-[Npx]` / `text-[clamp(...)]` 任意值（20 处）。
- CSS 扁平 `px` 字号已归位到上表（`10/11→12`、`14→15`、`17/19→18`、`21/22→20`、`23/25/26→24`、`29→30`）。
- **页面副标题（H2）**：住宿 `.intro`、社群 `.tagline`、攻略 `.heroSubtitle` 统一走 `--text-h2`（杀掉 3 份重复的 `clamp(23px, 2.65vw, 33px)`），且**不在小屏降级**——此前会掉到 15 / 18px，宋体在小字号下笔画细、可读性差，既然定为"大字号用宋体"，就该在小屏也保持大字号（`--text-h2` 下限 22px）。
- **有意保留**：各页面的响应式大标题 `clamp(...)`（Hero 等）与断点覆写（`41px` / `56px` / `78px`），属响应式微调，暂不强行统一。

---

## 3. 按钮

### 3.1 变体 × 尺寸（唯一来源）

**3 个变体**：`primary` / `secondary` / `ghost`
**2 个尺寸**：`md`（主操作）/ `sm`（行内操作）

| | `md` | `sm` |
|---|---|---|
| 字号 | 16px（`text-base`） | 15px（`text-sm`） |
| 内边距 | `px-5 py-2.5` | `px-4 py-2` |
| 圆角 | `rounded-xl`（12px） | 同 |
| 最小高度 | 44px（`min-h-11`） | 36px（`min-h-9`） |
| 焦点环 | `outline-2 outline-offset-2 outline-primary` | 同 |

**唯一来源**：`src/components/form-ui.tsx` 的 `buttonCls(variant, size)`；
`primaryBtnCls` / `secondaryBtnCls` / `ghostBtnCls` / `primaryBtnSmCls` / `secondaryBtnSmCls` / `ghostBtnSmCls` 是它的兼容别名。

### 3.2 落地方式

- **唯一来源**：
  - `buttonCls(variant, size)` —— 尺寸 `md` / `sm` / `xs`（`xs` 供卡片等密集场景）
  - `iconBtnCls(size, extra)` —— 圆形图标按钮（关闭 / 翻页 / 移除），尺寸由调用处指定
- **已完成**：
  - `form-ui` 常量升级为基元；删除 `.accom-editorial .bg-primary` 的「渐变 + 7px」重写。
  - CSS 类按钮归位：`.primary-button` / `.community-button` / `.primaryButton` / `.textButton` / `.qrButton` / `.icon-button` / `.popup-btn`。
  - 组件侧全部改用基元：卡片操作（心愿/详情/对比）、工具栏、对比栏、筛选器触发按钮与清空、弹窗操作区、确认对话框、心愿单浮层、日历翻页、邮箱模板、登录页。
  - 全站按钮恢复**统一键盘焦点环**（此前筛选器 `outline-none`、多数手拼按钮均无焦点反馈）。
- **保留未纳入**（属其他组件类别，见 §10）：下拉菜单项、筛选药丸 chips、日历日期格。

### 3.3 语义

- `primary`：一个页面/区块**只有一个**主操作
- `secondary`：并列或次等操作（描边）
- `ghost`：取消、工具、行内低权重操作

---

## 4. 圆角

**两级语义刻度**——组件一律按角色选用语义类，**不要直接写尺码类**：

| 语义类 | 值 | 用于 |
|---|---|---|
| `rounded-control` | 12px | 按钮 / 输入框 / 下拉触发器 / 菜单项 / 图标底座 |
| `rounded-surface` | 16px | 卡片 / 面板 / 弹窗 / 浮层 / 空态 / 提示条 |
| `rounded-full` | 胶囊 | 徽章 / 头像 / 圆形图标按钮 |

尺码类（Token 层，仅供上面两者与特例使用）：`sm 8 → md 10 → lg/xl 12 → 2xl 16 → 3xl 20`

**已修复**：
1. `@theme` 只覆盖 `--radius-sm/md/lg`，导致刻度非单调（`lg 28 > md 20 > 2xl 16 > xl 12`），卡片比弹窗还圆 → 已改为**全量单调刻度**。
2. `rounded-[--radius-sm]` 非法语法（缺 `var()`）→ 已改为 `rounded-(--radius-sm)`（10 处）。

**已完成（2b 语义收敛）**：原先 `rounded-lg`（12px）是"公用地"——按钮、白卡、tooltip、菜单项混用同一数值，且下拉浮层(12px)与弹窗(16px)不一致。现按角色收敛为 **控件 31 处 → `rounded-control`、容器 57 处 → `rounded-surface`**（含 32 处 `rounded-2xl` 改名 + 6 处错用修正）。

---

## 5. 颜色

品牌色分两套（对应两个主题）；**组件里禁止写颜色字面量**，一律引用 token（Tailwind 任意值写 `bg-(--color-x)`，不要 `bg-[#xxxxxx]`）。

| Token | 值 | 用途 |
|---|---|---|
| `--color-paper` | `#f9f6f0` | 编辑风纸色底 |
| `--color-rule` | `#789491` | 细分隔线 |
| `--color-accent` | `#b44427` | 朱红强调（含**心愿 / 收藏**激活态） |
| `--color-accent-soft` | `#f0ddd0` | 朱红浅底（徽章 / 收藏激活底） |
| `--color-paper-hover` | `#eeeede` | 编辑风 hover 浅底（归并 `#eeeede` / `#f5f1e8`） |
| `--color-neutral-soft` | `#eef0ea` | 中性浅底（草稿等徽章） |

- Lake 品牌色（`--color-primary` 系）与状态色（`--color-success/warning/error/info`）定义在 `@theme inline`。
- **数据可视化色板独立**：种族构成 / 学校类型图例等多色图表（`#5BA3C4` / `#9CCBBD` 等）**不参与归一**，保留分类区分度。
- 地图 UI 品牌青绿已归一到 `--color-primary`（原 `#2e9e8c` 系废弃）。

---

## 6. 间距节奏

- 统一 **8px 栅格**（4px 为半档）：`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`。
- 手写 CSS 里的设计稿像素（27/31/36/38/47px…）在重构时归到最近的栅格值。
- Tailwind 层现状基本合规，继续用 `gap-*` / `p-*` / `space-y-*` 标准档位。

---

## 7. 阴影（elevation）

统一为 **3 档**，在 `@theme` 里**覆盖 Tailwind 默认的中性黑阴影**（避免两套并存），全部使用品牌绿 tint：

| Token | 用途 |
|---|---|
| `--shadow-sm` | 卡片 / 面板静止态 |
| `--shadow-md` | 浮层 / 下拉 / tooltip / 卡片 hover 抬升 |
| `--shadow-lg` | 弹窗 / 模态 |

**已完成**：全站 53 处收敛为 `sm 19 / md 21 / lg 11`；旧 token `--shadow-1` / `--shadow-2` 已废弃删除。
装饰性阴影（`.primary-button` 的内高光、`.icon-button` 的 inset、攻略页地图停靠点）**保留原样**，不属 elevation 体系。

---

## 8. 层级（z-index）

集中定义一张层表（`:root` 的 `--z-*`），禁止散落魔法数字：

| Token | 值 | 用途 |
|---|---|---|
| `--z-sticky` | 100 | 吸顶小控件（地图工具栏） |
| `--z-map` | 500 | 地图图例 / 底图切换 |
| `--z-header` | 900 | 页眉 / 对比条 |
| `--z-modal` | 1000 | 弹窗 |
| `--z-popover` | 1100 | 下拉 / 浮层 |
| `--z-confirm` | 2000 | 二次确认（最高） |

用法：`z-(--z-modal)`。

**已完成**：16 处 `z-[900]` / `z-[1000]` / `z-[1100]` / `z-[2000]` / `z-[500]` / `z-[100]` 全部改为 token 引用，魔法数字清零。
**局部层叠**（同一容器内的 `z-10 / 20 / 30 / 50`）**不属层表**，按需就地使用。

---

## 9. 响应式断点

| 名称 | 值 | 用途 |
|---|---|---|
| `sm` | 640 | 大屏手机 |
| `md` | 768 | 平板竖 |
| `lg` | 1024 | 平板横 / 小笔记本 |
| `xl` | 1280 | 桌面 |

- 弃用 `767 / 1000 / 1100 / 1300 / 1500` 等自定义值，全部归到上表。
- 优先用 Tailwind 断点类；手写 media query 仅用于 CSS 模块内的复杂版式，且必须使用同一组值。

---

## 10. 容器宽度与左右留白

### 10.1 宽度档位（`--width-*`，定义在 `globals.css` 的 `:root`）

| Token | 值 | 用途 |
|---|---|---|
| `--width-page` | 1440px | 页眉 / 页脚 / 首页 / 攻略（满宽版面） |
| `--width-work` | 1400px | 工作台：找学校 / 找幼儿园（地图 + 列表并置） |
| `--width-content` | 1280px | 常规内容：住宿 / 社群 / 我的申请 / 我的住宿 |
| `--width-form` | 1024px | 表单页：申请 / 住宿申请 |
| `--width-narrow` | 720px | 窄内容（备用） |

用法：CSS 里 `max-width: var(--width-content)`；TSX 里 `max-w-(--width-content)`。

**组件级宽度不属页面档位**（保留 Tailwind 原语）：对比条 `max-w-5xl`、登录卡片 `max-w-md`、浮层 `max-w-sm`、tooltip `max-w-[80vw]`。

### 10.2 左右留白（`--page-gutter`）

| 断点 | 值 |
|---|---|
| 默认 | 44px |
| ≤1100px | 32px |
| ≤767px | 22px |
| ≤359px | 16px |

**全站唯一来源**：`.page-width` / `.content-width` / module 的 `.page` `.main` / 页眉页脚 / 内页容器（`px-(--page-gutter)`）全部引用它。

**已修复**：此前是三套互不相干的体系 —— 攻略 `padding 38/24/16px`（断点 1000/640）、住宿社群 `width 44/32/22/16px`（断点 1100/767/359）、内页 `24/40px`。断点不同导致 **1368px 以下各页 Hero 文字左边界错位最多 22px**。现已统一：硬编码 `calc(100% - Npx)` 清零，攻略 `.heroCopy` 的 `left` 改为 `max(var(--page-gutter), calc((100% - var(--width-content)) / 2))`，与住宿/社群同一公式，任意视口下三页文字左边界重合。

---

## 11. 组件基元清单（`src/components/ui/`）

规划中的复用组件（逐步建立）：

- `Button`（§3）
- `Input` / `Select` / `Textarea` / `Checkbox` / `Radio` / `Switch`
- `Field`（label + 控件 + error/hint，已有雏形）
- `Card`（统一卡片容器）
- `Chip` / `Badge`
- `Modal` / `ConfirmDialog`（统一遮罩、圆角、阴影、Esc/点击外部/焦点锁）
- `EmptyState` / `Loading` / `Skeleton`（统一状态反馈）

---

## 12. 交互、动效与状态

### 12.1 动效时长（`--dur-*`，定义在 `:root`）

| Token | 值 | 用途 |
|---|---|---|
| `--dur-fast` | 160ms | 微反馈：popover 入场 / hover / 颜色变化 |
| `--dur-base` | 250ms | 常规：遮罩淡入 / 面板切换 / 抬升 |
| `--dur-slow` | 400ms | 版面级：页面区块入场 |

**已完成**：CSS 的 `animation`（fadeUp / overlayIn / popoverIn）与全部 `transition` 时长接入 token，硬编码时长清零。
TSX 层保留 Tailwind 的 `duration-200 / 300 / 500`（卡片 hover / 箭头位移 / 进度条），值域与上表一致。

### 12.2 图标

- **两个来源**：`lucide-react`（功能图标，默认描边 2）+ 自定义细线图标（`components/icons.tsx`、`components/editorial/icons.tsx`）。
- **已完成**：自定义图标的描边从 `1.35 / 1.4 / 1.5 / 1.6` 统一到 **1.5**（22 处）；大尺寸插图图标（`.stepIcon` 56px、`ShieldIcon` 64px）保留 `2.2 / 2.6`。
- **尺寸**：走 `h-4 w-4`(81) / `h-3.5 w-3.5`(39) / `h-5 w-5`(14) / `h-9 w-9`(13) 等 4px 倍数档。

### 12.3 状态反馈

- 统一组件：`src/components/ui/states.tsx` 的 `LoadingState`（转圈 + 文案）/ `EmptyState`（图标 + 文案）。
- **已完成**：页面内手写的空态文案改用 `EmptyState`。整页级虚线卡片空态（`my-*` 页的 `EmptyState` 是各页自己的版式）保留。

### 12.4 弹窗 / 浮层

统一规格（7 个弹窗全部对齐）：

- **遮罩**：`bg-ink/40 backdrop-blur-sm`，入场 `animate-overlay`（`--dur-base`）
- **层级**：`z-(--z-modal)`；二次确认 `z-(--z-confirm)`
- **容器**：`rounded-surface`(16px) + `shadow-lg` + `bg-paper` / `bg-white` + `border-(--color-rule)`
- **关闭**：点击遮罩（+ 内容区 `stopPropagation`）、**Esc 键**（`useEscapeKey`，`src/components/ui/use-escape.ts`）、关闭按钮 `aria-label="关闭"`
- **滚动锁**：打开时 `document.body.style.overflow = "hidden"`

### 12.5 焦点态与无障碍

- **全站焦点环基线**：`:where(a, button, [role=button], input, select, textarea, summary, [tabindex]):focus-visible` —— 任何可聚焦元素默认有可见焦点反馈。
- `@media (prefers-reduced-motion: reduce)` 在 `globals.css` 统一关闭动效（`animation: none !important`）。

---

## 13. 已确认决策

1. **无衬线字体**：采用 `Noto Sans SC`，替代当前 `Inter`。
2. **按钮字号**：`md` = `16px`、`sm` = `14px`（从现状 20px 收口）。
3. **双氛围**：**保留** Editorial + Lake 两个主题，但降级为「同一设计系统的 2 个主题」——仅允许在**色板 + 标题字体**两个维度不同，其余原子全部共享。
   - **合并重复实现**：现 `.editorial` / `.guide-page` / `.accom-editorial` 属于同一 Editorial 主题的三次重复实现，应合并为一套（通过主题变量覆盖，而非各自重映射 token）。
   - 未来若要收敛为单主题，因原子已共享，只需改色板即可。

---

## 附：实施步骤（每步都可本地预览效果）

| 步骤 | 内容 | 可见效果 |
|---|---|---|
| 1 | 修 3 个真 bug（圆角/阴影非法语法、`animate-popover` 死类） | 部分元素从直角变圆角、浮层出现动画 |
| 2 | 重定圆角刻度（§4） | 按钮/卡片/输入框圆角趋于一致 |
| 3 | 颜色 token 化（地图青绿归一、心愿红、字面量转变量） | 地图与品牌绿统一 |
| 4 | 字体切换 + 字号刻度（§1/§2） | 全局字体与标题层级变化 |
| 5 | 按钮收敛（§3） | 全站按钮统一外观 |
| 6 | 间距/阴影/层级/断点（§5–§8） | 版面更整齐 |
| 7 | 组件基元 + 状态反馈 + 焦点态（§9–§11） | 表单/弹窗/空态统一，键盘可聚焦 |

---

## 附：本轮已落地清单

### 设计 Token

**`@theme`（Tailwind 命名空间）**
- **颜色**：`--color-rule` / `--color-accent` / `--color-accent-soft` / `--color-paper-hover` / `--color-neutral-soft` / `--color-stroke-strong`
- **字号**：`--text-2xs`(12) / `xs`(13) / `sm`(15) / `base`(16) / `lg`(18) / `xl`(20) / `2xl`(24) / `3xl`(30)
- **语义字号**：`--text-lead` `clamp(16,1.6vw,20)` / `--text-h2` `clamp(22,2.8vw,32)` / `--text-h1` `clamp(28,3.6vw,42)` / `--text-hero` `clamp(48,5vw,68)`
- **圆角**：语义两级 `--radius-control`(12) / `--radius-surface`(16)，另留尺码 `sm 8 / md 10 / lg·xl 12 / 2xl 16 / 3xl 20`
- **阴影**：`--shadow-sm`（卡片）/ `--shadow-md`（浮层）/ `--shadow-lg`（弹窗）—— **覆盖 Tailwind 默认黑阴影**
- **字体**：`--font-sans`（Noto Sans SC）/ `--font-editorial`（Noto Serif SC）

**`:root`（布局 / 层级 / 动效）**
- **容器宽度**：`--width-page`(1440) / `--width-work`(1400) / `--width-content`(1280) / `--width-form`(1024) / `--width-narrow`(720)
- **左右留白**：`--page-gutter` —— 默认 44px，≤1100:32，≤767:22，≤359:16
- **层级**：`--z-sticky`(100) / `--z-map`(500) / `--z-header`(900) / `--z-modal`(1000) / `--z-popover`(1100) / `--z-confirm`(2000)
- **动效**：`--dur-fast`(160ms) / `--dur-base`(250ms) / `--dur-slow`(400ms)

### 组件基元（`src/components/form-ui.tsx`）
- `buttonCls(variant, size)` —— `primary/secondary/ghost` × `md/sm/xs`
- `iconBtnCls(size, extra)` —— 圆形图标按钮
- `chipCls(active, extra)` —— 药丸 / 筛选 chip
- `menuItemCls(extra)` —— 下拉 / 菜单项
- `inputCls` / `selectCls` / `Field` / `SectionTitle`

### 组件基元（`src/components/ui/`）
- `states.tsx` —— `LoadingState` / `EmptyState`
- `confirm-dialog.tsx`

### 关键修复与统一
- 修复 `rounded-[--radius-sm]` / `shadow-[--shadow-*]` 非法语法（圆角 / 阴影失效）
- 修复 `animate-popover` 死类（浮层无入场动画）
- 修复 `confirm-dialog` 遮罩异类（`bg-black/40` 无模糊 → `bg-ink/40 backdrop-blur-sm`）
- **字体**：`Inter` → `Noto Sans SC`；**取消三个作用域的整页衬线**，改为只给「标题层」声明衬线（正文 / 控件 / 元信息回归无衬线）
- **字号**：CSS 硬编码 px 全部接入 token；3 处重复的 `clamp(23px,2.65vw,33px)`（Hero 导语）统一到 `--text-lead`；3 处「视觉 H2 但语义 P」副标题改为 `<h2>` + `--text-h2` 并取消小屏降级
- **间距**：非栅格值（3/7/9/13/17/19/21/23/25/27/29/31/33/37/39/41/43/47px）归到 4px 倍数
- **按钮**：编辑风主按钮从 4 份手写副本收敛为 1 个 `.primary-button`；`.community-button` / `.qrButton` / `.primaryButton` 全部删除
- **圆角**：全站 88 处收敛为 `rounded-control`(31) / `rounded-surface`(57)
- **阴影**：53 处收敛为 `sm 19 / md 21 / lg 11`；旧 `--shadow-1/2` 废弃
- **层级**：16 处魔法数字 → 6 个 token
- **布局**：容器宽度 5 档 token 化；gutter 三套体系（攻略 38/24/16 @1000/640、住宿社群 44/32/22/16 @1100/767/359、内页 24/40）→ **一套**（@1100/767/359）
- **动效**：`animation` + 全部 `transition` 时长接入 token
- **图标**：自定义描边 `1.35 / 1.4 / 1.5 / 1.6` → **1.5**
- **弹窗**：7 个统一遮罩 / 容器 / 层级；补 6 处缺失的 Esc 关闭（`useEscapeKey`）
- **状态徽章**：`StatusBadge` 统一（此前学校卡带描边、住宿卡不带）
- **状态反馈**：手写空态文案改用 `EmptyState`

### 有意保留（属刻意的设计差异，非不一致）
- **双主题色板**：Editorial（纸色 + 朱红）与 Lake（湖白 + 湖水绿），**只允许在色板 + 标题字体两个维度不同**
- **字体分工**：标题 / 品牌 / 刊物装饰用衬线；正文 / 控件 / 元信息 / 数字用无衬线
- **图标两族**：lucide（功能页，描边 2）与自定义细线（编辑风，1.5）；大尺寸插图图标 2.2 / 2.6
- 正文 `.prose` 排版节奏；各页 Hero 的响应式大标题覆写（41 / 56 / 78px）
- 住宿 `.sectionHeading h2`(40px)、`.accentHeading` 移动端 33px、`.prose h2`(28px) 等编辑风特定字号
- 数据可视化多色板（种族构成、学校类型图例）
- 小装饰圆角（`.popup-check` 3px、`.entry-button` 2px）与胶囊（999px）
- 整页级虚线空态卡片（`my-*` 页自有的版式）
- `.qrDialog`（原生 `<dialog>`）的独立宽度与内边距

### 待办（低优先，未动）
- 卡片标题 `h3` 是否改为无衬线（当前全站 `h1`–`h3` 均为衬线）
- 中文长文（`.prose`）的段落节奏与字距微调
