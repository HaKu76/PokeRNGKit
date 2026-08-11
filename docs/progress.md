# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-11
> - 当前阶段：阶段 2B / 3，Static Searcher 与第三世代存档信息
> - 当前模块：`gen3static`、`profiles`
> - Git 基线：`a5c47ba feat: 实现第三世代定点乱数模块`
> - 工作区状态：Static Searcher、存档信息、主题、输入限制和文档尚未提交
> - 部署状态：本轮工作区尚未推送，GitHub Pages 与真实 Wasm 待 Actions 验证
> - 人工验收：待项目所有者执行

## 1. 文档用途

本文是跨会话、跨机器和无聊天上下文环境的恢复入口。新环境按以下顺序阅读：

1. [AI 开发一致性指南](ai-development.md)：必读文件、上游核对和完成门槛。
2. [README](../README.md)：产品定位、构建、部署、隐私和许可证。
3. [产品需求](requirements.md)：当前范围和验收标准。
4. [技术方案](tech-stack.md)：版本、Wasm、Worker、持久化和 CI/CD。
5. [Gen 3 ID](modules/gen3id.md)、[Gen 3 Static](modules/gen3static.md)与[Gen 3 Profiles](modules/gen3profiles.md)。
6. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)：文档、提交、构建和发布说明。

聊天记录不是项目状态的单一事实来源。功能、依赖、工具链、构建、部署或阻塞发生变化后更新本文。

## 2. 已确认决策

- 正式英文工程名为 PokeRNGKit，不设置中文名。
- 当前只做第三世代，不开始 Gen IV。
- 模块名沿用 PokeFinder；内部使用 `gen3id`、`gen3static`、`gen3wild` 等标识。
- 只使用 npm，不增加 pnpm、Yarn 或 Bun 元数据。
- React + TypeScript 负责 UI、校验、Worker 编排、结果和持久化。
- PokeFinder RNG 规则使用 C++ -> Emscripten -> Wasm，不在 TypeScript 中重写生产算法。
- Wasm 只在 Web Worker 中运行；多核使用多个独立单线程 Wasm 实例。
- 不依赖 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- IndexedDB 保存存档信息，localStorage 提供完整镜像兜底并保存语言、主题和悬浮窗状态。
- 界面只支持简体中文、英文和日文；中文控件名逐字复用 `PokeFinder_zh.ts`。
- 主界面使用 `system-ui`，不加载第三方字体。
- GitHub Pages 先用于测试；Cloudflare Pages 后续作为正式部署目标。
- GitHub Actions 自动生成正式 Wasm 与站点产物，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 功能测试与最终验收由项目所有者执行；自动检查只提供工程证据。
- Codex 不自动暂存、提交、push、部署或发布，只提供一个 GitHub Desktop 提交标题。

## 3. Git 与部署基线

- 当前分支：`main`，跟踪 `origin/main`。
- 当前 HEAD：`a5c47ba3c43a8d72e168ede1da6278eada5f49fd`。
- 当前远端仍为 `https://github.com/HaKu76/PokeHero.git`；GitHub 仓库现名为 PokeRNGKit 时可由 GitHub Desktop 后续更新远端 URL。
- 最近 Git 基线已包含第三世代 ID 与 Static Generator。
- 当前首要测试地址为 <https://haku76.github.io/PokeRNGKit/>。
- `.github/workflows/ci.yml` 在 `main` push 后验证原生夹具、构建全部 Wasm/Web 产物并部署 Pages；Cloudflare 配置存在时复用同一 `dist` artifact。
- 如果 Pages 自动配置被仓库策略拒绝，在 GitHub `Settings -> Pages -> Build and deployment` 把 Source 设为 `GitHub Actions` 后重新运行。

## 4. 已进入 Git 基线

### 4.1 工程

- React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和三语基础已落地。
- `.node-version` 锁定 Node.js `24.19.0`，`packageManager` 锁定 npm `12.0.2`。
- CMake `4.3.1` 与 Ninja `1.13.2` 由 npm 提供；Emscripten `6.0.6` 由 emsdk/Actions 提供。
- GPL-3.0-or-later、上游署名、对应源码记录和站点免责声明已建立。
- 当前包含 PokeFinder GPL 衍生代码，不能附加“禁止商用”限制；本轮未修改许可证。商业使用本身不是违约，但分发时仍必须履行 GPL 的源码、许可证和版权声明义务。

### 4.2 `gen3id`

- XD/Colosseum、FireRed/LeafGreen/Emerald、Ruby/Sapphire ID Generator。
- TID、SID、TSV 筛选、推进范围、Worker Pool、进度、取消和结果上限。
- 虚拟化表格、排序、CSV、三语和本地 UI 预览。
- 算法与输入上限见 [Gen 3 ID](modules/gen3id.md)。

### 4.3 Static Generator

- Method 1、Method 4、Latios/Latias 游走 IV 缺陷和首批定点预设。
- 独立 `gen3static` Wasm/Worker、筛选、进度、取消、虚拟化表格、排序和 CSV。
- Generator 已由提交 `a5c47ba` 纳入 Git 基线；项目所有者完整功能验收仍待执行。

## 5. 当前未提交工作区

### 5.1 Static Searcher

- `gen3static` API 从 1 提升到 2，C++、TypeScript、Worker 和 `module.json` 已同步。
- C ABI 新增 `gen3static_search`，按 PokeFinder Method 1/4 反向恢复 IV 对应 Seed。
- Searcher 按 IV 笛卡尔积稳定分片，使用独立 `Gen3StaticSearcherWorkerPool`。
- 原生夹具增加 Groudon、Method 4、全 31 IV 恢复 4 个候选结果断言。
- Generator/Searcher 标签、进度、取消、Seed 结果列和 CSV 已接入同一 Static 工作区。

### 5.2 Static 补全

- Seed 空输入按上游解析为 `0`。
- Seed、Advances、Offset、TID/SID 和 IV 输入限制已在 HTML、规范化函数和 domain 校验中对齐。
- 新增“取消筛选”与 PokeFinder IV 组合键快捷设置。
- 结果新增觉醒属性与觉醒威力，移除不需要的 Level 列。
- 修复结果标题下方由虚拟行偏移造成的空白行。
- 当前首批预设仍不是完整 PokeFinder encounter 表，且未按当前存档版本过滤；这是提交后的第一个 Static 数据任务。

### 5.3 第三世代存档信息

- 支持新建、编辑、复制、删除、选择、JSON 导入导出和全部清除。
- IndexedDB 是主存储，localStorage 保存完整镜像并在 IndexedDB 失败时兜底。
- 默认临时存档为 `- / Emerald / 12345 / 54321`，不会自动持久化。
- 应用全局右下角显示小型悬浮窗；首次默认收起，用户状态写入 localStorage。
- ID 工作区可查看全部三代存档；Static 工作区只列当前兼容的掌机版本，避免把 XD/Colosseum 存档用于掌机定点计算。
- 管理器仍保留 XD/Colosseum 记录，为后续对应模块保留数据。

### 5.4 界面与文档

- 使用博客来源的浅色/深色调色板，主题写入 localStorage。
- 左侧模块导航改为默认收起的覆盖式抽屉，支持遮罩、Escape 和选择后关闭。
- 站点继续使用系统默认字体和现有 `public/favicon.ico`。
- 新增根 `AGENTS.md`、[AI 开发一致性指南](ai-development.md)和[Gen 3 Profiles](modules/gen3profiles.md)。
- ID/Static 模块文档补充上游输入限制与核对文件。

## 6. 当前验证状态

### 6.1 本轮已通过

2026-08-11 在当前工作区已通过：

- `npm run format`。
- `npm run typecheck`。
- `npm test`：8 个测试文件、25 项测试通过。
- `npm run build:ui`：Vite UI 模式构建成功，同时生成 ID 与 Static Worker bundle。
- `npm run dev:ui`：`http://127.0.0.1:5173/` 返回 HTTP 200。
- `npm run verify`：格式、lint、类型、25 项测试与生产 Web/PWA 构建通过；PWA precache 11 个条目。
- `npm ls --depth=0`：顶层依赖树完整。
- Markdown 本地链接：13 个文件检查通过，无缺失目标。
- `gen3static` API：manifest、TypeScript、C++ 与原生夹具均为版本 2。
- 过期阶段描述扫描与 `git diff --check` 通过。

这些结果是在全局存档悬浮窗和模块抽屉改为默认收起后重新运行，仍不代表项目所有者验收或真实 Wasm 已通过。

### 6.2 当前本机工具链

- 本机 Node.js：`24.13.0`，低于项目要求的 `24.19.0`。
- 本机 npm：`11.6.2`，低于项目锁定的 `12.0.2`。
- npm CMake/Ninja：`npm run wasm:doctor` 检测为可用。
- Emscripten / `emcmake`：当前 PowerShell 未激活，`npm run wasm:doctor` 失败。
- 本机 C++ 编译器：`npm run wasm:test:native` 配置失败，CMake 未找到 `CMAKE_CXX_COMPILER`。

### 6.3 尚未完成

- 当前 C++ Searcher 夹具未在本机编译运行；锁定工具链的 Actions 必须验证 4 候选断言。
- Emscripten 6.0.6 的 `gen3static_search` 导出和真实 Worker/Wasm 浏览器集成。
- GitHub Pages 上的 ID/Static Worker、Wasm、PWA 安装和离线重载。
- 项目所有者对 ID、Static、存档信息、主题和响应式界面的功能验收。
- Cloudflare Pages 与 `hakuhiro.top` 正式域名。

## 7. 下一步

严格按以下顺序执行：

1. 项目所有者打开 `http://127.0.0.1:5173/`，验收模块抽屉、全局存档悬浮窗、CRUD、导入导出、清除和 Static Generator/Searcher 交互。
2. 使用 GitHub Desktop 提交当前工作区；提交标题由最终 diff 生成。
3. 推送 `main`，确认 Actions 原生夹具、Emscripten Wasm、生产构建和 GitHub Pages 全部通过。
4. 记录项目所有者使用的浏览器版本、已知输入和验收结果。
5. 修复验收问题后，补齐 Static encounter presets 并按存档版本过滤。
6. Static 数据范围通过后，再开始 `gen3wild` Generator/Searcher。

## 8. 不要提前做

- 不开始 Gen IV、Egg、GameCube、PokeSpot 或 Jirachi。
- 不把 Wild 或其他世代逻辑塞进 `gen3static`。
- 不把 PokeFinder RNG Core 改写成 TypeScript。
- 不启用 Wasm pthread、`SharedArrayBuffer` 或跨源隔离。
- 不引入后端、SSR、账号、云同步、遥测、运行时 CDN 或第三方字体。
- 不提前安装 React Router、全局状态框架、Dexie、Playwright 或大型 UI 依赖。
- 不删除 GPL 头、上游版权、SHA-256 或对应源码说明。
- 不硬编码尚未决定的 Cloudflare 域名。
- 不提交生成的 Wasm、构建目录或 `dist/`。

## 9. 已知风险

- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要降低 Worker 数。
- 取消通过终止 Worker 生效，实际延迟需要 Pages 实测。
- Searcher IV 范围最多 50,000,000 组合，宽范围仍可能产生大量候选并先触发 250,000 条结果上限。
- Static 首批预设不是完整 encounter 表；增加预设时必须核验版本、物种、等级、性别阈值和游走缺陷。
- localStorage 镜像提高 IndexedDB 故障恢复能力，但用户清除站点数据后仍无法恢复未导出的存档信息。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；API 握手会拒绝运行，但更新体验仍需实测。
- 如果源码仓库不是公开可访问，公开 Pages 不能只链接私有仓库来履行对应源码提供义务。

## 10. 新环境恢复

### 10.1 最短检查

```bash
git status --short --branch
git log -5 --oneline
node --version
npm --version
npm ci --engine-strict
npm run wasm:doctor
```

不要在未确认工作区所有者前执行 reset、checkout、clean 或删除操作。

### 10.2 本地 UI

```bash
npm run dev:ui
```

打开 <http://127.0.0.1:5173/>。该模式只验收界面与交互，不验证 RNG 或性能。

### 10.3 完整验证

```bash
npm run verify
npm run wasm:test:native
npm run wasm:build
```

后两项需要 C++ 编译器与已激活的 Emscripten。缺少工具链时保留失败信息，由 Actions 补齐，不把未运行项写成已通过。

### 10.4 最小交接上下文

```text
PokeRNGKit 不设置中文名，只用 npm，当前只做 Gen III。
HEAD a5c47ba 已包含 gen3id 与 Static Generator。
当前未提交工作区实现 Static Searcher、觉醒力量、输入限制、主题、
第三世代存档信息和全局默认收起悬浮窗。
生产算法使用 C++/Emscripten Wasm，仅在独立 Worker 中运行；
多核使用多个单线程 Wasm 实例，不依赖 SharedArrayBuffer。
先阅读 AGENTS.md、docs/ai-development.md 和 docs/progress.md，
完成验证与项目所有者验收后再补 Static encounter presets，最后开始 Wild。
```

## 11. 维护规则

- 每个功能、部署、阻塞、依赖或工具链变化后更新日期和当前阶段。
- 验证结果区分“已通过”“未运行”“待项目所有者验收”。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个功能模块新增或更新 `docs/modules/<module>.md`。
- 控件名和输入限制必须重新核对 PokeFinder Form 与翻译文件。
- 发布版本记录实际 Git commit、构建工具版本、产物和验证环境。
- README、进度、提交、构建或发布说明使用 `hakuhiro-project-style`。
