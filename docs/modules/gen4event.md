# 第四世代 Event Generator / Searcher

`gen4event` 对照 PokeFinder 4.3.2 的 `Event4` 实现第四世代配信乱数 Generator 与 Searcher。生产算法位于独立 C++/WebAssembly 模块，React 只负责输入、分片、Worker 调度、结果解码和显示。

## 功能范围

- 支持 Diamond、Pearl、Platinum、HeartGold、SoulSilver 存档。
- 用户直接指定宝可梦种类、等级和性格，不读取 Wonder Card 文件。
- Generator 按 Seed、初始帧、最大帧数和 Offset 生成 IV。
- Searcher 按六项 IV、Delay 和帧数范围恢复第四世代 Seed。
- 筛选项只保留上游 `Event4` 实际开放的六项 IV、觉醒属性和显示能力值。
- 不提供 PID、异色、性别、特性、个性或遗传相关结果。

界面采用紧凑操作工作台：Generator 与 Searcher 共用设置和筛选结构，结果区使用固定表头、虚拟列表、列排序和表格内部横向滚动。DPPt Generator 隐藏电话列，HGSS Generator 显示电话列。

## 上游依据

本模块以本地只读 PokeFinder 4.3.2 归档 `C:\Users\Hakuhiro\Desktop\PokeFinder-master` 为行为依据，核对文件如下：

```text
Form/Gen4/Event4.cpp
Form/Gen4/Event4.hpp
Form/Gen4/Event4.ui
Form/Controls/TextBox.cpp
Form/Controls/TextBox.hpp
Form/i18n/PokeFinder_zh.ts
Core/Gen4/Generators/EventGenerator4.cpp
Core/Gen4/Generators/EventGenerator4.hpp
Core/Gen4/Searchers/EventSearcher4.cpp
Core/Gen4/Searchers/EventSearcher4.hpp
Core/Gen4/States/State4.hpp
Core/Parents/Filters/StateFilter.cpp
Core/Parents/Filters/StateFilter.hpp
Core/RNG/LCRNG.hpp
Core/RNG/LCRNGReverse.cpp
Core/RNG/LCRNGReverse.hpp
Model/Gen4/EventModel4.cpp
Model/Gen4/EventModel4.hpp
```

PokeFinder 及其源码归 Admiral-Fish 等原作者所有，遵循 GPL-3.0-or-later。PokeRNGKit 保留上游归属、许可和商标免责声明，不暗示官方授权或合作关系。

## 输入边界

| 输入              | 进制与长度          | 范围            | 空值与默认值                | 上游依据                                              |
| ----------------- | ------------------- | --------------- | --------------------------- | ----------------------------------------------------- |
| Seed              | 十六进制，最多 8 位 | `0..FFFFFFFF`   | 空值按 `0`；默认空          | `Event4.cpp` 的 `InputType::Seed32Bit`；`TextBox.cpp` |
| Initial Advances  | 十进制，最多 10 位  | `0..4294967295` | 默认 `0`                    | `InputType::Advance32Bit`；`Event4.ui`                |
| Max Advances      | 十进制，最多 10 位  | `0..4294967295` | 默认 `1000`                 | `InputType::Advance32Bit`；`Event4.ui`                |
| Offset            | 十进制，最多 10 位  | `0..4294967295` | 空值按 `0`；默认空          | `InputType::Advance32Bit`；`Event4.ui`                |
| Min / Max Delay   | 十进制，最多 10 位  | `0..4294967295` | 默认 `600..2000`            | `InputType::Delay`；`Event4.ui`                       |
| Min / Max Advance | 十进制，最多 10 位  | `0..4294967295` | 默认 `0..1000`              | `InputType::Advance32Bit`；`Event4.ui`                |
| Species           | 十进制枚举          | `1..493`        | 默认 `1`                    | `Translator::getSpecies(493)`；组合框索引加一         |
| Level             | 十进制整数          | `1..100`        | 默认 `1`                    | `Event4.ui` 的两个 `QSpinBox`                         |
| Nature            | 十进制枚举          | `0..24`         | 默认 `0`                    | `Translator::getNatures()`；组合框索引                |
| 六项 IV           | 十进制整数          | 每项 `0..31`    | 最小默认 `0`，最大默认 `31` | `Filter` 与 `StateFilter::compareIV`                  |
| Hidden Power      | 16 位掩码           | 至少选择一项    | 默认全选                    | `StateFilter::compareHiddenPower`                     |

跨字段约束：

- Generator 的 `Initial Advances + Offset + Max Advances` 不得超过 `0xFFFFFFFF`。
- Searcher 的最小 Delay 不得大于最大 Delay，最小帧数不得大于最大帧数。
- 每项 IV 的最小值不得大于最大值。
- Generator 的 `Max Advances + 1` 不得超过 2,000,000 个状态。
- Searcher 六项 IV 区间的笛卡尔积不得超过 2,000,000 组。

上游 `TextBox::getUInt()` 会把空文本转换为 `0`。Web 输入保持 Seed 与 Offset 的空值语义，其余必填数值若为空则由领域校验拒绝。

## 算法行为

### Generator

`EventGenerator4` 先以 `PokeRNG(seed, initialAdvances)` 定位基础 RNG。每一帧使用 Offset jump 的副本连续读取两个高 16 位值并拆分六项 IV，同时原 RNG 每帧前进一次，用该值计算电话和 Chatot 音高。结果帧数为 `Initial Advances + candidateIndex`，`Max Advances` 包含起始帧，因此总状态数为 `Max Advances + 1`。

上游 Generator 只调用 `StateFilter::compareIV`。即使筛选控件显示觉醒属性选择，Generator 也不会按觉醒属性过滤；本模块保留该行为。Searcher 才调用 `compareHiddenPower`。

### Searcher

Searcher 按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 枚举 IV 笛卡尔积，先计算并筛选觉醒属性，再按 Method 1 的 `LCRNGReverse::recoverPokeRNGIV` 恢复候选。对每个恢复项逆推一次初始 Seed，并依照上游再加入最高位异或 `0x80000000` 的候选；随后在闭区间帧数范围内逆推，仅保留 `hour < 24` 且 Delay 位于闭区间的第四世代格式 Seed。

Delay 输入保留上游 `u32` 范围，但第四世代 Seed 的 Delay 字段来自低 16 位。因此最小 Delay 大于 `65535` 时不会产生结果，最大 Delay 大于 `65535` 不会扩大可命中的 Seed 范围。

`recoverPokeRNGIV` 本身也会返回最高位异或候选，`EventSearcher4` 调用方仍会再次加入异或候选。该重复路径是 PokeFinder 4.3.2 的实际结果语义，本模块不去重。

## 结果列

Generator：

- DPPt：帧数、音高、HP、攻击、防御、特攻、特防、速度、觉醒属性、觉醒威力。
- HGSS：在帧数后增加电话，其余列与 DPPt 相同。

Searcher：

- Seed、Delay、帧数、HP、攻击、防御、特攻、特防、速度、觉醒属性、觉醒威力。

`Show Stats` 启用后，六项 IV 列使用所选种类、等级和性格计算能力值。Seed 固定显示为 8 位大写十六进制。Searcher 内部保留 Hour 用于格式校验，但上游 `EventSearcherModel4` 不显示 Hour，因此 Web 表格也不增加该列。

## Wasm 与 Worker

模块 manifest 的 contract version 与 API version 均为 `1`，导出：

```text
gen4event_api_version
gen4event_generate
gen4event_search
gen4event_result_ptr
gen4event_result_count
gen4event_last_error
```

Generator 记录为 11 个 `uint32_t`，共 44 字节：

```text
advances, hp, attack, defense, specialAttack, specialDefense, speed,
hiddenPower, hiddenPowerStrength, call, chatot
```

Searcher 记录为 12 个 `uint32_t`，共 48 字节：

```text
seed, delay, hour, advances, hp, attack, defense,
specialAttack, specialDefense, speed, hiddenPower, hiddenPowerStrength
```

Generator 默认按最多 500 帧分片，Searcher 默认按最多 500 组 IV 组合分片。自定义分片大小必须为正整数，并限制到单次 C ABI 的 100,000 状态上限。多个 Dedicated Worker 独立加载 Wasm，完成结果按 `chunkIndex` 顺序归并；取消会终止并清空当前 Worker，后续运行重新创建，不依赖 `SharedArrayBuffer`、Wasm pthreads 或跨源隔离。

单次 C ABI 调用最多返回 100,000 条结果，UI 总结果上限同为 100,000，调用方不能通过 Worker 选项放宽。Searcher 单分片填满缓冲区时返回已经收集的结果而不是丢弃批次；Worker Pool 随后停止继续派发，并在摘要中记录 `resultLimitReached`。

## 固定夹具

Generator 原生夹具：

```text
Seed: 00000000
Initial Advances: 0
Max Advances: 0
Offset: 0
Species: 1
Nature: 0
Level: 1
IV: 0/0/0/11/26/30
Hidden Power: 3
Power: 65
Call: 0
Chatot: 0
```

Searcher 原生夹具使用同一组 IV、Delay `600..2000`、Advance `0..1000`，要求至少返回一条结果，且每条已抽检结果满足 Hour、Delay 和 IV 约束。

## 验证状态

已通过 `npm test -- src/features/gen4event`：2 个测试文件、11 项测试。领域测试覆盖 ABI 解码、Generator/Searcher 分片、完整 `u32` Delay/Advance、IV 反向区间、两百万组合上限、非法分片大小和错误缓冲区；Preview 测试覆盖确定性输出、IV 枚举顺序、16 位 Delay 字段边界和取消。

已使用 Visual Studio 2022 x64 C++ 环境独立编译并执行 `gen4event_bridge.cpp` 与 `event4_native_test.cpp`，Generator 固定夹具、Searcher 有效格式约束和 C ABI v1 均通过。已通过 `npx eslint src/features/gen4event`。全项目 `npm run typecheck` 与 `npm run format:check` 当前被并行开发中的 `gen4egg` 与共享入口文件阻塞，不属于本模块文件。

共享接入仍由第四世代主线完成，包括 `App.tsx`、翻译键、顶层 Wasm 模块清单和构建入口。在这些入口接入前，生产页面不会加载 `gen4event`，顶层 native 测试命令也可能无法发现 `gen4event_native_test` 目标。
