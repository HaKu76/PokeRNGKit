# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-11
> - 当前阶段：阶段 1B，GitHub Pages 测试部署
> - 当前模块：`gen3id`，第三世代 ID 乱数
> - Git 基线：`39c41c5 init: 仓库初始化`
> - 工作区状态：本阶段实现尚未提交，由项目所有者检查后提交和推送
> - 部署状态：GitHub Pages 尚未完成首次部署

## 1. 文档用途

本文用于跨会话、跨机器和跨工作环境恢复项目上下文。新环境先阅读本文，再按需阅读：

1. [README](../README.md)：项目定位、当前能力、构建、部署和许可证。
2. [产品需求](requirements.md)：`gen3id` 功能边界、验收标准和后续阶段。
3. [技术方案](tech-stack.md)：版本、目录、Wasm、Worker、测试和 CI/CD。
4. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)：文档、提交、构建和发布说明格式。

聊天记录不是项目状态的单一事实来源。每个模块完成、部署、阻塞或工具链变化后都更新本文。

## 2. 已确认决策

- 正式英文工程名为 PokeRNGKit，当前不设置中文名。
- 项目将 PokeFinder 转为纯静态、本地优先的 Web 工具。
- 第一阶段只做第三世代；当前先完成 ID 乱数，再做档案、Static 和 Wild。
- 只使用 npm，不使用 pnpm、yarn 或 Bun。
- 产品层使用 React + TypeScript；RNG Core 使用 C++ -> Emscripten -> Wasm。
- Wasm 只在 Web Worker 内运行，Worker Pool 使用多个独立 Wasm 实例并行计算。
- 基线不使用 `SharedArrayBuffer`、Wasm threads、COOP/COEP 或跨源隔离。
- CMake 和 Ninja 作为 npm devDependencies 安装；Emscripten 使用官方 emsdk。
- 语言只支持简体中文、英文和日文。
- GitHub Pages 先作为测试环境；Cloudflare Pages 后续作为正式部署目标。
- 正式 Wasm 与站点产物由 GitHub Actions 全自动构建，不提交本地生成的 `.wasm` 或 `dist/`。
- 本地 UI 验收使用独立 `ui` mode 和确定性样例引擎，不依赖 Emscripten，也不参与生产构建。
- 正式域名使用 `hakuhiro.top` 下的地址，具体主机名未决定。
- 功能测试和最终验收由项目所有者亲自执行。
- 不由 Codex 自动提交、push 或发布；每个模块结束时提供建议提交信息。

## 3. 已完成

### 3.1 仓库基线

- 已完成首个提交 `39c41c5 init: 仓库初始化`。
- 已建立 README、需求、技术方案、进度交接、GPLv3 许可证和 `.gitignore`。
- 已建立项目级 `hakuhiro-project-style` Skill。
- 已将正式工程名统一为 PokeRNGKit，产品代码、PWA、npm/CMake 标识和文档已同步更新。
- 当前远端仍为 `https://github.com/HaKu76/PokeHero.git`，当前分支为 `main`；仓库和本地目录尚未随品牌改名，由项目所有者在提交前后统一处理。

### 3.2 React 应用

- 已建立 React 19 + TypeScript 6 + Vite 8 工程。
- 已实现第三世代 ID 乱数单页工作区。
- 已实现 XD/竞技场、火叶/绿宝石、红蓝宝石三种模式。
- 已实现 TID、SID、TSV 精确筛选。
- 已实现推进范围校验、进度、取消、错误和结果上限状态。
- 已实现四列虚拟化结果表、数值排序、清空和 CSV 导出。
- 已实现简体中文、英文和日文切换，并用 `localStorage` 保存语言。
- 已实现 `dev:ui` / `preview:ui` 本地 UI 验收模式，并持续显示非生产提示。
- 已加入 PWA manifest、Service Worker 配置和图标。
- 已加入页面源码、GPL 和 PokeFinder 上游入口。

主要文件：

```text
src/App.tsx
src/i18n.ts
src/styles.css
src/features/id/domain.ts
src/features/id/domain.test.ts
src/features/id/search.ts
src/features/id/preview/Gen3IdUiPreviewEngine.ts
src/features/id/preview/Gen3IdUiPreviewEngine.test.ts
```

### 3.3 Worker Pool

- 已定义 `init/run` 请求和 `ready/batch/error` 响应协议。
- 已实现 `Gen3IdWorkerPool`，默认最多使用 8 个 Worker。
- 已将任务拆成最多 100,000 状态的分片。
- 已按 `chunkIndex` 恢复并行返回批次的确定性顺序。
- 已使用 transferable `ArrayBuffer` 传递 12 字节定长结果记录。
- 已通过终止 Worker Pool 实现取消，下一任务重新初始化。

主要文件：

```text
src/features/id/worker/messages.ts
src/features/id/worker/Gen3IdWorkerPool.ts
src/features/id/worker/gen3id.worker.ts
```

### 3.4 Wasm 与上游 Core

- 已导入 PokeFinder 4.3.2 第三世代 ID Generator 所需的最小 C++ Core。
- 已在 `third_party/pokefinder/UPSTREAM.md` 记录上游、范围和文件 SHA-256。
- 已建立独立 `gen3id` CMake target、module manifest 和 `gen3id_*` C ABI。
- 已建立三种模式固定夹具、筛选和错误码的原生 C++ 测试。
- 已关闭文件系统和 Wasm threads，使用 ES module、Worker 环境和可增长内存。
- 已建立 npm 构建编排 `scripts/wasm.mjs`。

主要文件：

```text
wasm/CMakeLists.txt
wasm/modules/gen3id/module.json
wasm/modules/gen3id/CMakeLists.txt
wasm/modules/gen3id/bridge/gen3id_bridge.cpp
wasm/modules/gen3id/tests/id3_native_test.cpp
third_party/pokefinder/UPSTREAM.md
```

### 3.5 npm 工具链

- `.node-version` 和 `engines` 锁定 Node.js `24.19.0`。
- `packageManager` 和 Actions 锁定 npm `12.0.2`。
- `cmake-runtime@4.3.1` 和 `ninja-runtime@1.13.2` 精确锁定在 npm devDependencies。
- Actions 使用 `mymindstorm/setup-emsdk@v14` 安装 Emscripten `6.0.6`。
- 应用和构建入口全部由 npm scripts 提供。

### 3.6 GitHub Pages 工作流

`.github/workflows/ci.yml` 已实现：

1. Checkout。
2. 安装 Node.js `24.19.0`、npm `12.0.2` 和 Emscripten `6.0.6`。
3. `npm ci --engine-strict` 和 `npm run wasm:doctor`。
4. 格式、lint、类型、TypeScript 单元测试和 Web 构建。
5. 原生 C++ 一致性测试。
6. Wasm + Web 完整生产构建。
7. 上传 `dist/` 并部署 GitHub Pages。

Actions 会尝试将 Pages Source 自动设为 GitHub Actions。构建使用 `BASE_PATH=./`，同一份 `dist/` 可用于 `/PokeRNGKit/` 和后续 Cloudflare 根路径。

Cloudflare job 已保留为可选路径；没有配置 `CLOUDFLARE_PROJECT_NAME` 时不会运行。

## 4. 当前验证状态

### 4.1 本次已通过

2026-08-11 在当前工作区运行：

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`：2 个测试文件，7 个测试通过
- `BASE_PATH=./ npm run build:web`：Vite 8.2.1 构建成功，PWA precache 10 个条目
- `npm run build:ui`：不依赖 Wasm 产物，UI 预览静态构建成功
- 构建产物检查：相对 JS/CSS 路径正确，`dist/legal/LICENSE.txt` 与 `dist/legal/UPSTREAM.md` 存在并进入 precache
- `npx npm@12.0.2 ci --ignore-scripts`：按新 lockfile 安装 476 个包；当前 Node 版本产生预期的 engine 警告
- `npm ls --all`：完整依赖树通过
- `npm audit`：0 个已知漏洞

以上是工程检查，不代表项目所有者功能验收。

### 4.2 当前本机工具链

- 当前本机 Node.js：`24.13.0`，低于项目要求的 `24.19.0`。
- 当前本机 npm：`11.6.2`，低于项目锁定的 `12.0.2`。
- npm 安装的 CMake：可用。
- npm 安装的 Ninja：可用。
- 本机 C++ 编译器：未安装或未进入 PATH。
- Emscripten / `emcmake`：本机尚未激活。

`npm run wasm:test:native` 已尝试，但 CMake 因找不到 C++ 编译器而停止配置；没有执行原生夹具。`npm run wasm:doctor` 正确报告 CMake/Ninja 可用、Emscripten/`emcmake` 缺失。

因此本机结果不能作为锁定 Node/npm 环境、原生一致性或 Wasm 构建的最终证明。GitHub Actions 会使用锁定 Node/npm/Emscripten 和 Ubuntu 系统编译器补齐完整验证。

### 4.3 尚未验证

- Emscripten 实际生成 `gen3id.mjs` 与 `gen3id.wasm`。
- 原生 C++ 固定夹具通过。
- GitHub Pages 首次构建和部署。
- Pages 环境中的 Worker/Wasm URL、PWA 安装和离线重载。
- 项目所有者对三种模式、筛选、取消、CSV、三语和移动端的功能验收。
- Cloudflare Pages 和 `hakuhiro.top` 正式域名。

## 5. 当前第一优先级

先部署 GitHub Pages 测试，不开始档案、Static、Wild 或其他世代。

### 5.1 本地 UI 验收

不安装 Emscripten 也可以运行：

```bash
npm run dev:ui
```

访问 <http://127.0.0.1:5173/>。

需要按静态产物方式预览时运行：

```bash
npm run preview:ui
```

访问 <http://127.0.0.1:4173/>。

UI 预览可以检查模式切换、输入、筛选、进度、取消、表格、排序、CSV、三语和响应式布局。页面显示“UI 预览”时，结果是确定性样例，不用于 RNG 正确性或性能验收。

### 5.2 项目所有者提交

首次部署前，在 GitHub 仓库设置中将仓库名改为 `PokeRNGKit`，并在 GitHub Desktop 的仓库设置中确认远端地址更新为 `https://github.com/HaKu76/PokeRNGKit.git`。本地目录名不影响构建，可在关闭开发工具后按需改名。

使用 GitHub Desktop 检查本阶段 diff 后提交：

```text
feat: 实现第三世代 ID 乱数模块
```

随后通过 GitHub Desktop 推送 `main`。当前会话不代为提交或 push。

### 5.3 GitHub Pages

推送后查看仓库 `Actions -> Verify And Deploy`。工作流成功后，预计测试地址为：

```text
https://haku76.github.io/PokeRNGKit/
```

如果 Configure GitHub Pages 因仓库策略失败：

1. 打开 `Settings -> Pages`。
2. 将 `Build and deployment -> Source` 设为 `GitHub Actions`。
3. 回到 Actions 重新运行失败工作流。

不要选择从分支目录直接发布；本项目的 Wasm 和 Vite 产物由 Actions 构建后上传。

### 5.4 项目所有者验收

在 Pages 环境检查：

- 三种 ID 模式各一组已知输入。
- TID、SID、TSV 单独和组合筛选。
- 大范围进度、取消、结果上限和页面响应。
- 排序、CSV 和清空结果。
- 简体中文、英文、日文切换与刷新保留。
- 桌面和移动浏览器布局。
- 在线首次加载、PWA 安装和离线重载。
- 页面源码、GPL、上游链接可打开。

把实际浏览器版本、输入、结果和问题记录回本文或独立 validation 文档。

## 6. Pages 通过后的顺序

1. 修复项目所有者在 `gen3id` 验收中发现的问题。
2. 增加 Worker + 真实 Wasm 浏览器集成测试。
3. 增加 GitHub Pages 路径和离线 Playwright 冒烟。
4. 记录 `gen3id` 性能、Worker 数、取消和内存基线。
5. 完成三代档案与 IndexedDB。
6. 开始 `gen3static`。
7. 开始 `gen3wild`。
8. 进入 Cloudflare Pages 与正式域名发布准备。

## 7. 不要提前做

- 不要在 Pages 和 `gen3id` 验收前开始 Gen IV ID。
- 不要把 Static/Wild 逻辑放入 `gen3id` 模块。
- 不要把 RNG Core 改写成 TypeScript。
- 不要启用 Wasm pthread、`SharedArrayBuffer` 或跨源隔离。
- 不要引入后端、SSR、账号、云同步、遥测或运行时 CDN。
- 不要安装尚未进入实现阶段的路由、全局状态、Dexie、Playwright 或大型 UI 依赖。
- 不要删除 GPL 头、上游版权、SHA-256 或对应源码说明。
- 不要硬编码尚未决定的 Cloudflare 域名。

## 8. 已知风险

- CI 是首次实际 Emscripten 构建，可能暴露 Linux 路径、CMake 或 Emscripten 6.0.6 参数问题。
- `glob@11.1.0` 有上游弃用提示，来源为 `vite-plugin-pwa -> workbox-build`；当前审计为 0 个漏洞，等待上游升级，不使用未经验证的 override。
- 多 Worker 会复制 Wasm 内存；低内存移动设备可能需要降低 Worker 数。
- 取消依赖分片边界和 Worker 终止，实际延迟需要 Pages 实测。
- PWA 旧缓存可能造成 UI/Wasm API 版本短暂错配；当前 API 握手会拒绝运行，但更新体验仍需验收。
- GitHub Pages 是否允许 Actions 自动启用受仓库和组织策略影响。
- 如果源代码仓库不是公开可访问，公开 Pages 不能只链接私有仓库来履行对应源码提供义务。

## 9. 新环境恢复

### 9.1 最短检查

```bash
git status --short --branch
git log -1 --oneline
node --version
npm --version
npm ci --engine-strict
npm run wasm:doctor
```

### 9.2 完整验证

激活官方 emsdk 后运行：

```bash
npm run verify
npm run wasm:test:native
npm run wasm:build
npm run build
```

新环境必须使用 `.node-version` 和 `packageManager` 指定版本。桌面的 `C:\Users\Hakuhiro\Desktop\PokeFinder-master` 只用于历史只读核验，构建只使用仓库内 `third_party/pokefinder/`。

### 9.3 最小交接上下文

```text
先阅读 README.md、docs/progress.md、docs/requirements.md 和
docs/tech-stack.md，再检查 git status。项目名 PokeRNGKit 已确定，
不设置中文名；只用 npm；当前只落地 Gen III 的 gen3id。
React/TypeScript 负责 UI 和 Worker 编排，PokeFinder 4.3.2 C++ Core
通过 Emscripten 编译为单线程 Wasm，多核由独立 Worker Pool 使用，
不依赖 SharedArrayBuffer。当前第一优先级是 GitHub Pages 测试和
项目所有者验收，完成前不要开始下一个模块。结束前更新
docs/progress.md，并按 hakuhiro-project-style 给出提交信息。
```

## 10. 维护规则

- 每个模块、部署、阻塞、依赖或工具链变化后更新日期和当前阶段。
- 把已完成事项移入“已完成”，附文件和实际命令。
- 验证结果区分“已通过”“未运行”“待项目所有者验收”。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 功能边界变化先更新需求文档，再更新本文。
- 发布版本记录实际 Git commit、构建工具版本、产物和验证环境。
- 编写 README、进度、提交、构建或发布说明时使用 `hakuhiro-project-style`。
