# 第三世代 Wild Generator

> - 模块标识：`gen3wild`
> - 当前状态：Generator 已接入 API v2、C++/Wasm/Worker Pool 和完整 PokeFinder 筛选；尚未提交、推送或由项目所有者验收
> - 上游基线：PokeFinder 4.3.2
> - API 版本：`2`
> - 当前范围：Generator；Searcher 尚未实现

## 1. 当前能力

- 按全局存档的 Ruby、Sapphire、Emerald、FireRed 或 LeafGreen 版本切换遭遇数据，并使用存档 TID/SID 判断闪光。
- 支持 Grass、Rock Smash、Surfing、Old Rod、Good Rod 和 Super Rod。
- 支持上游 `Wild 1`、`Wild 2`、`Wild 4` 生成方式。
- Emerald 支持 Synchronize、Cute Charm、Pressure、Hustle、Vital Spirit、Magnet Pull 与 Static 队首规则。
- 支持 RSE Rock Smash 的 Bike、Black Flute、Cleanse Tag、White Flute，Route 119 丑丑鱼钓点和 RSE Safari Zone 额外推进。
- 设置中选择 Location 和 Pokémon 时，会按上游 `EncounterArea::getSlots` 与 `getLevelRange` 同步 Encounter Slot 和等级范围。
- 筛选支持 PokeFinder `Filter` 的性格、觉醒力量、Encounter Slot 多选，等级、六项 IV 闭区间，Shiny、Gender、Ability 和“取消筛选”。
- 结果表对齐 `WildGeneratorModel3` 的 16 列：`Advances / Slot / Level / PID / Shiny / Nature / Ability / HP / Atk / Def / SpA / SpD / Spe / Hidden / Power / Gender`。
- 支持 IV/能力值显示切换、个体值计算器入口、数值排序、虚拟化显示、CSV、进度和取消。
- 本地 `ui` 模式提供确定性样例结果，用于验收表单与交互；页面会明确提示该模式不代表 Wasm RNG 结果。

## 2. 输入限制与上游依据

| 输入                                   | 进制与范围                                                         | 空值行为                                            | 依据                                                |
| -------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------- |
| Seed                                   | 十六进制 `00000000..FFFFFFFF`，最多 8 位                           | `TextBox::getUInt()` 按 `0` 处理                    | `Form/Gen3/Wild3.cpp`、`Form/Controls/TextBox.cpp`  |
| Initial Advances                       | 十进制 `0..4294967295`，最多 10 位                                 | 表单默认 `0`                                        | `InputType::Advance32Bit`                           |
| Max Advances                           | 十进制 `0..4294967295`，最多 10 位                                 | 表单默认 `100000`；Web 单任务最多 50,000,000 个状态 | `InputType::Advance32Bit` 与 Worker 任务上限        |
| Offset                                 | 十进制 `0..4294967295`，最多 10 位                                 | 表单默认 `0`                                        | `InputType::Advance32Bit`                           |
| TID / SID                              | 十进制 `0..65535`                                                  | 来自当前全局存档                                    | `Profile3` 的 `u16` 字段                            |
| Level                                  | 十进制 `1..100`，最小值不得大于最大值                              | `1..100`；选择 Pokémon 时同步物种范围               | `Form/Controls/Filter.ui`、`Filter::isValid`        |
| 每项 IV                                | 十进制 `0..31`，最小值不得大于最大值                               | `0..31`                                             | `Filter.ui`、`Filter::isValid`                      |
| Nature / Hidden Power / Encounter Slot | 分别为 25 / 16 / 最多 12 项多选                                    | 全不选和全选都按 `Any`                              | `Form/Controls/Filter.cpp`、`CheckList::getChecked` |
| Shiny / Gender / Ability               | 上游值分别为 `Any/Star/Square/Star-Square`、`Any/0/1/2`、`Any/0/1` | `Any`                                               | `Filter::setup` 与 `StateFilter`                    |

`Initial Advances + Offset + Max Advances` 不得超过 `0xFFFFFFFF`。`Max Advances` 包含起点，因此状态总数为 `Max Advances + 1`。TypeScript 将任务拆成最多 100,000 个状态的分片；C ABI 也拒绝超过该边界的单次调用。单任务结果最多保留 250,000 条。

全不选/全选的 CheckList 语义与 PokeFinder 一致：显示 `Any`，请求层会发送完整掩码。用户用 Ctrl 点击 IV 标签时设置 `31..31`，Alt 设置 `30..31`，Ctrl+Alt 设置 `0..0`，普通点击恢复 `0..31`。

## 3. RNG 顺序

每个候选推进从 `PokeRNG(seed, initialAdvances + offset)` 复制临时 RNG，并依次执行：

1. RSE Rock Smash 遭遇率检查。
2. Feebas、Magnet Pull / Static 或普通 `EncounterSlot::hSlot` 槽位选择。
3. 按槽位等级范围计算等级；Pressure 额外进行一次等级修正判断。
4. Cute Charm 判定；RSE Safari Zone 额外推进一次。
5. Synchronize 或普通性格判定，并提前应用性格筛选。
6. 循环生成 PID，直到性格和 Cute Charm 条件满足。
7. Method 2 在 IV 前额外推进一次；Method 4 在两组 IV 之间额外推进一次。
8. 从两组 16 位随机数拆分 HP、Atk、Def、SpA、SpD、Spe，计算 Ability、Gender、Shiny、Hidden Power 和 Hidden Power Power，并应用剩余筛选。

遭遇槽权重对照 `EncounterSlot::hSlot`：Grass 为 12 槽，Surfing/Rock Smash 为 5 槽，三种鱼竿分别为 2、3、5 槽。PokeFinder 的 `Hustle`、`Pressure`、`Vital Spirit` 共用 `Lead` 枚举值和等级修正规则；UI 仍保留各自的上游控件名称。

## 4. Wasm、Worker 与协议

生产算法位于 `wasm/modules/gen3wild/bridge/gen3wild_bridge.cpp`，React 主线程只负责表单、校验、分片、结果与导出。

```text
Gen3WildPanel
  -> Gen3WildWorkerPool
      -> 独立 Dedicated Worker x N
          -> gen3wild.mjs + gen3wild.wasm
              -> gen3wild_generate (API 2)
```

API v2 将 Shiny、Gender、Ability、Nature、Hidden Power、Encounter Slot、Level 和六项 IV 范围全部传入 C ABI，在 Wasm 内完成筛选。旧 API v1 的调用会在 Worker 初始化握手时被拒绝，避免 PWA 旧缓存把新 UI 请求发给旧模块。

每个 Worker 持有独立 Wasm 实例。任务分片可乱序完成，但 Pool 按 `chunkIndex` 恢复提交顺序；取消通过终止 Worker 生效。结果使用 60 字节定长记录和 transferable `ArrayBuffer` 返回，不依赖 `SharedArrayBuffer`、Wasm pthread 或跨源隔离。

## 5. 数据与特殊地点

`src/features/wild/gen3Data.ts` 包含五个掌机版本的遭遇表和第三世代 Personal 的性别阈值与属性类型。`src/features/shared/gen3Personal.ts` 另外保留 `personal_rsefrlg.bin` 的两个常规 Ability ID，`gen3Abilities.ts` 复用 PokeFinder 中英日三语能力名称。

当前数据没有保留 Tanoby Chamber 每个未知图腾槽位的 form。七个 Tanoby Chamber 因此从地点列表排除，不能按普通 form 0 遭遇计算；`Seven Island Tanoby Ruins` 的水面与钓鱼区域不是 Chamber，仍可选择。

完整遭遇数据输入的精确 `EncounterTableGenerator` revision 尚待补记。完成来源记录和全表抽样前，只能声明已核对固定地点与算法分支，不能声明全部地点数据已完成上游一致性验收。

## 6. 上游核对文件

- `Core/Gen3/Generators/WildGenerator3.cpp/.hpp`
- `Core/Gen3/EncounterArea3.cpp/.hpp`
- `Core/Gen3/Encounters3.cpp/.hpp`
- `Core/Parents/EncounterArea.cpp/.hpp`
- `Core/Parents/Filters/Filter.cpp/.hpp` 与 `Core/Parents/Filters/StateFilter.cpp/.hpp`
- `Core/Util/EncounterSlot.cpp/.hpp`
- `Core/Enum/Lead.hpp`
- `Form/Gen3/Wild3.cpp/.hpp/.ui`
- `Form/Controls/Filter.cpp/.ui` 与 `Form/Controls/CheckList.cpp`
- `Form/i18n/PokeFinder_zh.ts` 与 `PokeFinder_ja.ts`
- `Model/Gen3/WildModel3.cpp/.hpp`
- `Core/Resources/Embed/embed_gen3.py` 与 `embed_personal.py`
- `Test/Gen3/WildGenerator3Test.cpp` 与 `Test/Gen3/wild3.json`

## 7. 固定夹具与验证

`wasm/modules/gen3wild/tests/wild3_native_test.cpp` 使用 Emerald Route 111 Grass 固定输入：

```text
Seed: 477218588
Method: Wild 1 / Method 1
Advances: 0..9
TID / SID: 12345 / 54321
```

全筛选通过时第 0 帧预期为 PID `1012584442`、Encounter Slot `3`、Trapinch `#328`、Level `21`、IV `12/31/4/27/8/20`、Nature `17`。夹具还覆盖性格、觉醒力量、槽位、等级、IV 范围、无效掩码和单调用状态上限。本机当前没有可用 C++ 编译器，夹具尚未实际运行；应由 GitHub Actions 的 `npm run wasm:test:native` 验证后再记录为通过。

本轮自动验证：

- 已通过：`npm run format:check`
- 已通过：`npm run lint`
- 已通过：`npm run typecheck`
- 已通过：`npm test`（12 个测试文件、39 项测试）
- 已通过：`npm run build:ui`
- 已通过：浏览器 UI 预览生成、性格多选、宝可梦联动和结果表检查
- 未运行：`npm run wasm:test:native`、`npm run wasm:build`；本机未激活可用的 C++/Emscripten 编译环境

## 8. 当前限制与下一步

- Wild Searcher 尚未实现。
- Tanoby Chamber form 规则、地点本地化和完整遭遇数据来源 revision 尚待补齐。
- GitHub Pages 上的真实 Worker/Wasm、移动端性能、取消延迟和离线缓存仍需项目所有者验收。

下一步先由 Actions 验证原生夹具、Wasm 构建和 Pages 资源加载，再由项目所有者使用 PokeFinder 固定输入逐字段比对 Wild Generator。通过后单独实现 Wild Searcher，不把 Searcher 混入本轮 Generator 增量。
