# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-12
> - 当前阶段：第三世代 Egg Generator 模块落地
> - 当前模块：`gen3egg`
> - Git 基线：`b97ae07 feat: 增加第三世代个体值查询PID`
> - 工作区状态：孵化模块及相关项目文档未提交；Codex 不暂存、不提交、不 push
> - 部署状态：本轮未推送，GitHub Pages 与 Cloudflare Pages 均未执行本轮部署
> - 验收状态：本轮未运行工程检查、原生夹具、Wasm 构建、浏览器检查或算法验收

## 0. 当前工作区优先状态

- 当前未提交内容包含 `gen3egg` 的 C++/Emscripten Wasm target、C ABI、Worker Pool、React 工作区、三语词条、样式、模块文档和上游追溯；此前遗留的 `gen3initialseed`、CI 格式和界面修复也仍在同一工作区，必须一并保留。
- 当前模块集合：`gen3id`、`gen3initialseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`profiles`、`ivcalculator`。
- 本轮完成静态源码与上游文件核对，以及 `git diff --check`、仓库 Markdown 本地链接、Egg 新文件尾随空白检查。未运行 npm、CMake、测试、原生夹具、Wasm 构建、UI 预览、浏览器或性能检查。
- 算法验收规则不变：GitHub Actions 部署成功后，由项目所有者提供实际生产 URL 并明确授权，才可在该页面使用已记录夹具回归。Actions、本地 Wasm、UI 预览和工程检查都不能替代算法验收。

### 本轮实现：`gen3egg`

- 新增独立 `wasm/modules/gen3egg` target、API v1、`gen3egg_*` C ABI、原生夹具和 `module.json`，已注册到顶层 CMake 与 `scripts/wasm.mjs`。
- 新增 `src/features/egg`：领域校验、请求编码、结果解码、UI 预览引擎、Worker 协议、Worker Pool 和 React 面板。生产 RNG 仅在 Worker 内的 Wasm 实例运行。
- 支持 PokeFinder 4.3.2 `EggGenerator3` 的 Emerald `EBred`、`EBredSplit`、`EBredAlternate`，以及 RS/FRLG `RSFRLGBred`、`RSFRLGBredSplit`、`RSFRLGBredAlternate`、`RSFRLGBredMixed`。
- 支持亲代 IV/性别、Emerald 不变之石与性格、Held/Pickup Seed、推进范围、校准值、查看图鉴次数、好感度、蛋种类、当前存档 TID/SID、完整筛选、遗传来源显示、排序、CSV、进度和取消。
- Emerald 与 RS/FRLG 使用不同结果列布局。空 16 位 Seed 按上游无符号输入行为视为 `0`；输入范围、组合约束与固定夹具记录在 [Gen 3 Egg](modules/gen3egg.md)。
- 浏览器任务总组合上限为 `150,060,006`，保留 PokeFinder Emerald 默认 `5000 / 5000 / 0..5` 范围；Worker 在读取结果前核对 API 版本、记录上限、对齐和 Wasm 堆边界。
- 静态审查修正 Egg 性格全选掩码为 25 位 `0x1FF_FFFF`，防止第 22 至 25 种性格被错误排除；已补充 domain 边界断言，未运行测试。

### 下一位开发者第一步

1. 阅读 [`AGENTS.md`](../AGENTS.md)、[AI 开发一致性指南](ai-development.md)、本文、[Gen 3 Egg](modules/gen3egg.md) 和 [PokeFinder 上游记录](../third_party/pokefinder/UPSTREAM.md)。
2. 使用 GitHub Desktop 审查当前全部未提交修改，确认没有混入生成物；不要覆盖或重置已有工作区内容。
3. 项目所有者提交后推送 `main`，等待 GitHub Actions 以锁定工具链构建全部六个 Gen III Wasm 模块并部署 Pages。
4. Actions 部署成功后，项目所有者提供生产 URL 并明确授权；再用 Egg 文档的 Emerald 与 RSFRLG 固定夹具共同回归，并记录 URL、commit、Actions run、浏览器版本、输入、预期和实际结果。

建议 GitHub Desktop 提交标题：

```text
feat: 增加第三世代孵化乱数
```

## 1. 恢复入口

新环境按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)
2. [AI 开发一致性指南](ai-development.md)
3. 本文
4. [README](../README.md)、[产品需求](requirements.md)与[技术方案](tech-stack.md)
5. 当前模块文档：[Gen 3 Egg](modules/gen3egg.md)
6. 第四世代后续交接：[Gen 4 Development](gen4-development.md)
7. [上游记录](../third_party/pokefinder/UPSTREAM.md)
8. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)

聊天记录不是项目状态的事实来源。功能、依赖、工具链、构建、部署或阻塞变化后更新本文。

## 2. 已确认决策

- 正式英文工程名为 PokeRNGKit，不设置中文名。
- 当前产品只做第三世代；第四世代只保留 `gen4id`、`gen4static`、`gen4wild` 的共享接口和 AI 交接，不实现算法或 UI。
- 只使用 npm，不增加 pnpm、Yarn 或 Bun 元数据。
- React + TypeScript 负责 UI、输入校验、Worker 编排、结果与持久化；PokeFinder RNG 规则使用 C++ -> Emscripten -> Wasm，生产算法不在 TypeScript 主线程运行。
- 多核使用多个独立单线程 Worker/Wasm 实例，不依赖 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- IndexedDB 保存存档，localStorage 提供镜像兜底并保存语言、主题和悬浮窗状态。
- 界面只支持简体中文、英文和日文；有上游简中翻译时逐字复用，没有时保留英文。
- 正式 Wasm 与站点产物由 GitHub Actions 自动生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 未获项目所有者对具体命令或 URL 的明确授权时，Codex 不运行测试、构建、算法回归、性能检查或浏览器检查。
- Codex 不自动暂存、提交、push、部署或发布；完成模块后只提供一条 GitHub Desktop 提交标题。

## 3. Git 与部署状态

- 当前分支：`main`，HEAD `b97ae07 feat: 增加第三世代个体值查询PID`。
- 当前没有待完成的 merge 状态；所有本轮修改保持未提交。
- GitHub Pages 是当前测试目标；Cloudflare Pages 与 `hakuhiro.top` 留到 Pages 验收后配置。

## 4. 已进入 Git 基线

- 工程基础：React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语；npm 是唯一包管理器。
- 构建基线：Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2`。
- 法律边界：GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 已有工作区：`gen3id`、`gen3static` Generator/Searcher、`gen3wild` Generator/Searcher、三代存档信息、个体值计算器、`gen3ivtopid`。
- UI 基础：默认收起的模块抽屉、全局存档悬浮窗、浅色/深色主题和系统默认字体。

## 5. 验证状态

### 5.1 历史工程与页面证据

- 历史记录中包含前一阶段的 `format:check`、lint、typecheck、单元测试、UI 预览、原生夹具和生产页面回归证据；这些证据仅覆盖当时的构建与模块，不能覆盖当前未提交的 Egg 实现。
- 历史生产页面回归曾验证 ID Searcher 与 Static Searcher 固定夹具；具体记录以 Git 历史和此前部署对应文档为准。

### 5.2 本轮未运行

- `npm run format:check`、`npm run lint`、`npm run typecheck`、`npm test` 与 `npm run build:ui`：未运行，等待项目所有者对具体命令授权。
- `npm run wasm:test:native` 与 `npm run wasm:build`：未运行，等待项目所有者授权；本机工具链与 `emcmake` 状态未在本轮检查。
- GitHub Pages、真实 Worker/Wasm、移动端、PWA、离线、性能与算法回归：未运行，等待 Actions 部署和生产 URL 授权。

### 5.3 本轮静态检查

- 已通过：`git diff --check`。
- 已通过：README、`docs/` 与 `third_party/pokefinder/UPSTREAM.md` 的本地 Markdown 链接目标存在性检查。
- 已通过：`docs/modules/gen3egg.md`、`src/features/egg/` 与 `wasm/modules/gen3egg/` 的尾随空白检查。
- 上述检查不包含 TypeScript 编译、C++ 编译、原生夹具、Wasm 构建或算法验收。

## 6. 已知风险与边界

- `gen3egg` 当前只实现 Egg Generator；Egg Searcher、Masuda 和第四世代孵化规则不在范围内。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要在 Pages 实测后降低 Worker 数。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；Worker API 握手会拒绝版本不一致，但更新体验仍需在部署后验证。
- Wild 遭遇数据的精确 `EncounterTableGenerator` revision 与 Tanoby Chamber form 数据仍待后续处理，不属于 Egg 模块。
- 公开部署 Wasm 时必须向用户提供对应完整源码、构建脚本和 GPL 许可材料。

## 7. 新环境恢复

以下命令仅在项目所有者对具体范围授权后执行：

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

完整工程验证：

```bash
npm run verify
npm run wasm:test:native
npm run wasm:build
```

后两项需要 C++ 编译器与已激活的 Emscripten。缺少工具链时保留失败信息，由 Actions 补齐，不把未运行项写成已通过。

## 8. 维护规则

- 每个功能、部署、阻塞、依赖或工具链变化后更新本文。
- 验证结果必须区分“历史证据”“经授权检查”“未运行”和“待项目所有者共同验收”。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个 RNG 功能更新 `docs/modules/<module>.md`，重新核对 PokeFinder Form、Core、翻译和输入限制。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
