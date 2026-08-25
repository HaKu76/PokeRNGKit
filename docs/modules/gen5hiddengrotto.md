# 第五世代隐藏洞穴乱数

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

## 范围

本模块对应 PokeFinder 4.3.2 的 `Hidden Grotto`，仅接受 Black 2 / White 2 Profile，提供四条独立工作流：

- `Grotto Slot Generator`
- `Grotto Slot Searcher`
- `Pokemon Generator`
- `Pokemon Searcher`

Slot 工作流恢复洞穴刷新是否成功、Group、Slot、宝可梦性别或道具；Pokemon 工作流对指定 Group 与 Slot 生成实际宝可梦的 PID、IV、等级、性格、特性、性别、觉醒力量和能力值。前端只负责 Profile、表单、缓存读取、任务分片、取消、进度、结果校验和表格；BWRNG、MT、SHA-1 初始 Seed、启动 Advances、洞穴刷新、PID、IV、派生值与筛选均在独立 Worker 的 C++/WebAssembly 中执行。

模块保持全静态、local-first，不使用后端、运行时 CDN、`SharedArrayBuffer`、Wasm pthread 或跨源隔离。

## 上游文件

只读核验文件：

```text
802747CBA9074B7EA541C4E57A6E9D981402F6149B1EBE2EA435C0D4320997B3  Form/Gen5/HiddenGrotto.cpp
87F5AAF4C7311955802C3FDFD4A7DC175E810B53D14C0D0D89EA6DBD50B00AC3  Form/Gen5/HiddenGrotto.ui
FD5BF503838AC41EBBBCC4C3E6ABAEA0FEEE22847B98F0B1C9848567A3A89C12  Core/Gen5/Generators/HiddenGrottoGenerator.cpp
6605E483216DEF63891BCDCE55C28BD3302A6AB622E77B2D8AB36AF4E2A3FC04  Core/Gen5/Generators/HiddenGrottoGenerator.hpp
39352B83F44FD89447F4B6C712DE176DC4CAD9786DCC4C2B718E2EE851EE81A7  Core/Gen5/HiddenGrottoArea.cpp
9461BBE7A5ABE74DF4F452C772A2A5FF1A1A00CF69DE937291ABF523E76D7471  Core/Gen5/HiddenGrottoArea.hpp
74D4491545925AEAD605B67F17FB93753F076DAB7BBAC475F8EC53D66149575D  Core/Gen5/States/HiddenGrottoState.hpp
EE5775654D2A230CC2FB236E8592E15804D2BDB533A463754EDCC6681D5A92FF  Core/Gen5/Filters/HiddenGrottoFilter.cpp
82A1B618E41382477AB478F7220ACE7B396C884015E615AA70A032254F3EF3C6  Core/Gen5/Filters/HiddenGrottoFilter.hpp
2B8986AEF129DBD77D1D1E1E932133E93CFCF8B2F8FEC6E042B7CD31A9F26117  Model/Gen5/HiddenGrottoModel.cpp
349DAA9428142825E5A50BA44859483B58673AB11D5001460F95C33009AE8DBF  Model/Gen5/HiddenGrottoModel.hpp
A046674A29E5C379B8934A4D928A83F4634D5F3E55BF6EF1C09C1317E2DBDC00  Test/Gen5/HiddenGrottoGeneratorTest.cpp
18F550912D5C4BF0B9DB32C8096E66BCC1AB16CFB079A8AA2A6D58BCCEBA6161  Test/Gen5/hiddengrotto.json
51B4F88667748825CE5091600BD2C5EE7F0152912BFC25856004319E41863FCA  Form/Controls/TextBox.cpp
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
D67358790583FEBF22227ABF10B002EBAEC02E797EA08E125093CEA8C36F665F  Form/i18n/PokeFinder_ja.ts
```

隐藏洞穴遭遇数据来自 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 BW2 `grotto` NARC。原始文件为 4,612 bytes，SHA-256 为 `F4D5EEF5647F4E423D27B77D781620860D5BD0C113596C1B5F63C0022EF7A652`；按同目录 `bw2.py` 的 `hidden_grotto()` 生成的 20 地点静态表为 2,760 bytes，SHA-256 为 `01DF220214F1C6BFDA06E3F1776DEB04ABE44AEE51225584B016C354CA978AF2`。当前静态表包含以下 location ID：

```text
45, 106, 126, 107, 135, 111, 121, 136, 118, 34,
130, 131, 123, 137, 9, 8, 101, 138, 100, 127
```

每个地点固定包含 4 个 Group。每组包含 3 个宝可梦 Slot、4 个道具 Slot 和 4 个隐藏道具 Slot；运行时不联网读取遭遇数据。

## 输入限制

| 控件                                   | 进制 |             最小值 |             最大值 | 最多字符 |   空值 |           默认值 | 上游来源                                     |
| -------------------------------------- | ---: | -----------------: | -----------------: | -------: | -----: | ---------------: | -------------------------------------------- |
| Generator `Seed`                       |   16 |                `0` | `FFFFFFFFFFFFFFFF` |       16 |    `0` |              `0` | `HiddenGrotto.cpp` 的 `InputType::Seed64Bit` |
| Generator `Initial Advances`           |   10 |                `0` |       `4294967295` |       10 |    `0` |              `0` | `InputType::Advance32Bit`                    |
| Generator `Max Advances`               |   10 |                `0` |       `4294967295` |       10 |    `0` |           `1000` | `HiddenGrotto.ui`                            |
| Generator `Offset`                     |   10 |                `0` |       `4294967295` |       10 |    `0` |              `0` | `InputType::Advance32Bit`                    |
| Pokemon Generator `IV Advances`        |   10 |                `0` |       `4294967295` |       10 |    `0` |              `0` | `HiddenGrotto.cpp`                           |
| Searcher `Initial Advances`            |   10 |                `0` |       `4294967295` |       10 |    `0` |              `0` | `InputType::Advance32Bit`                    |
| Searcher `Max Advances`                |   10 |                `0` |       `4294967295` |       10 |    `0` |            `100` | `HiddenGrotto.ui`                            |
| Pokemon Searcher `Initial IV Advances` |   10 |                `0` |       `4294967295` |       10 |    `0` |              `0` | `HiddenGrotto.cpp`                           |
| Pokemon Searcher `Max IV Advances`     |   10 |                `0` |       `4294967295` |       10 |    `0` |              `0` | `HiddenGrotto.ui`                            |
| `Start Date` / `End Date`              | 日期 |       `2000-01-01` |       `2099-12-31` |        - | 不允许 | 当前或已保存日期 | `HiddenGrotto.cpp`、`DateEdit`               |
| Pokemon `Levels`                       |   10 | 当前 Slot 最低等级 | 当前 Slot 最高等级 |        - | 不允许 |    Slot 等级范围 | `HiddenGrotto.cpp`、`StateFilter`            |
| IV 最小/最大                           |   10 |                `0` |               `31` |        2 | 不允许 |           `0/31` | `Filter`、`StateFilter`                      |

Profile 的 TID、SID、MAC、VCount、Timer0、GxStat、VFrame、语言、DS 类型、Keypresses、Memory Link 与 Shiny Charm 复用 `gen5profiles` 的输入和持久化边界。非 Black 2 / White 2 Profile 在 UI、domain 与 C++ API 三层拒绝。

跨字段约束：

- Advances、Offset 与 IV Advances 分别使用独立 `uint32_t` 输入。上游没有额外的求和拒绝；计算与结果推进保持 PokeFinder 的 32 位无符号环绕语义。
- Pokemon Generator 只使用一个 `IV Advances`，因此 `Max IV Advances` 固定为 `0`。
- Searcher 的 `Offset` 固定为 `0`，日期起点不得晚于终点，并且至少存在一个合法 Keypresses 组合。
- Slot 工作流不得携带 IV、Pokemon Filter 或缓存设置；Pokemon Searcher 不允许禁用筛选器。
- Group 为 `0..3`，Pokemon Slot 为 `0..2`。固定雄性、固定雌性和无性别物种只接受上游 Personal 数据允许的性别。
- Slot、Group、Gender、Nature 与 Hidden Power 的空 mask 均按上游 `CheckList` 的默认 `full=true` 解释为 `Any`；部分选择才形成实际筛选。
- 单次任务最多返回 100,000 条结果，估算状态评估不得超过 250,000,000 次。

简体中文逐字复用上游已完成词条“隐藏洞穴”“释出之力等级”“生成器”“检索器”“地点”“宝可梦”“道具”“性别”“初始帧”“最大帧数”“筛选项”“同步”。上游简中未完成的 `Group`、`Slot`、`Needle`、`Buttons`、`IV Advances`、`Advance Finder` 与 `Adjacent Seeds` 保留精确英文源字符串。

## Slot 工作流

Slot Generator 从 `Utilities5::initialAdvancesBW2` 对应的启动位置开始，每帧先进行洞穴刷新判定。默认阈值为 `5%`；启用 Grotto Power 后额外进行两次刷新 roll，并分别增加 `10/20/30/50` 的阈值。

刷新成功后依次生成 Group 与 Slot：

- `0..2`：宝可梦，并额外生成性别。
- `3..6`：普通道具。
- `7..10`：隐藏道具。

结果按地点静态表恢复宝可梦或道具数据，并应用 11 位 Slot、4 位 Group 与 2 位性别筛选。Slot Searcher 以 Profile 的 Timer0、日期、合法 Keypresses 与每天 86,400 秒计算 SHA-1 初始 Seed，再对每个候选运行同一 Slot Generator；它不使用 IV Cache 或 SHA1 Cache。

## Pokemon 工作流

Pokemon Generator 使用 Seed 高 32 位初始化 Gen V MT，并按 BW2 规则在实际 IV 读取前额外推进 2。PID BWRNG 从启动 Advances 加 `Initial Advances` 开始，每帧应用 `Offset`。

每个结果按上游顺序生成：

1. 选择当前 Group 与 Pokemon Slot，并在该 Slot 的等级范围内生成 Level。
2. 生成 PID；结果永不异色，但 Shiny Charm 仍把 PID roll 从 1 次增加到 3 次。
3. `None` 保留随机 Nature；`Synchronize` 固定为所选 Nature。上游未向 Hidden Grotto 暴露 Cute Charm。
4. 默认使用隐藏特性槽 `2`；物种没有隐藏特性时回退到 PID 的 ability bit。
5. 按 PID、Personal 性别阈值与所选固定性别生成最终 Gender，并计算 Characteristic、Hidden Power、威力和六项能力值。

Pokemon Searcher 支持 raw、IV Cache 与 IV+SHA Cache 三条路径。`.ivcache` 与 `.sha1cache` 复用 `gen5wild` 的解析和 Profile 兼容规则；缓存文件只保存在当前页面内存，不写入 Profile 路径，也不上传。快速检索仅在 IV 范围满足 PokeFinder 常用高个体 spread 条件且请求推进范围包含于 IV Cache 时启用；SHA Cache 无有效命中时回退 IV-only。

## 浏览器预算

设 `rawSeeds = 日期数 x Timer0 数 x 合法按键数 x 86400`，`ivCount = Max IV Advances + 1`，`pidCount = Max Advances + 1`：

- Slot Searcher：`rawSeeds x pidCount`。
- Pokemon Raw：`rawSeeds x ivCount x (pidCount + 1)`。
- Pokemon IV Cache：`rawSeeds + expectedMtSeedMatches x pidCount`。
- Pokemon IV+SHA Cache：`shaEntryCount x pidCount`。

`expectedMtSeedMatches = ceil(rawSeeds x ivEntryCount / 2^32)`，只用于拒绝明显超过浏览器预算的请求，不代表真实命中数量。最多四个独立 Worker 消费互不重叠分片，批次按 `chunkIndex` 恢复确定顺序；取消、协议错误、异常缓冲区或 Wasm 致命错误会终止并重建 Worker。

## Worker ABI

模块 API v1 在 manifest 与 Worker 握手中分别声明：

```text
slot-generator
slot-searcher
pokemon-generator
pokemon-searcher
```

请求固定为 114 个 `uint32_t`，包含操作、Profile、PID/IV 推进范围、Lead、Grotto Power、Group、Slot、Gender、两类筛选、结果上限、Generator Seed 或 Searcher 日期、分片信息，以及 12 组宝可梦、16 个道具和 16 个隐藏道具数据。

结果固定为 16 个 `uint32_t`：

```text
seedLow, seedHigh, date, seconds, timer0Buttons,
advances, ivAdvances, pidOrData, metadata, ivs0, ivs1,
speciesForm, abilityIndex, stats0, stats1, stats2
```

Slot 结果在 `pidOrData` 保存宝可梦或道具 ID，在 `metadata` 保存 Chatot、Needle、Gender、Group、Slot 与 item 标记。Pokemon 结果复用同一布局保存 PID、IV、Level、Nature、Ability、Gender、Hidden Power、Characteristic 与能力值。缓存 ABI 为 `gen5hiddengrotto_configure_cache(ivPtr, ivEntryCount, shaPtr, shaEntryCount)` 与 `gen5hiddengrotto_clear_cache()`；IV 每项为两个 word，SHA 每项为四个 word。

## 表格与工具

Slot Generator 保留 5 列：`Advances, Chatot, Needle, Group, Slot`。Slot Searcher 保留 7 列：`Seed, Advances, Group, Slot, Date/Time, Timer0, Buttons`。

Pokemon Generator 保留 18 列：`Advances, Chatot, Needle, Level, PID, Shiny, Nature, Ability, HP, Atk, Def, SpA, SpD, Spe, Hidden, Power, Gender, Characteristic`。Pokemon Searcher 在前方增加 `Seed` 与 `IV Advances`，并在末尾增加 `Date/Time, Timer0, Buttons`，共 21 列。

两种 Generator 均可从已选结果打开共享 `Advance Finder`；Pokemon Searcher 可把已选结果的日期时间与 Buttons 带入 `Adjacent Seeds`。Pokemon 表支持 IV/能力值切换。所有结果表使用固定列宽、横向滚动、表头排序、虚拟滚动和鼠标/键盘行选择。

## 固定夹具

上游 `hiddengrotto.json` 记录四组固定夹具：

- Slot / None / Seed `0` / location `45`：5 条；首条 Advances `49`、Chatot `2`、data `183`、gender `0`、group `1`、slot `2`。
- Slot / Level S / Seed `0`：60 条；首条 Advances `46`、Chatot `40`、data `507`、group `2`、slot `1`。
- Pokemon / Dunsparce / Male / Seed `0`：10 条；首条 PID `64B21E81`，IV `22/27/19/27/17/27`，Advances `46`，Level `12`。
- Pokemon / Synchronize / Dunsparce / Female：10 条；首条 PID `64B21E03`。

## 实现文件

- `wasm/modules/gen5hiddengrotto/bridge/gen5hiddengrotto_bridge.cpp`
- `wasm/modules/gen5hiddengrotto/bridge/gen5hiddengrotto_bridge.h`
- `wasm/modules/gen5hiddengrotto/tests/gen5hiddengrotto_native_test.cpp`
- `src/features/gen5hiddengrotto/domain.ts`
- `src/features/gen5hiddengrotto/encounters.ts`
- `src/features/gen5hiddengrotto/cache.ts`
- `src/features/gen5hiddengrotto/worker/gen5hiddengrotto.worker.ts`
- `src/features/gen5hiddengrotto/worker/Gen5HiddenGrottoWorkerPool.ts`
- `src/features/gen5hiddengrotto/Gen5HiddenGrottoPanel.tsx`
- `src/features/gen5hiddengrotto/preview/Gen5HiddenGrottoUiPreviewEngine.ts`

## 验证

- 已通过：`npm test -- src/features/gen5hiddengrotto` 共 5 个测试文件、29 项测试，覆盖 Profile、日期、`uint32_t` 环绕、跨字段边界、固定性别、四工作流预算与分片、20 个遭遇地点、IV/SHA Cache 兼容与回退、UI Preview、Worker 握手、缓存加载、结果解码、上限和取消。
- 已通过：定向 `gen5hiddengrotto_native_parity` 1/1，固定 Slot None、Grotto Power Level S、Pokemon Male、Synchronize Female、raw/IV/IV+SHA parity 和错误边界。
- 已通过：完整 `npm run wasm:test:native` 共 35/35 原生夹具。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；Prettier、ESLint、TypeScript、83 个 Vitest 文件共 328 项测试、Vite 生产构建和 61 项 PWA 预缓存通过。ESLint 保留 Egg、Wild 与 Hidden Grotto 的 3 条 TanStack Virtual / React Compiler 非阻断警告，构建保留主包体积警告。
- 环境记录：受限终端的首次完整校验在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过，确认不是源码或构建配置失败。
- 待验证：生产 Wasm 与算法结果需 GitHub Actions 部署完成后，由项目所有者提供生产 URL 并明确授权回归。

## 来源与许可

算法、字段语义、遭遇数据和 Personal 数据改编自 PokeFinder 4.3.2 与 EncounterTableGenerator。保留 PokeFinder 与相关上游文件的 GPL-3.0-or-later 许可、作者归属、源码分发义务和商标免责声明。
