# PokeRNGKit 技术栈与工程方案

> - 状态：PokeFinder Gen III、Gen IV、Gen V 已接入独立 Wasm/Worker；Gen VIII Profiles / IDs / Eggs 与 Gen VII Stationary / Wild / SOS / Egg / Battle Tree / Event / ID 已实现，下一模块为 Main RNG Tool
> - 更新日期：2026-08-16
> - 当前范围：完整 PokeFinder 4.3.2，以及 `docs/module-inventory.md` 中除 `NTR Helper` 外的全部 3DSRNGTool 功能
> - 包管理器：npm

3DSRNGTool 模块使用本地优化版 `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN` revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 作为主要行为来源，公开仓库只作为祖先归属记录；实现路径与差异范围见 `third_party/3dsrngtool/UPSTREAM.md`。`pokerusfinder` 使用 DevonStudios Pokerus Finder 的 GPL-3.0 源码行为作为第三/四世代帧查询基线，来源记录见 `third_party/pokerusfinder/UPSTREAM.md`。

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
  |-- i18next / theme / localStorage
  |-- profile repository -> IndexedDB + localStorage mirror
  |-- virtualized result table / CSV
  |-- ui mode -> deterministic preview engine
  `-- production -> module-specific Worker Pool
        |-- Gen3IdWorkerPool / Gen3IdSearcherWorkerPool -> gen3id.mjs + gen3id.wasm
        |-- Gen3InitialSeedWorkerPool -> gen3initialseed.mjs + gen3initialseed.wasm
        |-- Gen3SeedToTimeWorkerPool -> gen3seedtotime.mjs + gen3seedtotime.wasm
        |-- Gen3NgcSeedWorkerPool -> gen3ngcseed.mjs + gen3ngcseed.wasm
        |-- Gen3StaticWorkerPool ---------+
        |-- Gen3StaticSearcherWorkerPool -+-> gen3static.mjs + gen3static.wasm
        |-- Gen3WildWorkerPool ---------+
        |-- Gen3WildSearcherWorkerPool -+-> gen3wild.mjs + gen3wild.wasm
        |-- Gen3IvToPidWorkerPool ------> gen3ivtopid.mjs + gen3ivtopid.wasm
        |-- Gen3EggWorkerPool ----------> gen3egg.mjs + gen3egg.wasm
        |-- Gen4StaticWorkerPool ---------+
        |-- Gen4StaticSearcherWorkerPool -+-> gen4static.mjs + gen4static.wasm
        |-- Gen4WildWorkerPool -----------+
        |-- Gen4WildSearcherWorkerPool ---+-> gen4wild.mjs + gen4wild.wasm
        |-- Gen4ChainedSidWorker ------------> gen4chainedsid.mjs + gen4chainedsid.wasm
        |-- Gen7StationaryWorker ------------> gen7stationary.mjs + gen7stationary.wasm
        |-- Gen7WildWorker ------------------> gen7wild.mjs + gen7wild.wasm
        |-- Gen7SosWorker -------------------> gen7sos.mjs + gen7sos.wasm
        |-- Gen7EggWorker -------------------> gen7egg.mjs + gen7egg.wasm
        `-- Gen7BattleTreeWorker ------------> gen7battletree.mjs + gen7battletree.wasm
                                            |
                                            `-- narrow C ABI bridges
                                             `-- PokeFinder 4.3.2 / 3DSRNGTool rules
```

所有 Worker 相互独立。Pool 负责分片、排序批次、进度、结果上限和取消；C++ 只负责给定输入范围内的确定性计算。

Vite 的 `ui` mode 在编译期选择本地 UI 预览引擎。该引擎只生成确定性样例，用于验收界面状态和交互；生产 mode 固定选择 Worker Pool，不能通过 URL 或本地设置切换。UI mode 不注册 PWA Service Worker，避免样例页面污染真实 Wasm 预览缓存。

## 4. 当前版本与锁定策略

以下版本来自 2026-08-12 已提交或待提交的 `package.json`、`.node-version`、`package-lock.json` 和 Actions 配置。升级时必须重新查询官方发布信息和支持范围，不凭旧版本表直接修改。

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

各 RNG 工作区继续由所属 React 组件的 `useState`、`useMemo` 和明确的搜索引擎实例管理；Gen VII Stationary、Wild 与 ID 也保持独立状态、Worker 和 Wasm 生命周期。存档信息分别由各世代 profile hook 与 repository 层持有，不引入 Zustand、Redux 或其他全局状态框架；Spinda Painter 与 Encounter Lookup 使用本地确定性数据，不进入 RNG Worker 状态。

### 5.2 路由

当前不安装 React Router。ID、G3/G4 Static、Wild 与存档信息管理使用应用内状态即可完成工作流，不需要独立 URL；形成真正的可分享页面边界后再评估路由，并优先使用兼容静态托管刷新行为的方案。URL 不保存 TID、SID、Seed 或完整筛选条件。

### 5.3 表格

当前使用语义化表头/行和 `@tanstack/react-virtual`：

- 排序规则简单，直接由 TypeScript 数值排序实现。
- 虚拟化只渲染可见行，降低大结果集 DOM 成本。
- ID、G3/G4 Static 与 Wild 结果都只需要单列数值排序，当前 CSS Grid + TypeScript 排序足够。
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
- IndexedDB：第三世代与第四世代存档信息的独立主存储记录。
- `localStorage`：两代独立存档镜像、语言、主题和各悬浮窗折叠状态。
- Worker/Wasm：任务期间的临时计算状态。
- 页面刷新：终止任务并重建 Worker，不持久化结果。
- UI 预览：ID、Initial Seed、GameCube Seed Finder、G3/G4 Static、Wild、IVs to PID、Egg 与 Gen VII Stationary / Wild / SOS / Egg 各自使用同一请求边界的确定性样例引擎，不读取或生成 Wasm；预览结果只用于界面交互验收。`gen3spindapainter` 是不涉及 RNG 的确定性 PID/坐标映射，直接由 React domain 计算，不创建 Wasm 或 Worker。

### 6.2 存档 repository

当前直接使用浏览器 IndexedDB API，并通过 `Gen3ProfileRepository` 与 `Gen4ProfileRepository` 隔离两代数据。两者使用独立 schema 标识、记录键和 localStorage 镜像，不需要为这一级复杂度引入 Dexie。repository 负责验证、事务、IndexedDB 失败回退和镜像恢复。

每次保存同时更新 localStorage 完整镜像；这是明确的数据恢复路径，不是长期全局 store。导入导出使用带格式标识和 schema 版本的 JSON。清除操作同时删除 IndexedDB 记录和镜像，不把 TID/SID 放进 URL。

## 7. Wasm 模块化

### 7.1 命名

模块名按“世代 + 功能”组织：

```text
gen3id
gen3initialseed
gen3seedtotime
gen3ngcseed
gen3static
gen3wild
gen3ivtopid
gen3egg
gen3pidtoiv
gen3gamecube
gen3pokespot
gen3jirachi
gen4id
gen4seedtotime
gen4static
gen4wild
gen4chainedsid
gen7stationary
gen7wild
gen7sos
gen7egg
gen7battletree
gen7id
```

每个模块必须拥有独立目录、manifest、构建 target、C ABI 前缀、Worker client 和测试，避免一个 Wasm 文件吸收所有世代和功能。当前 `gen3ivtopid` 每次输入只恢复有限候选，不创建多 Worker 分片；`gen3egg` 只提供 Generator，Searcher 保留为后续独立工作流。

`src/features/shared/rngModuleContract.ts` 保留跨世代的 manifest、Worker 信封和第四世代模块标识。`gen4id`、`gen4static`、`gen4wild` 与 `gen4chainedsid` 已分别注册 API v1、独立产物、导航和运行时；Chained SID 使用单 Dedicated Worker，其余大范围模块按任务使用 Worker Pool。各模块的输入、算法、结果和验证边界记录在对应的 `docs/modules/gen4<module>.md`。

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
    |-- gen3initialseed/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen3seedtotime/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen3ngcseed/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen3static/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen3wild/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen3ivtopid/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen3egg/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen3pidtoiv/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen3gamecube/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen3pokespot/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen3jirachi/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen4static/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen4wild/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen4chainedsid/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/
    |-- gen7stationary/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen7wild/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen7sos/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen7egg/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    |-- gen7battletree/
    |   |-- CMakeLists.txt
    |   |-- module.json
    |   |-- bridge/
    |   `-- tests/
    `-- pokerusfinder/
        |-- CMakeLists.txt
        |-- module.json
        |-- bridge/
        `-- tests/

public/wasm/                        # 生成物，忽略
|-- gen3id.mjs
|-- gen3id.wasm
|-- gen3initialseed.mjs
|-- gen3initialseed.wasm
|-- gen3seedtotime.mjs
|-- gen3seedtotime.wasm
|-- gen3ngcseed.mjs
|-- gen3ngcseed.wasm
|-- gen3static.mjs
|-- gen3static.wasm
|-- gen3wild.mjs
|-- gen3wild.wasm
|-- gen3ivtopid.mjs
|-- gen3ivtopid.wasm
|-- gen3egg.mjs
|-- gen3egg.wasm
|-- gen3pidtoiv.mjs
|-- gen3pidtoiv.wasm
|-- gen3gamecube.mjs
|-- gen3gamecube.wasm
|-- gen3pokespot.mjs
|-- gen3pokespot.wasm
|-- gen3jirachi.mjs
|-- gen3jirachi.wasm
|-- gen4static.mjs
|-- gen4static.wasm
|-- gen4wild.mjs
|-- gen4wild.wasm
|-- gen4chainedsid.mjs
|-- gen4chainedsid.wasm
|-- gen7stationary.mjs
|-- gen7stationary.wasm
|-- gen7wild.mjs
|-- gen7wild.wasm
|-- gen7sos.mjs
|-- gen7sos.wasm
|-- gen7egg.mjs
|-- gen7egg.wasm
|-- gen7battletree.mjs
|-- gen7battletree.wasm
|-- gen7event.mjs
|-- gen7event.wasm
|-- gen7id.mjs
|-- gen7id.wasm
|-- pokerusfinder.mjs
`-- pokerusfinder.wasm
```

`scripts/wasm.mjs` 读取 `module.json`，选择模块、调用 npm 提供的 CMake/Ninja、执行原生测试或通过 emsdk 构建 Wasm，并检查声明的产物是否存在。

### 7.3 C ABI

当前 `gen3id` API 版本为 2，`gen3initialseed`、`gen3seedtotime`、`gen3ngcseed`、`gen3pidtoiv`、`gen3gamecube`、`gen3pokespot`、`gen3jirachi`、`gen3ivtopid`、`gen3egg`、`gen4static`、`gen4wild`、`gen4chainedsid`、`gen7stationary`、`gen7wild`、`gen7sos`、`gen7egg`、`gen7battletree`、`gen7event`、`gen7id` 与 `pokerusfinder` API 版本为 1，`gen3static` 与 `gen3wild` API 版本为 3。

`gen7stationary` 使用连续会话 C ABI，57 个 32 位请求字在 `begin()` 时初始化 SFMT、NPC 模型状态和长帧快照，`step()` 每批推进有限状态并返回 9 个 `uint32_t` 的结果记录：

```c
uint32_t gen7stationary_api_version();
uint32_t gen7stationary_begin(const Gen7StationaryPackedRequest *request);
uint32_t gen7stationary_step(uint32_t maximumStates);
uintptr_t gen7stationary_result_ptr();
uint32_t gen7stationary_result_count();
uint32_t gen7stationary_step_processed();
uint32_t gen7stationary_total_processed();
uint32_t gen7stationary_total_results();
uint32_t gen7stationary_done();
uint32_t gen7stationary_limit_reached();
uint32_t gen7stationary_last_error();
```

结果记录为 `frame / realTimeFrames / randomLow / randomHigh / ec / pid / packedIvs / metadata / delay`。该模块只使用一个 Dedicated Worker，不按帧范围分片；取消时终止 Worker 并在下一任务重新创建会话。

`gen7wild` 同样使用连续会话 C ABI。91 个 32 位请求字包含版本、Seed、帧范围、TSV/TRV、Lead、NPC/Raining、六类遭遇参数、11 个物种字、11 个槽位元数据字、12 个分布字和完整筛选；`step()` 返回 11 个 32 位字的结果记录：

```text
frame / realTimeFrames / randomLow / randomHigh / ec / pid /
packedIvs / metadata / delay / packedEncounter / specialValue
```

该模块只使用一个 Dedicated Worker，默认每批处理 16384 帧；取消时终止 Worker 并重新创建连续会话。完整协议见 [Gen 7 Wild](modules/gen7wild.md)。

`gen7sos` 使用 77 个 32 位请求字和 14 个 32 位结果字的连续会话 C ABI。请求包含 Pokemon Generation / Call Prediction 模式、双随机数种子、帧范围、九个 Ally 槽位、战斗条件和两组筛选；结果包含 Pokemon 或 Call 记录及实际 Battle Advance。模块只使用一个 Dedicated Worker，默认每批处理 16384 帧；Calls Path Finder 只重算目标帧前 27 帧的必要窗口。完整协议见 [Gen 7 SOS](modules/gen7sos.md)。

`gen7egg` 使用 187 个 32 位请求字和 20 个 32 位结果字的连续会话 C ABI。请求包含 Frame Range / Egg Number / Shortest Path 模式、四字 TinyMT 状态、双亲与孵化设置、完整 4096-bit Other TSV mask 和筛选；结果包含当前/领取后状态、Egg 结果、遗传来源与操作。模块只使用一个 Dedicated Worker，默认每批处理 16384 个状态；Shortest Path 使用增量前向松弛并将浏览器目标限制为 `5,000,000`。完整协议见 [Gen 7 Egg](modules/gen7egg.md)。

`gen7battletree` 使用 9 个 32 位请求字和 7 个 32 位结果字的连续会话 C ABI。请求包含 Seed、闭区间帧范围、版本、NPC、Delay、Streak、Trainer ID 筛选和结果上限；结果包含 Index、Actual Hit、Real Time Frames、64 位 Random Number、Trainer ID 与 Mark。模块只使用一个 Dedicated Worker，默认每批处理 16384 帧；当前浏览器绝对帧限制为 `5,000,000`。完整协议见 [Gen 7 Battle Tree](modules/gen7battletree.md)。

`gen7event` 使用 58 个 32 位请求字和 9 个 32 位结果字的连续会话 C ABI。请求包含版本、Seed、闭区间帧范围、TSV/TRV、NPC、Delay、配信标志、PID/ID/EC、锁定项、物种形态、六项固定 IV 和完整筛选；结果包含 Frame、Real Time Frames、64 位 Random Number、EC、PID、压缩 IV、元数据和 Delay。模块只使用一个 Dedicated Worker，默认每批处理 2048 帧；当前浏览器绝对帧限制为 `5,000,000`。完整协议见 [Gen 7 Event](modules/gen7event.md)。

ID C ABI 为：

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
uint32_t gen3id_search(uint32_t mode, uint32_t tid, uint32_t input);
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

`gen3id_search` 的 `mode` 区分 SID/PID 输入，返回连续 24 字节记录：

```text
uint32 seed
uint32 frame
uint32 tidSID
uint32 tsvShiny
uint32 yearMonthDay
uint32 hourMinute
```

Searcher 只使用一个独立 Worker/Wasm 实例；取消时终止并重建该 Worker，不与 Generator Worker Pool 共享任务状态。

Initial Seed C ABI v1 提供两个独立工作流：

```c
uint32_t gen3initialseed_api_version();
uint32_t gen3initialseed_find_rs_ids(uint32_t tid, uint32_t sid);
uint32_t gen3initialseed_find_target(
  uint32_t targetSeed,
  uint32_t startAdvance,
  uint32_t stateCount
);
uintptr_t gen3initialseed_result_ptr();
uint32_t gen3initialseed_result_count();
uint32_t gen3initialseed_last_error();
```

两种操作都返回连续的 8 字节记录：

```text
uint32 initialSeed  # 低 16 位初始 Seed
uint32 advances     # 反推帧数，范围 0..0xFFFFFFFF
```

`RS IDs` 固定扫描 65,536 个低位状态；目标 Seed 反推按 `startAdvance + stateCount <= 0xFFFFFFFF` 校验，每次调用最多 500,000 个状态。`Max Results` 是 Worker 编排层的结果上限，不改变 C ABI 的确定性状态扫描。

Seed to Time C ABI v1 接受 32 位 Seed 和年份，并返回该年份内所有匹配的日期/分钟：

```c
uint32_t gen3seedtotime_api_version();
uint32_t gen3seedtotime_calculate(uint32_t seed, uint32_t year);
uint32_t gen3seedtotime_origin_seed();
uint32_t gen3seedtotime_advances();
uintptr_t gen3seedtotime_result_ptr();
uint32_t gen3seedtotime_result_count();
uint32_t gen3seedtotime_last_error();
```

每条记录为五个连续 `uint32_t`：`year / month / day / hour / minute`。C++ 先用 PokeRNGR 回推到不超过 `0xFFFF` 的原始 Seed，再按 PokeFinder 的年份/分钟顺序枚举；全年最多扫描 527,040 个分钟，使用单个 Dedicated Worker，不分片。

GameCube Seed Finder C ABI v1 提供 Gales、Colo 与 Channel 三种入口，并返回单个 `uint32_t` Seed 记录：

```c
uint32_t gen3ngcseed_api_version();
uint32_t gen3ngcseed_search_gales(
  uint32_t playerIndex, uint32_t enemyIndex,
  uint32_t enemyHpLeft, uint32_t enemyHpRight,
  uint32_t playerHpLeft, uint32_t playerHpRight,
  const uint32_t* seeds, uint32_t seedCount,
  uint32_t lowStart, uint32_t lowCount
);
uint32_t gen3ngcseed_search_colo(
  uint32_t partyLead, uint32_t trainer,
  const uint32_t* seeds, uint32_t seedCount,
  uint32_t lowStart, uint32_t lowCount
);
uint32_t gen3ngcseed_search_channel(
  const uint32_t* patterns, uint32_t count,
  uint32_t startSeed, uint32_t stateCount
);
uintptr_t gen3ngcseed_result_ptr();
uint32_t gen3ngcseed_result_count();
uint32_t gen3ngcseed_last_error();
```

Gales/Colo 首轮按低 16 位分片，Channel 覆盖 `0x40000001..0xFFFFFFFE`。可选 `.precalc` 由 TypeScript 流式校验 Qt ISO 3309 CRC 与 25/24 个小端分区，候选按 200,000 个 Seed 读取并在 Pool 内进一步按 50,000 个 Seed 分片；XDRNG 搜索仍只在 C++/Wasm 中执行。

IVs to PID C ABI v1 接受六项 IV、Nature 与 TID：

```c
uint32_t gen3ivtopid_api_version();
uint32_t gen3ivtopid_calculate(
  uint32_t hp, uint32_t atk, uint32_t def,
  uint32_t spa, uint32_t spd, uint32_t spe,
  uint32_t nature, uint32_t tid
);
uintptr_t gen3ivtopid_result_ptr();
uint32_t gen3ivtopid_result_count();
uint32_t gen3ivtopid_last_error();
```

每条记录为九个连续 `uint32_t`：`seed / pid / sid / method / ability / gender12.5 / gender25 / gender50 / gender75`。候选恢复只使用一个 Dedicated Worker，不拆分任务。

### 6.5 Spinda Painter

`src/features/spindapainter/domain.ts` 保存 PokeFinder 的四个斑点偏移、边界和 8 像素 PID 网格。面板使用静态导入的 `spinda.png` 与 `spinda_spot1..4.png`，在相对比例画布中保持上游原始 `512x512` 坐标系；指针移动以实际图片左上角为锚点，仅作上游边界钳制，反向 PID 对坐标除以 8 截断。键盘方向键每次移动一个网格。此模块不调度 Worker，不访问 Wasm，且通过 Workbox 的 `png` 预缓存模式与其他离线资源一起缓存。

Egg C ABI v1 使用 54 个 `uint32_t` 请求字，按 Held Advances 分片生成并返回 22 个连续 `uint32_t`：

```c
uint32_t gen3egg_api_version();
uint32_t gen3egg_generate(
  const uint32_t* request, uint32_t requestWords,
  uint32_t initialAdvancesHeld, uint32_t maxAdvancesHeld,
  uint32_t maxResults
);
uintptr_t gen3egg_result_ptr();
uint32_t gen3egg_result_count();
uint32_t gen3egg_result_truncated();
uint32_t gen3egg_last_error();
```

记录布局为 `heldAdvances / pickupAdvances / redraws / pid / ability / gender / nature / shiny / hp / atk / def / spa / spd / spe / inheritanceHP / inheritanceAtk / inheritanceDef / inheritanceSpA / inheritanceSpD / inheritanceSpe / hiddenPower / hiddenPowerStrength`。每次 Wasm 调用最多处理 100,000 个 Held/Pickup/Redraw 组合；浏览器任务总组合上限为 `150,060,006`，以覆盖上游 Emerald 默认范围。

Static C ABI 使用同一结果生命周期，并提供 `gen3static_generate` 与 `gen3static_search`。Generator 传入 Seed、推进范围、Offset、Method、预设属性、TID/SID 和筛选；Searcher 传入 IV 组合 `startIndex`、`stateCount`、Method、预设属性、TID/SID 和筛选。两者都返回连续 48 字节记录：

```text
uint32 advancesOrSeed  # Generator 为 Advances，Searcher 为 Seed
uint32 pid
uint32 ivHP / ivAtk / ivDef / ivSpA / ivSpD / ivSpe
uint32 ability
uint32 gender
uint32 level
uint32 natureShiny  # low 8 bits nature, remaining bits shiny type
```

Wild C ABI v3 提供 `gen3wild_generate` 与 `gen3wild_search`。Generator 传入紧凑槽位数组、Seed、推进范围、Offset、Method、Lead、Encounter、遭遇率、RSE/Feebas/Safari/Rock Smash 特殊规则、TID/SID 和完整筛选；Searcher 传入 IV 组合 `startIndex`、`stateCount`、相同的遭遇规则与筛选，并通过逆推恢复候选 Seed。两者返回连续 60 字节记录：

```text
uint32 advancesOrSeed  # Generator 为 Advances，Searcher 为 Seed
uint32 pid
uint32 ivHP / ivAtk / ivDef / ivSpA / ivSpD / ivSpe
uint32 ability / gender / level
uint32 natureShiny
uint32 encounterSlot / species / form
```

Gen IV Static C ABI v1 提供 `gen4static_generate` 与 `gen4static_search`。Generator 接受 Seed、推进范围、Offset、Method、Lead、同步性格、模板属性、TID/SID 和完整筛选；Searcher 接受 IV 组合分片、Delay/Advance 范围及相同的 Method、Lead、模板和筛选。结果为固定 16 个 `uint32_t` 字段：

```text
uint32 advancesOrSeed  # Generator 为 Advances，Searcher 为 Seed
uint32 pid
uint32 ivHP / ivAtk / ivDef / ivSpA / ivSpD / ivSpe
uint32 ability / gender / nature / shiny
uint32 hiddenPower / hiddenPowerStrength
uint32 characteristic / callPitch
```

Generator 的 `Max Advances` 包含起点；Searcher 的 IV 组合按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 分片。Method 1/J/K、Synchronize、Cute Charm 与 Seed 恢复以 PokeFinder 4.3.2 为权威基线。

Gen IV Wild C ABI v1 提供 `gen4wild_generate` 与 `gen4wild_search`。请求结构固定为 75 个 `uint32_t`，包括槽位指针/数量、Seed 或 Searcher 范围、Method、Lead、Encounter、存档、特殊规则和完整筛选；每个槽位固定为 19 个 `uint32_t`：

```text
uint32 species / form / minLevel / maxLevel
uint32 stats[6]
uint32 types[2] / genderRatio
uint32 items[3] / abilities[3]
```

Generator 与 Searcher 结果均为 22 个 `uint32_t`。Generator 布局为 `advances / battleAdvances / pid / ivs[6] / ability / gender / level / nature / shiny / encounterSlot / species / form / item / hiddenPower / hiddenPowerStrength / call / chatot`。Searcher 布局为 `seed / delay / hour / advances / pid / ivs[6] / ability / gender / level / nature / shiny / encounterSlot / species / form / item / hiddenPower / hiddenPowerStrength`；Delay/Hour 只参与内部初始 Seed 验证，不作为 UI 可见列。

边界原则：

- 只传递固定宽度整数、指针和长度，不暴露 C++ 对象、STL 或 Qt 类型。
- 每次 C ABI 调用最多处理 100,000 个 Generator 状态；Egg 以 Held 范围分片且每次最多处理 100,000 个 Held/Pickup/Redraw 组合；G3/G4 Wild Searcher 的 TypeScript 分片上限为 10,000 个 IV 组合；G4 Static Searcher 的 TypeScript 分片上限为 500 个 IV 组合，C ABI 保留 100,000 的防御上限。
- `gen3initialseed` 目标 Seed 每次 C ABI 调用最多处理 500,000 个反推状态；UI 的 `Max Results` 上限为 65,536 条。
- `gen3wild` API v3 的 Generator/Searcher 筛选都在 C++/Wasm 内完成，Worker 不复制第二套 RNG 筛选逻辑。
- `gen3initialseed` 的正向/反向 LCRNG 计算只在 C++/Wasm 中执行，TypeScript 不复写生产 RNG。
- `gen3seedtotime` 的 PokeRNGR 回推和全年日期/分钟枚举只在 C++/Wasm 中执行，TypeScript 不复写生产算法。
- `gen3ngcseed` 的 Gales/Colo/Channel XDRNG 搜索只在 C++/Wasm 中执行；TypeScript 只读取 Precalc 二进制结构，不推导 RNG 结果。
- `gen4chainedsid` 的 Method 1 Seed 恢复、PID 位回推和 SID 候选收窄只在 C++/Wasm 中执行；TypeScript 只提交完整观测列表并解码 SID 缓冲区。
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
    }
  | {
      type: "search";
      taskId: string;
      chunk: StaticSearcherChunk;
      request: StaticSearcherRequest;
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
- ID、Initial Seed、Seed to Time、GameCube Seed Finder、GameCube RNG、PID to IVs、PokeSpot、Jirachi Advancer、Static、Wild、IVs to PID、Egg 与 Gen VII Stationary / Wild / SOS / Egg / Battle Tree 使用相同的消息信封原则，但保留独立 TypeScript 类型、Worker 文件和 API 版本，不使用未加区分的通用 payload。Initial Seed 以 `rs-ids` 与 `target` 区分操作，只有目标 Seed 反推携带 `chunkIndex`；Seed to Time、PID to IVs、Jirachi 与 IVs to PID 每次输入都是有限任务；GameCube Seed Finder、GameCube RNG 和 PokeSpot 使用模块自己的分片协议；Egg 以 Held Advances 分片，保留 Pickup 范围和 Redraws 作为每个分片的完整请求输入；Gen VII 连续会话以 `batchIndex` 提交 `step()` 批次，不使用多 Worker 乱序归并。

`gen4id`、`gen4static`、`gen4wild`、`gen4chainedsid`、`gen7stationary`、`gen7wild`、`gen7sos`、`gen7egg`、`gen7battletree` 与 `gen7event` 使用 `rngModuleContract.ts` 的版本 1 信封，初始化时同时声明 `moduleId`、`contractVersion` 与 `apiVersion`；第四世代任务统一使用 `type: "task"` 加 `operation: "generator" | "searcher"`，Gen VII Stationary、Wild、SOS、Egg、Battle Tree 与 Event 固定声明 `operation: "generator"`。这一契约不改写三代消息类型。

## 9. 源码与许可证边界

`third_party/pokefinder/` 是构建使用的可审计 vendored snapshot，不引用开发者桌面绝对路径。

- `UPSTREAM.md` 记录上游项目、版本、导入日期、文件 SHA-256 和修改边界。
- 上游文件保留原版权与 GPL 头。
- PokeRNGKit bridge 使用独立文件和 `gen3id_*`、`gen3initialseed_*`、`gen3seedtotime_*`、`gen3ngcseed_*`、`gen3static_*`、`gen3wild_*`、`gen3ivtopid_*`、`gen3pidtoiv_*`、`gen3egg_*`、`gen3gamecube_*`、`gen3pokespot_*`、`gen3jirachi_*`、`gen4id_*`、`gen4static_*`、`gen4wild_*`、`gen4chainedsid_*`、`gen7stationary_*`、`gen7wild_*`、`gen7sos_*`、`gen7egg_*`、`gen7battletree_*`、`gen7event_*`、`gen7id_*`、`pokerusfinder_*` 前缀。
- `vite.config.ts` 在构建结束时将根 `LICENSE` 和上游记录复制到 `dist/legal/`。
- 页面页脚链接 PokeRNGKit 源代码、GPL 文本和上游记录。

公开部署 Wasm 时，源代码仓库或对应源码包必须对站点用户可访问。

## 10. 工程目录

```text
.github/workflows/ci.yml            # 验证、Pages、可选 Cloudflare
docs/
|-- modules/
|   |-- gen3id.md
|   |-- gen3initialseed.md
|   |-- gen3seedtotime.md
|   |-- gen3ngcseed.md
|   |-- gen3profiles.md
|   |-- gen3static.md
|   |-- gen3wild.md
|   |-- gen3ivtopid.md
|   |-- gen3egg.md
|   |-- gen4static.md
|   |-- gen4wild.md
|   |-- gen4chainedsid.md
|   |-- gen4profiles.md
|   |-- gen4ivcalculator.md
|   `-- encounterlookup.md
|-- ai-development.md
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
    |-- shared/
    |   `-- rngModuleContract.ts
    |-- id/
    |   |-- domain.ts
    |   |-- preview/
    |   `-- worker/
    |-- initialseed/
    |   |-- domain.ts
    |   |-- Gen3InitialSeedPanel.tsx
    |   |-- preview/
    |   `-- worker/
    |-- seedtotime/
    |   |-- domain.ts
    |   |-- Gen3SeedToTimePanel.tsx
    |   |-- preview/
    |   `-- worker/
    |-- ngcseed/
    |   |-- domain.ts
    |   |-- precalc.ts
    |   |-- Gen3NgcSeedPanel.tsx
    |   |-- preview/
    |   `-- worker/
    |-- profiles/
    |   |-- domain.ts
    |   |-- repository.ts
    |   `-- useGen3Profiles.ts
    |-- static/
    |   |-- domain.ts
    |   |-- Gen3StaticPanel.tsx
    |   |-- searcher.ts
    |   |-- preview/
    |   `-- worker/
    |-- wild/
    |   |-- domain.ts
    |   |-- Gen3WildPanel.tsx
    |   |-- gen3Data.ts
    |   |-- search.ts
    |   `-- worker/
    |-- ivtopid/
        |-- domain.ts
        |-- Gen3IvToPidPanel.tsx
        |-- search.ts
        |-- preview/
        `-- worker/
    `-- egg/
        |-- domain.ts
        |-- Gen3EggPanel.tsx
        |-- search.ts
        |-- preview/
        `-- worker/
    |-- gen4static/
    |   |-- domain.ts
    |   |-- Gen4StaticPanel.tsx
    |   |-- search.ts
    |   |-- searcher.ts
    |   |-- preview/
    |   `-- worker/
    |-- gen4wild/
    |   |-- domain.ts
    |   |-- Gen4WildPanel.tsx
    |   |-- search.ts
    |   |-- preview/
    |   `-- worker/
    |-- gen4chainedsid/
    |   |-- data.ts
    |   |-- domain.ts
    |   |-- Gen4ChainedSidPanel.tsx
    |   |-- preview/
    |   `-- worker/
    |-- gen4profiles/
    |-- gen4ivcalculator/
    `-- encounterlookup/
third_party/pokefinder/
vite.config.ts
vitest.config.ts
wasm/modules/
|-- gen3id/
|-- gen3initialseed/
|-- gen3seedtotime/
|-- gen3ngcseed/
|-- gen3static/
|-- gen3wild/
|-- gen3ivtopid/
|-- gen3egg/
|-- gen4static/
|-- gen4wild/
`-- gen4chainedsid/
```

后续模块沿用同一结构。G3 Static、G4 Static、G3 Wild 与 G4 Wild 的 Generator/Searcher 各自共享所属版本化模块，但使用独立请求、Pool 和任务生命周期；Chained SID 使用自己的单 Worker 和 Wasm；不要把 `gen4id` 或其他模块逻辑塞进现有模块。

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
npm run format:files -- <file...> # 格式化本任务指定文件
npm run format:changed   # 格式化相对 HEAD 的 Git 改动文件
npm run format:check     # Prettier 只读检查
npm run wasm:test:native # 原生 C++ 夹具
npm run wasm:build       # 生成 public/wasm
npm run verify           # 格式、lint、类型、单元测试、Web 构建
npm run verify:full      # verify + 原生测试 + Wasm 构建
```

`public/wasm/`、`wasm/build/` 和 `dist/` 都是生成物，不提交到 Git。

## 12. 测试金字塔

### 12.1 当前已实现

- **C++ 原生夹具**：ID 三种模式，Initial Seed 的 RS TID/SID 固定候选，Seed to Time 的时间表与 32 位回推，NGC Seed C ABI 输入边界，G3 Static Method 1/4、Searcher 反向恢复与游走缺陷，Wild Route 111 Generator/Searcher，IVs to PID Channel/Method 2，Egg Emerald/RSFRLG，G4 Static Method 1/J/K、Synchronize、Cute Charm 与 Searcher，以及 Gen VII Stationary / Wild / SOS / Egg / Battle Tree / Event 连续会话固定结果。
- **TypeScript 单元测试**：ID、G3/G4 Static、Wild、IVs to PID、Egg、Spinda Painter 与 Gen VII Stationary / Wild / SOS / Egg / Battle Tree / Event 输入边界，Generator/Searcher 分片、固定宽度结果解码、Wonder Card 解析、PID/斑点双向映射、觉醒力量、输入规范化、主题和红蓝宝石 Seed 推导。
- **持久化单元测试**：G3/G4 存档 JSON schema、合并边界、IndexedDB 主存储抽象与 localStorage 兜底。
- **UI 预览引擎测试**：ID、Initial Seed、GameCube Seed Finder、G3/G4 Static、Wild Generator/Searcher、IVs to PID、Egg Generator 与 Gen VII Stationary / Wild / SOS / Egg / Battle Tree / Event 的确定性样例、进度和取消。
- **静态检查**：Prettier、ESLint、TypeScript project build。
- **生产 Web 构建**：Vite Worker、PWA、相对 base 和法律文件。

### 12.2 Pages 预览后补充

- Testing Library：模块切换、表单校验、取消、排序、CSV 和语言切换。
- Worker + 真实 Wasm 浏览器集成：API 握手、批次顺序、错误、取消和内存边界。
- Playwright：GitHub Pages 子路径、ID/Initial Seed/Seed to Time/G3 Static/Wild/IVs to PID/Egg/Spinda Painter/G4 Static 冒烟、两代独立悬浮工具、离线重载和移动视口。
- 性能基线：记录设备、浏览器、状态数、Worker 数、吞吐、取消耗时和峰值内存。

测试数量不代替上游一致性。优先保证 C++ 固定夹具、协议边界和真实 Pages 加载路径。

## 13. 当前模块技术验证门槛

当前 `gen3initialseed`、`gen3seedtotime`、`gen3ivtopid` 与 `gen3egg` 进入部署页面算法回归前必须完成：

1. 原生夹具验证 TID `48163`、SID `64377` 返回 `05A0 / 0` 与 `C19B / 36724`，并覆盖 C ABI 的 TID/SID 和分片边界错误码。
2. RS IDs 以 65,536 个低位状态完成扫描，所有返回记录的初始 Seed 不大于 `0xFFFF` 且按稳定帧顺序提交。
3. FRLG / RSE 的反向分片覆盖 `1..0xFFFFFFFF`，跨 Worker 的乱序批次按 `chunkIndex` 恢复；达到 `Max Results` 或取消后不接收迟到结果。
4. Emscripten 6.0.6 生成可加载的 `gen3initialseed.mjs` 与 `gen3initialseed.wasm`，API 握手为版本 1。
5. 大范围目标 Seed 任务运行时主线程仍能切换模块、响应取消和滚动现有结果。
6. 简体中文、英文和日文可以切换；PokeFinder 无中文词条的 `Initial Seed Finder`、`Target Seed` 和 `Max Results` 保持英文。
7. 排序、CSV、结果上限、错误状态和移动端结果表符合需求。
8. GitHub Pages 无 Initial Seed JS、Worker、Wasm、manifest 或 Service Worker 404。
9. 项目所有者提供部署 URL 并明确授权后，Codex 才能在生产页面记录算法与功能回归证据。
10. 项目所有者完成并记录界面、真实设备、PWA 和正式发布验收。

`gen3ivtopid` 额外门槛：原生夹具必须覆盖 IV `0/0/0/0/0/0` 的 Channel 结果和 IV `31/31/31/0/31/31` 的 Method 2 结果；Worker 必须拒绝超过 128 条、未按 `uint32_t` 对齐或超出 Wasm 堆边界的结果缓冲区；浏览器页面必须显示九列结果，空 TID 必须等价于 `0`，且不出现第四世代 Cute Charm。

`gen3seedtotime` 额外门槛：原生夹具必须覆盖 Seed `00000000`、Year `2000` 的七条时间和 Seed `40000000` 的原始 Seed `1AA5` / Advances `66861`；Worker 必须拒绝未按 `uint32_t` 对齐或超出 Wasm 堆边界的结果缓冲区；浏览器页面必须回写 32 位输入的原始 16 位 Seed，并显示只读 Advances。

`gen3egg` 额外门槛：原生夹具必须覆盖 `EBred` Bulbasaur 的 50 条结果与 `RSFRLGBredSplit` Bulbasaur 的 60 条结果，并核对首条 Advances、PID 和六项 IV；Worker 必须拒绝超过 100,000 条、未按 `uint32_t` 对齐或超出 Wasm 堆边界的结果缓冲区；浏览器页面必须按游戏显示 Emerald 的 16 列或 RS/FRLG 的 15 列，空 16 位 Seed 必须等价于 `0000`。

`gen4static` 额外门槛：原生夹具必须覆盖 Method 1/J/K、Synchronize、Cute Charm、Searcher 和输入错误；浏览器必须核对 `Max Advances=N` 处理 `N+1` 个状态、固定结果列宽、Searcher 首列 Seed、六项 IV 默认 `0..31`，并确认 G3/G4 存档 schema、存储键与全局个体值计算器状态边界清晰。

`gen4wild` 额外门槛：原生夹具必须覆盖 Route 222 Method J Generator/Searcher 与非法 fixed slot；浏览器必须抽样 Method J/K、甜甜蜜树、宝可追踪、捕虫大赛和 HGSS 狩猎地带，确认单槽与 31 IV 约束、默认 IV `0..31`、固定结果列宽、Searcher 不显示 Delay/Hour，以及 G3/G4 存档与全局个体值计算器边界清晰。

`gen4chainedsid` 额外门槛：原生夹具必须使用 Lake of Rage Gyrados 的三条观测得到唯一 SID `54320`，并覆盖 API 版本和非法 TID；Worker 必须拒绝超过 1024 条观测、非 `uint32_t` 对齐或长度异常的结果；浏览器必须确认逐条收窄、TID 锁定、清空和取消。

## 14. GitHub Actions 与 Pages

`.github/workflows/ci.yml` 在 pull request、`main` push 和手动触发时运行。

```text
checkout
  -> Node 24.19.0
  -> npm 12.0.2
  -> npm ci --engine-strict
  -> npm run verify
  -> Emscripten 6.0.6
  -> wasm:doctor
  -> npm run wasm:test:native
  -> npm run build (BASE_PATH=./，构建所有 module.json)
  -> configure Pages
  -> upload dist artifact
  -> deploy GitHub Pages
```

Pull request 不执行 configure/upload/deploy。主分支部署 job 不重新编译，只部署 build job 上传的 artifact。

前端验证刻意放在 Emscripten 安装之前。格式、lint、类型、单元测试或 Web 构建失败时，Actions 会在进入约 30 秒的 emsdk 安装阶段前停止；Wasm 工具链只为已通过前端门槛的提交初始化。

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

## 18. `gen3initialseed` 实现约束

`gen3initialseed` 沿用当前 React/TypeScript + C++/Emscripten Wasm + Worker 的边界。Wasm 只暴露固定宽度整数 C ABI，结果使用 `{ initialSeed: uint32, advances: uint32 }` 的 8 字节记录；不暴露 STL、Qt、文件系统或宿主路径。

`RS IDs` 采用一个 Worker 处理 65536 个低位候选；`FRLG / RSE` 使用多个独立 Worker 实例处理反向 PokeRNG 分片。每个任务携带 `taskId`、`chunkIndex`、`startAdvance` 和 `stateCount`，主线程只按 `chunkIndex` 合并结果。取消通过终止 Worker 实例实现，不要求 `SharedArrayBuffer`、Wasm pthread 或跨源隔离。

算法边界和输入限制以 [docs/modules/gen3initialseed.md](modules/gen3initialseed.md) 为准；Real96 仓库仅为公开算法参考，`StarfBerry/PokeRNG` 仅登记为研究资料。

## 19. 暂不引入

- React Router：当前模块切换不需要独立 URL。
- Zustand / Redux：当前状态局部且所有权清晰。
- TanStack Table：当前 ID、G3/G4 Static 与 Wild 都只有单列排序和固定列定义。
- Dexie：当前单记录 schema 使用原生 IndexedDB 已足够；出现多 store 迁移或复杂查询后再评估。
- Testing Library / Playwright：Pages 预览稳定后按真实交互补充。
- Next.js、SSR 或后端框架：违反纯静态目标。
- Comlink：显式消息协议更适合批次、版本和转移所有权审计。
- Wasm threads / `SharedArrayBuffer`：普通静态托管兼容性优先。
- 遥测和错误上报 SaaS：本地优先和隐私目标优先。
