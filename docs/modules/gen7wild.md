# 第七世代 Wild RNG

## 功能范围

本模块对应 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VII `Wild RNG`、`Search7_Normal()` 与 `Wild7`：

- 支持 Sun、Moon、Ultra Sun、Ultra Moon 的普通野生、Ultra Beast、Island Scan、Fishing、Ambush Encounters 与 Berry Tree。
- 从上游遭遇表生成 SM / USUM 四版本昼夜槽位、地点、等级、NPC、Correction、Raining、出现率、延时和属性元数据。
- 支持 Fishing Bubbling / Overview、Ambush 触发方式、Bite Delay、Delay2、Wild Cry 和版本限定钓鱼参数。
- 支持 Synchronize、Cute Charm、Static、Magnet Pull、Compound Eyes、Suction Cups / Sticky Hold、Pressure / Hustle / Vital Spirit、Black Flute 与 White Flute。
- 支持 Shiny Charm、IV、性格、觉醒力量、性别、特性、异色、方块异色、槽位、特殊遭遇、等级、完美 IV 数量和 Blink / Safe Frame 筛选。
- 提供单 Dedicated Worker、会话式分批进度、取消、结果上限、虚拟滚动、排序和 CSV。

Poke Pelago 特殊遭遇已归入 `Stationary RNG`，不在 Wild 中重复实现。SOS 连锁使用独立生成顺序与参数，将由 `SOS RNG` 模块处理。

生产 RNG 只在 `gen7wild` Worker 内的 WebAssembly 执行。React/TypeScript 负责输入、遭遇数据选择、请求校验、结果解码和展示；UI Preview 只生成布局样例，不能作为算法结果证据。

## 输入限制

空的十进制或十六进制文本按 `0` 解释。HTML 控件和 Domain 同时执行下表约束。

| 输入                         | 进制与范围                          | 默认值与跨字段行为                                                            | 上游依据                                                                      |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Game Version                 | Sun、Moon、Ultra Sun、Ultra Moon    | 地点和特殊遭遇必须属于所选版本；SM 起始帧 `418`，USUM 起始帧 `478`            | `MainForm.cs`、`Util/FuncUtil.cs::getstartingframe()`                         |
| Seed                         | 十六进制，8 位，`0..0xFFFFFFFF`     | 空值为 `0`                                                                    | `MainForm.Designer.cs` 的 `Seed.Mask = "AAAAAAAA"`；`RNG/SFMT.cs`             |
| Initial Frame                | 十进制，版本起始帧到 `1000000000`   | 选择版本时重置到对应起始帧                                                    | `MainForm_Load()`、`FuncUtil.MAXFRAME`                                        |
| Max Frame                    | 十进制，`Initial Frame..1000000000` | 闭区间；当前浏览器绝对帧保护上限为 `10000000`                                 | `MainForm_Load()`、`Search7_Normal()`；PokeRNGKit 浏览器预算                  |
| TSV                          | 十进制，`0..4095`                   | 用于 PID 异色判定                                                             | `MainForm.Designer.cs` 的 `TSV.Maximum`；`Wild7.Generate()`                   |
| TRV                          | 十六进制，1 位，`0..F`              | 用于区分方块异色                                                              | `MainForm.Designer.cs` 的 `TRV.Mask = "A"`；`Wild7.Generate()`                |
| Category                     | 6 类                                | Normal Wild、UB、Island Scan、Fishing、Ambush Encounters、Berry Tree          | `MainForm.Designer.cs`、`MainForm.cs::getWildSettings()`                      |
| Pokemon / Location           | 上游版本限定清单                    | UB / Island Scan 先选择特殊宝可梦，再收窄地点；其他分类直接选择地点           | `Gen7/Gen7Encounter/*`、`MainForm.cs::SetWildArea()`                          |
| Day / Night                  | 布尔模式                            | 切换 Sun/Moon 对应的昼夜槽位；Moon 系版本按上游反转版本侧                     | `Gen7/Gen7Encounter/EncounterArea.cs`、`Wild7.UseArea()`                      |
| Bubbling / Overview          | 布尔值                              | 只对 Fishing 开放；影响 USUM 等级上限、槽位类型、平台延时和全局延时类型       | `Gen7/Wild7.cs::getSpecialRate()`、Fishing 分支                               |
| Trigger Method               | Default、Step、X Menu               | 只对部分 Ambush Encounters 开放                                               | `MainForm.cs::SetMiscDelay()`、`Wild7.UseArea()`                              |
| NPC                          | 十进制，`0..100`                    | 内部模型数为 `NPC + 1`                                                        | `MainForm.Designer.cs` 默认 `NumericUpDown`；`ModelStatus`                    |
| Correction                   | 十进制，`0..50`                     | 普通、UB 与 Island Scan 使用地点值；Fishing、Ambush、Berry 由上游延时分支处理 | `MainForm.Designer.cs`、`Wild7.UseArea()`                                     |
| Raining                      | 布尔值                              | 启用时每个模型时间片额外推进下雨 phase                                        | `MainForm.cs::SetWildArea()`、`ModelStatus.NextState()`                       |
| Minimum / Maximum Level      | 十进制，各 `1..100`                 | Minimum 不得大于 Maximum；Fishing Bubbling 可按上游增加 5 级                  | `MainForm.Designer.cs` 默认 `NumericUpDown`；`Wild7.UseArea()`                |
| Rate                         | 十进制，`0..100`                    | UB / Island Scan 使用地点出现率；Fishing 默认特殊率 `80`                      | `MainForm.Designer.cs`、`Wild7.getSpecialRate()`                              |
| Bite Delay                   | 十进制，`0..100`                    | Fishing 默认按地点取 `78 / 89 / 97`                                           | `MainForm.Designer.cs`、`Wild7.Fishing()`                                     |
| Delay2                       | 十进制，`0..10000`，步长 2          | 只对 Ambush 开放；进入算法前截断除以 2                                        | `MainForm.Designer.cs` 的 `Delay2.Maximum` / `Increment`；`getWildSettings()` |
| Lead                         | 11 项                               | Synchronize 才允许选择 25 种同步性格                                          | `MainForm.Designer.cs`、`Core/WildRNG.cs`                                     |
| Shiny Charm / Consider Delay | 布尔值                              | Shiny Charm 在未锁闪分支增加 PID 抽取；关闭 Consider Delay 跳过遭遇延时       | `Wild7.Generate()`、`RNGPool.WildDelay()`                                     |
| IV range                     | 六组闭区间，各端 `0..31`            | 每组最小值不得大于最大值                                                      | `MainForm.Designer.cs`、`Core/RNGFilters.cs`                                  |
| Perfect IV Value / Count     | `0..31` / `0..6`                    | 结果中大于等于指定值的 IV 数量必须达到 Count                                  | `MainForm.Designer.cs`、`Core/RNGFilters.cs`                                  |
| Nature / Hidden Power        | 25 / 16 项位掩码                    | 空掩码与全选都表示不缩小结果                                                  | `MainForm.cs::FilterSettings`、`Core/RNGFilters.cs`                           |
| Gender / Ability             | Any、Male、Female / Any、1、2、H    | 使用生成结果内部值筛选                                                        | `MainForm.cs::FilterSettings`、`Core/RNGFilters.cs`                           |
| Shiny                        | Any、Any Shiny、Square              | Square 同时要求异色                                                           | `ShinyOnly`、`SquareShinyOnly`、`Core/RNGFilters.cs`                          |
| Slot / Special / Level       | 槽位掩码、布尔值、`0..100`          | Level `0` 表示任意；Special Only 只保留特殊遭遇                               | `MainForm.cs::FilterSettings`、`Core/RNGFilters.cs`                           |
| Blink                        | Any、Blink Only、Safe Frame Only    | Blink 条件在 Disable Filters 时仍由连续帧模型处理                             | `FuncUtil.getblinkflaglist()`、`Search7_Normal()`                             |
| Result Limit                 | `1..100000`                         | 当前 UI 固定为 `100000`                                                       | `MainForm.cs::MAX_RESULTS_NUM`；PokeRNGKit Worker/Wasm 边界                   |

上游实际帧上限是 `1000000000`。当前实现为了限制浏览器初始化和连续 SFMT 推进成本，将绝对最大帧暂时限制为 `10000000`；该保护限制不改写上游输入记录。

## 遭遇数据

生成脚本 `scripts/generate_gen7_wild_data.mjs` 分别读取 `EncounterArea7.SlotType` 的物种槽位映射、`WildRNG.SlotDistribution` 的概率分布、`Gen7/Gen7Encounter`、`PKMW7` 和关联数据文件，输出 `src/features/gen7wild/data.ts`：

- 普通地点：SM 89、USUM 91。
- Fishing：SM 21、USUM 19。
- Ambush Encounters：SM 19、USUM 21。
- Berry Tree：SM 11、USUM 10。
- Ultra Beast：SM 8、USUM 2。
- Island Scan：SM 28、USUM 28。

每个槽位保存物种、形态、性别阈值、随机性别、固定 3V、Electric 和 Steel 标志；地点保存四版本昼夜槽位、等级、NPC、Correction、Raining、Fishing / Ambush 延时和版本限定文本。

## 算法

`Search7_Normal()` 同时维护 SFMT 主流、NPC `ModelStatus`、当前长帧模型快照与 Blink 标记。每个目标帧先根据遭遇类型执行特殊率、槽位、等级和 Lead 判定，再执行 Wild Delay、EC、PID、IV、特性、性格、性别和持有物抽取。

Fishing 保留冒泡、Overview、咬勾、平台、宝可梦出现和钓起物品阈值；内部 `Pokemon delay` 按上游 `((Timedelay + 4) / 2)` 派生为 `1 / 2`，非 Fishing 请求在该 ABI 字段写入 `1`，实际遭遇延时仍使用各分类自己的 `delayTime`。Ambush 保留全局 Delay、Inline Delay2、Honey 修正和 Cry；Berry Tree 固定使用脚本等级和单槽位。Ultra Beast 特殊分支保留锁闪与固定 3V 元数据。

连续状态不能按帧范围并行拆开，因此模块使用单个会话式 Dedicated Worker。Wasm `begin()` 初始化状态，`step()` 允许 `1..65536` 帧，Worker 默认每批处理 `16384` 帧并让出事件循环；取消时终止 Worker，下一任务重新创建实例。

## Worker 与 Wasm 契约

- Module id：`gen7wild`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：91 个 32 位字
- 结果：11 个 32 位字
- Worker：1 个 Dedicated Worker

```text
Gen7WildPanel
  `-- Gen7WildWorker
        `-- gen7wild.worker.ts
              `-- gen7wild.mjs + gen7wild.wasm
                    |-- gen7wild_begin
                    `-- gen7wild_step
```

结果记录包含 Frame、Realtime、64 位 Random Number、EC、PID、压缩 IV、Nature、Ability、Gender、Hidden Power、Shiny / Square、Synchronize、Blink、Delay、Species、Form、Level、Slot、Item 与 Special Value。Worker 核对模块 id、共享契约、API 版本、批次序号、处理计数、结果计数、缓冲区长度和每条结果的领域约束。

## 界面与翻译

桌面使用双列 operational workspace：左侧按 RNG Info、Encounter、Lead 和 Filters 分组，右侧结果表占据主要宽度并独立滚动；窄屏重排为单列。图标按钮使用可访问名称和 tooltip，计算、取消、错误、空结果和结果上限保持稳定布局。

简体中文逐字复用 `3DSRNGTool/Resources/text/lang_zh.txt` 已存在的 `野生乱数`、`野生草丛遇敌设置`、`游戏版本`、`地点`、`NPC数`、`帧数修正`、`等级范围`、`出现率`、`咬勾延时`、`延迟2 (F)`、`队首`、`触发方式`、`冒泡`、`预览`、`下雨`、`考虑时间延迟`、`标记`、`时间`、`道具`、`仅准确帧` 和 `只显示特殊`。无简中词条的控件保留 English source label。

## 当前验证状态

本轮未获授权运行测试、类型检查、原生夹具、Wasm 构建、Vite 构建或浏览器检查。源码已加入 Domain、UI Preview、Worker 协议和原生会话夹具，但这些文件尚未执行；不能据此声明算法或界面已通过。

生产算法验收仍须等待项目所有者提交、推送并由 GitHub Actions 部署后，使用项目所有者提供的准确生产 URL 执行。

## 上游与许可

主要上游文件：

- `3DSRNGTool/MainForm.cs`
- `3DSRNGTool/MainForm_Core.cs`
- `3DSRNGTool/MainForm.Designer.cs`
- `3DSRNGTool/Gen7/Wild7.cs`
- `3DSRNGTool/Core/WildRNG.cs`
- `3DSRNGTool/Core/RNGPool.cs`
- `3DSRNGTool/Core/RNGFilters.cs`
- `3DSRNGTool/Gen7/Gen7Encounter/*`
- `3DSRNGTool/Gen7/PKMW7.cs`
- `3DSRNGTool/Gen7/ModelStatus.cs`
- `3DSRNGTool/RNG/SFMT.cs`
- `3DSRNGTool/Util/FuncUtil.cs`
- `3DSRNGTool/Resources/text/lang_zh.txt`

3DSRNGTool 代码按其 MIT 条款记录来源；PokeRNGKit 整体继续按 `GPL-3.0-or-later` 发布，并保留 PokeFinder 版权声明、对应源码提供义务和商标免责声明。PokeRNGKit 不是 Nintendo、Creatures 或 GAME FREAK 的官方产品，也未获其认可。
