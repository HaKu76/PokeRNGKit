# 第三世代 Wild Generator

> - 模块标识：`gen3wild`
> - 当前状态：PR #1 合并工作区已接入独立 C++/Wasm/Worker，尚未提交、推送或由项目所有者验收
> - 上游基线：PokeFinder 4.3.2
> - API 版本：1
> - 当前范围：Generator；Searcher 尚未实现

## 1. 当前能力

- 按当前全局掌机存档选择 Ruby、Sapphire、Emerald、FireRed 或 LeafGreen 遭遇表，并使用存档 TID/SID 判断闪光。
- 支持 Grass、Rock Smash、Surfing、Old Rod、Good Rod 与 Super Rod。
- 支持 Method 1、Method 2 与 Method 4。
- Emerald 支持 Synchronize、Cute Charm、Pressure、Hustle、Vital Spirit、Magnet Pull 与 Static 队首规则。
- 支持 RSE 碎岩的 Bike、Black Flute、Cleanse Tag 与 White Flute，以及 Route 119 丑丑鱼钓点和 RSE Safari Zone 额外推进。
- 结果包含 Advances、Encounter Slot、Pokemon、Level、PID、六项 IV、Nature 与 Shiny，支持数值排序、虚拟化显示、CSV、进度和取消。

当前仅提供性格多选筛选。IV、觉醒力量、特性、性别、闪光、等级、Pokemon 与 Encounter Slot 等完整 Wild 筛选，以及 Wild Searcher，留在后续增量，不在本轮文档中标记为完成。

## 2. 输入限制

| 输入             | 进制与范围                               | 空值行为          | 依据                                                        |
| ---------------- | ---------------------------------------- | ----------------- | ----------------------------------------------------------- |
| Seed             | 十六进制 `00000000..FFFFFFFF`，最多 8 位 | 按 `0` 处理       | `Wild3.cpp` 的 `InputType::Seed32Bit` 与 `TextBox::getUInt` |
| Initial Advances | 十进制 `0..4294967295`，最多 10 位       | 表单默认 `0`      | `InputType::Advance32Bit`                                   |
| Max Advances     | 十进制 `0..49999999`，最多 10 位         | 表单默认 `100000` | 上游为 `u32`；Web 单任务额外限制为 50,000,000 个状态        |
| Offset           | 十进制 `0..4294967295`，最多 10 位       | 表单默认 `0`      | `InputType::Advance32Bit`                                   |
| TID / SID        | 十进制 `0..65535`                        | 来自当前全局存档  | `Profile3` 的 `u16` 字段                                    |

`Initial Advances + Offset + Max Advances` 不得超过 `0xFFFFFFFF`。Max Advances 包含起点，因此状态总数为 `Max Advances + 1`。TypeScript 将任务拆成最多 100,000 个状态的分片，C ABI 同时拒绝超过该边界的单次调用；单任务结果最多保留 250,000 条。

方法和遭遇类型使用下拉框。队首规则仅在 Emerald 显示；Magnet Pull 仅用于 Grass，Static 仅用于 Grass 与 Surfing。Pressure、Hustle 与 Vital Spirit 在上游 `Lead` 枚举中共享同一数值和等级修正规则，但保留各自控件名称。

## 3. RNG 顺序

每个候选推进从 `PokeRNG(seed, initialAdvances + offset)` 复制临时 RNG，并依次执行：

1. RSE Rock Smash 遭遇率检查。
2. Feebas、Magnet Pull / Static 或普通 H 槽位选择。
3. 槽位等级计算；Pressure / Hustle / Vital Spirit 额外进行等级修正判断。
4. Cute Charm 判定；RSE Safari Zone 额外推进一次。
5. Synchronize 或普通性格判定。
6. 循环生成 PID，直到性格和 Cute Charm 条件满足。
7. Method 2 在 IV 前额外推进一次；Method 4 在两组 IV 之间额外推进一次。
8. 从两组 16 位随机数拆分 HP、Atk、Def、SpA、SpD、Spe，并计算 Ability、Gender 与 Shiny。

遭遇槽权重对照 `EncounterSlot::hSlot`：Grass 为 12 槽，Surfing / Rock Smash 为 5 槽，三种鱼竿分别为 2、3、5 槽。RSE 碎岩遭遇率先乘 16，再应用 Bike 和道具修正。

## 4. Wasm 与 Worker

生产算法位于 `wasm/modules/gen3wild/bridge/gen3wild_bridge.cpp`，React 主线程只负责表单、校验、分片、结果与导出。

```text
Gen3WildPanel
  -> Gen3WildWorkerPool
      -> 独立 Dedicated Worker x N
          -> gen3wild.mjs + gen3wild.wasm
              -> gen3wild_generate
```

每个 Worker 持有独立 Wasm 实例。任务分片可乱序完成，但 Pool 按 `chunkIndex` 提交批次；取消通过终止 Worker 生效。结果使用 60 字节定长记录和 transferable `ArrayBuffer` 返回，不依赖 `SharedArrayBuffer`、Wasm pthread 或跨源隔离。

## 5. 数据与特殊地点

`src/features/wild/gen3Data.ts` 是生成数据，包含五个掌机版本的遭遇表和第三世代 Personal 的性别阈值与属性类型。`scripts/generate_gen3_wild_data.py` 接受 PokeFinder `EncounterTableGenerator` 兼容的 `wild_encounters.json`、PokeFinder 简中物种表和 `personal_rsefrlg.bin`；生成文件不参与 Prettier。

当前数据没有保留 Tanoby Chamber 每个未知图腾槽位的 form。七个 Tanoby Chamber 因此从地点列表排除，不能按普通 form 0 遭遇计算。`Seven Island Tanoby Ruins` 的水面与钓鱼区域不是 Chamber，仍可选择。

完整遭遇数据输入的精确 `EncounterTableGenerator` revision 尚待补记。完成该来源记录和全表抽样前，只能声明已核对固定地点与算法分支，不能声明全部地点数据已完成上游一致性验收。

## 6. 上游核对文件

- `Core/Gen3/Generators/WildGenerator3.cpp/.hpp`
- `Core/Gen3/EncounterArea3.cpp/.hpp`
- `Core/Gen3/Encounters3.cpp/.hpp`
- `Core/Parents/EncounterArea.cpp/.hpp`
- `Core/Util/EncounterSlot.cpp/.hpp`
- `Core/Enum/Lead.hpp`
- `Form/Gen3/Wild3.cpp/.hpp/.ui`
- `Form/Controls/TextBox.cpp/.hpp`
- `Form/i18n/PokeFinder_zh.ts` 与 `PokeFinder_ja.ts`
- `Core/Resources/Embed/embed_gen3.py` 与 `embed_personal.py`
- `Test/Gen3/WildGenerator3Test.cpp` 与 `Test/Gen3/wild3.json`

## 7. 固定夹具

`wasm/modules/gen3wild/tests/wild3_native_test.cpp` 已写入 PokeFinder 4.3.2 的 Emerald Route 111 Grass 固定输入：

```text
Seed: 477218588
Method: Method 1
Advances: 0..9
TID / SID: 12345 / 54321
```

第 0 帧预期为 PID `1012584442`、Encounter Slot `3`、Trapinch `#328`、Level `21`、IV `12/31/4/27/8/20`、Nature `17`。本机当前没有可用 C++ 编译器，夹具尚未实际运行；应由 GitHub Actions 的 `npm run wasm:test:native` 验证后再记录为通过。

## 8. 当前限制与下一步

- 本机 PowerShell 未激活 Emscripten 6.0.6，尚未生成或加载 `gen3wild.mjs/.wasm`。
- 尚无 Wild UI 预览引擎；`build:ui` 可以检查界面构建，但不能生成 Wild 样例结果。
- 尚未实现 Wild Searcher、完整 Wild 筛选、Tanoby Chamber form 规则和地点本地化。
- 尚未完成 GitHub Pages 上的真实 Worker/Wasm、移动端性能、取消延迟与离线验收。

下一步先由 Actions 验证原生夹具、Wasm 构建与 Pages 资源加载，再由项目所有者比对 PokeFinder 固定输入。通过后再单独实现 Wild Searcher，不把 Searcher 混入本轮 Generator 合并。
