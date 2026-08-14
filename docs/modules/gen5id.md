# 第五世代 ID 乱数

## 功能范围

本模块对应 PokeFinder 4.3.2 的 `Gen 5 TID/SID`：

- `Search By`：按可选 PID、`Static/Wild` XOR、TID、SID、日期范围和最大推进数检索 TID/SID。
- `Seed Finder`：按已获得的 TID、日期、小时、分钟、秒数范围和最大推进数反查初始 Seed。
- 结果保留上游九列：`Seed`、`Initial Advances`、`Advances`、`TID`、`SID`、`TSV`、`Date/Time`、`Timer0`、`Buttons`。
- 使用第五世代 Profile 的游戏、语言、机型、MAC、VCount、Timer0、GxStat、VFrame、按键数量和 `Skip L/R`。模块不另存一份 Profile。

生产搜索仅在独立 Worker 的 C++/WebAssembly 内运行。React/TypeScript 负责表单、输入校验、任务切片、Worker 编排、结果解码和虚拟表；`dev:ui` 使用独立的确定性布局预览引擎，不提供算法证据。

## 上游工作流

`Search By` 的顺序与 `Searcher5` 一致：

```text
Timer0 -> 日期 -> 合法按键组合 -> 00:00:00..23:59:59 -> IDGenerator5
```

`Seed Finder` 固定日期、小时和分钟，只遍历给定秒数范围。两种工作流都先通过 Gen V SHA-1 计算初始 Seed，再按 `Utilities5::initialAdvancesID()` 取得 BW 或 BW2 的 ID 初始推进数，最后使用 `BWRNG::nextUInt(0xffffffff)` 生成 TID、SID 和 TSV。

PID 过滤先比较 `PSV >> 3` 与 TSV。启用 `Static/Wild` 时，仅对原本满足闪光关系的结果继续比较 PID 首尾位与 TID/SID 首尾位 XOR；该选项在 PID 未启用时不可用。

## 输入限制

下表记录 Qt 控件配置、Core 参数类型和 Web 行为。空数字文本按上游 `TextBox::getUInt()` / `getUShort()` 读取为 `0`。

| 输入              | 进制与位宽          | 范围                     | 空值与跨字段行为                                             | 上游依据                                                          |
| ----------------- | ------------------- | ------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| PID               | 十六进制，最多 8 位 | `0..0xFFFFFFFF`          | 空值为 `0`；复选框未选中时忽略；`Static/Wild` 依赖 PID       | `IDs5.cpp` 的 `InputType::Seed32Bit`、`setXOR()`；`TextBox.cpp`   |
| Search By TID/SID | 十进制，最多 5 位   | `0..65535`               | 空值为 `0`；各自复选框未选中时忽略                           | `IDs5.cpp` 的 `InputType::TIDSID`；`TextBox.cpp`                  |
| Start/End Date    | `yyyy-MM-dd`        | `2000-01-01..2099-12-31` | Start 晚于 End 时拒绝；该错误由上游显式检查                  | `DateEdit.cpp`；`IDs5.cpp::search()`                              |
| Max Advances      | 十进制，最多 10 位  | `0..4294967295`          | 空值为 `0`；默认 `100`；绝对推进数不得溢出 `uint32_t`        | `IDs5.cpp` 的 `InputType::Advance32Bit`；`IDs5.ui`；`TextBox.cpp` |
| Seed Finder TID   | 十进制，最多 5 位   | `0..65535`               | 空值为 `0`，作为精确过滤条件                                 | `IDs5.cpp` 的 `InputType::TIDSID`                                 |
| Date              | `yyyy-MM-dd`        | `2000-01-01..2099-12-31` | 必须是有效日期                                               | `DateEdit.cpp`；`IDs5.ui`                                         |
| Hour              | 十进制              | `0..23`                  | Qt `QSpinBox` 默认最小值为 `0`                               | `IDs5.ui::spinBoxHour`                                            |
| Minute            | 十进制              | `0..59`                  | Qt `QSpinBox` 默认最小值为 `0`                               | `IDs5.ui::spinBoxMinute`                                          |
| Second Range      | 十进制              | 两端各为 `0..59`         | 上游没有 Min/Max 交叉约束；Min 大于 Max 时结果为空           | `IDs5.ui`；`IDs5.cpp::find()`                                     |
| Profile Timer0    | 十六进制，16 位     | 两端各为 `0..0xFFFF`     | Profile 编辑器没有 Min/Max 交叉约束；Min 大于 Max 时结果为空 | `Profile5.hpp`；`IDs5.cpp` 的 Timer0 循环                         |

第五世代 Profile 的其他边界沿用 `docs/modules/gen5profiles.md`：MAC 最多 12 位十六进制，VCount 为 `0..0xFF`，GxStat/VFrame 为 `0..99`，按键数量为 0 到 8 的九个布尔选项。

Web 任务额外限制有筛选条件的单次搜索最多执行 `250,000,000` 次 `初始 Seed 数量 x (Max Advances + 1)` ID 状态评估，结果最多保留 `100,000` 条。完全无筛选的 Search By 每个推进状态必然产生结果，因此按 `min(理论总评估数, 结果上限)` 计算实际最坏执行量，并在达到结果上限时提前终止；默认 Profile 的全部按键数量与默认 `Max Advances = 100` 因此可以直接启动。该限制在 TypeScript 中使用 BigInt 精确计算，在 C++ 中使用无溢出的除法式边界检查，避免静态页面因误填多年日期范围或筛选推进数而长期占用设备；输入字段本身仍保留上游完整整数边界。任务按连续的 `Timer0/日期/按键` 单元切片，每片尽量控制在约两百万次状态评估，但至少保留一个完整单元，取消时会终止并按需重建 Worker。

## Worker 与 Wasm 契约

- Module id：`gen5id`
- Contract version：`1`
- Wasm API version：`1`
- Operations：`generator` 用于 `Seed Finder`，`searcher` 用于 `Search By`
- 请求：31 个 `uint32_t`
- 结果：9 个 `uint32_t`

```text
result = seedLow, seedHigh,
         year | (month << 16) | (day << 24), secondsSinceMidnight,
         timer0 | (buttonMask << 16),
         initialAdvances, advances,
         tid | (sid << 16), tsv
```

Worker 在调用前验证模块契约、operation、任务与分片索引、实际最坏执行量、领域边界、指针对齐和堆范围；调用后验证结果数量、结果指针、缓冲长度和处理计数。Pool 解码时逐行验证日期时间、Timer0、按键、绝对推进数、TID/SID/TSV 关系和请求筛选语义；C++ 在生成前拒绝 `Initial Advances + Max Advances` 超过 `uint32_t`。Pool 最多使用 4 个默认 Worker、允许调用方请求最多 8 个，按 `chunkIndex` 恢复确定顺序；取消、Worker 崩溃、协议错误或未知批次会终止并清空槽位，后续搜索按需重建，不依赖 `SharedArrayBuffer`、Wasm pthread 或 cross-origin isolation。

## 翻译与界面

简中标签逐字采用 `Form/i18n/PokeFinder_zh.ts` 的 `IDs5` 与 `IDModel5` context，包括“第五世代ID乱数”“通过..检索”“反查Seed”“秒数范围”“最大帧数”“定点/野生”“初始帧”“帧数”和“日期/时间”。`ProfileDisplay5` 的 `Profile`、`Manager`，以及 `Start/End Date`、`Buttons` 与 `Start date is after end date` 的简中条目均未完成，因此保留英文源字符串；`Manager` 跳转到共享第五世代存档管理模块。

界面采用 HakuStyle Royal Blueprint compact workspace：Profile 摘要占一条稳定工作带，`Search By` 与 `Seed Finder` 在宽屏同列展示、窄屏按源码顺序重排，控件保持 44px 触控高度。结果表使用九列横向滚动与纵向虚拟化，首条记录直接位于 44px 表头之后；进度、错误、取消和结果上限提供对应 ARIA 状态。

## 固定夹具

- `Test/Gen5/id5.json`：Seed `0` 的 Black 与 Black 2 各 10 条 ID 状态。
- `Test/Gen5/IDGenerator5Test.cpp`：上游 Generator 固定夹具入口。
- `Test/Gen5/profilesearcher5.json` 对应的 Profile Searcher Seed：Black `6812116909077463616`、Black 2 `5264333967543063602`，用于交叉验证 Gen V SHA-1 输入。
- `wasm/modules/gen5id/tests/gen5id_native_test.cpp`：覆盖 BW/BW2 Generator、SHA-1/Seed Finder、空 Timer0 范围、非法分片、有筛选总评估上限、无筛选结果提前终止和绝对推进数溢出。
- `src/features/gen5id/domain.test.ts`：覆盖按键组合、候选与实际最坏状态评估规模、上游整数边界、日期错误、结果语义、浏览器任务上限与确定性切片。
- `src/features/gen5id/worker/Gen5IdWorkerPool.test.ts`：覆盖 Worker 致命崩溃后的槽位终止与下一次搜索重建。
- `src/features/gen5id/preview/Gen5IdUiPreviewEngine.test.ts`：覆盖布局预览批次与预取消。

## 上游与许可

行为改编自 PokeFinder 4.3.2：

- `Form/Gen5/IDs5.cpp`、`IDs5.hpp`、`IDs5.ui`
- `Core/Gen5/Generators/IDGenerator5.cpp`、`IDGenerator5.hpp`
- `Core/Gen5/Searchers/IDSearcher5.cpp`、`IDSearcher5.hpp`、`Searcher5.hpp`、`SearcherBase5.hpp`
- `Core/Gen5/Keypresses.cpp`、`Keypresses.hpp`、`Profile5.hpp`
- `Core/RNG/SHA1.*`、`Core/Gen5/Nazos.*`、`Core/RNG/LCRNG64.hpp`
- `Core/Util/Utilities.cpp`、`Utilities.hpp`
- `Core/Parents/Filters/IDFilter.*`、`Core/Parents/States/IDState.hpp`
- `Model/Gen5/IDModel5.cpp`、`IDModel5.hpp`
- `Form/Controls/TextBox.cpp`、`TextBox.hpp`、`DateEdit.cpp`、`DateEdit.hpp`
- `Form/i18n/PokeFinder_zh.ts`
- `Test/Gen5/IDGenerator5Test.*`、`Test/Gen5/id5.json`

保留 PokeFinder 的 GPL-3.0-or-later 许可、上游作者归属、对应源码提供义务和商标免责声明。PokeRNGKit 不是 Nintendo、Creatures 或 GAME FREAK 的官方产品，也未获其认可。
