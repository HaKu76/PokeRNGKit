# 第四世代扩展接口与 AI 交接

> - 状态：第四世代 Static Generator/Searcher、独立存档和全局个体值计算器已实现；生产回归待部署
> - 更新日期：2026-08-12
> - 上游基线：PokeFinder 4.3.2
> - 当前产品范围：第三世代既有模块与第四世代 Static

本文用于另一位开发者或 AI 在新会话中恢复第四世代模块。当前只落地 `gen4static`；`gen4id` 与 `gen4wild` 仍仅保留共享接口，不得据此推断已支持其他第四世代功能。

## 1. 已保留接口

[`src/features/shared/rngModuleContract.ts`](../src/features/shared/rngModuleContract.ts) 定义跨世代模块的最小公共边界：

- `RNG_MODULE_CONTRACT_VERSION`：Worker 信封协议版本，当前为 `1`。
- `RngModuleManifest`：模块标识、世代、API 版本、能力、构建 target、产物和上游来源。
- `RngWorkerInitMessage`：加载 MJS/Wasm 前声明模块、协议和 API 版本。
- `RngWorkerTaskMessage`：携带 `taskId`、操作、`chunkIndex`、模块请求和分片。
- `RngWorkerReadyMessage`、`RngWorkerBatchMessage`、`RngWorkerErrorMessage`：握手、批次和失败信封。
- `GEN4_MODULE_RESERVATIONS`：只保留 `gen4id`、`gen4static`、`gen4wild` 三个标识及 Generator/Searcher 能力。

`gen4id` 与 `gen4wild` 仍没有运行时注册。`gen4static` 已使用 API 版本 `1`、独立 Wasm target、Worker Pool、导航入口和 UI 预览引擎。

## 2.1 当前已实现：`gen4static`

- 覆盖 PokeFinder 第四世代 Static 的 Generator/Searcher、Method 1/J/K、Synchronize 和 Cute Charm 分支。
- 内置 99 条 DPPt/HGSS 定点模板，按 Starters、Fossils、Gifts、Game Corner、Stationary、Legends、Events、Roamers 分类；数据由 `scripts/generate_gen4_static_data.mjs` 生成。
- Generator 与 Searcher 六项 IV 最小/最大值均默认 `0..31`，IV 名称按钮沿用 G3 的单击、Ctrl、Alt、Ctrl+Alt 快捷键。
- 结果表使用固定列宽并显示觉醒属性、觉醒威力、个性、电话和音高；Searcher 的首列为 Seed，Generator 的首列为 Advances。
- G4 存档使用独立 React 模块、schema、IndexedDB/localStorage 键，不读取或覆盖 G3 存档状态；个体值计算器为全局单一 React 工具，不按世代拆分入口。

Generator 的 `Max Advances` 与 PokeFinder 一致，包含起点，因此输入 `N` 计算 `N + 1` 个状态；Searcher 的 IV 组合按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 的闭区间笛卡尔积枚举。

## 2. 模块边界

第四世代按 PokeFinder 模块分别落地：

| 模块         | 上游 Form           | 上游 Core Generator/Searcher          | 上游固定夹具                                                          |
| ------------ | ------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `gen4id`     | `Form/Gen4/IDs4`    | `IDGenerator4`、`IDSearcher4`         | `IDGenerator4Test.cpp`、`IDSearcher4Test.cpp`、`id4.json`             |
| `gen4static` | `Form/Gen4/Static4` | `StaticGenerator4`、`StaticSearcher4` | `StaticGenerator4Test.cpp`、`StaticSearcher4Test.cpp`、`static4.json` |
| `gen4wild`   | `Form/Gen4/Wild4`   | `WildGenerator4`、`WildSearcher4`     | `WildGenerator4Test.cpp`、`WildSearcher4Test.cpp`、`wild4.json`       |

每次只实现一个模块。Egg、Event、Seed to Time、Chained SID、Roamer 等保持独立候选，不并入上述三个模块。

## 3. AI 必读顺序

新会话开始后按以下顺序读取，不以聊天摘要替代仓库文件：

1. [`AGENTS.md`](../AGENTS.md)
2. [`docs/ai-development.md`](ai-development.md)
3. [`docs/progress.md`](progress.md)
4. 本文与 [`src/features/shared/rngModuleContract.ts`](../src/features/shared/rngModuleContract.ts)
5. [`docs/requirements.md`](requirements.md)与[`docs/tech-stack.md`](tech-stack.md)
6. 对应的 `docs/modules/gen4<module>.md`；首次开发时先创建
7. 上游对应 `Form/Gen4`、`Core/Gen4`、`Test/Gen4`、`Form/Controls` 和 `Form/i18n/PokeFinder_zh.ts`
8. [`third_party/pokefinder/UPSTREAM.md`](../third_party/pokefinder/UPSTREAM.md)

开始编辑前运行 `git status --short --branch`，保留已有工作区修改。

## 4. 目录与命名

首个模块以 `gen4id` 为例：

```text
docs/modules/gen4id.md
src/features/gen4id/
|-- domain.ts
|-- search.ts
|-- preview/
`-- worker/
wasm/modules/gen4id/
|-- CMakeLists.txt
|-- module.json
|-- bridge/
`-- tests/
```

模块 C ABI 使用同名小写前缀，例如 `gen4id_api_version`、`gen4id_generate`、`gen4id_search`、`gen4id_result_ptr`、`gen4id_result_count` 和 `gen4id_last_error`。不得复用 `gen3id` 的 API 版本、Worker 实例、结果记录或缓存键。

## 5. 实现前核对

每个控件都要从 Qt Form 和 Core 参数重新核对：

- 输入进制、`maxLength`、最小值、最大值、空值行为和跨字段约束。
- Generator 与 Searcher 实际提供的 Method、模式、日期时间、Delay、Advance 和筛选项。
- 游戏版本、存档字段、TID/SID、按键或硬件参数对候选列表和算法分支的影响。
- 结果模型的列、数值类型、显示格式和排序语义。
- 简体中文控件名是否存在于 `PokeFinder_zh.ts`；存在时逐字复用，不存在时保留英文源字符串。

核对结果写入 `docs/modules/gen4<module>.md`，并列出使用的上游文件。不要从三代限制、占位符或旧文档推断四代行为。

## 6. Wasm 与 Worker 契约

具体模块实现时才创建 `module.json` 并确定 `apiVersion`。manifest 必须能映射到 `RngModuleManifest`，产物保持 `<module>.mjs` 与 `<module>.wasm`。

Worker 初始化必须同时校验：

1. `moduleId` 与加载模块一致。
2. `contractVersion` 等于 `RNG_MODULE_CONTRACT_VERSION`。
3. TypeScript、C++ `*_api_version()` 与 `module.json` 的 `apiVersion` 完全一致。
4. `operations` 包含当前任务的 `generator` 或 `searcher`。

任务使用唯一 `taskId` 和单调 `chunkIndex`。Pool 可以并行分发分片，但必须按 `chunkIndex` 提交结果；`ArrayBuffer` 通过 transfer list 移交。取消继续通过终止并重建独立 Worker 实现，不引入 Wasm pthread、`SharedArrayBuffer` 或跨源隔离要求。

C ABI 只传固定宽度整数、指针和长度，不传 C++ 对象、STL、Qt 类型、字符串或文件路径。Generator 与 Searcher 可以共享一个版本化 Wasm 模块，但请求类型、分片规则和结果第一列语义必须显式区分。

## 7. 存档与数据

第四世代存档必须建立独立 schema、repository、导入导出格式和缓存键。开始实现前核对 `Profile4.cpp/.hpp` 及 `Form/Gen4/Profile`，不得把第四世代字段塞入第三世代存档记录。

Static/Wild 数据必须记录生成器、上游 revision、生成命令和校验方式。游戏版本差异、遭遇表、个人数据、形态和本地化资源都使用仓库内静态数据，不增加后端、运行时 CDN 或远端查询。

## 8. 测试与首个门槛

每个四代模块至少覆盖：

- 上游 JSON/QtTest 固定输入移植为原生 C++ 夹具，Generator 与 Searcher 逐字段对齐。
- C ABI 非法输入、单分片上限、结果上限和 API 版本测试。
- TypeScript 输入边界、笛卡尔积或推进分片、结果解码和消息信封测试。
- UI 预览的表单、进度和取消测试；预览数据不得作为 RNG 证据。
- 真实 Worker/Wasm 的握手、乱序批次、取消和静态子路径加载验证。

首个技术验证门槛建议选择 `gen4id` 的一组 Generator 与一组 Searcher 上游固定输入。只有以下项目全部成立，才把模块加入应用导航和默认 Actions 构建：

1. 输入限制和控件名已记录到 `docs/modules/gen4id.md`。
2. 原生夹具逐字段通过。
3. `module.json`、C++、TypeScript 和 Worker 握手使用同一 API 版本。
4. Emscripten 产物可由独立 Worker 加载，长任务不阻塞主线程并可取消。
5. `npm run verify:full` 与 Pages 子路径加载通过。
6. Codex 在项目所有者提供的部署 URL 上完成 PokeFinder 对照回归，项目所有者完成最终发布验收。

## 9. 构建接入顺序

1. 先使用 `POKERNGKIT_WASM_MODULES=gen4id` 单独配置、测试和构建新模块。
2. 通过原生与 Wasm 验证后，再将模块加入 `wasm/CMakeLists.txt` 和 `scripts/wasm.mjs` 的默认列表。
3. 最后接入生产 UI、PWA 缓存、Actions 冒烟与 Pages 验收。

顶层命令仍由 npm 提供；只有实际开始某个 Rust 或 C# 来源模块时才评估并锁定对应工具链，不能为接口预留提前增加依赖。
