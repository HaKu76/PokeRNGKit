# 第五世代野生乱数

## 范围

本模块对应 PokeFinder 4.3.2 的 `Gen 5 Wild`，提供 Black、White、Black 2 与 White 2 的 `Generator` 和 `Searcher`。遭遇类型覆盖 Grass、Dark Grass、Rustling Grass、Surfing、Rippling Surfing、Fishing 与 Rippling Fishing，并按游戏、季节、地点和遭遇类型加载本地遭遇表。

前端只负责 Profile、表单、遭遇数据选择、缓存文件读取、任务分片、取消、进度、结果校验和虚拟表格。MT、BWRNG、SHA-1 初始 Seed、启动 Advances、遭遇判定、PID、IV、等级、道具、能力值、队首修正与筛选均在独立 Worker 的 C++/WebAssembly 中执行。模块不使用 pthread、`SharedArrayBuffer`、跨源隔离、后端或运行时 CDN。

## 上游文件

只读核验文件：

```text
3FB404FB132891A55464C30EF7B90151BF38B1D4ACA75377168CB816E5F3F3FD  Form/Gen5/Wild5.cpp
2289E25BF406D06AF729879F3428B1FA6A1FBE89CA2FA41BEBA4E0A11AC1B0F7  Form/Gen5/Wild5.ui
9426E5A6F10FBA8263D907694F5AB2C7241C93651717F7D99F52496C3CF8A7CE  Core/Gen5/Generators/WildGenerator5.cpp
DFD586F847CDB6448BAAABB251B71A23F0724644FFA16FC22DD02972F1190C33  Core/Gen5/Generators/WildGenerator5.hpp
31CBE868D925305C533BF4B62B31BB3F9BCE843CFB6A4E95141A32C7B783014B  Core/Gen5/EncounterArea5.hpp
C233B3AF820C2824217DB0B6645E1BD6298E37CD21D1FDB3FF4180949683A5AA  Core/Gen5/Encounters5.cpp
90D8B27689B1F18C7D26FA7813BFC01C7FA6D4142FD0E902109ADFB6D3D5CE0F  Core/Gen5/Encounters5.hpp
81FFE6C68F980CC7EFC4DA06CDC275586679FBBF756A44564A16FF15B1B3E6AA  Core/Gen5/States/WildState5.hpp
50DE23795DA10C41FFB60530161CF8E03A82526DD966409110183C3BBF28DFFE  Core/Gen5/Searchers/IVSearcher5.hpp
273CA2F3C335413F88DAA23048AD40948E7751A0310838DC1BF5B4386CE9F66E  Core/Gen5/IVCache.cpp
460294C495603AD35D5BB5D65F149D9D58FF96695A1A2B32BF795361A27DA699  Core/Gen5/SHA1Cache.cpp
E8E421ED968929CB030CEB7D8D711AAEB4990A71C0F1A57841B9957C67FCD872  Test/Gen5/WildGenerator5Test.cpp
1AC4D8B47192253FD212661B1587617E36E56F5FD4D9FC1B4D5025B1FBEBC9E8  Test/Gen5/wild5.json
51B4F88667748825CE5091600BD2C5EE7F0152912BFC25856004319E41863FCA  Form/Controls/TextBox.cpp
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
D67358790583FEBF22227ABF10B002EBAEC02E797EA08E125093CEA8C36F665F  Form/i18n/PokeFinder_ja.ts
EF986F89970E5BDF568B6DADB269AC326E588FEED39A1C3361CE79569513DFBB  Core/Resources/Personal/Gen5/personal_bw.bin
956D7AAE664CF75AF663A2F3593A2B14559A68374168557BC844A9D95E8E0E44  Core/Resources/Personal/Gen5/personal_b2w2.bin
```

遭遇表字段对照 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的第五世代资源生成。物种、形态、等级范围、遭遇率与 seasonal 标记打包为本地静态数据；Personal 种族值、性别、特性与携带道具字段对照 PokeFinder 4.3.2 的 BW/BW2 binary，不在运行时联网读取。

## 输入限制

| 控件                           | 进制 |       最小值 |             最大值 | 最多字符 |   空值 |           默认值 | 上游来源                                             |
| ------------------------------ | ---: | -----------: | -----------------: | -------: | -----: | ---------------: | ---------------------------------------------------- |
| Generator `Seed`               |   16 |          `0` | `FFFFFFFFFFFFFFFF` |       16 |    `0` |              `0` | `Wild5.cpp` 的 `InputType::Seed64Bit`；`TextBox.cpp` |
| Generator `IV Advances`        |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | `Wild5.cpp` 的 `InputType::Advance32Bit`；`Wild5.ui` |
| Generator `Initial Advances`   |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | 同上                                                 |
| Generator `Max Advances`       |   10 |          `0` |       `4294967295` |       10 |    `0` |           `1000` | 同上                                                 |
| Generator `Offset`             |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | 同上                                                 |
| Searcher `Initial IV Advances` |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | `Wild5.cpp` 的 `InputType::Advance32Bit`；`Wild5.ui` |
| Searcher `Max IV Advances`     |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | 同上                                                 |
| Searcher `Initial Advances`    |   10 |          `0` |       `4294967295` |       10 |    `0` |              `0` | 同上                                                 |
| Searcher `Max Advances`        |   10 |          `0` |       `4294967295` |       10 |    `0` |            `100` | 同上                                                 |
| `Start Date` / `End Date`      | 日期 | `2000-01-01` |       `2099-12-31` |        - | 不允许 | 当前或已保存日期 | `Wild5.cpp`、`DateEdit`                              |
| `Levels`                       |   10 |          `1` |              `100` |        - | 不允许 |          `1/100` | `Wild5.ui` 的等级 SpinBox；`StateFilter`             |
| IV 最小/最大                   |   10 |          `0` |               `31` |        2 | 不允许 |           `0/31` | `Filter`、`StateFilter`                              |

Profile 的 TID、SID、MAC、VCount、Timer0、GxStat、VFrame、游戏、语言、DS 类型、Keypresses、Memory Link、Shiny Charm 与 N's Pokémon released 复用 `gen5profiles` 的输入和持久化边界。Generator 允许九项 Keypresses 数量全部关闭，因为它直接使用输入 Seed；Searcher 必须至少产生一个合法按键组合。

Searcher 的起始日期不得晚于结束日期，`Offset` 固定为 `0`，并且不能关闭筛选器。Generator 的 `Initial Advances + Offset + Max Advances`、Searcher 的 `Initial Advances + Max Advances` 与两种模式的 `Initial IV Advances + Max IV Advances` 均不得超过 `4294967295`。Generator 使用单个 `IV Advances`，因此 `Max IV Advances` 固定为 `0`。

Ability 只接受 `Any/0/1`，Gender 只接受 `Any/♂/♀`，Shiny 使用上游 `Any/Star/Square/Star-Square` 值 `255/1/2/3`。Nature、Hidden Power 与当前遭遇槽位至少各选择一项；等级筛选必须位于 `1..100` 且最小值不得大于最大值。单次任务最多返回 100,000 条结果。

## 遭遇与设置

- 七类遭遇按上游显示为 Grass、Dark Grass、Rustling Grass、Surfing、Rippling Surfing、Fishing 与 Rippling Fishing；前三类各有 12 个槽位，水上与钓鱼类各有 5 个槽位。
- Spring、Summer、Autumn、Winter 选择仅改变带 seasonal 数据的地点；地点列表、宝可梦候选、槽位和等级范围始终来自当前版本、季节与遭遇类型的静态表。
- `Lead` 支持 None、25 种 Synchronize Nature、Cute Charm Male/Female、Magnet Pull、Static、Pressure、Hustle、Vital Spirit、Suction Cups、Sticky Hold 与 Compound Eyes。
- Suction Cups 只在普通 Fishing 显示，不用于 Rippling Fishing；Lucky Power 只在 Black 2 / White 2 显示。
- Generator 可取消筛选；Searcher 始终应用 IV、Nature、Hidden Power、Ability、Gender、Shiny、Slot 与 Level 条件。

简体中文控件逐字复用上游已完成的“第五世代野生乱数”“生成器”“检索器”“乱数信息”“队首”“初始帧”“最大帧数”“遭遇类型”“草丛”“深色草丛”“摇动草丛”“冲浪”“水纹冲浪”“钓鱼”“水纹钓鱼”“地点”“宝可梦”“季节”“春天”“夏天”“秋天”“冬天”“筛选项”“复眼”“迷人身躯”“遭遇率修正”“黏着”“吸盘”“遭遇等级机率修正”“活力”“压迫感”“干劲”“遭遇种类修正”“磁力”“静电”与“同步”。`Slot`、`Levels`、`Needle`、`IV Advances`、`Buttons`、`Lucky Power`、`Advance Finder`、`Adjacent Seeds` 和快速检索提示在上游简中翻译中未完成，因此保留精确英文源字符串。

## 算法

Generator 的 MT 使用 Seed 高 32 位；BW 从输入 `IV Advances` 读取，BW2 在 MT 读取时额外推进 2。PID BWRNG 从 `Utilities5::initialAdvances(seed, profile) + Initial Advances` 开始，并在每帧应用 `Offset`。结果 `Advances` 显示包含启动推进的绝对值。

每帧按 PokeFinder `WildGenerator5` 顺序执行：

1. 根据队首读取 Cute Charm、Magnet Pull / Static、Pressure / Hustle / Vital Spirit 或 Synchronize 的触发判定；Compound Eyes 与 Suction Cups / Sticky Hold 使用各自分支。
2. Dark Grass 执行双打判定，命中时在选择槽位与生成 PID 之间增加两次 BWRNG 消耗。
3. Memory Link 与 N's Pokémon released 组合在非 Fishing 路径增加对应 RNG 偏移；普通 Fishing 先执行遭遇率判定，Suction Cups 将有效遭遇率加倍。
4. Magnet Pull / Static 可把槽位限制到相应属性物种；否则按遭遇类型和 BW2 Lucky Power 选择槽位。Pressure / Hustle / Vital Spirit 可把等级提高 5，并受当前槽位组最高等级限制。
5. Cute Charm 可强制合法性别。BW2 的 Shiny Charm 增加两次 PID roll，Lucky Power `3/S` 再增加一次；命中异色后停止继续 roll。
6. 读取 Nature、携带道具、Chatot 与 Needle，并用当次结果的物种、等级、IV 和 Nature 计算六项能力值与 Characteristic。

Searcher 以 Profile 的 Timer0、日期、有效 Keypresses 与每天 86,400 秒计算 SHA-1 初始 Seed，再对每个候选执行 IV 与 PID 范围。PokeFinder 没有独立 `WildSearcher5`；本模块复用通用 `IVSearcher5` 的 Seed/IV 搜索语义，再调用 `WildGenerator5` 路径恢复野生状态。最多四个独立 Worker 消费互不重叠分片，批次按 `chunkIndex` 恢复确定顺序；取消、协议错误、Wasm 错误或异常缓冲区会终止并重建 Worker。

## 快速检索缓存

浏览器允许用户上传 PokeFinder `.ivcache` 与 `.sha1cache`。文件只保存在当前页面内存中，不写入 Profile 文件路径，也不上传。

`.ivcache` 使用小端 magic `0xD08CB7C0`、`initialAdvances`、`maxAdvances`、三组桶计数和 Seed 列表。Wild 使用 Normal 桶；BW2 在实际 MT 读取时应用额外 2 次推进。快速 IV 搜索只在请求 IV 下限符合 PokeFinder 高个体 spread 条件、且请求范围位于缓存范围内时启用。

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

`expectedMtSeedMatches = ceil(rawSeeds × ivEntryCount / 2^32)`，用于浏览器任务预算和拒绝明显过大的请求，不是算法命中数量承诺。真实结果仍由 C++/Wasm 对每个 Seed、IV、遭遇状态与筛选条件计算。

## Worker ABI

API v1 使用 84 个 `uint32_t` 请求字段，包含操作、Profile、Memory Link、Shiny Charm、N's Pokémon released、PID/IV 推进范围、队首、Lucky Power、遭遇率、12 组物种/形态与等级槽位、筛选、结果上限、Generator Seed 或 Searcher 日期，以及分片起点与数量。

结果固定为 16 个 `uint32_t`：

```text
seedLow, seedHigh, date, seconds, timer0Buttons,
advances, ivAdvances, pid, metadata, ivs0, ivs1,
speciesForm, itemAbilityIndex, stats0, stats1, stats2
```

`metadata` 打包 Chatot、Needle、Ability、Gender、Level、Nature、Shiny 与 Slot；`ivs1` 同时打包 Hidden Power 类型与威力，`speciesForm` 同时打包 Characteristic。缓存 ABI 为 `gen5wild_configure_cache(ivPtr, ivEntryCount, shaPtr, shaEntryCount)` 与 `gen5wild_clear_cache()`：IV 每项为 `[ivAdvance, seedHigh]` 两个 word，SHA 每项为 `[keyLow, keyHigh, seedLow, seedHigh]` 四个 word。

## 表格

Generator 保留 20 列：`Advances, Chatot, Needle, Item, Slot, Level, PID, Shiny, Nature, Ability, HP, Atk, Def, SpA, SpD, Spe, Hidden, Power, Gender, Characteristic`。

Searcher 保留 23 列：`Seed, Advances, IV Advances, Item, Slot, Level, PID, Shiny, Nature, Ability, HP, Atk, Def, SpA, SpD, Spe, Hidden, Power, Gender, Characteristic, Date/Time, Timer0, Buttons`。

两种模式均可在 IV 与实际能力值之间切换，能力值固定使用生成该行时的物种、等级、IV 和 Nature，不受后续表单选择变化影响。结果表使用固定列宽、横向滚动、表头排序和纵向虚拟化；行可由鼠标或键盘选中。Generator 可从当前结果打开共享 `Advance Finder`，使用 Chatot/Needles 连续观测筛选并通过 `Jump to Advance` 返回原行；Searcher 可把已选结果的日期时间与 Buttons 带入 `Adjacent Seeds`。

## 实现文件

- `wasm/modules/gen5wild/bridge/gen5wild_bridge.cpp`
- `wasm/modules/gen5wild/bridge/gen5wild_bridge.h`
- `wasm/modules/gen5wild/tests/gen5wild_native_test.cpp`
- `src/features/gen5wild/domain.ts`
- `src/features/gen5wild/encounters.ts`
- `src/features/gen5wild/encounterData.ts`
- `src/features/gen5wild/cache.ts`
- `src/features/gen5wild/worker/gen5wild.worker.ts`
- `src/features/gen5wild/worker/Gen5WildWorkerPool.ts`
- `src/features/gen5wild/Gen5WildPanel.tsx`
- `src/features/gen5wild/preview/Gen5WildUiPreviewEngine.ts`

## 验证

- `domain.test.ts` 用于覆盖版本、遭遇区域、队首、`uint32_t` 与跨字段边界、Raw/IV/IV+SHA 预算、分片和结果筛选。
- `cache.test.ts` 用于覆盖 IV/SHA 头、Profile 兼容、IV+SHA 选择、空命中回退、内容指纹、日期子集和损坏文件。
- `Gen5WildWorkerPool.test.ts` 用于覆盖缓存加载、结果上限、取消与 Worker 协议边界。
- `Gen5WildUiPreviewEngine.test.ts` 用于固定预览结果、结果上限与取消状态。
- `gen5wild_native_test.cpp` 固定 Black / Black 2 Grass、Fishing、Cute Charm、Magnet Pull、Suction Cups、Lucky Power、能力值和 raw/IV Cache/IV+SHA Cache parity，并拒绝推进溢出与非法缓存。

已通过 `npm test -- src/features/gen5wild` 的 6 个测试文件、18 项测试，定向 ESLint、全仓 TypeScript 与 `gen5wild_native_parity` 1/1。完整 `npm run wasm:test:native` 通过 34/34 原生夹具。

使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`，全仓 Prettier、ESLint、TypeScript、78 个 Vitest 文件共 299 项测试、Vite 生产构建与 60 项 PWA 预缓存通过；仅保留两条既有 TanStack Virtual 警告和主包体积警告。受限终端的同一验证仅在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`。

生产 Wasm 与算法结果仍需 GitHub Actions 部署完成后，由项目所有者提供生产页 URL 并明确授权回归。

## 来源与许可

算法、字段语义、遭遇数据和 Personal 数据改编自 PokeFinder 4.3.2 与 EncounterTableGenerator。保留 PokeFinder 与相关上游文件的 GPL-3.0-or-later 许可、作者归属、源码分发义务和商标免责声明。
