# PokeHero（工作名）技术栈与工程方案

> - 状态：阶段 0 技术基线
> - 核验日期：2026-08-11
> - 适用范围：第三世代 Static/Wild MVP

> 品牌状态：`PokeHero` 仅为当前目录和私有 package 的工作标识，英文正式名与中文名均待定。本文不授权或安排仓库/远端重命名。

## 1. 决策摘要

PokeHero 采用单仓库、单前端应用，不建立后端或不必要的 monorepo：

- React + TypeScript + Vite 构建 Web 原生界面。
- PokeFinder 4.3.2 的三代 C++ Core 经过最小适配后由 Emscripten 编译为 WebAssembly。
- Wasm 只在 Web Worker 中运行；长搜索拆成协作式分片，不使用 Wasm threads 或 `SharedArrayBuffer`。
- Dexie 管理 IndexedDB 档案，`localStorage` 只保存语言和轻量偏好。
- Zustand 管理跨组件的瞬时任务/UI 状态；表单局部状态留在 React 内。
- TanStack Table + TanStack Virtual 处理可排序、可配置和虚拟化结果表。
- i18next + react-i18next 管理中英文领域词汇与界面文本。
- vite-plugin-pwa/Workbox 生成可提示更新的离线缓存。
- Vitest、Testing Library、Playwright 和上游夹具构成测试体系。
- ESLint flat config + typescript-eslint + Prettier 负责静态质量与格式。
- GitHub Actions 负责冻结安装、检查、构建、浏览器测试和 GitHub Pages 部署。

不采用 Redux、TanStack Query、Next.js、服务端渲染、CSS-in-JS、通用 UI 大组件库或 Comlink。当前没有服务端数据缓存问题；显式 Worker 消息更适合批次、进度、取消和协议版本控制；Vite 自带的 CSS Modules 足够支持 MVP。

## 2. 架构约束

1. **纯静态**：生产产物只有 HTML、CSS、JS、Worker、Wasm、manifest、图标和许可证/来源文件。
2. **本地优先**：计算和用户数据不离开浏览器；不引入运行时 CDN、遥测或远程字体。
3. **单线程基线**：普通静态托管无需 COOP/COEP。优化先做算法边界、分片、批次和数据布局，再评估可选 SIMD。
4. **Core 为事实来源**：RNG 算法、枚举和遭遇数据来自可追溯的 PokeFinder 三代 Core；React 不复制算法。
5. **Qt 不进入 Web 构建**：从 Form 提取业务规则并以 TypeScript 规则表/测试表达，不编译 Qt，也不移植文件型 `ProfileLoader`。
6. **协议先于界面**：Wasm ABI 和 Worker 协议必须在 Static/Wild 界面开发前通过夹具验证。
7. **发布可复现**：每个 `.wasm` 都能映射到精确上游来源、PokeHero 补丁、工具链和 lockfile。

## 3. 版本基线与锁定策略

### 3.1 核验来源

- JavaScript 包版本和 peer/engine 范围来自 [npm 官方注册表](https://www.npmjs.com/)，在核验日期读取 `latest` dist-tag 与元数据。
- Node.js 版本来自 [Node.js 官方发布表](https://nodejs.org/en/about/previous-releases)：24.19.0 为当日 Latest LTS，24.x 仍在 LTS 支持期。
- Emscripten 版本来自 [emscripten-core/emscripten 官方标签](https://github.com/emscripten-core/emscripten/tags)：6.0.6 为当日最新已验证标签。
- PokeFinder 基线来自本地只读源码 `project(PokeFinder VERSION 4.3.2)`；导入前还必须补录精确提交/tag 或归档 SHA-256。

文档不使用 `latest` 作为安装声明。下表是初始化基线，不代表依赖会永久停在这些版本。

### 3.2 工具链

| 工具             | 基线           | package/配置策略                                            | 原因                                                                                        |
| ---------------- | -------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Node.js          | `24.19.0` LTS  | `.node-version` 精确锁定；`engines.node` 为 `>=24.19.0 <25` | 当前 LTS，满足 Vite、ESLint、jsdom 和 npm 要求                                              |
| npm              | `12.0.2`       | `packageManager` 精确锁定；提交 `package-lock.json`         | 官方 npm CLI；团队只维护一套包管理器和锁文件                                                |
| TypeScript       | `6.0.3`        | `package.json` 精确版本                                     | npm 最新 TS 7.0.2 超出 typescript-eslint 8.66.0 的 `<6.1.0` peer 范围；先选择已验证兼容版本 |
| Emscripten/emsdk | `6.0.6`        | CI、开发容器或安装脚本精确锁定                              | Wasm 产物可能随编译器变化，不能用浮动 latest                                                |
| CMake            | `>=3.31 <5`    | 声明兼容范围；CI 精确 patch                                 | PokeFinder 4.3.2 声明最低 3.31；项目只使用受控特性                                          |
| Python           | `>=3.14 <3.15` | 声明兼容范围；CI 精确 patch                                 | 上游资源生成脚本的当前 CMake 要求；阶段 1 验证是否能合理放宽                                |
| C++              | C++23          | `CMAKE_CXX_STANDARD 23`                                     | 与上游 4.3.2 一致                                                                           |

### 3.3 生产依赖

| 选择                      | 初始化声明        | 用途与理由                                                                              |
| ------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `react`, `react-dom`      | `19.2.8` 精确配对 | UI 与并发渲染基础；精确配对避免两包漂移                                                 |
| `react-router`            | `^8.3.0`          | 使用 hash router，让 GitHub Pages 子路径/刷新无需服务器 rewrite；保留浏览器历史和深链接 |
| `zustand`                 | `^5.0.14`         | 小型跨组件瞬时状态；任务状态、列偏好和应用级 UI，不承载持久档案                         |
| `@tanstack/react-table`   | `^9.1.2`          | Headless 表格，字段/排序逻辑可测试，不强加视觉系统                                      |
| `@tanstack/react-virtual` | `^3.14.9`         | 大结果集行虚拟化；与 Table 分工明确                                                     |
| `i18next`                 | `^26.3.6`         | 稳定 key、fallback、复数和命名空间支持                                                  |
| `react-i18next`           | `^17.0.11`        | React 绑定，peer 范围支持本基线 React/TypeScript                                        |
| `dexie`                   | `^4.4.4`          | IndexedDB schema、事务和版本迁移，减少手写异步游标错误                                  |

不引入 CSV 库：MVP 只导出已知列，由一个经过 RFC 4180、BOM、公式注入和精度测试的纯函数完成。若后续需要导入或流式超大文件，再基于数据量评估成熟解析器。

### 3.4 构建、PWA 与开发依赖

| 选择                   | 初始化声明 | 用途与理由                                                            |
| ---------------------- | ---------- | --------------------------------------------------------------------- |
| `vite`                 | `^8.2.1`   | 快速 ESM 开发与静态生产构建，原生支持 Worker、Wasm URL 和 CSS Modules |
| `@vitejs/plugin-react` | `^6.0.5`   | React Fast Refresh 与 JSX 转换；peer 范围要求 Vite 8                  |
| `vite-plugin-pwa`      | `^1.3.0`   | 基于 Workbox 生成 precache、manifest 和更新提示；支持 Vite 8          |
| `@types/react`         | `^19.2.18` | React TypeScript 类型                                                 |
| `@types/react-dom`     | `^19.2.4`  | React DOM TypeScript 类型                                             |
| `@types/node`          | `^24.13.3` | 与 Node 24 工具链主版本匹配                                           |

PWA 首选 `generateSW`，配置 `registerType: 'prompt'`，将带内容哈希的 Worker、Wasm 和语言资源纳入 precache。除非离线策略出现 `generateSW` 无法表达的需求，不创建自定义 Service Worker。

### 3.5 测试依赖

| 选择                          | 初始化声明    | 用途与理由                                                       |
| ----------------------------- | ------------- | ---------------------------------------------------------------- |
| `vitest`                      | `4.1.10` 精确 | 与 coverage 插件精确配对，单元/组件测试                          |
| `@vitest/coverage-v8`         | `4.1.10` 精确 | peer 要求与 Vitest 完全一致                                      |
| `jsdom`                       | `^30.0.1`     | React DOM 单元环境；Node 24.19.0 满足其 engine                   |
| `@testing-library/react`      | `^16.3.2`     | 以用户行为验证 React 组件                                        |
| `@testing-library/dom`        | `^10.4.1`     | React Testing Library 的显式 peer 依赖                           |
| `@testing-library/user-event` | `^14.6.3`     | 键盘、输入和交互序列                                             |
| `@testing-library/jest-dom`   | `^7.0.1`      | 可访问 DOM 断言；支持 Vitest                                     |
| `@playwright/test`            | `1.62.1` 精确 | 测试 runner 与浏览器二进制必须同步，覆盖 Chromium/Firefox/WebKit |

### 3.6 Lint 与格式化

| 选择                          | 初始化声明 | 用途                                           |
| ----------------------------- | ---------- | ---------------------------------------------- |
| `eslint`                      | `^10.8.1`  | flat config lint 核心                          |
| `@eslint/js`                  | `^10.0.1`  | 官方 JS 推荐规则                               |
| `typescript-eslint`           | `^8.66.0`  | 类型感知 TypeScript 规则；当前支持 TS `<6.1.0` |
| `eslint-plugin-react-hooks`   | `^7.1.1`   | Hooks 与 React Compiler 相关规则               |
| `eslint-plugin-react-refresh` | `^0.5.4`   | Vite Fast Refresh 导出约束                     |
| `prettier`                    | `^3.9.6`   | Markdown、JSON、CSS、TS/TSX 格式化             |

ESLint 负责错误与代码约束，Prettier 只负责格式；不安装会重复处理格式的 ESLint 插件集合。

### 3.7 精确版本与兼容范围规则

- **精确锁定于 manifest**：Node、npm、TypeScript、Emscripten、React/React DOM、Vitest/coverage、Playwright，以及未来上游 PokeFinder commit/checksum。
- **兼容范围声明于 manifest**：API 遵循 semver 的普通直接依赖，使用 `^` 留在同一 major；CMake/Python 用受控范围。
- **所有实际安装精确锁定**：`package-lock.json` 提交到 Git，CI 只运行 `npm ci`；禁止提交 pnpm/yarn/Bun 锁文件。
- **关联依赖成组升级**：React/React DOM/types、Vite/plugin/PWA、Vitest/coverage、ESLint/typescript-eslint、Playwright/browsers 必须在同一个依赖 PR 中升级。
- **禁止自动合并 major**：任何 major、Emscripten、TypeScript 或 Wasm ABI 变化都必须重跑上游一致性、浏览器和离线测试。
- **TypeScript 7 升级条件**：typescript-eslint 的官方 peer 范围覆盖 7.x，且 lint/typecheck/构建全部通过后再单独评估。

## 4. 状态与数据边界

| 状态           | 所有者                    | 持久化                    | 示例                               |
| -------------- | ------------------------- | ------------------------- | ---------------------------------- |
| 字段输入与校验 | React 组件/reducer        | 否                        | seed、IV 范围、当前筛选草稿        |
| URL 导航       | React Router hash route   | URL 中只放非敏感枚举/页面 | Static/Wild/档案页面，不放 TID/SID |
| 跨组件 UI/任务 | Zustand                   | 默认否                    | Worker 状态、选中结果、列配置草稿  |
| 档案           | Dexie/IndexedDB           | 是                        | 游戏、TID、SID、dead battery       |
| 轻量偏好       | 封装后的 `localStorage`   | 是                        | 语言、确认过的更新提示、表格偏好   |
| 计算状态       | Worker + Wasm task handle | 任务期间                  | 搜索游标、进度、待发送批次         |

不把 Dexie 数据镜像进一个长期全局 store。页面通过 repository hook 订阅所需查询，写入经显式事务完成。任务启动时把档案复制成不可变 DTO，避免运行中档案修改导致结果语义变化。

## 5. 目录规划

阶段 1 初始化以下单应用结构：

```text
PokeHero/
|-- .github/
|   `-- workflows/          # CI、Pages 部署、许可证/安全检查
|-- docs/
|   |-- requirements.md
|   |-- tech-stack.md
|   `-- legal/              # 上游署名、来源、发布源码说明
|-- public/                 # manifest 图标等有明确许可的静态资产
|-- src/
|   |-- app/                # router、providers、error boundary、app shell
|   |-- components/         # 通用表单、表格、任务状态等无领域算法组件
|   |-- domain/gen3/        # DTO、枚举、校验、规则表、结果 schema
|   |-- features/profiles/  # 档案 UI 与 use cases
|   |-- features/static/    # Static Generator/Searcher UI
|   |-- features/wild/      # Wild Generator/Searcher UI
|   |-- infra/db/           # Dexie schema、repository、migration
|   |-- infra/worker/       # client、协议、批次 decoder、生命周期
|   |-- i18n/               # zh-CN/en 资源与领域词汇映射
|   |-- styles/             # tokens、global CSS、CSS Modules 共用层
|   `-- main.tsx
|-- wasm/
|   |-- bridge/             # PokeHero C ABI、DTO 转换、批次布局
|   |-- cmake/              # toolchain/preset 辅助
|   |-- CMakeLists.txt
|   `-- README.md           # 本地/CI 可复现构建说明
|-- third_party/pokefinder/
|   |-- UPSTREAM.md         # version、commit/tag、SHA-256、导入范围
|   |-- LICENSE
|   `-- ...                 # 构建 Wasm 所需的完整对应源码与版权头
|-- tests/
|   |-- e2e/
|   |-- fixtures/pokefinder-4.3.2/
|   |-- integration/
|   `-- performance/
|-- package.json
|-- package-lock.json
|-- tsconfig*.json
`-- vite.config.ts
```

`third_party/pokefinder` 采用可审计的 vendored snapshot，而不是依赖开发者桌面路径。只导入构建三代 Static/Wild 所需源码、共享 Core、资源生成输入及第三方依赖，但该最小集合必须足以作为发布 Wasm 的完整对应源码。保留原头部，并在 `UPSTREAM.md` 记录删除/修改内容。zstd、nlohmann/json、fph 和 EncounterTableGenerator 均单独登记版本与许可证。

## 6. WebAssembly 边界

### 6.1 编译单元

Wasm target 只包含：

- 三代 Static/Wild generator、searcher、state、filter、encounter、profile 和所需父类。
- 所需 RNG、枚举、个人数据、翻译无关的资源读取与 zstd 解压。
- PokeHero 的 `wasm/bridge` 适配层。

不包含 Qt、Form、Model、`ProfileLoader`、其他世代、原生线程入口或桌面文件路径。基线编译参数关闭 pthreads 和显式 SIMD，开启 release 优化和未定义行为/边界诊断的独立测试构建。

### 6.2 稳定 C ABI

不向 JS 暴露 C++ 类，也不把 Embind 对象传播到应用层。桥接层提供版本化、拥有关系明确的 C ABI，概念接口如下：

```c
uint32_t ph_api_version(void);
uint32_t ph_core_version(void);
uint32_t ph_create_task(const uint8_t* request_json, uint32_t length);
uint32_t ph_step_task(uint32_t handle, uint32_t work_budget);
uint32_t ph_batch_ptr(uint32_t handle);
uint32_t ph_batch_len(uint32_t handle);
uint32_t ph_progress_ptr(uint32_t handle);
void ph_discard_batch(uint32_t handle);
void ph_cancel_task(uint32_t handle);
void ph_destroy_task(uint32_t handle);
```

精确签名在 spike 中可调整，但必须保留这些语义：版本握手、一次性请求解析、可分片 `step`、有界批次、可读取真实进度、幂等取消和显式销毁。

- 控制输入使用带 `schemaVersion` 的 UTF-8 JSON，每个任务只解析一次。它便于夹具审查，开销相对搜索可忽略。
- 结果不构造大 JSON。桥接层生成带固定 header 的小端序列式批次；Worker 立即复制成可转移 `ArrayBuffer`。
- PID、seed、advances、IV 等保持数值列；枚举返回稳定整数码，由 TypeScript/i18n 映射显示文本。
- 64 位值在二进制中使用高/低 `uint32` 或 `uint64` 布局，在控制/日志协议中使用十进制字符串；不得经过不安全的 JS `number`。
- 每种 operation 都有独立 `resultSchemaVersion` 和 decoder，未知版本直接拒绝，不做猜测性兼容。
- Wasm 内存中的 pointer 只在一次 Worker 同步步骤内有效；不跨 `memory.grow`、消息或渲染周期持有 view。

### 6.3 协作式取消

没有共享内存时，Worker 在一次同步 C++ 长调用期间无法处理 `cancel` 消息。因此 Searcher 必须支持增量游标：

1. `ph_step_task` 最多执行 `work_budget` 个候选或达到时间片目标。
2. Worker 复制当前批次并发送进度。
3. Worker 让出事件循环，处理可能到达的取消消息。
4. 未取消时继续下一步；取消时调用 `ph_cancel_task`/`ph_destroy_task` 并发出单一终态。

初始目标是单个 step p95 小于 100 ms、取消确认 p95 小于 500 ms。`work_budget` 由性能夹具校准，而不是写死在 UI。

## 7. Worker 消息协议原则

### 7.1 外层协议

UI 与 Worker 共享纯 TypeScript discriminated union。MVP 每个 Worker 同时只有一个任务：

```ts
type UiToWorker =
  | { type: "init"; protocolVersion: 1 }
  | {
      type: "start";
      protocolVersion: 1;
      requestId: string;
      operation: Operation;
      payload: unknown;
    }
  | { type: "cancel"; protocolVersion: 1; requestId: string }
  | { type: "dispose"; protocolVersion: 1 };

type WorkerToUi =
  | {
      type: "ready";
      protocolVersion: 1;
      apiVersion: number;
      coreVersion: string;
    }
  | { type: "started"; protocolVersion: 1; requestId: string }
  | {
      type: "progress";
      protocolVersion: 1;
      requestId: string;
      completed: string;
      total?: string;
    }
  | {
      type: "batch";
      protocolVersion: 1;
      requestId: string;
      sequence: number;
      schemaVersion: number;
      rows: number;
      buffer: ArrayBuffer;
    }
  | {
      type: "completed";
      protocolVersion: 1;
      requestId: string;
      rows: number;
      elapsedMs: number;
    }
  | { type: "cancelled"; protocolVersion: 1; requestId: string; rows: number }
  | {
      type: "error";
      protocolVersion: 1;
      requestId?: string;
      code: WorkerErrorCode;
      recoverable: boolean;
    };
```

### 7.2 协议规则

- `protocolVersion` 不匹配时失败关闭；Wasm `apiVersion`、Core 版本和结果 schema 在 `ready`/batch 中显式报告。
- `requestId` 由 UI 生成，所有任务消息回显；任务结束后的迟到消息被 client 丢弃。
- batch `sequence` 从 0 连续递增；遗漏、重复或未知 schema 使该任务失败，不能展示可能错位的数据。
- `ArrayBuffer` 通过 transfer list 转移，发送方不再访问；进度和错误保持小对象。
- Worker 只发稳定错误码，i18n 在 UI 完成。开发日志可有诊断详情，但不得包含档案快照或完整结果。
- `cancel` 幂等。`completed`、`cancelled`、`error` 每个请求只能出现一个终态。
- Worker client 负责超时、崩溃重建和任务状态机；React 组件不直接调用 `postMessage`。
- 任何输入在 UI 和 Worker 两侧按同一 DTO 规则验证；C++ 桥仍执行边界范围检查，不能信任 JS。

不使用 Comlink：它适合 RPC，但会弱化本项目需要显式审查的流式批次、传输所有权、取消竞争和协议版本。

## 8. 浏览器存储

### 8.1 IndexedDB/Dexie

数据库名使用带产品命名空间的稳定值，例如 `pokehero`。首版只建立 `profiles` 表；主键是随机 UUID，game/name 可建索引，TID/SID 不作为索引或 URL 状态。

每次 schema 升级：

1. 增加 Dexie version，不修改已发布 version 的迁移函数。
2. 用匿名化的上一版夹具跑迁移成功、回滚/失败和重复打开测试。
3. 在 UI 启动完成前等待数据库 ready。
4. 对不可恢复数据提供导出诊断和清空选择，不自动删除。

### 8.2 localStorage

通过一个小型 typed adapter 访问，key 带版本前缀。只保存语言、主题/列等轻量偏好和 PWA 提示状态。不保存档案、搜索结果、Wasm 二进制或大 JSON。解析失败回退默认值并移除单个损坏 key。

## 9. 路由、UI 与样式

- 使用 React Router 的 hash router。路由建议为 `#/profiles`、`#/gen3/static/generator`、`#/gen3/static/searcher`、`#/gen3/wild/generator`、`#/gen3/wild/searcher`。
- Hash 之后不放 TID、SID、seed、IV 目标或完整筛选，避免浏览历史/分享泄漏；只保存页面和无敏感枚举。
- 使用语义 HTML、CSS custom properties 与 CSS Modules。设计 token 集中管理颜色、间距、字型和密度。
- 不引入整套组件框架。先实现项目需要的 Input、Select、Checkbox、Tabs、Dialog、Progress、DataTable 等受控组件，并按 WCAG 2.2 AA 测试。
- TanStack Table 只管理列、排序和行模型；TanStack Virtual 管理可见窗口。领域结果 DTO 保持不可变，渲染模型负责本地化。

## 10. i18n

资源按领域命名空间拆分：`common`、`profiles`、`static`、`wild`、`errors`、`domain`。默认语言英文，浏览器语言为简体中文时首次选择 `zh-CN`，之后使用本地设置。

领域 Core 只返回稳定码，例如 nature ID、game bit/ID、encounter slot。TypeScript 中的版本化字典负责英文/中文显示。CI 执行 key 集合对称检查，并在组件测试中将缺失 key 视为失败。

CSV 的表头按当前语言导出；稳定原始值和列 key 在测试夹具中保留，避免翻译变更影响排序或一致性。

## 11. PWA 与静态部署

- Vite `base` 由环境变量配置，默认支持 `/PokeHero/`，自定义域名部署可设 `/`。
- Worker 用 `new Worker(new URL(..., import.meta.url), { type: 'module' })`，Wasm URL 由构建产物解析，不拼接绝对根路径。
- Workbox precache 应覆盖 app shell、Worker、Wasm、领域数据和语言资源；所有文件使用内容哈希。
- 更新策略为 prompt。已有任务运行时延迟激活/刷新；用户确认且无运行任务后切换。
- 离线 fallback 只回应用入口，不把 404、API 或第三方请求伪装成成功。
- GitHub Pages 与 Cloudflare Pages 部署同一 `dist/`，不得为某平台维护算法或资源分支。

## 12. 测试金字塔

### 12.1 Core 一致性层

- 从 PokeFinder 4.3.2 导入 Static/Wild 四组上游 JSON 夹具和必要资源，保留来源说明。
- 一个无 Qt 的原生 CTest harness 与 Wasm harness 使用同一请求/结果 schema。
- 固定输入逐字段比较 seed/PID/advances/IV/nature/ability/gender/shiny/hidden power/slot/level 等适用列。
- sanitizer 原生构建覆盖桥接层内存、越界、生命周期和非法枚举。

### 12.2 TypeScript 单元层（最多）

- DTO 校验、Qt 规则提取后的联动表、整数/十六进制解析。
- Worker client 状态机、批次 decoder、序列检测、终态竞争。
- Dexie migrations、localStorage adapter、CSV 转义/公式防护/精度。
- i18n key 完整性与领域 ID 映射。

### 12.3 React 组件层

- Testing Library 验证键盘、标签、校验、对话框、筛选复制、表格排序和取消交互。
- 不断言实现细节或大面积 snapshot；优先角色、名称和用户可见状态。

### 12.4 浏览器集成层

- 在真实浏览器加载真实 Worker + Wasm，验证 init、四种 operation、批次、进度、取消和崩溃恢复。
- 使用真实 IndexedDB 验证档案事务和迁移。
- 针对 GitHub Pages `base` 构建运行静态服务器，禁止测试绕过生产 URL 解析。

### 12.5 E2E 与非功能层（最少）

- Playwright Chromium/Firefox/WebKit 覆盖档案 -> Generator/Searcher -> 排序 -> CSV 的关键路径。
- 在线首次加载后切断网络，重载并运行 Static/Wild 冒烟。
- axe 或等价检查配合键盘人工验收；性能 harness 记录 Wasm/native 比率、step p95、取消 p95、内存和批次吞吐。

覆盖率不是单一质量目标。TypeScript 领域/协议/迁移模块设置较高分支门槛；纯 UI 以关键行为覆盖。C++ 是否可接受以夹具一致性和 sanitizer 为主。

## 13. 首个技术验证实施顺序

1. 记录并导入 PokeFinder 精确来源、GPL 头、Static/Wild 夹具和最小依赖清单。
2. 建立不依赖 Qt/ProfileLoader 的原生 C++ adapter，先让 CTest harness 通过四组夹具。
3. 用 Emscripten 6.0.6 编译同一 adapter，关闭 threads/SIMD，验证 C ABI 和结果 binary schema。
4. 实现最小 TypeScript Worker client 和命令行/测试页 harness，仅展示 init、批次、进度、取消和摘要，不开发正式产品页。
5. 测量并调整 step/batch，达到取消、相对性能和内存门槛。
6. 构建到 `/PokeHero/` base，在普通静态服务器验证 Worker/Wasm URL、缓存和离线重载。
7. 将门槛结果记录为 `docs/validation/wasm-spike.md`；全部通过后才开始档案和 Static UI。

## 14. CI/CD

Pull request 必须运行：

```text
frozen install
  -> format check + lint + typecheck
  -> TypeScript unit/component tests + coverage
  -> native Core/bridge tests + sanitizer job
  -> Wasm build + upstream parity tests
  -> production build at /PokeHero/
  -> Playwright browser/offline smoke
  -> license/source inventory check
```

主分支通过相同构建后上传不可变 `dist/` artifact，再由 Pages job 部署该 artifact，不在部署 job 重新编译。Emscripten SDK、Node、npm 和 Playwright 版本都来自已提交配置；缓存 key 包含 lockfile 与工具链版本。

Cloudflare Pages 使用 `npm run build` 和 `dist/`，但同样执行 CI 门禁。部署平台不能成为唯一测试环境。

## 15. 主要风险与对策

| 风险                                 | 影响            | 对策                                                      |
| ------------------------------------ | --------------- | --------------------------------------------------------- |
| 原生 searcher 长循环阻塞 Worker 取消 | 取消无响应      | 在 C++ 适配层引入增量游标/step，性能门槛先行              |
| SIMD/线程假设不适用于普通静态站      | 构建或运行失败  | 基线关闭，两者只作为后续能力检测优化                      |
| Qt Form 隐含规则未迁移               | 结果或选项错误  | 提取规则表，并用上游 UI 行为/夹具形成测试                 |
| ProfileLoader 依赖文件系统           | 浏览器不可用    | Core 只接受 Profile DTO，持久化完全由 Dexie 管理          |
| Wasm/JS 协议或缓存版本错配           | 崩溃/错误结果   | 三层版本握手、内容哈希、原子 PWA 更新                     |
| 大批结果复制和 DOM 渲染              | 内存/卡顿       | 二进制批次、transfer、虚拟化、结果上限/清理策略           |
| 64 位整数经过 JS number              | 静默精度损失    | binary uint64 或十进制字符串，边界测试                    |
| GitHub Pages 子路径/刷新             | Worker/Wasm 404 | hash router、可配置 base、生产路径 E2E                    |
| GPL 对应源码不完整                   | 无法合规发布    | vendored 可追溯源码、构建说明、发布 inventory 门禁        |
| 上游版本仅有 4.3.2 标签信息          | 无法精确复现    | 导入前记录 commit/tag 或归档 SHA-256，未完成则不发布 Wasm |

## 16. 暂不引入

- **Redux/Redux Toolkit**：当前状态规模和所有权不需要额外事件层。
- **TanStack Query**：没有服务端请求或缓存一致性问题。
- **Next.js/SSR/后端框架**：违反纯静态、本地计算目标并增加部署面。
- **Comlink**：显式消息协议更适合可审计的批次、取消和传输所有权。
- **通用表单框架/schema 框架**：先用 typed reducer 与小型领域 validator；当重复复杂度真实出现再评估。
- **UI 组件大库/Tailwind**：MVP 需要高密度领域表单和表格，语义组件 + CSS Modules 更可控。
- **Wasm threads/SharedArrayBuffer**：普通静态托管和跨源隔离兼容性优先。
- **遥测/错误上报 SaaS**：隐私与离线目标优先，测试和本地诊断先满足质量需求。
