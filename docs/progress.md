# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-11
> - 当前阶段：阶段 2A，第三世代 Static Generator
> - 当前模块：`gen3static`
> - Git 基线：`93c9d5a docs: 更新 Pages 部署阻塞记录`
> - 工作区状态：Static Generator 代码、界面、图标和文档尚未提交
> - 部署状态：GitHub Pages 尚未部署，仓库需要先启用 GitHub Actions 作为 Pages Source

## 1. 文档用途

本文是跨会话、跨机器和跨工作环境的恢复入口。新环境先阅读：

1. [README](../README.md)：项目定位、当前能力、构建、部署和许可证。
2. [产品需求](requirements.md)：ID、Static Generator 边界与验收标准。
3. [技术方案](tech-stack.md)：版本、目录、Wasm、Worker、测试和 CI/CD。
4. [Gen 3 ID 算法](modules/gen3id.md)与 [Gen 3 Static 算法](modules/gen3static.md)。
5. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)：文档、提交、构建和发布说明格式。

聊天记录不是项目状态的单一事实来源。每个模块完成、部署、阻塞或工具链变化后更新本文。

## 2. 已确认决策

- 正式英文工程名为 PokeRNGKit，当前不设置中文名。
- 第一阶段只做第三世代，不开始 Gen IV。
- 模块名沿用 PokeFinder 功能名；内部使用 `gen3id`、`gen3static` 等“世代 + 功能”标识。
- 只使用 npm，不使用 pnpm、yarn 或 Bun。
- React + TypeScript 负责 UI、校验、Worker 编排、结果和持久化。
- RNG Core 使用 C++ -> Emscripten -> Wasm，不在 TypeScript 中重写上游算法。
- Wasm 只在 Web Worker 内运行；多核由多个独立 Worker/Wasm 实例实现。
- 不依赖 Wasm threads、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- CMake 和 Ninja 由 npm 安装；Emscripten 使用官方 emsdk，CI 自动安装。
- 界面只支持简体中文、英文和日文。
- 主界面使用 `system-ui` 默认字体，不复用博客字体，不加载第三方字体。
- GitHub Pages 先作为测试环境；Cloudflare Pages 后续作为正式部署目标。
- 正式域名使用 `hakuhiro.top` 下的地址，具体主机名未决定。
- 正式 Wasm 与站点产物由 GitHub Actions 自动构建，不提交本地 `.wasm` 或 `dist/`。
- 功能测试与最终验收由项目所有者亲自执行。
- Codex 不自动提交、push 或发布；每个模块结束时只提供建议提交信息。

## 3. Git 与部署基线

- 当前分支：`main`，跟踪 `origin/main`。
- 当前远端仍记录 `https://github.com/HaKu76/PokeHero.git`，GitHub 通过仓库重命名重定向到 PokeRNGKit；后续可在 GitHub Desktop 更新远端 URL。
- 最近提交：

```text
93c9d5a docs: 更新 Pages 部署阻塞记录
5229038 fix: 修复 Wasm 工具链检测
b94f331 feat: 实现第三世代 ID 乱数模块
```

- Actions 已证明锁定工具链可以完成 ID 原生夹具、Wasm 与 Web 构建。
- GitHub Pages 的 Configure Pages 步骤曾因 Token 无权创建站点而失败。
- 项目所有者需要在仓库 `Settings -> Pages -> Build and deployment` 把 Source 设为 `GitHub Actions`，再推送当前模块或重新运行工作流。
- 预计测试地址：<https://haku76.github.io/PokeRNGKit/>。

## 4. 已完成基线

### 4.1 仓库与工程

- README、需求、技术方案、进度交接、GPLv3 许可证和 `.gitignore` 已建立。
- 项目级 `hakuhiro-project-style` Skill 已建立并纳入仓库。
- React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和三语基础已落地。
- `.node-version` 锁定 Node.js `24.19.0`，`packageManager` 锁定 npm `12.0.2`。
- `cmake-runtime@4.3.1`、`ninja-runtime@1.13.2` 和 Emscripten `6.0.6` 构成当前 Wasm 工具链基线。
- `.github/workflows/ci.yml` 自动验证、构建所有 manifest 模块，并部署 Pages；配置后也可部署 Cloudflare Pages。

### 4.2 `gen3id`

- 已实现 XD/竞技场、火红/叶绿/绿宝石、红宝石/蓝宝石 ID Generator。
- 已实现 TID、SID、TSV 筛选、推进范围、Worker Pool、进度、取消和结果上限。
- 已实现四列虚拟化表格、排序、CSV、三语和本地 UI 预览。
- 已导入 PokeFinder 4.3.2 所需最小 Core，并记录文件 SHA-256。
- 已建立 `gen3id_*` C ABI、12 字节结果记录和原生固定夹具。
- 模块算法见 [docs/modules/gen3id.md](modules/gen3id.md)。

## 5. 当前工作区：`gen3static`

### 5.1 Wasm 模块

- 新增 `wasm/modules/gen3static/` 独立 CMake target、manifest、C ABI bridge 和原生夹具。
- 复用 vendored PokeRNG LCRNG，不复制 Qt UI、ProfileLoader 或完整 Static Core 对象图。
- 对齐 PokeFinder `StaticGenerator3::generate` 的 PID、Method 1、Method 4、IV、性格、特性、性别和闪光规则。
- 对 Latios/Latias 实现第三世代游走 IV 缺陷。
- 使用 48 字节定长结果记录；每次 C ABI 调用最多处理 100,000 个状态。

主要文件：

```text
wasm/modules/gen3static/module.json
wasm/modules/gen3static/CMakeLists.txt
wasm/modules/gen3static/bridge/gen3static_bridge.h
wasm/modules/gen3static/bridge/gen3static_bridge.cpp
wasm/modules/gen3static/tests/static3_native_test.cpp
```

### 5.2 TypeScript 与 Worker

- 新增 Static 请求、校验、分片、48 字节解码和结果类型。
- 新增 `Gen3StaticWorkerPool` 与独立 Worker；默认最多 8 个 Worker。
- 批次按 `chunkIndex` 恢复确定顺序，通过 transferable `ArrayBuffer` 返回。
- 支持进度、取消、结果上限和 Worker/Wasm 错误终态。
- 新增确定性 UI 预览引擎，不依赖 Emscripten。

主要文件：

```text
src/features/static/domain.ts
src/features/static/search.ts
src/features/static/worker/messages.ts
src/features/static/worker/Gen3StaticWorkerPool.ts
src/features/static/worker/gen3static.worker.ts
src/features/static/preview/Gen3StaticUiPreviewEngine.ts
```

### 5.3 界面

- 应用侧栏可切换 Gen 3 ID 与 Gen 3 Static。
- Static Generator 使用三列操作区：乱数信息、设置/目标、筛选；结果区独立占满宽度。
- 首批预设：Mewtwo、Rayquaza、Regirock、Regice、Registeel、Deoxys、Latios、Latias。
- 支持 Seed、推进范围、Offset、Method、TID/SID、IV、性格、特性、性别和闪光筛选。
- Latios/Latias 自动限制 Method 1，并显示游走 IV 提示。
- 结果表支持虚拟化、多列数值排序、CSV、清空和移动端横向滚动。
- Static 文案已加入简体中文、英文和日文；切换语言会同步 HTML `lang`。
- 品牌缩写图形已移除，站点和 PWA 使用 `public/favicon.ico`。
- 主界面保持 `system-ui` 默认字体；仅 Seed、PID、数值结果等使用系统等宽字体。

主要文件：

```text
src/App.tsx
src/i18n.ts
src/styles.css
src/features/static/Gen3StaticPanel.tsx
public/favicon.ico
index.html
vite.config.ts
```

### 5.4 算法与上游文档

- 新增 [Gen 3 ID 算法](modules/gen3id.md)。
- 新增 [Gen 3 Static 算法](modules/gen3static.md)。
- `third_party/pokefinder/UPSTREAM.md` 已补充 StaticGenerator3 与 Utilities 只读核验 SHA-256。
- Worker 分片在文档中明确为执行编排，不属于 RNG 规则。

## 6. 当前验证状态

### 6.1 本轮已观察

2026-08-11 在当前工作区通过：

- `npm run format`。
- `npm run typecheck`。
- `npm run lint`。
- `npm test`：4 个测试文件、12 项测试通过。
- `npm run build:ui`：Vite UI 模式构建成功，同时生成 ID 与 Static Worker bundle。
- `npm run verify`：格式、lint、类型、12 项测试与生产 Web/PWA 构建通过；PWA precache 11 个条目。
- 浏览器 UI 预览：Static 处理 100,001 个样例状态并显示 500 条结果；Latios 禁用 Method 4 并显示游走 IV 提示。
- 移动端 `390x844`：页面无整体横向溢出；结果表容器宽 322px、内容宽 1120px，横向滚动已验证。
- 默认字体：根元素实际解析为 `system-ui, sans-serif`。

以上是自动检查和 Codex 浏览器预览证据，不代表项目所有者功能验收或真实 RNG 性能。

### 6.2 当前本机工具链

- Node.js：`24.13.0`，低于项目要求的 `24.19.0`。
- npm：`11.6.2`，低于项目锁定的 `12.0.2`。
- npm CMake/Ninja：可用。
- 本机 C++ 编译器：`npm run wasm:test:native` 确认当前 PATH 中没有可用 C++ 编译器，CMake 停止配置，原生夹具未运行。
- Emscripten / `emcmake`：`npm run wasm:build` 确认当前 PowerShell 未激活，真实 Wasm 构建未运行。

本机前端检查可以提供开发证据，但不能替代锁定 Node/npm 环境、真实 Emscripten 构建或项目所有者验收。

### 6.3 尚未完成

- 当前本机的 `gen3static` 原生 C++ 夹具与真实 Wasm 构建；提交后由锁定工具链的 Actions 补齐。
- Static 真实 Worker/Wasm 浏览器集成。
- GitHub Pages 对两个 Worker/Wasm 模块的加载、PWA 安装与离线重载。
- 项目所有者对 ID 与 Static 的功能、移动端和结果正确性验收。
- Cloudflare Pages 与 `hakuhiro.top` 正式域名。

## 7. 下一步

按顺序执行：

1. 完成本轮格式、lint、类型、测试、UI/Web 构建、原生夹具和 Wasm 工具链检查。
2. 项目所有者运行 `npm run dev:ui`，验收 Static 桌面/移动布局、筛选、排序、CSV 和三语。
3. 使用 GitHub Desktop 提交当前模块，建议提交信息：

```text
feat: 实现第三世代定点乱数模块
```

4. 推送 `main`，确认 Actions 构建 `gen3id` 与 `gen3static`，并完成 GitHub Pages 测试。
5. 记录项目所有者验收结果和实际浏览器版本。
6. 修复验收问题后，再开始 Static Searcher。
7. 后续依次处理三代档案、Wild Generator/Searcher、发布加固和 Cloudflare 正式部署。

## 8. 不要提前做

- 不开始 Gen IV、Egg、GameCube、PokeSpot 或 Jirachi。
- 不把 Static Searcher 或 Wild 逻辑塞进 `gen3static` Generator bridge。
- 不把 RNG Core 改写成 TypeScript。
- 不启用 Wasm pthread、`SharedArrayBuffer` 或跨源隔离。
- 不引入后端、SSR、账号、云同步、遥测、运行时 CDN 或第三方字体。
- 不提前安装 React Router、全局状态框架、Dexie、Playwright 或大型 UI 依赖。
- 不删除 GPL 头、上游版权、SHA-256 或对应源码说明。
- 不硬编码尚未决定的 Cloudflare 域名。
- 不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。

## 9. 已知风险

- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要降低 Worker 数。
- 取消依赖当前分片结束或终止 Worker，实际延迟需要 Pages 实测。
- Static 首批预设不是完整 PokeFinder 定点数据集，增加预设时必须核验物种、等级、性别阈值和缺陷标记。
- Static bridge 当前复现上游规则但未 vendoring 完整 Static Core；后续上游升级时必须重新对照核验文件 SHA-256 和夹具。
- PWA 旧缓存可能造成 UI/Wasm API 版本短暂错配；API 握手会拒绝运行，但更新体验仍需验收。
- GitHub Pages 是否允许 Actions 自动启用受仓库和组织策略影响。
- 如果源代码仓库不是公开可访问，公开 Pages 不能只链接私有仓库来履行对应源码提供义务。

## 10. 新环境恢复

### 10.1 最短检查

```bash
git status --short --branch
git log -3 --oneline
node --version
npm --version
npm ci --engine-strict
npm run wasm:doctor
```

### 10.2 本地 UI

```bash
npm run dev:ui
```

访问 <http://127.0.0.1:5173/>。UI 预览结果是确定性样例，只用于界面与交互验收。

### 10.3 完整验证

激活官方 emsdk 并准备本机 C++ 编译器后运行：

```bash
npm run verify
npm run wasm:test:native
npm run wasm:build
npm run build
```

桌面的 `C:\Users\Hakuhiro\Desktop\PokeFinder-master` 只用于只读核验。正式构建只使用仓库内源码、vendored snapshot 和模块 bridge。

### 10.4 最小交接上下文

```text
先阅读 README.md、docs/progress.md、docs/requirements.md、
docs/tech-stack.md 和 docs/modules/。项目名 PokeRNGKit 已确定，
不设置中文名；只用 npm；当前只做 Gen III。gen3id 已进入 Git
基线，当前工作区实现 gen3static Generator，Static Searcher 未开始。
React/TypeScript 负责 UI 和 Worker 编排，PokeFinder 4.3.2 规则通过
C++/Emscripten 编译为单线程 Wasm，多核由独立 Worker Pool 使用，
不依赖 SharedArrayBuffer。下一步先完成验证、项目所有者验收、提交
和 Pages 测试，再开始 Static Searcher。结束前更新 docs/progress.md，
并按 hakuhiro-project-style 给出提交信息。
```

## 11. 维护规则

- 每个模块、部署、阻塞、依赖或工具链变化后更新日期和当前阶段。
- 把已完成事项移入“已完成”，附文件和实际命令。
- 验证结果区分“已通过”“未运行”“待项目所有者验收”。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个功能模块必须新增或更新 `docs/modules/<module>.md` 算法说明。
- 功能边界变化先更新需求文档，再更新本文。
- 发布版本记录实际 Git commit、构建工具版本、产物和验证环境。
- 编写 README、进度、提交、构建或发布说明时使用 `hakuhiro-project-style`。
