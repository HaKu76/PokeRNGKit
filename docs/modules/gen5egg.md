# 第五世代孵化乱数

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

## 功能范围

本模块对应 PokeFinder 4.3.2 的 `Gen 5 Eggs`：

- `Generator`：按 64 位初始 Seed、初始推进数、最大推进数和 Offset 生成 Black、White、Black 2、White 2 的蛋状态。
- `Searcher`：按第五世代 Profile 的 Timer0、日期、按键组合与时间枚举初始 Seed，再对每个 Seed 生成指定推进范围的蛋状态。
- 双亲：父母 A / B 各自设置六项个体值、特性、性别、道具和性格，并支持异国孵化。
- 筛选：异色、性别、特性、性格、觉醒属性和六项个体值；Generator 可取消筛选，Searcher 与上游一致始终启用筛选。
- 结果：Generator 保留上游 17 列，Searcher 保留上游 19 列，并支持遗传来源、能力值、排序、CSV 和虚拟滚动。

生产算法只在独立 Worker 的 C++/WebAssembly 内运行。React/TypeScript 负责表单、领域校验、任务切片、Worker 编排、结果解码和虚拟结果表；UI 预览引擎只提供确定性布局数据，不作为 RNG 结果证据。

## 输入限制

下表记录 Qt 控件配置、Core 参数类型和 Web 行为。空数字文本沿用 `TextBox::getUInt()` / `getULong()`，解释为 `0`。

| 输入                  | 进制与范围                                    | 默认值与跨字段行为                                                             | 上游依据                                                             |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Generator Seed        | 十六进制，最多 16 位，`0..0xFFFFFFFFFFFFFFFF` | 空值为 `0`                                                                     | `Eggs5.cpp` 的 `InputType::Seed64Bit`；`TextBox.cpp`                 |
| Initial Advances      | 十进制，最多 10 位，`0..4294967295`           | Generator / Searcher 默认 `0`；与 Max 的和不得溢出 `uint32_t`                  | `Eggs5.cpp` 的 `InputType::Advance32Bit`；`EggGenerator5` 构造参数   |
| Max Advances          | 十进制，最多 10 位，`0..4294967295`           | Generator 默认 `1000`；Searcher 默认 `100`                                     | `Eggs5.cpp/.ui`；`EggGenerator5` 构造参数                            |
| Offset                | 十进制，最多 10 位，`0..4294967295`           | 空值为 `0`；仅 Generator 使用；`Initial + Offset + Max` 不得溢出 `uint32_t`    | `Eggs5.cpp` 的 `InputType::Advance32Bit`；`EggGenerator5` 构造参数   |
| Start / End Date      | `yyyy-MM-dd`，`2000-01-01..2099-12-31`        | Searcher 使用闭区间；Start 晚于 End 时拒绝；日期在本地保存                     | `Eggs5.cpp::search()`；`DateEdit.cpp`                                |
| Parent IV             | 十进制，六项各为 `0..31`                      | 父母 A / B 默认全 `31`                                                         | `EggSettings.ui` 的十二个 `QSpinBox::maximum = 31`                   |
| Parent Ability        | `0`、`1`、`H`                                 | `H` 的内部值为 `2`                                                             | `EggSettings.cpp::setup(Game::Gen5)`                                 |
| Parent Gender         | Male、Female、Genderless、Ditto               | 仅接受上游八种有序组合；提交前按上游规则规范化父母顺序                         | `EggSettings::isValid()`、`reorderParents()`                         |
| Parent Item           | None、Everstone、六种 Power Item              | 内部值为 `0..7`；两名亲代都携带不变之石或力量道具时保留上游随机选择规则        | `EggSettings.cpp`；`EggGenerator5.cpp`                               |
| Parent Nature         | 25 种性格，内部值 `0..24`                     | 不变之石继承按上游 BW / BW2 分支执行                                           | `EggSettings.cpp`；`EggGenerator5.cpp`                               |
| Egg Specie            | `EggSettings::allowed[]` 中不超过 649 的物种  | 仅允许第五世代可孵化物种；自动完成不允许插入列表外值                           | `EggSettings.cpp::setup(Game::Gen5)`、`ComboBox::enableAutoComplete` |
| Masuda                | 布尔值                                        | 默认关闭；启用后增加五次 PID 重抽机会                                          | `EggSettings.ui`；`EggGenerator5` 构造函数                           |
| Disable Filters       | 布尔值                                        | 仅 Generator 可用；Searcher 的该控件由上游禁用                                 | `Eggs5.cpp::disableControls()`                                       |
| Shiny                 | Any、Not Shiny、Star、Square、Star/Square     | 映射到上游 `StateFilter` 异色筛选                                              | `Filter`、`StateFilter`                                              |
| Gender                | Any、Male、Female、Genderless                 | 对特殊蛋种使用实际生成物种的性别比例                                           | `Filter`、`Utilities::getGender()`                                   |
| Ability               | Any、`0`、`1`、`H`                            | 筛选 `H` 时必须是雄性 + 雌性，且雌性亲代特性为 `H`；百变怪组合不能遗传隐藏特性 | `EggSettings::isValid(true)`、`EggGenerator5.cpp`                    |
| Nature / Hidden Power | 25 / 16 项位掩码                              | Web 空选择按全选处理；编码和 Wasm 边界要求至少一项                             | `Filter`、`StateFilter`                                              |
| Filter IV             | 六组闭区间，各端为 `0..31`                    | 每组最小值不得大于最大值                                                       | `Filter.ui`、`StateFilter`                                           |

第五世代 Profile 的边界沿用 [`gen5profiles.md`](gen5profiles.md)：TID/SID 为 `0..65535`，MAC 最多 12 位十六进制，VCount 为 `0..0xFF`，Timer0 为 `0..0xFFFF` 闭区间，GxStat/VFrame 为 `0..99`，按键数量为 0 到 8 的九个布尔选项。Searcher 只枚举满足 `Skip L/R`、方向键互斥与软复位组合约束的实际按键掩码。

Web 单次任务最多执行 `250,000,000` 次状态评估并保留 `100,000` 条结果。Generator 的评估量为 `Max Advances + 1`；Searcher 的评估量为：

```text
日期数 * Timer0 数 * 合法按键组合数 * 86400 * (Max Advances + 1)
```

该限制使用 BigInt 在创建 Worker 前检查，避免静态页面因多年日期范围或过大推进数长期占用设备；HTML 与领域层仍保留上游完整整数输入范围。

## 双亲与特殊蛋种

合法组合为：Male + Female、Female + Male、Ditto + Female、Female + Ditto、Male + Ditto、Ditto + Male、Genderless + Ditto、Ditto + Genderless。

提交前按 `EggSettings::reorderParents()` 规范化为上游内部顺序：Female/Male、Female/Ditto、Ditto/Male、Ditto/Genderless 会交换父母 A / B 的全部 IV、特性、性别、道具和性格。UI 保留用户输入，TypeScript 编码和 C++ 边界都会再次规范化，避免 Worker 请求绕过表单规则。

尼多兰与电萤虫组合按上游特殊规则选择实际蛋种：

- Nidoran：`29 / 32` 在雌性与雄性个人数据之间选择。
- Volbeat / Illumise：`313 / 314` 在雄性与雌性个人数据之间选择。

结果携带实际物种，用于性别、特性名称、能力值和个人数据校验；上游结果表不增加物种列。

## 算法差异

### Black / White

MT19937 从初始 Seed 高 32 位生成六项基础 IV。BWRNG 先执行 Profile 自动初始推进，再从用户的 Initial Advances 与 Offset 开始逐帧生成物种、性格、隐藏特性判定、力量道具、三项遗传来源和 PID。非百变怪组合中，隐藏特性亲代有 60% 机会传递隐藏特性；百变怪组合跳过隐藏特性继承。

每一结果的 `Advances` 包含 Profile 自动初始推进。Chatot 与 Needle 来自该帧 BWRNG 状态；异国孵化最多额外重抽五次 PID。

### Black 2 / White 2

MT19937 先生成固定 Egg Seed，再由独立 BWRNG 一次确定实际蛋种、性格、特性、遗传来源和 IV。逐帧 BWRNG 只更新 PID、性别、异色、Advances、Chatot 与 Needle。隐藏特性亲代的 BW2 概率为特性 0 `20%`、特性 1 `20%`、隐藏特性 `60%`；百变怪组合只能生成普通特性。

Shiny Charm 在 BW2 增加两次 PID 重抽，异国孵化再增加五次。BW2 的个性值按上游固定蛋阶段的 `EC = 0` 计算，逐帧 PID 更新时不重算。

## Searcher

Searcher 的枚举顺序为：

```text
Timer0 -> 日期 -> 合法按键组合 -> 00:00:00..23:59:59 -> Gen V SHA-1 -> EggGenerator5
```

每个候选初始 Seed 使用相同的双亲、物种、筛选与 `Initial / Max Advances`。结果按 Worker `chunkIndex` 恢复确定顺序，随后显示 Seed、Advances、PID、异色、性格、特性、六项 IV 或遗传来源、觉醒属性、觉醒威力、性别、个性、日期/时间、Timer0 与 Buttons。Searcher 不显示 Generator 的 Chatot 与 Needle，与 `EggSearcherModel5` 的 19 列保持一致。

## Advance Finder

Generator 产生至少一条结果后可以打开共享 `Advance Finder`。弹层默认进入 Chatot 模式，也可切换到 Needles；两组来源数据都按 Generator 原始推进顺序提供，不受结果表当前排序影响。

- Chatot 使用每帧 `0..99` 音高值，支持联合区间观测。
- Needles 使用八方向值，支持精确方向与 `Any` 令牌。
- 弹层复用 `gen4advance` Wasm API v2，只执行连续观测匹配，不在 TypeScript 中复制查找算法。
- 弹层使用共享 `FloatingToolPanel` 居中显示，支持标题栏拖动、键盘方向键移动、遮罩点击、`Escape`、关闭按钮、焦点约束与恢复。
- `Jump to Advance` 关闭弹层，在当前排序后的结果表中选中同一结果，并把虚拟列表滚动到对应行。

Searcher 不显示该入口；其结果改为交给 Adjacent Seeds 继续核对日期时间、Buttons 与 Roamer 类型。

## Worker 与 Wasm 契约

- Module id：`gen5egg`
- Contract version：`1`
- Wasm API version：`2`
- Operations：`generator`、`searcher`
- 请求：73 个 `uint32_t`
- 结果：16 个 `uint32_t`
- 默认 Worker：最多 4 个；调用方最多请求 8 个

```text
Gen5EggPanel
  `-- Gen5EggWorkerPool
        `-- Dedicated Worker x N
              `-- gen5egg.mjs + gen5egg.wasm
                    `-- gen5egg_search
```

Worker 初始化验证模块 id、共享契约版本、API 版本与两种 operation。任务验证请求宽度、分片、Wasm 指针对齐、堆范围、错误码、结果数量、处理计数和结果缓冲长度。Pool 拒绝无效数值选项，按 `chunkIndex` 恢复乱序批次；取消、Worker 崩溃、协议错误或未知批次会终止并清空 Worker，后续搜索按需重建。模块不使用 `SharedArrayBuffer`、Wasm pthread、COOP/COEP 或跨源隔离。

## 翻译与界面

简中标签逐字采用 `Form/i18n/PokeFinder_zh.ts`，包括“第五世代孵化乱数”“生成器”“检索器”“乱数信息”“初始帧”“最大帧数”“起始日期”“最后日期”“筛选项”“父母A”“父母B”“蛋种类”“异国”“显示遗传来源”和六种力量道具。

上游未完成简中翻译的 `Profile`、`Manager`、`Offset`、`Needle`、`Buttons`、隐藏特性亲代错误等保留英文源字符串。结果表严格匹配 `EggGeneratorModel5` 的 17 列和 `EggSearcherModel5` 的 19 列。

界面采用 HakuStyle compact operational workspace：Profile 摘要使用稳定工作带，Generator / Searcher 为单行分段控件，RNG、双亲设置与筛选在宽屏三列、普通桌面两列、窄屏单列重排。控件在桌面使用 40px 紧凑高度，触屏断点提升到 44px；结果区为单层横向滚动与纵向虚拟表，不使用嵌套卡片、渐变或装饰性动画。

## 固定夹具与验证

- `Test/Gen5/egg5.json`：Black / Black 2 的 Bulbasaur、Nidoran、Illumise / Volbeat 六组共 60 帧。
- `wasm/modules/gen5egg/tests/gen5egg_native_test.cpp`：覆盖六组 PID 与 Advances、每组首帧完整状态、非法分片、推进溢出、结果上限和 SHA 固定值。
- `src/features/gen5egg/domain.test.ts`：覆盖 Seed、空十进制输入、推进数、双亲顺序与遗传来源、隐藏特性、按键、日期、任务预算、确定性切片、71-word 编码、结果解码上限和 BW/BW2 派生值。
- `src/features/gen5egg/worker/Gen5EggWorkerPool.test.ts`：覆盖乱序批次、有效结果上限传递、数值选项、取消和结果长度校验。
- `src/features/gen5egg/preview/Gen5EggUiPreviewEngine.test.ts`：覆盖特殊蛋种、隐藏特性筛选、非零按键组合和预取消。

2026-08-14 已通过：

- `npm test -- src/features/gen4advance src/features/gen5egg`：5 个测试文件、23 项测试通过。
- 定向 ESLint 与全仓 TypeScript 通过。
- `$env:POKERNGKIT_WASM_MODULES='gen4advance,gen5egg'; npm run wasm:test:native`：`gen4advance_native_parity` 与 `gen5egg_native_parity` 2/2 通过。
- 完整 `npm run wasm:test:native`：Visual Studio 2026 x64 环境中的 32/32 原生夹具通过，包含 `gen3pidtoiv_native_parity`、`gen4advance_native_parity` 与 `gen5egg_native_parity`。
- 使用 Node `24.19.0`、npm `12.0.2` 的完整 `npm run verify`：格式、ESLint、TypeScript、72 个 Vitest 文件共 278 项测试及 Web/PWA 构建通过；仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 受限终端曾在 Vite 复制现有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过。

浏览器、部署站点和生产算法回归仍需等待部署完成后，由项目所有者提供准确生产 URL 并单独授权。

## 上游与许可

行为改编自 PokeFinder 4.3.2：

- `Form/Gen5/Eggs5.cpp`、`Eggs5.hpp`、`Eggs5.ui`
- `Form/Controls/EggSettings.cpp`、`EggSettings.hpp`、`EggSettings.ui`
- `Form/Controls/Filter.cpp`、`Filter.hpp`、`Filter.ui`
- `Form/Controls/TextBox.cpp`、`TextBox.hpp`、`DateEdit.cpp`、`DateEdit.hpp`
- `Core/Gen5/Generators/EggGenerator5.cpp`、`EggGenerator5.hpp`
- `Core/Gen5/Searchers/Searcher5.hpp`、`SearcherBase5.hpp`
- `Core/Gen5/States/EggState5.cpp`、`EggState5.hpp`、`SearcherState5.hpp`
- `Core/Gen5/Keypresses.cpp`、`Keypresses.hpp`、`Profile5.hpp`
- `Core/Parents/Daycare.cpp`、`Daycare.hpp`
- `Core/Parents/Filters/StateFilter.cpp`、`StateFilter.hpp`
- `Core/RNG/SHA1.*`、`Core/Gen5/Nazos.*`、`Core/RNG/LCRNG64.hpp`、`Core/RNG/MTFast.hpp`
- `Core/Util/Utilities.cpp`、`Utilities.hpp`、`Translator.cpp`、`Translator.hpp`
- `Model/Gen5/EggModel5.cpp`、`EggModel5.hpp`
- `Form/i18n/PokeFinder_zh.ts`
- `Test/Gen5/EggGenerator5Test.cpp`、`EggGenerator5Test.hpp`、`egg5.json`

保留 PokeFinder 的 GPL-3.0-or-later 许可、上游作者归属、对应源码提供义务和商标免责声明。PokeRNGKit 不是 Nintendo、Creatures 或 GAME FREAK 的官方产品，也未获其认可。
