# PokeRNGKit 技术栈与工程方案

> - 状态：阶段 2A，`gen3static` Generator 已实现并等待完整验证
> - 更新日期：2026-08-11
> - 当前范围：第三世代 ID Generator 与 Static Generator
> - 包管理器：npm

## 1. 技术结论

PokeRNGKit 使用 TypeScript 构建产品层，使用 WebAssembly 承载 RNG Core：

- React + TypeScript 负责界面、输入校验、任务状态、结果展示、CSV 和国际化。
- PokeFinder 第三世代 C++ Core 通过 Emscripten 编译为独立 Wasm 模块。
- Wasm 只在 Dedicated Web Worker 内运行。
- Worker Pool 用多个独立 Wasm 实例利用多核 CPU，不依赖 `SharedArrayBuffer`。
- Vite 生成纯静态 `dist/`，GitHub Pages 先用于测试，Cloudflare Pages 后续用于正式部署。
- 所有本地和 CI 入口由 npm scripts 统一封装。

这一组合同时保留三项能力：上游 C++ 算法可复用、浏览器主线程不被长计算阻塞、普通静态托管可以直接部署。

## 2. 为什么不是纯 TypeScript

纯 TypeScript 适合界面和任务编排，但不适合作为本项目的唯一算法层：

- 重新实现 PokeFinder Core 会扩大正确性验证和长期维护成本。
- 后续导入 C++ 或 Rust 项目时，Wasm 模块可以保留原语言测试和算法结构。
- 大范围整数循环在 Wasm 中通常更容易获得稳定性能，且不受 UI 框架更新影响。
- 算法通过窄 C ABI 暴露后，React、Worker 和未来其他前端可以独立演进。

Wasm 本身不自动提供多线程。PokeRNGKit 当前用 Worker Pool 并行运行多个单线程 Wasm 实例；这可以使用多个 CPU 核，同时避免 GitHub Pages 无法统一提供跨源隔离响应头的问题。

## 3. 架构

```text
React UI
  |-- React local state
  |-- i18next / localStorage
  |-- virtualized result table / CSV
  |-- ui mode -> deterministic preview engine
  `-- production -> module-specific Worker Pool
        |-- Gen3IdWorkerPool -> gen3id.mjs + gen3id.wasm
        `-- Gen3StaticWorkerPool -> gen3static.mjs + gen3static.wasm
                                      |
                                      `-- narrow C ABI bridges
                                            `-- PokeFinder 4.3.2 Gen III rules
```

所有 Worker 相互独立。Pool 负责分片、排序批次、进度、结果上限和取消；C++ 只负责给定输入范围内的确定性计算。

Vite 的 `ui` mode 在编译期选择本地 UI 预览引擎。该引擎只生成确定性样例，用于验收界面状态和交互；生产 mode 固定选择 Worker Pool，不能通过 URL 或本地设置切换。UI mode 不注册 PWA Service Worker，避免样例页面污染真实 Wasm 预览缓存。

## 4. 当前版本与锁定策略

以下版本来自 2026-08-11 已提交或待提交的 `package.json`、`.node-version`、`package-lock.json` 和 Actions 配置。升级时必须重新查询官方发布信息和支持范围，不凭旧版本表直接修改。

### 4.1 精确锁定

| 工具或依赖      | 当前版本  | 锁定位置                             | 原因                             |
| --------------- | --------- | ------------------------------------ | -------------------------------- |
| Node.js         | `24.19.0` | `.node-version`、`engines`           | 本地与 CI 运行时一致             |
| npm             | `12.0.2`  | `packageManager`、Actions            | lockfile 安装行为一致            |
| TypeScript      | `6.0.3`   | `package.json`、lockfile             | 编译器变化会影响类型与产物       |
| React           | `19.2.8`  | `package.json`、lockfile             | 与 React DOM 成组验证            |
| React DOM       | `19.2.8`  | `package.json`、lockfile             | 与 React 成组验证                |
| Vitest          | `4.1.10`  | `package.json`、lockfile             | 测试运行时保持可复现             |
| Emscripten      | `6.0.6`   | Actions、工程文档                    | Wasm ABI、优化和输出格式需要复现 |
| cmake-runtime   | `4.3.1`   | `package.json`、lockfile             | 通过 npm 提供跨平台 CMake        |
| ninja-runtime   | `1.13.2`  | `package.json`、lockfile             | 通过 npm 提供跨平台 Ninja        |
| PokeFinder 基线 | `4.3.2`   | `third_party/pokefinder/UPSTREAM.md` | 算法与许可证来源可追溯           |

### 4.2 兼容范围 + lockfile 精确解析

| 依赖                      | manifest 范围 | 用途                               |
| ------------------------- | ------------- | ---------------------------------- |
| Vite                      | `^8.2.1`      | 静态构建、Worker 和资源处理        |
| `@vitejs/plugin-react`    | `^6.0.5`      | React JSX 转换                     |
| `vite-plugin-pwa`         | `^1.3.0`      | manifest、Service Worker、离线缓存 |
| `@tanstack/react-virtual` | `^3.14.9`     | 大结果表虚拟化                     |
| i18next                   | `^26.3.6`     | 国际化资源和语言状态               |
| react-i18next             | `^17.0.11`    | React 国际化绑定                   |
| ESLint                    | `^10.8.1`     | 静态检查                           |
| typescript-eslint         | `^8.66.0`     | TypeScript ESLint 规则             |
| Prettier                  | `^3.9.6`      | 统一格式                           |

兼容范围用于接收同一 major 内的可评估更新，`package-lock.json` 记录实际安装的精确版本。CI 只运行 `npm ci`，不在构建期间重算依赖树。

## 5. 前端选择

### 5.1 React 与 TypeScript

React 负责高交互表单、进度状态和虚拟化结果视图。TypeScript 为 RNG 请求、Worker 消息、Wasm 解码和状态机提供静态边界。

当前有 ID 与 Static 两个工作区，状态仍由各自 React 组件的 `useState`、`useMemo` 和明确的搜索引擎实例管理。暂不引入 Zustand、Redux 或其他全局状态框架；当多个模块需要共享档案、任务队列或列配置时再评估。

### 5.2 路由

当前不安装 React Router。ID 与 Static 使用应用内模块切换即可完成工作流，不需要独立 URL；档案、Wild 或可分享视图形成真正页面边界后再评估路由，并优先使用兼容静态托管刷新行为的方案。URL 不保存 TID、SID、Seed 或完整筛选条件。

### 5.3 表格

当前使用语义化表头/行和 `@tanstack/react-virtual`：

- 排序规则简单，直接由 TypeScript 数值排序实现。
- 虚拟化只渲染可见行，降低大结果集 DOM 成本。
- ID 四列与 Static 多列结果都只需要单列数值排序，当前 CSS Grid + TypeScript 排序足够。
- 暂不安装 TanStack Table；当列显隐、组合排序、固定列或复杂表头出现后再评估。

### 5.4 国际化

i18next + react-i18next 管理 `zh`、`en`、`ja`：

- 语言 key 是稳定标识，Wasm 不返回文案。
- 语言偏好保存在 `localStorage` 的 `pokerngkit-language`。
- 简体中文术语优先复用项目所有者维护的 PokeFinder 翻译。
- PokeFinder 4.3.2 中未完成的日文 ID Qt 文案由 Web 层补齐并单独维护。

### 5.5 PWA

`vite-plugin-pwa` 使用 Workbox 生成 Service Worker：

- 注册策略为 `autoUpdate`。
- 缓存 JS、CSS、HTML、ICO、MJS 和 Wasm。
- `navigateFallback` 为 `index.html`。
- 主界面使用 `system-ui` 默认字体栈，不依赖博客字体、第三方字体或运行时 CDN。

PWA 离线能力必须在真实 GitHub Pages 环境验收，构建成功不等于离线已经通过。

## 6. 状态与持久化

### 6.1 当前模块

- React state：输入、筛选、结果、排序、进度和任务终态。
- `localStorage`：只保存语言。
- Worker/Wasm：任务期间的临时计算状态。
- 页面刷新：终止任务并重建 Worker，不持久化结果。
- UI 预览：ID 与 Static 各自使用同一搜索接口的样例引擎，不读取或生成 Wasm。

### 6.2 后续档案

档案使用 IndexedDB，并通过 repository 层隔离页面。档案阶段计划引入 Dexie 处理 schema、事务和迁移，但在该模块开始前不安装依赖；届时重新核验稳定版本并提交 lockfile。

轻量设置继续使用 `localStorage`。不把 IndexedDB 数据镜像进长期全局 store，也不把 TID/SID 放进 URL。

## 7. Wasm 模块化

### 7.1 命名

模块名按“世代 + 功能”组织：

```text
gen3id
gen4id
gen3static
gen3wild
```

每个模块必须拥有独立目录、manifest、构建 target、C ABI 前缀、Worker client 和测试，避免一个 Wasm 文件吸收所有世代和功能。

### 7.2 当前目录

```text
wasm/
|-- CMakeLists.txt
|-- build/                         # 生成物，忽略
`-- modules/
    |-- gen3id/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    `-- gen3static/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/

public/wasm/                        # 生成物，忽略
|-- gen3id.mjs
|-- gen3id.wasm
|-- gen3static.mjs
`-- gen3static.wasm
```

`scripts/wasm.mjs` 读取 `module.json`，选择模块、调用 npm 提供的 CMake/Ninja、执行原生测试或通过 emsdk 构建 Wasm，并检查声明的产物是否存在。

### 7.3 C ABI

当前 `gen3id` 与 `gen3static` API 版本均为 1。ID C ABI 为：

```c
uint32_t gen3id_api_version();
uint32_t gen3id_generate(
  uint32_t mode,
  uint32_t input,
  uint32_t initialAdvances,
  uint32_t maxAdvances,
  uint32_t filterFlags,
  uint32_t tid,
  uint32_t sid,
  uint32_t tsv
);
uintptr_t gen3id_result_ptr();
uint32_t gen3id_result_count();
uint32_t gen3id_last_error();
```

结果为连续的 12 字节记录：

```text
uint32 advances
uint32 tidSID      # low 16 bits TID, high 16 bits SID
uint32 tsv
```

Static C ABI 使用同一生命周期形式：`gen3static_api_version`、`gen3static_generate`、`gen3static_result_ptr`、`gen3static_result_count` 和 `gen3static_last_error`。请求以固定宽度整数传入 Seed、推进范围、Offset、Method、预设属性、TID/SID 和筛选；结果为连续 48 字节记录：

```text
uint32 advances
uint32 pid
uint32 ivHP / ivAtk / ivDef / ivSpA / ivSpD / ivSpe
uint32 ability
uint32 gender
uint32 level
uint32 natureShiny  # low 8 bits nature, remaining bits shiny type
```

边界原则：

- 只传递固定宽度整数、指针和长度，不暴露 C++ 对象、STL 或 Qt 类型。
- 每次 C ABI 调用最多 100,000 个状态。
- 返回缓冲区在下一次同 Worker 调用前有效，Worker 必须立即复制并转移。
- 错误使用稳定数值码，TypeScript 负责转换为用户可见错误。
- API 版本不匹配时停止初始化，不尝试兼容猜测。

### 7.4 Emscripten 配置

当前模块使用：

- `-O3`
- ES module + modularized factory
- `ENVIRONMENT=worker`
- `ALLOW_MEMORY_GROWTH=1`
- `FILESYSTEM=0`
- `MALLOC=emmalloc`
- 单线程、无 `SharedArrayBuffer`

每个 Worker 只加载所属模块的 MJS/Wasm。增加 Worker 会提高并行度，也会增加 Wasm 内存占用；默认上限为 8，并在 Pages 实测后调整。

## 8. Worker 协议

### 8.1 请求

```ts
type ModuleWorkerRequest =
  | { type: "init"; moduleUrl: string }
  | {
      type: "run";
      taskId: string;
      chunk: ModuleChunk;
      request: ModuleRequest;
    };
```

### 8.2 响应

```ts
type ModuleWorkerResponse =
  | { type: "ready"; apiVersion: number }
  | {
      type: "batch";
      taskId: string;
      chunkIndex: number;
      stateCount: number;
      resultCount: number;
      elapsedMs: number;
      buffer: ArrayBuffer;
    }
  | {
      type: "error";
      taskId?: string;
      chunkIndex?: number;
      code: string;
      message: string;
    };
```

协议原则：

- 所有任务使用不可复用的 `taskId`。
- `chunkIndex` 保证多个 Worker 返回乱序时仍能按推进顺序提交结果。
- 批次缓冲区使用 transfer list 移交所有权。
- 取消通过终止 Pool 中的 Worker 实现，下一任务重新初始化。
- 未知任务、重复批次、Wasm 错误或缓冲区长度异常都进入失败终态。
- ID 与 Static 使用相同的消息信封原则，但保留独立 TypeScript 类型、Worker 文件和 API 版本，不使用未加区分的通用 payload。

## 9. 源码与许可证边界

`third_party/pokefinder/` 是构建使用的可审计 vendored snapshot，不引用开发者桌面绝对路径。

- `UPSTREAM.md` 记录上游项目、版本、导入日期、文件 SHA-256 和修改边界。
- 上游文件保留原版权与 GPL 头。
- PokeRNGKit bridge 使用独立文件和 `gen3id_*`、`gen3static_*` 前缀。
- `vite.config.ts` 在构建结束时将根 `LICENSE` 和上游记录复制到 `dist/legal/`。
- 页面页脚链接 PokeRNGKit 源代码、GPL 文本和上游记录。

公开部署 Wasm 时，源代码仓库或对应源码包必须对站点用户可访问。

## 10. 工程目录

```text
.github/workflows/ci.yml            # 验证、Pages、可选 Cloudflare
docs/
|-- modules/
|   |-- gen3id.md
|   `-- gen3static.md
|-- progress.md
|-- requirements.md
`-- tech-stack.md
public/
|-- favicon.ico
`-- wasm/                            # 生成物，忽略
scripts/wasm.mjs
src/
|-- App.tsx
|-- i18n.ts
|-- styles.css
`-- features/
    |-- id/
    |   |-- domain.ts
    |   |-- preview/
    |   `-- worker/
    `-- static/
        |-- domain.ts
        |-- Gen3StaticPanel.tsx
        |-- preview/
        `-- worker/
third_party/pokefinder/
vite.config.ts
vitest.config.ts
wasm/modules/
|-- gen3id/
`-- gen3static/
```

后续模块沿用同一结构，不把 `gen4id`、Searcher 或 Wild 逻辑塞进现有 Generator 文件。

## 11. npm 构建入口

### 11.1 本地环境

```bash
npm install --global npm@12.0.2
npm ci --engine-strict
npm run wasm:doctor
```

CMake 和 Ninja 来自 npm。`scripts/wasm.mjs` 解析对应平台的原生二进制，并在 POSIX 环境补齐 npm 发布包可能缺失的可执行位。Emscripten 必须使用[官方 emsdk](https://emscripten.org/docs/getting_started/downloads.html)安装和激活；npm registry 中同名旧包不作为 Windows 或 CI 工具链。

`npm run wasm:test:native` 还需要平台 C++ 编译器：Windows 可安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 的 C++ 工作负载，Linux 使用 GCC 或 Clang。GitHub Actions 的 Ubuntu runner 提供系统编译器；该编译器只用于原生夹具，公开 Wasm 产物仍由精确锁定的 Emscripten 生成。

### 11.2 命令

```bash
npm run dev              # 先构建 Wasm，再启动 Vite
npm run dev:ui           # 本地 UI 验收，不依赖 Wasm
npm run dev:web          # 只启动 Web；适合界面开发
npm run build            # Wasm + TypeScript + Vite
npm run build:ui         # 生成本地 UI 预览静态文件
npm run build:web        # 不重建 Wasm
npm run preview:ui       # 构建并预览 UI 模式
npm run wasm:test:native # 原生 C++ 夹具
npm run wasm:build       # 生成 public/wasm
npm run verify           # 格式、lint、类型、单元测试、Web 构建
npm run verify:full      # verify + 原生测试 + Wasm 构建
```

`public/wasm/`、`wasm/build/` 和 `dist/` 都是生成物，不提交到 Git。

## 12. 测试金字塔

### 12.1 当前已实现

- **C++ 原生夹具**：ID 三种模式，以及 Static Method 1、Method 4、游走缺陷、筛选和错误码。
- **TypeScript 单元测试**：ID/Static 输入边界、分片、解码和红蓝宝石 Seed 推导。
- **UI 预览引擎测试**：ID/Static 确定性样例、进度和取消。
- **静态检查**：Prettier、ESLint、TypeScript project build。
- **生产 Web 构建**：Vite Worker、PWA、相对 base 和法律文件。

### 12.2 Pages 预览后补充

- Testing Library：模块切换、表单校验、取消、排序、CSV 和语言切换。
- Worker + 真实 Wasm 浏览器集成：API 握手、批次顺序、错误、取消和内存边界。
- Playwright：GitHub Pages 子路径、ID/Static 冒烟、离线重载和移动视口。
- 性能基线：记录设备、浏览器、状态数、Worker 数、吞吐、取消耗时和峰值内存。

测试数量不代替上游一致性。优先保证 C++ 固定夹具、协议边界和真实 Pages 加载路径。

## 13. 当前模块技术验证门槛

`gen3static` Generator 进入项目所有者验收前必须完成：

1. 原生夹具通过 Method 1、Method 4、游走缺陷、筛选和错误边界。
2. 固定 Seed 的 PID、IV 与性格逐字段匹配 PokeFinder 4.3.2 基线。
3. Emscripten 6.0.6 生成可加载的 `gen3static.mjs` 与 `gen3static.wasm`。
4. Static Worker Pool 在多 Worker 下保持结果顺序、稳定进度和取消行为。
5. 大范围任务运行时主线程仍能响应输入、模块切换和结果滚动。
6. 简体中文、英文和日文可以切换，Latios/Latias 禁用 Method 4 并显示游走缺陷说明。
7. 多列排序、CSV、结果上限、错误状态和移动端横向滚动符合需求。
8. GitHub Pages 无 ID/Static JS、Worker、Wasm、manifest 或 Service Worker 404。
9. 项目所有者完成并记录功能、移动端和离线验收。

## 14. GitHub Actions 与 Pages

`.github/workflows/ci.yml` 在 pull request、`main` push 和手动触发时运行。

```text
checkout
  -> Node 24.19.0
  -> npm 12.0.2
  -> Emscripten 6.0.6
  -> npm ci --engine-strict
  -> wasm:doctor
  -> npm run verify
  -> npm run wasm:test:native
  -> npm run build (BASE_PATH=./，构建所有 module.json)
  -> configure Pages
  -> upload dist artifact
  -> deploy GitHub Pages
```

Pull request 不执行 configure/upload/deploy。主分支部署 job 不重新编译，只部署 build job 上传的 artifact。

相对 `BASE_PATH=./` 让同一产物同时适配：

- GitHub Pages：`https://haku76.github.io/PokeRNGKit/`
- Cloudflare Pages：未来自定义域名根路径

Actions 使用 `actions/configure-pages` 的 `enablement: true` 尝试启用 Pages。如果仓库或组织策略拒绝自动启用，项目所有者在 GitHub Settings 中把 Pages Source 设为 GitHub Actions 后重新运行。

### 14.1 构建职责

正式部署采用全自动构建，Actions 是公开产物的规范来源：

- Git 只跟踪源码、`package-lock.json`、工具链版本和构建脚本。
- Actions 在固定 Node、npm、Emscripten、CMake/Ninja 入口中生成 Wasm 和 Web 产物。
- `public/wasm/`、`wasm/build/` 和 `dist/` 不提交，避免二进制漂移和无法追溯的本机构建。
- Pages 与未来 Cloudflare 使用同一 build job 产生的完整 `dist/`，不拼接不同构建批次的 JS 与 Wasm。

本地完整编译是开发和应急备选，不是默认发布方式。CI 暂时不可用时，可以在锁定工具链中运行 `npm run verify:full` 和带相对 `BASE_PATH` 的 `npm run build`，再整体上传 `dist/`；不得只上传本地 `.wasm`。GitHub Pages 当前不维护 `gh-pages` 分支发布方式，工作流故障应优先修复。

## 15. Cloudflare 后续部署

Cloudflare job 默认不运行。配置以下内容后，工作流会下载与 Pages 相同的 `production-dist` artifact 并部署：

- Secret：`CLOUDFLARE_API_TOKEN`
- Secret：`CLOUDFLARE_ACCOUNT_ID`
- Repository variable：`CLOUDFLARE_PROJECT_NAME`

正式域名未确定前不加入 `CNAME` 或硬编码 URL。Pages 测试通过后再配置 Cloudflare 项目、域名、缓存和回滚流程。

## 16. 后续原生语言接入

未来导入 C++、Rust 或 C# 项目时，npm 继续作为顶层入口，但各模块保留自己的原生工具链：

- C++：CMake + Ninja + Emscripten。
- Rust：Cargo + `wasm32` 目标或成熟绑定工具；开始模块时再锁定版本。
- C#：仅在具体项目确实需要时评估浏览器 Wasm 发布链路、运行时体积和启动成本。

扩展 `module.json` 时可增加 `toolchain` 和模块构建驱动，但输出仍统一为可由 Worker 加载的 `.mjs/.wasm` 及版本化协议。不要为了假设中的未来源码，提前把 Rust 或 .NET 工具链加入当前 CI。

## 17. 暂不引入

- React Router：当前模块切换不需要独立 URL。
- Zustand / Redux：当前状态局部且所有权清晰。
- TanStack Table：当前 ID/Static 都只有单列排序和固定列定义。
- Dexie：档案阶段再安装并锁定。
- Testing Library / Playwright：Pages 预览稳定后按真实交互补充。
- Next.js、SSR 或后端框架：违反纯静态目标。
- Comlink：显式消息协议更适合批次、版本和转移所有权审计。
- Wasm threads / `SharedArrayBuffer`：普通静态托管兼容性优先。
- 遥测和错误上报 SaaS：本地优先和隐私目标优先。
