# 第五世代 Static

## 范围

本模块对应 PokeFinder 4.3.2 的 `Static`，提供 Black、White、Black 2 与 White 2 的 `Generator` 和 `Searcher`。它覆盖 Starters、Fossils、Gifts、Stationary、Legends、Events、Roamers、Curtis 与 Yancy 九类模板，并保留普通定点、野生定点、赠送蛋与游走宝可梦的不同 RNG 路径。

前端只负责 Profile、表单、缓存文件读取、任务分片、取消、进度、结果校验和虚拟表格。MT、BWRNG、SHA-1 初始 Seed、启动 Advances、PID、IV、队首、Lucky Power 与筛选均在独立 Worker 的 C++/WebAssembly 中执行。模块不使用 pthread、`SharedArrayBuffer`、跨源隔离、后端或运行时 CDN。

## 上游文件

只读核验文件：

```text
8E4A966CB65885F45510EFD414128A09190F351B82EF7C076ED4AA51BBF2A3CE  Form/Gen5/Static5.cpp
F6491FCBA3389F030780951F3798916251B0833FB79C8E4F154F96F795AA765E  Form/Gen5/Static5.ui
7EA6C27309F4E44AD9D48A8CFE77C8A9709C9877B851E91D76422F105583E785  Core/Gen5/Generators/StaticGenerator5.cpp
7B62EB32A84495FDCC8D2655E46A4321CE74781AE635D759D4F624F21A84F7E2  Core/Gen5/Generators/StaticGenerator5.hpp
8A0C67621722EE7285DF6005597457BBF339DCEE3E55F5024D4133FBABC12E73  Core/Gen5/StaticTemplate5.hpp
996A31CD6FDAC0E7BAF91E04B9B29CDB09F4C19EBB25C8A24476203AB362AC92  Core/Gen5/Searchers/Searcher5.hpp
50DE23795DA10C41FFB60530161CF8E03A82526DD966409110183C3BBF28DFFE  Core/Gen5/Searchers/IVSearcher5.hpp
273CA2F3C335413F88DAA23048AD40948E7751A0310838DC1BF5B4386CE9F66E  Core/Gen5/IVCache.cpp
460294C495603AD35D5BB5D65F149D9D58FF96695A1A2B32BF795361A27DA699  Core/Gen5/SHA1Cache.cpp
51B4F88667748825CE5091600BD2C5EE7F0152912BFC25856004319E41863FCA  Form/Controls/TextBox.cpp
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
EF986F89970E5BDF568B6DADB269AC326E588FEED39A1C3361CE79569513DFBB  Core/Resources/Personal/Gen5/personal_bw.bin
956D7AAE664CF75AF663A2F3593A2B14559A68374168557BC844A9D95E8E0E44  Core/Resources/Personal/Gen5/personal_b2w2.bin
```

Static 模板字段对照 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 `Gen5/encounters.json`，Personal 字段对照 PokeFinder 4.3.2 的 BW/BW2 binary。当前只读 `PokeFinder-master` 归档中的 EncounterTables 子模块为空，因此不能从该归档目录重新读取 `Gen5/encounters.json`；revision 以 `third_party/pokefinder/UPSTREAM.md` 的来源记录为准。

## 输入限制

| 控件                           | 进制 |       最小值 |             最大值 | 最多字符 |   空值 |           默认值 | 上游来源                                                 |
| ------------------------------ | ---: | -----------: | -----------------: | -------: | -----: | ---------------: | -------------------------------------------------------- |
| Generator `Seed`               |   16 |          `0` | `FFFFFFFFFFFFFFFF` |       16 |    `0` |              `0` | `Static5.cpp` 的 `InputType::Seed64Bit`；`TextBox.cpp`   |
| Generator `IV Advances`        |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | `Static5.cpp` 的 `InputType::Advance32Bit`；`Static5.ui` |
| Generator `Initial Advances`   |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | 同上                                                     |
| Generator `Max Advances`       |   10 |          `0` |       `4294967295` |       10 |    `0` |           `1000` | 同上                                                     |
| Generator `Offset`             |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | 同上                                                     |
| Searcher `Initial IV Advances` |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | `Static5.cpp` 的 `InputType::Advance32Bit`；`Static5.ui` |
| Searcher `Max IV Advances`     |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | 同上                                                     |
| Searcher `Initial Advances`    |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | 同上                                                     |
| Searcher `Max Advances`        |   10 |          `0` |       `4294967295` |       10 |    `0` |            `100` | 同上                                                     |
| `Start Date` / `End Date`      | 日期 | `2000-01-01` |       `2099-12-31` |        - | 不允许 | 当前或已保存日期 | `Static5.cpp`、`DateEdit`                                |
| IV 最小/最大                   |   10 |          `0` |               `31` |        2 | 不允许 |           `0/31` | `Filter`、`StateFilter`                                  |

Profile 的 TID、SID、MAC、VCount、Timer0、GxStat、VFrame、游戏、语言、DS 类型、Keypresses、Memory Link 与 Shiny Charm 复用 `gen5profiles` 的输入和持久化边界。Searcher 的起始日期不得晚于结束日期，`Offset` 固定为 `0`，并且不能关闭筛选器。Generator 的 `Initial Advances + Offset + Max Advances`、Searcher 的 `Initial Advances + Max Advances` 与两种模式的 `Initial IV Advances + Max IV Advances` 均不得超过 `4294967295`。

Ability 只接受 `Any/0/1`，Gender 只接受 `Any/♂/♀`，Shiny 使用上游 `Any/Star/Square/Star-Square` 值 `255/1/2/3`。Nature 与 Hidden Power 至少各选择一项。单次任务最多返回 100,000 条结果。

## 模板与设置

- Black/White 提供 Starters、Fossils、Gifts、Stationary、Legends、Events 与 Roamers。
- Black 2/White 2 提供 Starters、Fossils、Gifts、Stationary、Legends、Curtis 与 Yancy。
- `Lead` 仅在 Stationary、Legends 与 Events 显示；支持 None、25 种 Synchronize Nature、Cute Charm Male 与 Cute Charm Female。Personal gender 为全雄、全雌或无性别时隐藏 Cute Charm。
- `Lucky Power` 仅在 Black 2/White 2 的 `wild` 模板显示；Level 3 增加一次异色 PID roll。Profile 的 Shiny Charm 在相同路径增加两次 roll。
- Larvesta 与 Happiny 使用赠送蛋路径；Tornadus 与 Thundurus 使用 Roamer IV 顺序。
- Curtis 的 TSV 固定为 `54118`。PokeFinder 4.3.2 的 `StaticTemplate5::getYancy()` 错误返回 `curtis` 字段，因此 Yancy 不会应用预期 TSV `10303`；本模块为结果一致性保留该缺陷。

模板物种、版本、等级、Shiny lock、Ability、Gender、wild/egg/roamer/Curtis/Yancy 标志与 Personal gender/ability 均为本地静态数据，不从网络加载。宝可梦下拉只显示当前语言的本地化物种名，不附加地点或其他推断信息。

## 算法

Generator 的 MT 使用 Seed 高 32 位。BW 的普通模板从 `IV Advances` 开始，BW2 普通模板额外推进 2；赠送蛋与 Roamer 再额外推进 1。Roamer 按 `HP, Atk, Def, SpD, Spe, SpA` 读取，其他模板按 `HP, Atk, Def, SpA, SpD, Spe` 读取。

PID BWRNG 从 `Utilities5::initialAdvances(seed, profile) + Initial Advances` 开始，并在每帧应用 `Offset`。结果 `Advances` 显示包含启动推进的绝对值，因此 Seed `0` 的 BW 首帧为 `39`，BW2 首帧为 `46`，不是表单中的相对 `Initial Advances`。

每帧按模板进入下列路径：

1. NonWild 使用上游 `createPID` 处理固定 Ability、Gender 与 Shiny lock，再读取 Nature。
2. Gift Egg 直接读取 PID，额外丢弃一次临时 TID/SID 调用，再读取 Nature。
3. Roamer 直接读取 PID，再读取 Nature。
4. Wild 先处理 Cute Charm / Synchronize 判定，再执行 Shiny Charm 与 Lucky Power rolls，最后读取 Nature。
5. 主 BWRNG 每帧读取 Chatot 与 Needle；Chatot 显示为 `L/ML/M/MH/H + 数值`，Needle 显示为八方向符号。

Searcher 以 Profile 的 Timer0、日期、有效 Keypresses 与每天 86,400 秒计算 SHA-1 初始 Seed，再对每个候选执行 IV 与 PID 范围。最多四个独立 Worker 消费互不重叠分片，批次按 `chunkIndex` 恢复确定顺序；取消、协议错误、Wasm 错误或异常缓冲区会终止并重建 Worker。

## 快速检索缓存

浏览器允许用户上传 PokeFinder `.ivcache` 与 `.sha1cache`。文件只保存在当前页面内存中，不写入 Profile 文件路径，也不上传。

`.ivcache` 使用小端 magic `0xD08CB7C0`、`initialAdvances`、`maxAdvances`、三组桶计数和 Seed 列表。Normal 桶在 BW 使用 Advance 原值，在 BW2 使用 `Advance + 2`；Roamer 使用独立桶和 IV 顺序。快速 IV 搜索只在 IV 下限符合 PokeFinder 常见高个体 spread 条件、且请求范围位于缓存范围内时启用。

`.sha1cache` 使用 54 字节固定头和 16 字节记录：

```text
keyLow   u32 = buttonMask:12 | secondsSinceMidnight:20
keyHigh  u32 = relativeDate:u16 | timer0:u16
seedLow  u32
seedHigh u32
```

SHA1 Cache 必须与 IV Cache advances、Profile MAC、版本、Timer0、DS 类型、语言、GxStat、VCount、VFrame 和日期范围兼容。兼容文件没有当前请求命中时回退 IV-only，不把空结果误判为有效 IV+SHA 路径。Worker 缓存键包含文件实例、日期范围和筛选后 IV/SHA 内容指纹；同名同数量但内容不同的文件，或同一文件的不同日期子集，都会重新加载。普通搜索前显式清除旧缓存。

## 浏览器预算

单次任务上限为 250,000,000 次估算评估。设 `rawSeeds = 日期数 × Timer0 数 × 有效按键数 × 86400`、`ivCount = Max IV Advances + 1`、`pidCount = Max Advances + 1`：

- Raw：`rawSeeds × ivCount × (pidCount + 1)`。
- IV Cache：`rawSeeds + expectedMtSeedMatches × pidCount`。
- IV + SHA Cache：`shaEntryCount × pidCount`。

`expectedMtSeedMatches = ceil(rawSeeds × ivEntryCount / 2^32)`，用于浏览器任务预算和拒绝明显过大的请求，不是算法命中数量承诺。真实结果仍由 C++/Wasm 对每个 Seed、IV 与筛选条件计算。

## Worker ABI

API v1 使用 62 个 `uint32_t` 请求字段，包含操作、Profile、推进范围、模板、筛选、Generator Seed 或 Searcher 日期，以及分片起点与数量。结果固定为 12 个 `uint32_t`：

```text
seedLow, seedHigh, date, seconds, timer0Buttons,
advances, ivAdvances, pid, metadata, ivs0, ivs1, abilityIndex
```

缓存 ABI 为 `gen5static_configure_cache(ivPtr, ivEntryCount, shaPtr, shaEntryCount)` 与 `gen5static_clear_cache()`。IV 每项为 `[ivAdvance, seedHigh]` 两个 word；SHA 每项为 `[keyLow, keyHigh, seedLow, seedHigh]` 四个 word。

## 表格

Generator 保留上游 17 列：`Advances, Chatot, Needle, PID, Shiny, Nature, Ability, HP, Atk, Def, SpA, SpD, Spe, Hidden, Power, Gender, Characteristic`。

Searcher 保留上游 20 列：`Seed, Advances, IV Advances, PID, Shiny, Nature, Ability, HP, Atk, Def, SpA, SpD, Spe, Hidden, Power, Gender, Characteristic, Date/Time, Timer0, Buttons`。

两种模式均可在 IV 与实际能力值之间切换，Hardy、Docile、Serious、Bashful 与 Quirky 五种中性性格按 `1.0` 修正计算。结果表使用固定列宽、横向滚动、表头排序和虚拟化；首条记录直接位于表头下方，行可由鼠标或键盘选中。Generator 可从当前结果打开共享 `Advance Finder`，使用 Chatot/Needles 连续观测筛选并通过 `Jump to Advance` 返回原行；Searcher 可把已选结果的日期时间、Buttons 与 Roamer 类型带入 `Adjacent Seeds`。简体中文逐字复用上游已完成的 `生成器`、`检索器`、`乱数信息`、`初始帧`、`最大帧数`、`设置`、`筛选项`、`分类`、`宝可梦`、`起始日期`、`最后日期`、`队首`、`取消筛选`、`显示能力值` 与 `音高`；`Advance Finder`、`Adjacent Seeds`、`Needle`、`IV Advances`、`Buttons`、`Initial IV Advances`、`Max IV Advances`、`Lucky Power` 和快速检索提示在上游翻译中未完成，因此保留英文。

## 实现文件

- `wasm/modules/gen5static/bridge/gen5static_bridge.cpp`
- `wasm/modules/gen5static/bridge/gen5static_bridge.h`
- `wasm/modules/gen5static/tests/gen5static_native_test.cpp`
- `src/features/gen5static/domain.ts`
- `src/features/gen5static/cache.ts`
- `src/features/gen5static/worker/gen5static.worker.ts`
- `src/features/gen5static/worker/Gen5StaticWorkerPool.ts`
- `src/features/gen5static/Gen5StaticPanel.tsx`
- `src/features/gen5static/preview/Gen5StaticUiPreviewEngine.ts`

## 验证

- `domain.test.ts` 覆盖版本分类、`uint32_t` 与跨字段边界、Raw/IV/IV+SHA 预算、分片和结果筛选。
- `cache.test.ts` 覆盖 IV/SHA 头、Profile 兼容、IV+SHA 选择、空命中回退、同名不同内容、不同日期子集和损坏文件。
- `Gen5StaticWorkerPool.test.ts` 固定每个 Worker 只加载一次同一缓存后再分发任务。
- `Gen5StaticUiPreviewEngine.test.ts` 固定预览结果、启用/取消筛选与取消状态。
- `gen5static_native_test.cpp` 固定 Snivy、Larvesta、Tornadus、Musharna 的首尾状态，并比较 Raw、IV Cache 与 IV+SHA Cache 三条路径。

- 已通过定向 ESLint 与 `npm test -- src/features/gen5static`：4 个文件、15 项测试。
- 已通过 `$env:POKERNGKIT_WASM_MODULES='gen4advance,gen5static'; npm run wasm:test:native`：`gen4advance_native_parity` 与 `gen5static_native_parity` 2/2。
- 已通过完整 `npm run wasm:test:native`：Visual Studio 2026 x64 环境中的 31/31 原生夹具全部通过，包含 `gen3pidtoiv_native_parity`、`gen4advance_native_parity` 与 `gen5static_native_parity`。
- 已通过 Node `24.19.0`、npm `12.0.2` 的完整 `npm run verify`：格式、ESLint、TypeScript、67 个 Vitest 文件共 255 项测试及 Web/PWA 构建通过；仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 受限终端曾在 Vite 复制现有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过。

本地固定向量、原生夹具和构建只作为工程证据。Emscripten 生产 Wasm 与算法结果仍需 GitHub Actions 部署完成后，由项目所有者提供生产页 URL 并明确授权回归。

## 来源与许可

算法、字段语义、模板和 Personal 数据改编自 PokeFinder 4.3.2 与 EncounterTableGenerator。保留 PokeFinder 与相关上游文件的 GPL-3.0-or-later 许可、作者归属、源码分发义务和商标免责声明。
