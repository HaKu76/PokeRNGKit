# 第三世代 Wild Generator / Searcher

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- Searcher 先将六项 IV 的闭区间与完美个体条件求交，再按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 编号；例如六项 `0..31`、`31/5` 只产生 `187` 个候选，不会按 `32^6` 计数。六项范围和完美条件仍是 AND 关系，不是互斥模式。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

> - 模块标识：`gen3wild`
> - 当前状态：Generator/Searcher 已接入 API v5、C++/Wasm 和独立 Worker Pool；Tanoby Chamber 与完美个体交集索引已通过本机原生夹具，部署页面回归待完成
> - 上游基线：PokeFinder 4.3.2
> - API 版本：`5`
> - 当前范围：第三世代掌机 Wild，包括 FireRed / LeafGreen 的 7 个 Tanoby Chamber

## 能力与边界

- 按全局存档的 Ruby、Sapphire、Emerald、FireRed 或 LeafGreen 版本切换遭遇数据，并使用存档 TID/SID 判断闪光。
- 支持 Grass、Rock Smash、Surfing、Old Rod、Good Rod、Super Rod 和上游 `Wild 1`、`Wild 2`、`Wild 4`。
- 支持 Emerald Synchronize、Cute Charm、Pressure、Hustle、Vital Spirit、Magnet Pull 和 Static 队首规则。
- 支持 RSE Rock Smash 的 Bike、Black Flute、Cleanse Tag、White Flute，Route 119 Feebas Tile 和 RSE Safari Zone 额外推进。
- 支持 FireRed / LeafGreen 的 Monean、Liptoo、Weepth、Dilford、Scufib、Rixy、Viapois Chamber，并按槽位显示未知图腾 `A..Z`、`!`、`?` 形态。
- Generator 按 Seed 与推进范围生成状态；Searcher 按六项 IV 范围逆推候选 Seed。
- Location、Pokemon、Encounter Slot 和等级范围按当前存档版本联动。
- 筛选支持 PokeFinder 的 Nature、Hidden Power、Encounter Slot 多选，Level、六项 IV 闭区间，Shiny、Gender 和 Ability。
- Generator 提供“取消筛选”；Searcher 始终使用有效 IV 范围。
- 筛选器桌面布局复用上游 `Form/Controls/Filter.ui`：左侧为六项 IV 与工具，右侧按 Ability、Encounter Slot、Gender、Hidden Power、Level、Nature、Shiny 的上游顺序排列紧凑行；Static 复用其中相同的布局和多选控件，只移除不适用的 Encounter Slot、Level。窄屏统一降为单列。
- UI：第三世代 Wild 使用独立 `Gen3WildPanel.css` 和 `gen3wild-page` 页面作用域；桌面将 Generator/Searcher 放入标题栏并让乱数信息、设置、筛选三块同排，前两块按内容收窄，筛选和结果区共享右边界。输入、下拉、多选、操作按钮和菜单选项统一为 `30px`，长文本截断且菜单宽度跟随触发框；窄屏按单列重排。
- UI：完美个体值、完美个体数采用左右结构并置于分类筛选下方；显示能力值、取消筛选和个体值计算器共用底部操作行。结果提示位于标题右侧，结果表首行直接贴合表头，最后一列表头不保留右边界线。
- 结果表对齐 `WildGeneratorModel3` / `WildSearcherModel3` 的 16 列；Searcher 第一列为 Seed，Generator 第一列为 Advances。
- 支持 IV/能力值显示切换、个体值计算器入口、数值排序、虚拟化显示、CSV、进度和取消。
- 本地 `ui` 模式提供确定性样例，只用于表单和交互验收，不代表 Wasm RNG 结果。

## 2. 输入限制与上游依据

| 输入                                   | 进制与范围                                            | 空值或补充行为                                          | 依据                                                |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| Generator Seed                         | 十六进制 `00000000..FFFFFFFF`，最多 8 位              | `TextBox::getUInt()` 按 `0` 处理                        | `Form/Gen3/Wild3.cpp`、`Form/Controls/TextBox.cpp`  |
| Initial Advances                       | 十进制 `0..4294967295`，最多 10 位                    | Generator 默认 `0`；Searcher 不提供                     | `InputType::Advance32Bit`                           |
| Max Advances                           | 十进制 `0..4294967295`，最多 10 位                    | Generator 默认 `100000`；Web 任务最多 50,000,000 个状态 | `InputType::Advance32Bit` 与 Worker 任务上限        |
| Offset                                 | 十进制 `0..4294967295`，最多 10 位                    | Generator 默认 `0`；Searcher 不提供                     | `InputType::Advance32Bit`                           |
| TID / SID                              | 十进制 `0..65535`                                     | 来自当前全局存档                                        | `Profile3` 的 `u16` 字段                            |
| Level                                  | 十进制 `1..100`，最小值不得大于最大值                 | 默认 `1..100`；选择 Pokemon 时同步物种范围              | `Form/Controls/Filter.ui`、`Filter::isValid`        |
| 每项 IV                                | 十进制 `0..31`，最小值不得大于最大值                  | Generator 默认 `0..31`；Searcher 默认 `31..31`          | `Filter.ui`、`Filter::isValid`                      |
| Nature / Hidden Power / Encounter Slot | 分别为 25 / 16 / 当前遭遇表槽位多选                   | 全不选和全选都按 `Any`                                  | `Form/Controls/Filter.cpp`、`CheckList::getChecked` |
| Shiny / Gender / Ability               | `Any/Star/Square/Star-Square`、`Any/0/1/2`、`Any/0/1` | 默认 `Any`                                              | `Filter::setup`、`StateFilter`                      |
| Tanoby Chamber form                    | 整数 `0..27`，12 个槽位分别固定                       | 不接受普通 `form 0` 补齐或任意形态                      | `Gen3/pack.py`、`Encounters3.cpp`                   |

`Initial Advances + Offset + Max Advances` 不得超过 `0xFFFFFFFF`。Generator 的 `Max Advances` 包含起点，状态总数为 `Max Advances + 1`，TypeScript 分片上限为 100,000 个状态。

Generator/Searcher 的地点选择使用 `AutoCompleteComboBox.tsx`，对应 PokeFinder `Form/Gen3/Wild3.cpp:102-103` 的 `enableAutoComplete()` 调用；地点可点击展开完整候选，并使用包含匹配、弹出候选、方向键/Enter 选择和 `NoInsert` 语义。

Searcher 不接收 Seed 或推进范围。它按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 枚举六项 IV 范围与完美个体条件交集后的候选，总组合不得超过 50,000,000，TypeScript 分片上限为 10,000 个组合。C ABI 对 Generator 状态和 Searcher 组合保留 100,000 的单次防御上限；单任务最多保留 250,000 条结果。

全不选或全选的 CheckList 语义与 PokeFinder 一致：界面显示 `Any`，请求层发送完整掩码。定点与野生共用的多选控件均支持 `Ctrl + Click` 一键清空勾选并回到 `Any`。Ctrl 点击 IV 标签设置 `31..31`，Alt 设置 `30..31`，Ctrl+Alt 设置 `0..0`，普通点击恢复 `0..31`。

## 3. Generator 算法顺序

每个候选从 `PokeRNG(seed, initialAdvances + offset)` 对应状态复制临时 RNG：

1. RSE Rock Smash 执行遭遇率检查。
2. 按 Feebas、Magnet Pull / Static 或普通 `EncounterSlot::hSlot` 选择槽位。
3. 按槽位范围计算等级；Pressure 类队首执行额外等级修正。
4. Cute Charm 判定；RSE Safari Zone 额外推进一次。
5. Synchronize 或普通性格判定，并应用性格筛选。
6. 普通地点循环生成 PID，直到性格与 Cute Charm 条件满足；Tanoby Chamber 改为循环生成 `(low << 16) | high`，直到 PID 对应的未知图腾形态与槽位 form 一致，再由 `pid % 25` 取得性格。
7. Method 2 在 IV 前额外推进一次；Method 4 在两组 IV 之间额外推进一次。
8. 拆分六项 IV，计算 Ability、Gender、Shiny、Hidden Power 与威力，并应用剩余筛选。

遭遇槽权重来自 `EncounterSlot::hSlot`：Grass 为 12 槽，Surfing/Rock Smash 为 5 槽，三种鱼竿分别为 2、3、5 槽。PokeFinder 的 Hustle、Pressure、Vital Spirit 共享 `Lead` 枚举值和等级修正规则；UI 保留各自上游控件名称。

## 4. Searcher 算法顺序

Searcher 对每个 IV 组合执行：

1. Method 1/2 使用 `LCRNGReverse::recoverPokeRNGIV` 的连续 IV 调用恢复；Method 4 使用两次 IV 调用间有一次推进的恢复规则。每组 IV 最多得到 6 个候选状态。
2. Method 2 先逆向额外推进，再读取 PID 高低位；Method 4 的恢复函数已包含间隔规则。
3. 普通地点以恢复出的 PID 性格为目标，沿 `PokeRNGR` 反向追踪可能的队首、槽位、等级、Feebas、Safari 和 Rock Smash 分支；Tanoby Chamber 按上游半字顺序恢复 PID，并以未知图腾形态作为回溯停止条件。
4. Synchronize 同时检查成功分支和失败后自然命中性格的分支；Searcher 使用通用 `Synchronize`，不选择指定性格。
5. 通过槽位、形态、等级、Shiny、Gender、Ability、Nature 与 Hidden Power 筛选后，调用 `test[index].next()` 取得上游 `WildSearcherState` 的候选 Seed。

IV 范围与完美个体筛选在反向枚举前求交，随后在每个恢复结果上再次执行最终筛选，保证分片计数与实际候选保持一致。

None、Cute Charm、Synchronize、Pressure、Magnet Pull 与 Static 的 RNG 调用顺序逐段对齐 `WildSearcher3::search`。Hustle 与 Vital Spirit 在上游枚举中与 Pressure 共享同一值，因此使用同一等级分支。

## 5. Wasm、Worker 与协议

生产算法位于 `wasm/modules/gen3wild/bridge/gen3wild_bridge.cpp`；React 主线程只负责表单、校验、分片、结果和导出。

```text
Gen3WildPanel
  |-- Gen3WildWorkerPool
  `-- Gen3WildSearcherWorkerPool
        `-- Dedicated Worker x N
              `-- gen3wild.mjs + gen3wild.wasm
                    |-- gen3wild_generate
                    `-- gen3wild_search (API 5)
```

API v5 将 Generator/Searcher 的筛选、完美个体条件和 `tanobyChamber` 标记都传入 C ABI，在 Wasm 内完成。旧 API 会在 Worker 初始化握手时被拒绝，避免 PWA 旧缓存把新 UI 请求发给旧模块。

每个 Worker 持有独立 Wasm 实例。任务可乱序完成，Pool 按 `chunkIndex` 恢复提交顺序；取消通过终止 Worker 生效。结果使用 60 字节定长记录和 transferable `ArrayBuffer`，不依赖 `SharedArrayBuffer`、Wasm pthread 或跨源隔离。第一字段由 Generator 解码为 Advances，由 Searcher 解码为 Seed。

## 6. 数据与特殊地点

`src/features/wild/gen3Data.ts` 包含五个掌机版本的遭遇表和第三世代 Personal 的性别阈值与属性类型。`src/features/shared/gen3Personal.ts` 另保留 `personal_rsefrlg.bin` 的常规 Ability ID，`gen3Abilities.ts` 复用 PokeFinder 中英日三语能力名。

`gen3Data.ts` 的普通槽位元组没有保存 form，因此 `tanoby.ts` 按完整地点名恢复 `EncounterTableGenerator` 中的 7 组固定 form。来源为 revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 `Gen3/pack.py`；形态顺序如下：

- Monean：`A` × 11，最后 `?`。
- Liptoo：`C/C/C/D/D/D/H/H/H/U/U/O`。
- Weepth：`N/N/N/N/S/S/S/S/I/I/E/E`。
- Dilford：`P/P/L/L/J/J/R/R/R/Q/Q/Q`。
- Scufib：`Y/Y/T/T/G/G/G/F/F/F/K/K`。
- Rixy：`V/V/V/W/W/W/X/X/M/M/B/B`。
- Viapois：`Z` × 11，最后 `!`。

这 7 个地点仅存在于 FireRed / LeafGreen，`EncounterArea3::tanobyChamber()` 对应 location `0..6`。每个地点只有 Grass，遭遇率为 `7`，包含 12 个 `#201` 槽位，等级均固定为 `25`，form 为 `0..27`。请求层与 C ABI 同时拒绝版本、遭遇类型、遭遇率、特殊地点标记、槽数、物种、等级或 form 不符合这些约束的数据。`Seven Island Tanoby Ruins` 的水面与钓鱼区域不是 Chamber，仍按普通地点计算。

未知图腾形态使用上游公式：取 PID 的 `0x03000000`、`0x00030000`、`0x00000300`、`0x00000003` 四组低两位，拼接后 `% 28`。Generator 的 Tanoby PID 半字顺序为 `(low << 16) | high`；Searcher 恢复阶段与反向探测阶段分别保持 `WildSearcher3::search` 的对应顺序，并以目标形态而非性格判断回溯结束。

## 7. 上游核对文件

- `Core/Gen3/Generators/WildGenerator3.cpp/.hpp`
- `Core/Gen3/Searchers/WildSearcher3.cpp/.hpp`
- `Core/RNG/LCRNGReverse.cpp/.hpp`
- `Core/Gen3/EncounterArea3.cpp/.hpp`、`Encounters3.cpp/.hpp`
- `Core/Parents/EncounterArea.cpp/.hpp`、`Filters/Filter.cpp/.hpp`、`Filters/StateFilter.cpp/.hpp`
- `Core/Util/EncounterSlot.cpp/.hpp`、`Core/Enum/Lead.hpp`
- `Form/Gen3/Wild3.cpp/.hpp/.ui`
- `Form/Controls/Filter.cpp/.ui`、`Form/Controls/CheckList.cpp`
- `Form/i18n/PokeFinder_zh.ts`、`PokeFinder_ja.ts`
- `Model/Gen3/WildModel3.cpp/.hpp`
- `Core/Resources/Embed/embed_gen3.py`、`embed_personal.py`
- `EncounterTableGenerator@7769c1df80be93761fe6479d51cbf2fe7a7dc4f9/Gen3/pack.py`、`Gen3/frlg/wild_encounters.json`
- `Test/Gen3/WildGenerator3Test.cpp`、`WildSearcher3Test.cpp`、`wild3.json`

## 8. 固定夹具与验证

`wasm/modules/gen3wild/tests/wild3_native_test.cpp` 的 Generator 使用 Emerald Route 111 Grass：

```text
Seed: 477218588
Method: Wild 1 / Method 1
Advances: 0..9
TID / SID: 12345 / 54321
```

全筛选通过时第 0 帧预期为 PID `1012584442`、Encounter Slot `3`、Trapinch `#328`、Level `21`、IV `12/31/4/27/8/20`、Nature `17`。

同一地点的全 31 IV Searcher 夹具当前写入以下断言：

- Method 1 + None：20 条。
- Method 2 + Synchronize：54 条。
- Method 4 + Cute Charm F：4 条。
- 第一条 Method 1 候选 Seed 重新调用 Generator 时生成 1 条匹配状态。

Tanoby 固定夹具复用上游 `wild3.json` 的 `Fire Red Liptoo Chamber`：

```text
Seed: FFFFFFFC
Method: Wild 1 / Method 1
Advances: 0..9
Location: Liptoo Chamber / Grass / Rate 7
```

第 0 帧预期为 PID `265752342`、Encounter Slot `0`、未知图腾 `C`（form `2`）、Level `25`、IV `5/14/26/6/30/26`、Nature `17`。Searcher 的 IV 范围为 `31/0/31/31/31/31..31/31/31/31/31/31`，预期得到 `97` 条结果。

已通过：在 Visual Studio 2026 Build Tools x64 环境运行 `$env:POKERNGKIT_WASM_MODULES='gen3wild'; npm run wasm:test:native`，`gen3wild_native_parity` 通过 1/1；本轮四模块联合运行 `$env:POKERNGKIT_WASM_MODULES='gen3static,gen3wild,gen4static,gen4wild'; npm run wasm:test:native` 通过 4/4，且新增 `0..31 + 31/5` 的索引边界夹具通过。`npm run verify` 通过 178 个测试文件、619 项测试和生产 PWA 构建。该原生证据不替代 Emscripten Wasm 构建或部署页面算法回归。

## 9. 当前限制与下一步

- Tanoby Chamber 地点显示沿用模块已有的地点本地化表；未知图腾结果在物种名后显示 `A..Z`、`!`、`?` 形态。
- GitHub Pages 的真实 Worker/Wasm 与算法结果待 Codex 使用部署 URL 回归；移动端性能、取消延迟和离线缓存仍需项目所有者最终验收。
- 普通地点与 Tanoby Searcher 的本机原生固定计数、完美个体交集索引已通过；真实 Emscripten Wasm、部署页面、移动端性能、取消延迟和离线缓存仍需项目所有者最终验收。

下一步等待 GitHub Actions 完成部署。项目所有者提供 Pages URL 后，由 Codex 使用 PokeFinder 固定输入逐字段回归 Generator/Searcher 并记录证据，再由项目所有者完成界面、设备和发布验收。
