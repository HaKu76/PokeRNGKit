# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-12
> - 当前阶段：新增遇敌查询静态悬浮工具，等待工程检查与部署验收
> - 当前模块：`encounterlookup`
> - Git 基线：`c48eb28 fix: 修复第三世代孵化构建与分片验证`
> - 工作区状态：存在未提交的遇敌查询源码、静态数据与文档；Codex 不暂存、不提交、不 push
> - 部署状态：本轮未推送，GitHub Pages 与 Cloudflare Pages 均未执行本轮部署
> - 验收状态：历史基线已完成本机工程检查、原生夹具与 Wasm 发布构建；遇敌查询未运行工程检查、浏览器检查或项目所有者验收

## 0. 当前工作区优先状态

- HEAD `c48eb28` 已包含此前 Egg/Wild 构建、分片、格式和类型修复；本轮工作区没有待完成 merge，也没有未提交的旧模块修改。
- 当前模块集合：`gen3id`、`gen3initialseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`profiles`、`ivcalculator`、`encounterlookup`。
- 本轮新增 `encounterlookup`：右下角默认收起的全世代 Encounter Lookup，覆盖 PokeFinder 4.3.2 的 Gen III、Gen IV、Gen V 和 BDSP 共 16 个版本；静态数据由 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 生成，未运行工程检查。
- 遇敌查询不进入左侧 RNG 导航，不使用 Wasm/Worker；宝可梦候选、游戏版本、地点、遇敌种类和等级范围均来自本地静态数据。
- 已清理生成用 `.tmp-encounter-tables/` 与 `.tmp-encounter-tables.zip`；生成脚本和正式 `data.ts` 保留在工作区。
- 本轮只完成源码、上游和数据结构静态审查；未获项目所有者授权，未运行测试、构建、lint、typecheck、浏览器、性能或部署页面检查。

### 当前工作区实现：`encounterlookup`

- 新增 `src/features/encounterlookup`，包含查询 domain、边界测试、三语静态数据和右下角悬浮面板。
- 支持 PokeFinder 4.3.2 实际支持的 16 个游戏版本；物种上限为 Gen III `386`、Gen IV `493`、Gen V `649`、BDSP `493`。
- 查询覆盖时间、群聚、雷达、双槽、广播、季节、Feebas、HGSS Safari/撞树/捕虫大赛等上游 Encounter Lookup 组合。
- 个体值计算器与遇敌查询从所有入口保持双向互斥展开；左侧 `ActiveModule` 与模块抽屉不包含 Encounter Lookup。
- 生成脚本、精确 revision、输入行为和 GPL 来源记录见 [遇敌查询](modules/encounterlookup.md)与[上游记录](../third_party/pokefinder/UPSTREAM.md)。

### 下一位开发者第一步

1. 阅读 [`AGENTS.md`](../AGENTS.md)、[AI 开发一致性指南](ai-development.md)、本文、[遇敌查询](modules/encounterlookup.md)、[Gen 3 Egg](modules/gen3egg.md)、[Gen 3 Wild](modules/gen3wild.md) 和 [PokeFinder 上游记录](../third_party/pokefinder/UPSTREAM.md)。
2. 在 GitHub Desktop 审查遇敌查询面板、静态生成数据、生成脚本和文档；不要覆盖、重置或选择性丢弃工作区内容。
3. 项目所有者如需本机工程检查，明确授权具体命令；否则由项目所有者提交并推送，等待 GitHub Actions 复核并部署 Pages。
4. Actions 部署成功后，由项目所有者提供生产 URL 并明确授权外部浏览器检查，再共同验收 16 个版本切换、三语物种/地点、查询结果和移动端悬浮布局。

## 当前可用模块

- `gen3id`：第三世代 ID Generator/Searcher。
- `gen3initialseed`：第三世代 Initial Seed 反推。
- `gen3static`：第三世代定点 Generator/Searcher。
- `gen3wild`：第三世代野生 Generator/Searcher、地点选择、完整筛选、Worker Pool、CSV、UI 预览与真实 Wasm 运行。
- `gen3ivtopid`：第三世代 IVs to PID 查询。
- `gen3egg`：第三世代 Egg Generator。
- `profiles`、`ivcalculator`：全局存档与个体值计算器。
- `encounterlookup`：右下角遇敌查询悬浮工具，覆盖 PokeFinder 4.3.2 实际支持的 16 个游戏版本。

新环境按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)
2. [AI 开发一致性指南](ai-development.md)
3. 本文
4. [README](../README.md)、[产品需求](requirements.md)与[技术方案](tech-stack.md)
5. 当前模块文档：[遇敌查询](modules/encounterlookup.md)
6. 第四世代后续交接：[Gen 4 Development](gen4-development.md)
7. [上游记录](../third_party/pokefinder/UPSTREAM.md)
8. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)

### 本次合并带入的 Wild 变更

- 在遭遇生成数据中写入 PokeFinder 简体中文地点名，并为反编译地点标签补充同源名称映射。
- 为 Wild 增加 Searcher 操作页：Method、队首、遭遇地点、性格和六维 IV 最小/最大范围；任务依旧在独立 Worker/Wasm 实例中分片。
- 补齐觉醒力量、异色、性别、特性、宝可梦和遭遇槽位筛选，并移除 Wild 生成区旁的个体值计算器入口。
- 将六项 IV 最大值默认设为 31；Wild 结果表按 Static 的通用列顺序显示并追加槽位、宝可梦和等级，CSV 复用同一列定义，槽位按 PokeFinder 的 0 基值显示和导出。
- UI 模式提供明确标识的确定性样例引擎，方便先验收界面，且不把样例结果伪装成 Wasm 计算。
- 安装并激活项目锁定的 Emscripten 6.0.6，修复 Windows 下 `emcc.exe`/`emcmake.exe` 探测，并排除本地 SDK 与生成 Wasm 的格式和 lint 扫描。

## 验证记录

- 正式英文工程名为 PokeRNGKit，不设置中文名。
- 当前 RNG 产品只做第三世代；第四世代只保留 `gen4id`、`gen4static`、`gen4wild` 的共享接口和 AI 交接，不实现 RNG 算法或主模块 UI。`encounterlookup` 是用户明确批准的跨世代静态查询例外。
- 只使用 npm，不增加 pnpm、Yarn 或 Bun 元数据。
- React + TypeScript 负责 UI、输入校验、Worker 编排、结果与持久化；PokeFinder RNG 规则使用 C++ -> Emscripten -> Wasm，生产算法不在 TypeScript 主线程运行。
- 多核使用多个独立单线程 Worker/Wasm 实例，不依赖 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- IndexedDB 保存存档，localStorage 提供镜像兜底并保存语言、主题和悬浮窗状态。
- 界面只支持简体中文、英文和日文；有上游简中翻译时逐字复用，没有时保留英文。
- 正式 Wasm 与站点产物由 GitHub Actions 自动生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 未获项目所有者对具体命令或 URL 的明确授权时，Codex 不运行测试、构建、算法回归、性能检查或浏览器检查。
- 已获授权的浏览器、Worker、控制台、部署页面和 UI 调试只使用外部 Google Chrome 或 Microsoft Edge；不使用应用内浏览器作为调试替代。外部浏览器未连接时应报告并等待连接。
- Codex 不自动暂存、提交、push、部署或发布；完成模块后只提供一条 GitHub Desktop 提交标题。

## 后续验收

- 当前分支：`main`，HEAD `c48eb28 fix: 修复第三世代孵化构建与分片验证`。
- 当前无待完成 merge；遇敌查询源码、静态数据、生成脚本和文档保持未提交。
- GitHub Pages 是当前测试目标；Cloudflare Pages 与 `hakuhiro.top` 留到 Pages 验收后配置。

## 4. 已进入 Git 基线

- 工程基础：React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语；npm 是唯一包管理器。
- 构建基线：Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2`。
- 法律边界：GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 已有模块：`gen3id`、`gen3initialseed`、`gen3static` Generator/Searcher、`gen3wild` Generator/Searcher、`gen3ivtopid`、`gen3egg`、三代存档信息和个体值计算器；`encounterlookup` 当前仍在未提交工作区。
- UI 基础：默认收起的模块抽屉、全局存档悬浮窗、浅色/深色主题和系统默认字体。

## 5. 验证状态

### 5.1 历史工程与页面证据

- 历史记录中包含前一阶段的 `format:check`、`lint`、`typecheck`、单元测试、UI 预览、原生夹具和生产页面回归证据；这些证据只覆盖对应提交，不能覆盖当前未提交的遇敌查询变更。
- 历史生产页面回归曾验证 ID Searcher 与 Static Searcher 固定夹具；具体记录以 Git 历史和此前部署对应文档为准。

### 5.2 基线工程验证

- 已通过：`npm run verify`。Prettier、ESLint、`tsc -b`、15 个 Vitest 文件共 54 项测试、Vite 生产构建与 PWA 预缓存均已完成；ESLint 保留两条非阻断的 TanStack Virtual / React Compiler 警告。
- 已通过：在 Visual Studio 2026 Build Tools x64 开发环境中运行 `npm run wasm:test:native`，6/6 原生 Core 夹具通过。
- 已通过：在用户级 emsdk `6.0.6` 环境中运行 `npm run wasm:doctor` 与 `npm run build`，六个 Gen III Wasm 模块、Vite 生产站点和 PWA 预缓存均成功生成。CMake `4.3.1` 报告 Emscripten shared library 支持警告，但当前模块均为独立可执行 Wasm target，构建未受阻。
- GitHub Pages、真实 Worker/Wasm、移动端、PWA、离线、性能与算法回归：未运行，等待 Actions 部署和生产 URL 授权。

### 5.3 遇敌查询本轮检查

- 已完成：源码、生成数据结构、上游 16 个版本、世代图鉴上限、翻译词条与悬浮工具状态的静态审查。
- 已确认：生成数据包含 16 个游戏键，等级范围未发现反向值或超过 100 的记录；该结论来自生成阶段的静态数据检查，不是测试或浏览器验收。
- 未运行：`git diff --check`、Prettier、ESLint、TypeScript、Vitest、Vite 构建、Wasm、浏览器、性能、部署页面和项目所有者验收；原因是本轮未获具体检查授权。

## 6. 已知风险与边界

- `gen3egg` 当前只实现 Egg Generator；Egg Searcher、Masuda 和第四世代孵化规则不在范围内。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要在 Pages 实测后降低 Worker 数。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；Worker API 握手会拒绝版本不一致，但更新体验仍需在部署后验证。
- Wild 遭遇数据的 Tanoby Chamber form 数据仍待后续处理；本轮 `encounterlookup` 已锁定 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 并生成 16 个版本的静态查询数据。
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

后两项需要 C++ 编译器与已激活的 Emscripten。当前 Windows 本机可先执行：

```bat
call C:\Users\Hakuhiro\AppData\Local\pokerngkit-emsdk\emsdk_env.bat
npm run wasm:doctor
npm run build
```

emsdk 环境只对当前终端会话生效。新电脑缺少工具链时保留失败信息，由 Actions 补齐，不把未运行项写成已通过。

## 8. 维护规则

- 每个功能、部署、阻塞、依赖或工具链变化后更新本文。
- 验证结果必须区分“历史证据”“经授权检查”“未运行”和“待项目所有者共同验收”。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个 RNG 功能更新 `docs/modules/<module>.md`，重新核对 PokeFinder Form、Core、翻译和输入限制。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
