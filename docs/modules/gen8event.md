# 第八世代配信乱数

## 功能范围

本模块对应 PokeFinder 4.3.2 的 `Gen 8 Event`，仅使用 Brilliant Diamond / Shining Pearl Profile：

- 按两段 64 位 Xorshift Seed、初始帧、最大帧数与 Offset 生成 BDSP 配信状态。
- 支持物种、等级、PID Type、特性、性别、性格锁定、TID、SID、EC、PID、保底 31 IV 数量与蛋标记。
- 支持本地导入严格 732 字节的 `.wb8`；文件只在浏览器内解析。
- 支持异色、性别、特性、性格、觉醒属性、身高、体重与六项 IV 筛选，并可关闭筛选。
- 结果保留 PokeFinder `StaticModel8` 的 16 列，六项能力列可切换 IV 或能力值。
- 使用独立 C++/WebAssembly、Dedicated Worker Pool、进度、取消、结果上限、虚拟滚动、排序与 CSV。

生产 RNG 只在 Worker 内的 `gen8event` Wasm 执行。React/TypeScript 负责档案选择、输入校验、确定性分片、Worker 编排、`.wb8` 解析、结果解码和展示；UI 预览引擎只提供布局数据，不能作为算法结果证据。

## 输入限制

空数字文本沿用 PokeFinder `TextBox::getUInt()` / `getULong()`，解释为 `0`。HTML 与领域校验同时执行下表边界。

| 输入                  | 进制与范围                                    | 默认值与跨字段行为                                       | 上游依据                                                                       |
| --------------------- | --------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Profile               | Brilliant Diamond / Shining Pearl             | TID/SID 各为 `0..65535`；蛋配信使用 Profile TSV          | `Event8.cpp`、`EventGenerator8.cpp`、`ProfileDisplay8::setup(..., Game::BDSP)` |
| Seed 0 / Seed 1       | 十六进制，最多 16 位，`0..0xFFFFFFFFFFFFFFFF` | 空值为 `0`；两项同时为 `0` 时拒绝生成                    | `Event8.cpp` 的 `InputType::Seed64Bit`、`TextBox.cpp`                          |
| Initial Advances      | 十进制，最多 10 位，`0..4294967295`           | 默认 `0`                                                 | `Event8.cpp` 的 `InputType::Advance32Bit`                                      |
| Max Advances          | 十进制，最多 10 位，`0..4294967295`           | 默认 `100000`；处理 `Max Advances + 1` 个状态            | `Event8.ui`、`EventGenerator8.cpp` 的 `cnt <= maxAdvances`                     |
| Offset                | 十进制，最多 10 位，`0..4294967295`           | 空值为 `0`；`Initial + Offset + Max` 不得超过 `uint32_t` | `Event8.cpp`、`EventGenerator8` 构造参数                                       |
| Species               | 十进制，`1..493`                              | Form 固定为 `0`                                          | `Event8.cpp` 的 `Translator::getSpecies(493)`、`getParameters()`               |
| IV Count              | 十进制，`0..3`                                | 默认 `0`                                                 | `Event8.ui` 的 `QSpinBox::maximum = 3`                                         |
| Level                 | 十进制，`1..100`                              | 默认 `1`                                                 | `Event8.ui` 的 `QSpinBox` 最小值与最大值                                       |
| PID Type              | Nonshiny、Random、Star、Square、Static        | Static 使用输入 PID；其他类型消费随机 PID                | `Event8.ui`、`WB8.hpp`、本模块缺陷修正                                         |
| Ability               | `0`、`1`、`H`、`1/2`、`1/2/H`                 | 内部值 `0..4`                                            | `Event8.ui`、`EventGenerator8.cpp`                                             |
| Gender                | Male、Female、Genderless                      | 内部值 `0..2`，固定性别                                  | `Event8.ui`、`EventGenerator8.cpp`                                             |
| Nature Locked         | 布尔值                                        | 关闭时 Nature 使用 `255` 并随机生成 `0..24`              | `Event8::getParameters()`                                                      |
| TID / SID             | 十进制，最多 5 位，`0..65535`                 | 非蛋配信使用两者的异或作为 TSV                           | `InputType::TIDSID`、`EventGenerator8.cpp`                                     |
| EC / PID              | 十六进制，最多 8 位，`0..0xFFFFFFFF`          | EC 为 `0` 时随机；PID 只在 Static 使用                   | `InputType::Seed32Bit`、`EventGenerator8.cpp`                                  |
| Egg                   | 布尔值                                        | 开启时异色判定使用 Profile TID/SID                       | `EventGenerator8` 构造函数与 `Generator` 基类 TSV                              |
| `.wb8`                | 严格 732 字节                                 | 按小端偏移读取；Species 必须为 `1..493`                  | `Event8::importEvent()`、`WB8.hpp`                                             |
| Filter IV             | 六组闭区间，各端 `0..31`                      | 每组最小值不得大于最大值                                 | `Filter.ui`、`StateFilter.cpp`                                                 |
| Height / Weight       | 两组闭区间，各端 `0..255`                     | 最小值不得大于最大值                                     | `StateFilter` 构造参数与 `compareState(State8)`                                |
| Nature / Hidden Power | 25 / 16 项位掩码                              | Wasm 边界要求至少选择一项                                | `Filter`、`StateFilter`                                                        |
| Shiny                 | Any、Star、Square、Star/Square                | 对应 `StateFilter::compareShiny()`                       | `Filter`、`StateFilter`                                                        |
| Gender                | Any、Male、Female                             | 对应生成状态 `0..1`；上游 Filter 不提供 Genderless 筛选  | `Filter.ui`、`Filter.cpp`、`StateFilter`                                       |
| Ability               | Any、`0`、`1`、`H`                            | 对应生成状态 `0..2`                                      | `Filter`、`StateFilter`                                                        |
| Disable Filters       | 布尔值                                        | 开启后跳过全部状态筛选                                   | `StateFilter::compareState()`                                                  |
| Result Limit          | `1..100000`                                   | 浏览器与 Wasm 同时限制                                   | PokeRNGKit Worker/Wasm 边界                                                    |

Web 单次任务最多执行 `250,000,000` 次状态评估，评估量为 `Max Advances + 1`。该浏览器保护上限不缩小上游控件的 `uint32_t` 输入范围，但会在创建 Worker 前拒绝超出预算的任务。

## 上游缺陷修正

PokeFinder 4.3.2 的 `Event8.ui` 定义 PID Type 为 `0 Nonshiny / 1 Random / 2 Star / 3 Square / 4 Static`，但 `EventGenerator8.cpp` 只处理 `0 / 1 / 2 / 4`：Random 被当作强制星星，Star 被当作强制方块，Square 进入未初始化 PID。PokeRNGKit 按界面语义实现：

- Nonshiny：抽取随机 PID；若异色则翻转 `0x10000000`。
- Random：抽取随机 PID并保留实际异色类型。
- Star：抽取随机 PID并在需要时调整高 16 位，强制星星异色。
- Square：抽取随机 PID并在需要时调整高 16 位，强制方块异色。
- Static：使用输入 PID并计算实际异色类型。

PokeFinder `.wb8` 导入还把 EC/PID 的十进制字符串写入十六进制 TextBox，并且没有回填 Level。本模块用 8 位十六进制回填 EC/PID，并回填 Level；这两项属于文件导入修正，不改变 `WB8.hpp` 的偏移定义。

## 算法

外层使用等价于 `RNGList<u32, Xorshift, 32, gen>` 的帧列表，从 `Initial Advances + Offset` 开始。`gen` 使用 `Xorshift::next(0x80000000, 0x7fffffff)` 的无符号回绕语义。每帧依次处理 EC、PID、保底 31 IV、剩余 IV、特性、固定性别、性格、身高与体重，然后计算能力值、觉醒属性、个性和筛选结果。

非蛋配信使用配信 TID/SID 的异或；蛋配信保留 PokeFinder `Generator` 基类行为，使用当前 BDSP Profile TID/SID 的异或。Ability `1/2` 随机 `0..1`，`1/2/H` 随机 `0..2`。身高和体重分别为 `next(129) + next(128)`。

## Worker 与 Wasm 契约

- Module id：`gen8event`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：45 个 `uint32_t`
- 结果：11 个 `uint32_t`
- 默认 Worker：最多 4 个；调用方最多请求 8 个

```text
Gen8EventPanel
  `-- Gen8EventWorkerPool
        `-- Dedicated Worker x N
              `-- gen8event.mjs + gen8event.wasm
                    `-- gen8event_generate
```

Worker 初始化核对模块 id、共享契约版本、API 版本与 operation。任务核对请求宽度、分片范围、Wasm 指针、堆范围、错误码、结果数量、处理计数和缓冲区长度。Pool 按 `chunkIndex` 恢复乱序批次；取消、崩溃、协议错误或未知批次会终止并清空 Worker，后续任务按需重建。

## 翻译与界面

简体中文逐字采用 `Form/i18n/PokeFinder_zh.ts`，包括“第八世代配信乱数”“乱数信息”“设置”“导入”“种类”“PID类型”“非异色”“随机”“星星”“方块”“定点乱数”“锁性格”和“孵化乱数”。`EC`、`IV Count`、文件格式与文件打开错误在上游未完成翻译，因此保留英文源字符串。日文 Event8、StaticModel8 与 Filter 词条均未完成翻译，保留英文源字符串。

界面使用紧凑 operational workspace：档案摘要位于顶部，RNG 信息与设置/筛选在桌面并排，设置和筛选使用标签切换，结果表占据剩余高度并独立滚动。`1280px` 以下重排为单栏；触屏断点把 40px 紧凑控件提升到 44px。

## 固定夹具与验证

- `Test/Gen8/event8.json`：PokeFinder 上游 Manaphy 固定数据，Seed `1234567887654321 / 8765432112345678`，帧 `0..9`。
- 首行：EC `220345D0`、PID `8FD266FA`、IV `15/30/31/19/31/31`、Nature `24`、Ability Index `93`、Gender `2`、Shiny `0`、Height `52`、Weight `48`、Characteristic `11`。
- `wasm/modules/gen8event/tests/gen8event_native_test.cpp`：覆盖上游十帧、五种 PID Type、零 Seed、推进溢出和结果上限。
- `src/features/gen8event/domain.test.ts`：覆盖输入边界、`.wb8`、确定性分片、45-word 编码、派生值和解码上限。
- `src/features/gen8event/preview/Gen8EventUiPreviewEngine.test.ts`：覆盖筛选、不可满足的觉醒属性和取消。
- `src/features/gen8event/worker/Gen8EventWorkerPool.test.ts`：覆盖乱序批次、数值选项、结果上限传递、取消和缓冲区长度。

模块完成后的实际命令与结果记录在 `docs/progress.md`；源码和夹具存在不等于生产页面算法已经验收。

## 上游与许可

行为改编自 PokeFinder 4.3.2：

- `Form/Gen8/Event8.cpp`、`Event8.hpp`、`Event8.ui`
- `Form/Controls/Filter.cpp`、`Filter.hpp`、`Filter.ui`
- `Form/Controls/TextBox.cpp`、`TextBox.hpp`
- `Core/Gen8/Generators/EventGenerator8.cpp`、`EventGenerator8.hpp`
- `Core/Gen8/States/State8.hpp`
- `Core/Gen8/WB8.hpp`
- `Core/Gen8/Profile8.hpp`
- `Core/Parents/Filters/StateFilter.cpp`、`StateFilter.hpp`
- `Core/Parents/States/State.cpp`、`State.hpp`
- `Core/RNG/RNGList.hpp`、`Xorshift.cpp`、`Xorshift.hpp`
- `Core/Util/Nature.cpp`、`Nature.hpp`、`Utilities.hpp`
- `Model/Gen8/StaticModel8.cpp`、`StaticModel8.hpp`
- `Form/i18n/PokeFinder_zh.ts`、`PokeFinder_ja.ts`
- `Test/Gen8/EventGenerator8Test.cpp`、`EventGenerator8Test.hpp`、`event8.json`

只读上游路径为 `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master`。保留 PokeFinder 的 GPL-3.0-or-later 许可、版权归属、对应源码提供义务和商标免责声明。PokeRNGKit 不是 Nintendo、Creatures 或 GAME FREAK 的官方产品，也未获其认可。
