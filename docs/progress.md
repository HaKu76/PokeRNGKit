# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-12
> - 当前阶段：第三世代 Initial Seed Finder、Wild 地点本地化与筛选布局统一
> - 当前模块：`gen3id`、`gen3initialseed`、`gen3static`、`gen3wild`、`profiles`、`ivcalculator`
> - Git 基线：`309dedf feat: 显示第三世代特性名称并优化定点布局`
> - 工作区状态：Initial Seed Finder、Wild 地点本地化和筛选布局存在未提交修改；Codex 不暂存、不提交、不 push
> - 部署状态：本轮未推送，GitHub Pages 与 Cloudflare Pages 均未执行本轮部署
> - 验收状态：ID Searcher 与 Static Searcher 固定夹具已在项目所有者授权的 GitHub Pages 页面回归；本轮特性显示和布局待部署后共同验收

## 0. 当前工作区优先状态

- 最近更新：2026-08-12；Git 基线为 `309dedf feat: 显示第三世代特性名称并优化定点布局`。
- 当前未提交内容：`gen3initialseed` 初始 Seed Finder、Wild 地点中英资源生成与显示、Wild/Static 统一紧凑筛选网格、Wasm 构建清单、模块文档和上游来源记录。
- 当前模块：`gen3id`、`gen3initialseed`、`gen3static`、`gen3wild`、`profiles`、`ivcalculator`。
- 自动化状态：本轮未运行 npm、CMake、原生夹具、TypeScript 测试、构建、浏览器检查或部署；算法和 UI 均未验收。
- 项目所有者验收规则保持不变：必须先由 GitHub Actions 完成部署，再由所有者提供生产 URL 并明确授权，才能做算法回归；本地 Wasm 或 UI 预览不能替代验收。

### 本轮实现

- `gen3initialseed`：RS TID/SID 全候选反推、FRLG/RSE 目标 Seed 分片反推、固定宽度 C ABI、独立 Worker/Wasm、稳定排序、进度、取消和 CSV；原生夹具覆盖 `48163/64377 -> 05A0/0、C19B/36724` 与 `00006073 -> 0000/1`，本轮未运行。
- `gen3wild`：地点选择框使用 PokeFinder 4.3.2 `en/zh` 地点资源；不匹配的 EncounterTableGenerator 细分名称保留英文，日文沿用上游英文。
- `gen3wild` 与 `gen3static`：筛选项统一使用 `gen3-filter-selects` 和共享的 `MultiCheckSelect`；两者保留上游 `Filter.ui` 的左侧 IV/工具与右侧标签-控件紧凑行。Wild 只在固定顺序中额外显示 Encounter Slot 和 Level，Static 移除这两项。
- 参考记录：Real96 两个 GPL-3.0 初始 Seed 项目用于算法研究；StarfBerry/PokeRNG 仅登记参考，未复制代码。

### 下一位开发者第一步

1. 阅读 [`docs/modules/gen3initialseed.md`](modules/gen3initialseed.md) 与 [`third_party/pokefinder/UPSTREAM.md`](../third_party/pokefinder/UPSTREAM.md)。
2. 在具备项目所有者授权后，按 `.github/workflows/ci.yml` 和 `package-lock.json` 检查四个 Gen III Wasm target；当前 Codex 不执行这些命令。
3. 项目所有者在 GitHub Desktop 审查后自行提交，建议标题：`feat: 集成第三世代初始种子检索`。
4. 推送并等待 Actions 部署；项目所有者提供 URL 后，再共同验收 Initial Seed 结果、地点中文名和野生/定点筛选布局。

## 1. 恢复入口

本文是跨会话和跨机器恢复入口。新环境按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)
2. [AI 开发一致性指南](ai-development.md)
3. 本文
4. [README](../README.md)、[产品需求](requirements.md)与[技术方案](tech-stack.md)
5. 当前模块文档：[Gen 3 ID](modules/gen3id.md)
6. 第四世代后续交接：[Gen 4 Development](gen4-development.md)
7. [上游记录](../third_party/pokefinder/UPSTREAM.md)
8. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)

聊天记录不是项目状态的事实来源。功能、依赖、工具链、构建、部署或阻塞变化后更新本文。

## 2. 已确认决策

- 正式英文工程名为 PokeRNGKit，不设置中文名。
- 当前产品仍只做第三世代；第四世代仅保留 `gen4id`、`gen4static`、`gen4wild` 的共享接口和 AI 交接，不实现算法或 UI。
- 只使用 npm，不增加 pnpm、Yarn 或 Bun 元数据。
- React + TypeScript 负责 UI、校验、Worker 编排、结果与持久化。
- PokeFinder RNG 规则使用 C++ -> Emscripten -> Wasm，生产算法不在 TypeScript 主线程运行。
- 多核使用多个独立单线程 Worker/Wasm 实例，不依赖 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- IndexedDB 保存存档，localStorage 提供镜像兜底并保存语言、主题和悬浮窗状态。
- 界面只支持简体中文、英文和日文；有上游简中翻译时逐字复用，没有时保留英文。
- 正式 Wasm 与站点产物由 GitHub Actions 自动生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 未获项目所有者明确授权时，Codex 不运行测试、构建、算法回归、性能检查或浏览器检查。获得具体命令或 URL 授权后，检查结果只作为工程证据；部署后的 UI 由 Codex 报告结果并与项目所有者共同验收。
- 算法结果的验收只能在 GitHub Actions 部署完成、项目所有者提供实际站点 URL 并明确授权后进行。原生夹具、本地 Wasm、UI 预览和 Actions 状态不构成算法验收。
- Codex 不自动暂存、提交、push、部署或发布，只提供 GitHub Desktop 操作说明和一条提交标题。

## 3. Git 与部署状态

- 当前分支：`main`，HEAD `309dedf`。
- 当前没有待完成的 merge 状态；本轮工作区修改均保持未提交。
- 远端和仓库目录沿用现有设置，不在本轮重命名或修改远端。
- GitHub Pages 是当前测试目标；Cloudflare Pages 与 `hakuhiro.top` 留到 Pages 验收后配置。

## 4. 已进入 Git 基线

### 4.1 工程与应用基础

- React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语基础。
- Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2` 的构建基线。
- GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 默认收起的模块抽屉、全局存档悬浮窗、浅色/深色主题和系统默认字体。

### 4.2 已有功能

- `gen3id`：XD/Colosseum、FRLG/E、RS ID Generator，筛选、Worker Pool、进度、取消、排序和 CSV。
- `gen3static`：67 条掌机模板、Generator/Searcher、Method 1/4、游走 IV 缺陷、完整定点筛选、觉醒力量、能力值、Worker Pool、排序和 CSV。
- `gen3wild`：Generator/Searcher、掌机遭遇数据、特殊地点规则、完整筛选、Worker Pool、排序和 CSV。
- `profiles`：IndexedDB 主存储、localStorage 镜像、新建、编辑、复制、删除、选择、JSON 导入导出和全部清除。
- `ivcalculator`：第三世代物种、性格、觉醒力量、多行能力值交集和下一级提示。
- 右侧悬浮工具列：存档信息和个体值计算器按固定纵向按钮列收起，展开后向左延展；点击页面空白不会收起存档信息。

## 5. 当前未提交工作区：Initial Seed Finder、地点本地化与筛选布局

### 5.1 已实现

- Static 结果的特性列由纯槽位数字改为 PokeFinder 格式 `0/1: 特性名称`；物种特性 ID 来自 `personal_rsefrlg.bin`，名称复用上游中英日资源。
- Wild 已使用同一共享 Personal 与特性名称表，本轮不修改其算法或筛选协议。
- `static-control-grid` 保留 PokeFinder 的 RNG Info / Settings / Filters 三栏结构；RNG 与设置控件改为标签在左、控件在右的紧凑行布局。
- Filters 改为 PokeFinder `Filter.ui` 同类左右分栏：IV 范围与工具位于左侧，性格、觉醒力量、异色、性别和特性位于右侧；Wild 额外的遭遇槽位和等级筛选也复用同一右侧紧凑行。
- `gen3wild` 与 `gen3static` 的筛选项共用 `gen3-filter-selects` 桌面布局和控件间距，移动端统一降为单栏，避免两种模块再次出现不同的筛选器排列方式。
- 桌面控件限制最大宽度，窄屏恢复单栏，避免输入框随面板无上限拉伸。

### 5.2 明确未完成

- 本轮未运行测试、构建、算法回归或浏览器检查；Static 特性名称和新布局尚未进入 Pages 产物。
- 本轮部署后的 UI 复核与项目所有者最终验收。
- 第四世代算法、数据、存档、Wasm、Worker 和界面；未得到项目所有者单独指示前不得开始。

## 6. 验证状态

### 6.1 历史自动检查（规则生效前，不构成验收）

- 本轮已通过：`npm run format:check`、`npm run lint`、`npm run typecheck`。
- 本轮已通过：`npm test -- --run`，13 个测试文件、48 项测试。
- 本轮已通过：`npm run build:ui` 与 `npm run verify`；生产 PWA 构建生成 Service Worker，保留主 JS 超过 500 kB 的既有警告。
- 本轮 UI 预览已人工触发 SID 与 PID 固定样例：SID 显示 `05A0/0`、`C19B/36724` 两条；PID 显示 7 条，含方块闪和星闪。该预览不加载 Wasm，且不构成验收。
- 本轮已通过：`git diff --check`；17 个 Markdown 文件的本地链接目标均存在。
- 本轮已运行：`npm run wasm:doctor`，Node.js、CMake、Ninja 可用，Emscripten 与 `emcmake` 缺失，因此命令按预期失败。
- 本轮已通过：`npm run wasm:test:native`，`gen3id_native_parity`、`gen3static_native_parity`、`gen3wild_native_parity` 共 3 项原生夹具。

### 6.2 当前未运行或等待授权

- `npm run wasm:build`：本机没有已激活的 Emscripten `emcmake`。
- GitHub Pages 和真实 Worker/Wasm 集成：待项目所有者授权并提供部署 URL 后检查。
- 移动端性能、取消延迟、PWA 安装与离线：待项目所有者明确授权的验收范围。

当前终端实际为 Node.js `24.13.0`、npm `11.6.2`，低于仓库锁定的 Node.js `24.19.0`、npm `12.0.2`。上述前端检查已通过，但原生/Wasm 和发布结论必须以锁定工具链的 Actions 为准。

右侧悬浮工具列的本轮实现尚未运行任何检查；等待项目所有者指定授权的 UI 检查范围后再执行。

## 7. 2026-08-12 生产页面回归

- 验证站点：`https://haku76.github.io/PokeRNGKit/`。项目所有者已明确授权本轮在该生产页面检查算法和界面；未运行本地算法验收、构建或测试。
- 已验证：Gen III ID Searcher 输入 TID `48163`、SID `64377`，返回 `05A0 / Frame 0 / TSV 2283` 与 `C19B / Frame 36724 / TSV 2283`；输入 TID `48163`、PID `0000475A` 返回 7 条，其中 2 条方块闪、5 条星闪。
- 已验证：Gen III Static Searcher 在 Emerald 的“传说 / 固拉多 / Method 4 / 六项 IV 31 / 其余筛选任意”夹具返回 4 条候选，符合 `docs/modules/gen3static.md` 的固定夹具预期；结果首列为 Seed。
- 发现：ID 切换至 Searcher 后，Generator 表单和结果仍显示。原因是 `.control-grid` 的 `display: grid` 覆盖浏览器默认的 `[hidden]` 样式。本地已在 `src/styles.css` 强制遵循 `[hidden]`，待部署页面复核。
- 优化：本地已压缩 `static-control-grid` 的最小列宽、间距、内边距、控件高度和 IV 行高，参考上游 `Form/Gen3/Static3.ui` 的 `spacing=6`、`margin=11`。当前生产站点仍是旧 CSS，必须在下一次部署后与项目所有者共同验收。

## 8. 下一步

1. 项目所有者在 GitHub Desktop 审查未提交修改并创建提交：`feat: 显示第三世代特性名称并优化定点布局`。
2. 推送后等待 GitHub Actions 部署，再由项目所有者提供更新后的站点 URL；本轮本地 UI 修复必须在新产物上复核。
3. UI 复核重点：Static 特性列显示 `槽位: 名称`；三栏在桌面和侧栏展开状态下不横向溢出；输入框不再占满整栏，筛选布局接近 PokeFinder。
4. 项目所有者决定是否授权移动端、PWA、离线和性能检查的范围。
5. 两阶段验收通过后再决定 Tanoby Chamber 数据或发布加固；第四世代仍等待项目所有者指定具体模块。

## 8. 已知风险

- 遭遇数据的精确 `EncounterTableGenerator` revision 尚未记录；全地点一致性仍需抽样验收。
- Tanoby Chamber 因缺少 form 被排除，在数据补齐前不能开放。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要降低 Worker 数。
- ID Searcher 当前只枚举 2000 年并返回每个 Seed 的第一组日期；扩大年份范围前需重新确定产品语义与结果规模。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；`gen3id` v2、Static/Wild v3 握手会拒绝运行，但更新体验仍需实测。
- 第四世代 reservation 没有 API 版本和运行时实现；其他 AI 不得把接口存在误写成产品支持。
- 公开部署 Wasm 时必须能向用户提供对应的完整源码、构建脚本和 GPL 许可材料。

## 9. 新环境恢复

```bash
git status --short --branch
git log -5 --oneline
node --version
npm --version
npm ci --engine-strict
npm run wasm:doctor
```

本地 UI：

```bash
npm run dev:ui
```

完整验证：

```bash
npm run verify
npm run wasm:test:native
npm run wasm:build
```

后两项需要 C++ 编译器与已激活的 Emscripten。缺少工具链时保留失败信息，由 Actions 补齐，不把未运行项写成已通过。

## 10. 维护规则

- 每个功能、部署、阻塞、依赖或工具链变化后更新本文。
- 验证结果区分“历史自动检查”“经授权检查”“未运行”和“待项目所有者共同验收”；自动检查不能替代项目所有者验收。
- 未获得项目所有者对具体命令或 URL 的明确授权时，不执行任何测试、构建、算法回归、性能检查或浏览器检查。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个 RNG 功能更新 `docs/modules/<module>.md`。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core 与翻译文件。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
