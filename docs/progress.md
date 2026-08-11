# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-11
> - 当前阶段：阶段 4A，第三世代 Wild Generator 验证
> - 当前模块：`gen3id`、`gen3static`、`gen3wild`、`profiles`、`ivcalculator`
> - Git 基线：`9092968 feat: 合并第三世代野生生成器`
> - 工作区状态：`gen3wild` 实现与文档仍有未提交修改；Codex 不暂存、不提交、不 push
> - 部署状态：本轮未推送，GitHub Pages 与 Cloudflare Pages 均未执行本轮部署
> - 人工验收：待项目所有者执行

## 1. 恢复入口

本文是跨会话和跨机器恢复入口。新环境按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)
2. [AI 开发一致性指南](ai-development.md)
3. 本文
4. [README](../README.md)、[产品需求](requirements.md)与[技术方案](tech-stack.md)
5. 当前模块文档：[Gen 3 Wild](modules/gen3wild.md)
6. [上游记录](../third_party/pokefinder/UPSTREAM.md)
7. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)

聊天记录不是项目状态的事实来源。功能、依赖、工具链、构建、部署或阻塞变化后更新本文。

## 2. 已确认决策

- 正式英文工程名为 PokeRNGKit，不设置中文名。
- 当前只做第三世代；模块名沿用 PokeFinder，内部使用 `gen3id`、`gen3static`、`gen3wild`。
- 只使用 npm，不增加 pnpm、Yarn 或 Bun 元数据。
- React + TypeScript 负责 UI、校验、Worker 编排、结果与持久化。
- PokeFinder RNG 规则使用 C++ -> Emscripten -> Wasm，生产算法不在 TypeScript 主线程运行。
- 多核使用多个独立单线程 Worker/Wasm 实例，不依赖 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- IndexedDB 保存存档，localStorage 提供镜像兜底并保存语言、主题和悬浮窗状态。
- 界面只支持简体中文、英文和日文；有上游简中翻译时逐字复用，没有时保留英文。
- 正式 Wasm 与站点产物由 GitHub Actions 自动生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 功能测试与最终验收由项目所有者执行；自动检查只提供工程证据。
- Codex 不自动暂存、提交、push、部署或发布，只提供 GitHub Desktop 操作说明和一条提交标题。

## 3. Git 与部署状态

- 当前分支：`main`，HEAD `9092968`。
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
- `profiles`：IndexedDB 主存储、localStorage 镜像、新建、编辑、复制、删除、选择、JSON 导入导出和全部清除。
- `ivcalculator`：第三世代物种、性格、觉醒力量、多行能力值交集和下一级提示。

## 5. 当前未提交工作区：`gen3wild` Generator

### 5.1 已实现

- 独立 `wasm/modules/gen3wild/` CMake target、API v2 C ABI、60 字节结果记录和原生固定夹具。
- `src/features/wild/` domain、Worker 消息、Worker Pool、分片解码和本地 UI 预览引擎；每个 Worker 独立持有 Wasm 实例。
- 单分片最多 100,000 个状态，单任务最多 50,000,000 个状态，结果上限 250,000 条；取消通过终止 Worker 生效。
- 支持 Ruby、Sapphire、Emerald、FireRed、LeafGreen，Grass、Rock Smash、Surfing、Old Rod、Good Rod、Super Rod，以及 Wild 1/2/4。
- 支持 Emerald 队首规则、RSE Rock Smash 遭遇率修正、Route 119 Feebas Tile 和 RSE Safari Zone 额外 RNG 推进。
- C++/Wasm 内完成 Shiny、Gender、Ability、Nature、Hidden Power、Encounter Slot、Level 和六项 IV 范围筛选。
- UI 提供地点/宝可梦联动、筛选清除、IV 快捷键、能力值显示、16 列结果表、数值排序、CSV、进度和取消。
- 当前数据没有 Tanoby Chamber 的未知图腾 form，七个 Chamber 从地点列表排除。

### 5.2 明确未完成

- Wild Searcher。
- Tanoby Chamber form 数据、地点本地化和完整遭遇数据来源 revision 记录。
- Actions 原生夹具、Emscripten Wasm 产物、Pages 真实资源加载和项目所有者功能验收。

## 6. 验证状态

### 6.1 已运行

- 本轮已通过：`npm run verify`（格式、lint、类型检查、生产 Web 构建）。
- `npm test`：12 个测试文件、39 项测试通过。
- 前一轮已通过：`npm run build:ui`，并完成 UI 预览基础交互检查；同时对照上游 `personal_rsefrlg.bin` 核对 390 条能力数据。
- 本轮已通过：`npm run format:check`、`npm run build:ui`、`git diff --check`；Markdown 引用目标存在。

### 6.2 当前未运行

- `npm run wasm:test:native`：本机没有可用 C++ 编译器。
- `npm run wasm:build`：本机没有已激活的 Emscripten `emcmake`。
- GitHub Pages、移动端性能、取消延迟、PWA 离线和真实 Worker/Wasm 集成：需 Actions 或项目所有者验收。

## 7. 下一步

1. 完成本轮 `verify`、UI 构建、Markdown 链接和 diff 检查。
2. 项目所有者在 GitHub Desktop 审查未提交修改并创建提交：`feat: 完善第三世代野生乱数生成器`。
3. 推送后确认 Actions 的原生夹具、Emscripten Wasm、生产构建和 GitHub Pages 全部通过。
4. 使用 PokeFinder 固定输入逐字段验收 Wild Generator，记录浏览器版本、输入和结果。
5. Wild Generator 验收通过后，单独开始 Wild Searcher；不要把 Searcher 混入本轮增量。

## 8. 已知风险

- 遭遇数据的精确 `EncounterTableGenerator` revision 尚未记录；全地点一致性仍需抽样验收。
- Tanoby Chamber 因缺少 form 被排除，在数据补齐前不能开放。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要降低 Worker 数。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；API v2 握手会拒绝运行，但更新体验仍需实测。
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
- 验证结果区分“已通过”“未运行”和“待项目所有者验收”。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个 RNG 功能更新 `docs/modules/<module>.md`。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core 与翻译文件。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
