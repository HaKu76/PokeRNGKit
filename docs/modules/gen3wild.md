# 第三世代 Wild Generator / Searcher

> - 模块标识：`gen3wild`
> - 当前状态：Generator/Searcher 已接入 API v3、C++/Wasm 和独立 Worker Pool；尚未提交、推送或完成部署页面回归
> - 上游基线：PokeFinder 4.3.2
> - API 版本：`3`
> - 当前范围：第三世代掌机 Wild；Tanoby Chamber 暂不开放

## 1. 当前能力

- 按全局存档的 Ruby、Sapphire、Emerald、FireRed 或 LeafGreen 版本切换遭遇数据，并使用存档 TID/SID 判断闪光。
- 支持 Grass、Rock Smash、Surfing、Old Rod、Good Rod、Super Rod 和上游 `Wild 1`、`Wild 2`、`Wild 4`。
- 支持 Emerald Synchronize、Cute Charm、Pressure、Hustle、Vital Spirit、Magnet Pull 和 Static 队首规则。
- 支持 RSE Rock Smash 的 Bike、Black Flute、Cleanse Tag、White Flute，Route 119 Feebas Tile 和 RSE Safari Zone 额外推进。
- Generator 按 Seed 与推进范围生成状态；Searcher 按六项 IV 范围逆推候选 Seed。
- Location、Pokemon、Encounter Slot 和等级范围按当前存档版本联动。
- 筛选支持 PokeFinder 的 Nature、Hidden Power、Encounter Slot 多选，Level、六项 IV 闭区间，Shiny、Gender 和 Ability。
- Generator 提供“取消筛选”；Searcher 始终使用有效 IV 范围。
- 筛选器桌面布局复用上游 `Form/Controls/Filter.ui`：左侧为六项 IV 与工具，右侧按 Ability、Encounter Slot、Gender、Hidden Power、Level、Nature、Shiny 的上游顺序排列紧凑行；Static 复用其中相同的布局和多选控件，只移除不适用的 Encounter Slot、Level。窄屏统一降为单列。
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

`Initial Advances + Offset + Max Advances` 不得超过 `0xFFFFFFFF`。Generator 的 `Max Advances` 包含起点，状态总数为 `Max Advances + 1`，TypeScript 分片上限为 100,000 个状态。

Searcher 不接收 Seed 或推进范围。它按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 枚举 IV 笛卡尔积，总组合不得超过 50,000,000，TypeScript 分片上限为 10,000 个组合。C ABI 对 Generator 状态和 Searcher 组合保留 100,000 的单次防御上限；单任务最多保留 250,000 条结果。

全不选或全选的 CheckList 语义与 PokeFinder 一致：界面显示 `Any`，请求层发送完整掩码。定点与野生共用的多选控件均支持 `Ctrl + Click` 一键清空勾选并回到 `Any`。Ctrl 点击 IV 标签设置 `31..31`，Alt 设置 `30..31`，Ctrl+Alt 设置 `0..0`，普通点击恢复 `0..31`。

## 3. Generator 算法顺序

每个候选从 `PokeRNG(seed, initialAdvances + offset)` 对应状态复制临时 RNG：

1. RSE Rock Smash 执行遭遇率检查。
2. 按 Feebas、Magnet Pull / Static 或普通 `EncounterSlot::hSlot` 选择槽位。
3. 按槽位范围计算等级；Pressure 类队首执行额外等级修正。
4. Cute Charm 判定；RSE Safari Zone 额外推进一次。
5. Synchronize 或普通性格判定，并应用性格筛选。
6. 循环生成 PID，直到性格与 Cute Charm 条件满足。
7. Method 2 在 IV 前额外推进一次；Method 4 在两组 IV 之间额外推进一次。
8. 拆分六项 IV，计算 Ability、Gender、Shiny、Hidden Power 与威力，并应用剩余筛选。

遭遇槽权重来自 `EncounterSlot::hSlot`：Grass 为 12 槽，Surfing/Rock Smash 为 5 槽，三种鱼竿分别为 2、3、5 槽。PokeFinder 的 Hustle、Pressure、Vital Spirit 共享 `Lead` 枚举值和等级修正规则；UI 保留各自上游控件名称。

## 4. Searcher 算法顺序

Searcher 对每个 IV 组合执行：

1. Method 1/2 使用 `LCRNGReverse::recoverPokeRNGIV` 的连续 IV 调用恢复；Method 4 使用两次 IV 调用间有一次推进的恢复规则。每组 IV 最多得到 6 个候选状态。
2. Method 2 先逆向额外推进，再读取 PID 高低位；Method 4 的恢复函数已包含间隔规则。
3. 以恢复出的 PID 性格为目标，沿 `PokeRNGR` 反向追踪可能的队首、槽位、等级、Feebas、Safari 和 Rock Smash 分支。
4. Synchronize 同时检查成功分支和失败后自然命中性格的分支；Searcher 使用通用 `Synchronize`，不选择指定性格。
5. 通过槽位、等级、Shiny、Gender、Ability、Nature 与 Hidden Power 筛选后，调用 `test[index].next()` 取得上游 `WildSearcherState` 的候选 Seed。

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
                    `-- gen3wild_search (API 3)
```

API v3 将 Generator/Searcher 的筛选都传入 C ABI，在 Wasm 内完成。旧 API 会在 Worker 初始化握手时被拒绝，避免 PWA 旧缓存把新 UI 请求发给旧模块。

每个 Worker 持有独立 Wasm 实例。任务可乱序完成，Pool 按 `chunkIndex` 恢复提交顺序；取消通过终止 Worker 生效。结果使用 60 字节定长记录和 transferable `ArrayBuffer`，不依赖 `SharedArrayBuffer`、Wasm pthread 或跨源隔离。第一字段由 Generator 解码为 Advances，由 Searcher 解码为 Seed。

## 6. 数据与特殊地点

`src/features/wild/gen3Data.ts` 包含五个掌机版本的遭遇表和第三世代 Personal 的性别阈值与属性类型。`src/features/shared/gen3Personal.ts` 另保留 `personal_rsefrlg.bin` 的常规 Ability ID，`gen3Abilities.ts` 复用 PokeFinder 中英日三语能力名。

当前数据没有保留 Tanoby Chamber 每个未知图腾槽位的 form。七个 Tanoby Chamber 从地点列表排除，不能按普通 form 0 计算；`Seven Island Tanoby Ruins` 的水面与钓鱼区域不是 Chamber，仍可选择。

完整遭遇数据输入的精确 `EncounterTableGenerator` revision 尚待补记。完成来源记录和全表抽样前，只能声明固定地点与算法分支已核对，不能声明全部地点数据已通过上游一致性验收。

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

本机当前没有可用 C++ 编译器和已激活的 Emscripten，因此上述新增 Searcher 原生断言和真实 Wasm 尚未运行；必须由 GitHub Actions 的 `npm run wasm:test:native` 与 `npm run wasm:build` 验证后再记录为通过。TypeScript、格式、Web 构建和 UI 预览检查结果记录在 [`docs/progress.md`](../progress.md)。

## 9. 当前限制与下一步

- Tanoby Chamber form、地点本地化和完整遭遇数据来源 revision 尚待补齐。
- GitHub Pages 的真实 Worker/Wasm 与算法结果待 Codex 使用部署 URL 回归；移动端性能、取消延迟和离线缓存仍需项目所有者最终验收。
- Searcher 固定计数尚未在本机原生编译器中执行，不得写成已通过上游一致性测试。

下一步先由 Actions 验证 API v3 原生夹具和 Wasm 构建。项目所有者提供 Pages URL 后，由 Codex 使用 PokeFinder 固定输入逐字段回归 Generator/Searcher 并记录证据，再由项目所有者完成界面、设备和发布验收。通过后再决定 Tanoby Chamber 数据或发布加固，不提前开始其他世代算法。
