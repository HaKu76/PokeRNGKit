# Usage and Choice Workflow

Use this reference when the user asks how to use HakuStyle, gives an open-ended UI
request, asks for style options, or has not supplied enough visual constraints to
form a stable style contract.

## Invocation

Users may invoke the skill explicitly:

```text
使用 $web-frontend-style 优化这个项目的 UI。
```

They may include constraints:

```text
使用 $web-frontend-style 优化这个 Vue 工作台。PC 优先，手机可用，
保留现有功能，重点修复侧栏和主题切换。先让我选择风格再改代码。
```

They may also name a recipe:

```text
使用 $web-frontend-style，采用 Royal Blueprint，标准密度，圆润控件，
实体表面，只在收藏卡片上使用 Pokemon 材质效果。
```

If the task already supplies platform, product type, theme, density, material, and
motion direction, do not repeat the questionnaire. Confirm the style contract and
proceed.

## When to ask choices

Ask choices before editing when any of these are true:

- the user explicitly asks to select or compare styles;
- the request is "make it prettier", "optimize the UI", or similarly open-ended;
- several compatible page shells or themes would materially change the result;
- replacing the current identity would be difficult to reverse;
- the project has no established tokens or design system.

Do not pause for choices when the user names an exact direction, the repository has
a strong established system, or the change is a narrow component fix. Make a
reasonable compatible choice and record it.

## Choice round A: required high-impact decisions

Ask at most three questions in the first round. Put the recommended option first
and explain the result in one sentence.

### A1. Product shell

```text
这个项目的主要使用方式更接近哪一种？

A. 工作台 / 工具（推荐用于后台、资料工具、配置页）
B. 阅读 / 文档（推荐用于博客、教程、VitePress）
C. 个人档案 / 收藏（推荐用于主页、宝可梦图鉴、作品集）
D. 移动控制台（推荐用于 PWA、状态监控、快捷操作）
```

Mapping:

- A -> operational workspace; Lunora + Ant state system.
- B -> reading/documentation; Clarity + Blue Archive/Mizuki/Sakurairo as identity.
- C -> profile/archive; CRWeb/Hurt-in-dream/xlrt plus optional JRPG material.
- D -> mobile control surface; Home Assistant task ordering with HakuStyle palette.

### A2. Visual tone / theme

Offer no more than three candidates selected from product fit. Use these defaults:

- general tools: Ant Neutral, Royal Blueprint, Indigo Night;
- Pokemon/JRPG tools: Royal Blueprint, HakuDex Azure, Indigo Night;
- blogs/docs: Blue Archive Dual, Sakura Mist, Ant Neutral;
- personal/creative: Frosted Lilac, HakuDex Azure, Sakura Mist.

Do not list all themes unless the user asks for the complete palette catalogue.

### A3. Information density

```text
你希望页面的信息密度？

A. 标准（推荐，16px 正文、44px 控件）
B. 舒适（阅读和触控优先、48px 控件）
C. 紧凑（高密度工作台、15px 正文、40px 控件）
```

Never offer a smaller-than-compact profile.

## Choice round B: ask only when it changes the result

### B1. Shape

```text
A. 圆润（推荐，12px 控件、18-20px 卡片/面板）
B. 标准圆角（10px 控件、16-18px 卡片/面板）
C. 主题硬朗（仅明确的 JRPG、像素、Win7 或复古窗口）
```

Do not offer fully square geometry as a generic modern option.

### B2. Material

```text
A. 实体表面（推荐，最清晰稳定）
B. 轻玻璃（仅导航、浮层或身份区域）
C. 主题材质（只给一个重点组件）
```

If C is chosen, select at most one: JRPG frame, Pokemon foil, Balatro background,
pixel heading, or draggable decorative character.

### B3. Motion

```text
A. 安静（推荐工具和阅读页）
B. 顺滑（状态转换、抽屉、主题切换有清晰连续性）
C. 鲜明（只为个人主页或主题展示，仍受一个特效预算限制）
```

Reduced-motion remains mandatory for every answer.

## Convert answers into a style contract

Return a short contract before editing:

```text
平台：响应式 Web，PC 主用，手机支持
产品类型：工作台
基础系统：项目现有 Vue 组件 + Ant 状态模型
页面原型：Lunora 式固定侧栏和连续主工作区
排版密度：标准，16px 正文 / 44px 控件
形状：圆润，12px 控件 / 18px 卡片
主题：Royal Blueprint，支持 light/dark/system
材质：实体表面
动效：顺滑，主题 400ms、抽屉 260ms、控件 160ms
特效：收藏预览使用一处 Pokemon 材质
排除：全局玻璃、装饰圆球、同色描边文字、像素正文、连续粒子
```

Use this contract to select tokens and references. Do not treat it as visible UI
copy to paste into the product.

## Default answers when the user delegates the choice

For a general Web product:

```text
shell: operational workspace or the repository's existing shell
theme: Ant Neutral
density: standard
shape: rounded standard
material: solid
motion: quiet/smooth
signature effect: none
```

For a Pokemon/JRPG tool:

```text
shell: operational workspace or archive
theme: Royal Blueprint, then HakuDex Azure if stronger identity is desired
density: standard
shape: rounded
material: solid
motion: smooth
signature effect: one JRPG frame or collectible material
```

## Demo usage

Open `assets/previews/index.html` directly in a browser. It provides:

- product-shell previews for workspace, reading, profile/archive, and mobile
  control surfaces;
- all approved HakuStyle themes;
- density, shape, material, motion, and signature-effect choices;
- a generated style contract that can be included in the user's next Codex prompt.

Use the Demo to compare decisions with identical domain content. Do not judge a
theme using different copy, data, or feature sets.
