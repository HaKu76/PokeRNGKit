# 第五世代配信乱数

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

## 功能范围

本模块对应 PokeFinder 4.3.2 的 `Gen 5 Event`，支持导入第五世代 `.pgf` 配信卡，并提供 `Generator` 与 `Searcher` 两种操作。

- Generator 按 64 位初始 Seed、Initial Advances、Max Advances 与 Offset 生成配信状态。
- Searcher 按第五世代 Profile 的 Timer0、日期、合法按键组合和一天内 86,400 秒枚举初始 Seed，再生成指定推进范围。
- 配信参数包括 TID、SID、物种、固定或随机性格、性别约束、特性约束、异色约束、等级、蛋标记和六项固定或随机个体值。
- 筛选覆盖个体值、性格、觉醒属性、特性、性别与异色；Generator 可以取消筛选，Searcher 始终启用筛选。
- Generator 保留上游 17 列结果，Searcher 保留上游 19 列结果，并支持能力值显示、排序与纵向虚拟化。
- Generator 结果可打开上游 `Advance Finder`，按 Chatot 或 Needle 观测序列定位并跳转到对应结果行。

生产算法只在独立 Worker 的 C++/WebAssembly 中运行。React/TypeScript 负责 PGF 解析、表单校验、分片、Worker 调度、结果解码和显示；UI 预览引擎只提供确定性布局数据，不作为 RNG 验收证据。

## 输入限制

| 输入                  | 进制与范围                                    | 默认值与行为                                             | 上游来源                                                              |
| --------------------- | --------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Generator Seed        | 十六进制，最多 16 位，`0..0xFFFFFFFFFFFFFFFF` | 空值按 `0`                                               | `Event5.cpp` 的 `InputType::Seed64Bit`；`TextBox.cpp`                 |
| Initial Advances      | 十进制，最多 10 位，`0..4294967295`           | Generator / Searcher 默认 `0`                            | `Event5.cpp` 的 `InputType::Advance32Bit`；`EventGenerator5` 构造参数 |
| Max Advances          | 十进制，最多 10 位，`0..4294967295`           | Generator 默认 `1000`；Searcher 默认 `100`               | `Event5.cpp/.ui`；`EventGenerator5` 构造参数                          |
| Offset                | 十进制，最多 10 位，`0..4294967295`           | 空值按 `0`；仅 Generator 使用                            | `Event5.cpp` 的 `InputType::Advance32Bit`                             |
| Start / End Date      | `yyyy-MM-dd`，`2000-01-01..2099-12-31`        | Searcher 使用闭区间；Start 晚于 End 时拒绝               | `Event5.cpp::search()`；`DateEdit.cpp`                                |
| Event TID / SID       | 十进制，最多 5 位，`0..65535`                 | 初始空值按 `0`；导入 PGF 后显示偏移 `0x00 / 0x02` 的值   | `TextBox.cpp`；`PGF.hpp`；`Event5.cpp`                                |
| Species               | 十进制，`1..649`                              | PGF 小端偏移 `0x1A`                                      | `PGF.hpp`；Gen V personal data                                        |
| Nature                | 固定 `0..24` 或随机 `255`                     | 未勾选固定性格时为 `255`                                 | `PGF.hpp`；`Event5.cpp::getGeneratorParameters()`                     |
| Gender                | `0` 仅雄性、`1` 仅雌性、`2` 随机              | PGF 偏移 `0x35`                                          | `Event5.ui`；`PGF.hpp`                                                |
| Ability               | `0`、`1`、`H`、`0/1`                          | 内部值依次为 `0..3`                                      | `Event5.ui`；`PGF.hpp`；`EventGenerator5.cpp`                         |
| Shiny                 | Random、Never、Always                         | 内部值 `0..2`                                            | `Event5.ui`；`PGF.hpp`                                                |
| Level                 | 十进制，`1..100`                              | PGF 偏移 `0x5B`                                          | `Event5.ui` 的 `QSpinBox minimum=1 maximum=100`；`PGF.hpp`            |
| Event IV              | 六项各为固定 `0..31` 或随机 `255`             | 未勾选固定项时为随机；顺序为 HP、Atk、Def、SpA、SpD、Spe | `Event5.cpp`；`PGF.hpp`                                               |
| Egg                   | 布尔值                                        | PGF `0x5C == 1`；蛋模板的 TSV 固定为 `0`                 | `PGF.hpp`；`EventGenerator5.cpp`                                      |
| Filter IV             | 六组闭区间，各端 `0..31`                      | 每组最小值不得大于最大值                                 | `Filter.ui`；`StateFilter`                                            |
| Nature / Hidden Power | 25 / 16 项位掩码                              | 编码与 Wasm 边界至少选择一项                             | `Filter`；`StateFilter`                                               |

第五世代 Profile 的输入边界沿用 [`gen5profiles.md`](gen5profiles.md)：TID/SID 为 `0..65535`，MAC 最多 12 位十六进制，VCount 为 `0..0xFF`，Timer0 为 `0..0xFFFF` 闭区间，GxStat/VFrame 为 `0..99`。Searcher 只枚举符合 `Skip L/R`、方向键互斥和软复位组合限制的按键掩码。

`Initial Advances + Max Advances + Offset` 不得超过 `uint32_t`。Web 单次任务最多执行 `250,000,000` 次状态评估并保留 `100,000` 条结果：

```text
Generator = Max Advances + 1
Searcher = 日期数 * Timer0 数 * 合法按键组合数 * 86400 * (Max Advances + 1)
```

任务规模在 Worker 创建前使用 `BigInt` 校验。

## PGF 文件

`.pgf` 文件必须恰好为 204 字节。解析字段如下：

| 字段                                | 偏移                                      |
| ----------------------------------- | ----------------------------------------- |
| TID / SID                           | `0x00 / 0x02`，小端 16 位                 |
| Species                             | `0x1A`，小端 16 位                        |
| Nature / Gender / Ability / Shiny   | `0x34 / 0x35 / 0x36 / 0x37`               |
| HP / Atk / Def / Spe / SpA / SpD IV | `0x43 / 0x44 / 0x45 / 0x46 / 0x47 / 0x48` |
| Level / Egg                         | `0x5B / 0x5C`                             |

界面保持上游未完成简中翻译的错误原文：`Invalid format`、`Wondercard is not the correct size`、`File error`、`There was a problem opening the wondercard` 与 `Start date is after end date`。

## 算法

每个候选 Seed 先执行与游戏版本、Memory Link 和启动状态一致的第五世代初始推进。配信模板随后从基础 8 次推进开始，并按字段增加消耗：

- 每项随机 IV 增加 2 次推进。
- 固定雄性或雌性增加 2 次推进。
- 随机性格增加 2 次推进。

生成顺序保持 `EventGenerator5`：六项固定或随机 IV、两次丢弃、PID、可选随机性格、结果特性/性别/异色、觉醒属性与强度。`Never` 会把偶然异色 PID 翻转为非异色；`Always` 根据 TSV 构造异色 PID；蛋模板使用 `TSV = 0`。特性 `0/1` 根据 PID bit 16 选择普通特性。

Searcher 的候选顺序与 `Searcher5` 一致：

```text
Timer0 -> 日期 -> 合法按键组合 -> 00:00:00..23:59:59 -> Gen V SHA-1 -> EventGenerator5
```

Worker 按 `chunkIndex` 恢复确定性结果顺序。Searcher 表格不显示 Generator 的 Chatot 与 Needle，而增加 Seed、日期/时间、Timer0 和 Buttons。

## Worker 与 Wasm 契约

- Module id：`gen5event`
- Contract version：`1`
- Wasm API version：`2`
- Operations：`generator`、`searcher`
- 请求：66 个 `uint32_t`
- 结果：11 个 `uint32_t`
- 默认 Worker：最多 4 个；调用方最多请求 8 个

```text
Gen5EventPanel
  `-- Gen5EventWorkerPool
        `-- Dedicated Worker x N
              `-- gen5event.mjs + gen5event.wasm
                    `-- gen5event_search
```

桥内嵌 PokeFinder Gen V personal data，用于性别比和三项特性编号，不从 UI 请求中重复传输。Worker 检查模块 id、共享契约、API、operation、请求宽度、Wasm 指针对齐、堆边界、错误码、处理计数和结果缓冲区长度。Pool 拒绝 NaN/Infinity 选项，取消时终止并重建 Worker，且不使用 `SharedArrayBuffer`、Wasm pthread 或跨源隔离。

## 界面

简中控件逐字复用 `Form/i18n/PokeFinder_zh.ts`：第五世代配信乱数、生成器、检索器、乱数信息、初始帧、最大帧数、设置、种类、特性、性别、仅 ♂、仅 ♀、随机、性格、异色、配信TID、配信SID、孵化乱数、导入、筛选项、起始日期、最后日期、检索、取消、等级、Offset、不能与必定。上游未翻译的 `Needle`、`Buttons` 和 PGF 错误保持英文。

界面采用 HakuStyle compact operational workspace：Profile 摘要为稳定工作带，Generator / Searcher 使用单行分段控件，桌面为 RNG、配信设置和筛选三列，普通屏幕重排为两列，窄屏为单列。物种沿用上游 `ComboBox::enableAutoComplete()` 的不插入自动完成行为；桌面控件高度 40px，触屏断点提升到 44px。结果区使用单层横向滚动与纵向虚拟列表，不使用嵌套卡片、渐变或装饰性背景。Generator 的 `Advance Finder` 使用可拖动居中工具面板；结果表提供单一键盘入口、方向键与 Home / End 定位，匹配后把焦点恢复到排序后的目标行。Searcher 在成功校验任务后把起止日期保存到 `localStorage`，与上游 `QSettings` 的日期恢复行为一致；存储不可用时继续使用当前本地日期，不阻断检索。

## 固定夹具与验证

- `Test/Gen5/event5.json`：Secret Egg Pidove、Spring Meloetta、Snarl Zoroark 三组各 10 帧。
- `wasm/modules/gen5event/tests/gen5event_native_test.cpp`：比较 30 帧的 Advances、PID、Ability Index、六项 IV、Nature、Ability、Gender、Shiny、Hidden Power、Chatot；另以 Black 2 SHA 固定 Seed 验证 Searcher 的日期、秒、Timer0、Buttons 与分片索引。
- `src/features/gen5event/domain.test.ts`：覆盖 64-word 编码、日期/按键任务数、评估数、确定性分片、固定 IV、Generator 空 Keypresses Profile、结果解码上限和范围约束。
- `src/features/gen5event/pgf.test.ts`：覆盖 204 字节限制、字段偏移、IV 顺序和非法字段。
- `src/features/gen5event/dateSettings.test.ts`：覆盖本地日期、有效持久化值、损坏日期、存储不可用与写入失败降级。
- `src/features/gen5event/worker/Gen5EventWorkerPool.test.ts`：覆盖乱序批次、有效结果上限传递、无效数值选项、取消和结果长度校验。
- `src/features/gen5event/preview/Gen5EventUiPreviewEngine.test.ts`：覆盖配信约束、筛选和非零按键组合。

本地原生夹具、Wasm 构建和 UI 预览只作为工程证据。算法结果验收仍需 GitHub Actions 部署完成后，由项目所有者提供准确生产 URL 并单独授权生产回归。

2026-08-14 已通过：

- 从空目录配置并重新编译模块独立 CMake target；`gen5event_native_parity` 1/1 通过，并覆盖 Generator Profile 九项 Keypresses 全关闭的输入。
- `npm test -- src/features/gen5event`：5 个测试文件、22 项测试通过。
- 定向 ESLint、全仓 TypeScript、模块定向 Prettier 与 `git diff --check` 通过。
- 完整 `npm run wasm:test:native`：Visual Studio 2026 x64 环境中的 33/33 原生夹具通过，包含 `gen3pidtoiv_native_parity`、`gen4advance_native_parity` 与 `gen5event_native_parity`。
- 使用 Node `24.19.0` 与 npm `12.0.2` 运行完整 `npm run verify`：格式、ESLint、TypeScript、72 个 Vitest 文件共 281 项测试通过；非受限 Web/PWA 构建成功并生成 `gen5event.worker`，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 受限终端在 Vite 复制现有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一构建命令在非受限环境通过。

## 上游与许可

行为改编自 PokeFinder 4.3.2：

- `Form/Gen5/Event5.cpp`、`Event5.hpp`、`Event5.ui`
- `Form/Controls/Filter.cpp`、`Filter.hpp`、`Filter.ui`
- `Form/Controls/TextBox.cpp`、`TextBox.hpp`、`DateEdit.cpp`、`DateEdit.hpp`
- `Core/Gen5/Generators/EventGenerator5.cpp`、`EventGenerator5.hpp`
- `Core/Gen5/PGF.hpp`
- `Core/Gen5/Searchers/Searcher5.hpp`、`SearcherBase5.hpp`
- `Core/Gen5/States/EventState5.hpp`、`SearcherState5.hpp`
- `Core/Gen5/Keypresses.cpp`、`Keypresses.hpp`、`Profile5.hpp`
- `Core/RNG/SHA1.*`、`Core/Gen5/Nazos.*`、`Core/RNG/LCRNG64.hpp`
- `Core/Util/Utilities.cpp`、`Utilities.hpp`
- `Model/Gen5/EventModel5.cpp`、`EventModel5.hpp`
- `Form/i18n/PokeFinder_zh.ts`
- `Test/Gen5/EventGenerator5Test.cpp`、`EventGenerator5Test.hpp`、`event5.json`
- `Core/Resources/Personal/Gen5/personal_b2w2.bin`

保留 PokeFinder 的 GPL-3.0-or-later 许可、上游作者归属、源代码分发义务和商标免责声明。PokeRNGKit 不是 Nintendo、Creatures 或 GAME FREAK 的官方产品，也未获其认可。
