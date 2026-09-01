# 第七世代 Stationary RNG

## 功能范围

本模块对应 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VII `Stationary RNG` 与 `Search7_Normal()`：

- 支持 Sun、Moon、Ultra Sun、Ultra Moon 的 SFMT 定点帧生成。
- 从 `Gen7/PKM7.cs` 生成 228 条版本限定模板，覆盖御三家、化石、礼物、交换、Poke Pelago、Totem、普通定点、各地区传说、Ultra Beast 与 Ultra Space Wilds。
- 支持 3DSRNGTool 的 NPC 模型状态、下雨 phase、Blink / Safe Frame、DelayType 1–27 和奇数 DelayType 4 转 6。
- 支持普通定点、Poke Pelago、In-Game Trade、Gift OT TSV、Ditto 固定性格、Shiny Lock、Forced Shiny、Shiny Charm 与固定 3V。
- 支持 IV、性格、觉醒属性、性别、特性、异色、方块异色、完美 IV 数量和 Blink 筛选。
- 提供单 Dedicated Worker、分批进度、取消、结果上限、虚拟滚动、排序和 CSV。

本模块已把 `Around Target` 的目标帧 ±100 映射到普通连续帧请求。Timeline 控件按上游 Stationary 可见性保留，但在专用时间线算法接入前保持禁用；`Timeline Leap` 仍仅属于 Gen VII Event，Main RNG Tool 继续使用独立工作区。

生产 RNG 只在 `gen7stationary` Worker 内的 WebAssembly 执行。React/TypeScript 负责输入、模板权限、请求校验、结果解码和展示；UI 预览引擎只生成布局样例，不能作为算法结果证据。

## 输入限制

空的十进制或十六进制文本按 `0` 解释。HTML 控件和 Domain 同时执行下表约束。

| 输入                                        | 进制与范围                                            | 默认值与跨字段行为                                                                  | 上游依据                                                                   |
| ------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Game Version                                | Sun、Moon、Ultra Sun、Ultra Moon                      | 模板必须属于所选版本；Sun/Moon 起始帧为 `418`，Ultra Sun/Ultra Moon 为 `478`        | `MainForm.cs`、`Util/FuncUtil.cs::getstartingframe()`                      |
| Seed                                        | 十六进制，8 位，`0..0xFFFFFFFF`                       | 空值为 `0`                                                                          | `MainForm.Designer.cs` 的 `Seed.Mask = "AAAAAAAA"`；`RNG/SFMT.cs`          |
| Initial Frame                               | 十进制，起始帧到 `1000000000`                         | 选择版本时重置到对应起始帧                                                          | `MainForm_Load()` 对 `Frame_min.Maximum` 的运行时覆盖；`FuncUtil.MAXFRAME` |
| Max Frame                                   | 十进制，`Initial Frame..1000000000`                   | 闭区间；当前静态浏览器会话额外限制绝对帧不超过 `5000000`                            | `MainForm_Load()`、`Search7_Normal()`；PokeRNGKit 浏览器预算               |
| TSV                                         | 十进制，`0..4095`                                     | Gift / Trade 模板存在 OT TSV 时使用模板值                                           | `MainForm.Designer.cs` 的 `TSV.Maximum`；`Stationary7.UseTemplate()`       |
| TRV                                         | 十六进制，1 位，`0..F`                                | 用于区分方块异色                                                                    | `MainForm.Designer.cs` 的 `TRV.Mask = "A"`；`Stationary7.Generate()`       |
| Category / Pokemon                          | 18 类、228 条模板                                     | 仅显示所选版本的模板；概念模板开放自定义字段                                        | `Gen7/PKM7.cs`、`MainForm.cs::SetPersonalInfo()`                           |
| Synchronize                                 | None 或 25 种性格                                     | 固定性格模板忽略选择；不支持同步的模板必须为 None                                   | `MainForm.cs::getStaSettings()`、`StationaryRNG.UseTemplate()`             |
| NPC                                         | 十进制，`0..100`                                      | 内部模型数为 `NPC + 1`；NPC 为 0 时开放 Blink Frame，否则开放 Safe Frame            | `MainForm.Designer.cs` 的默认 `NumericUpDown` 上限；`NPC_ValueChanged()`   |
| Delay                                       | 十进制，模板最小值 `min(template.delay, 0)` 到 `4000` | 上游步进为 2；实际时间为截断除法 `delay / 2 + 2`；DelayType 4 的奇数值按类型 6      | `MainForm.Designer.cs`、`SetPersonalInfo()`、`getsetting()`                |
| Consider Delay                              | 布尔值                                                | 关闭时重置模型状态，不执行模板 DelayType                                            | `RNGPool.Gen7Delay()`                                                      |
| Raining                                     | 布尔值                                                | 仅概念模板或上游标记为下雨的模板可编辑                                              | `MainForm.cs::SetPersonalInfo()`、`ModelStatus.NextState()`                |
| Shiny Charm                                 | 布尔值                                                | 在未锁闪且非 Always Sync 的普通定点中将 PID 抽取设为 3 次；Ditto 分支按上游单独处理 | `StationaryRNG.SetValue()`、`Stationary7.UseTemplate()`                    |
| Poke Pelago Shift                           | 十进制，`0..255`                                      | 只对 Poke Pelago 模板可用；运行时把 `Correction.Maximum` 从默认 50 覆盖为 255       | `MainForm.cs::Category_SelectedIndexChanged()`、`Stationary7.Generate()`   |
| Forced Shiny                                | 布尔值                                                | 只对 Ultra Space Wilds 可用                                                         | `MainForm.cs` 的 `ShinyMark` / `Isforcedshiny`、`Stationary7.Generate()`   |
| Custom Species                              | 十进制，`0..807`                                      | 只对概念模板开放                                                                    | `PKM7` 数据范围、`MainForm.cs::getStaSettings()`                           |
| Custom Level                                | 十进制，`0..100`                                      | 只对概念模板开放                                                                    | `MainForm.Designer.cs` 的默认 `NumericUpDown` 上限                         |
| Custom Gender                               | Genderless、Male、Female 或 5 种性别比例              | 内部使用 `0 / 1 / 2 / 30 / 62 / 126 / 190 / 224`                                    | `Util/FuncUtil.cs::getGenderRatio()`                                       |
| Custom Ability                              | Any、Ability 1、Ability 2、Hidden Ability             | 内部使用 `0..3`                                                                     | `MainForm.Designer.cs` 的 `Sta_Ability`；`getStaSettings()`                |
| Custom 3V / Always Synchronize / Shiny Lock | 布尔值                                                | 只对概念模板开放；3V 至少需要 3 个随机 IV 槽                                        | `MainForm.cs::Poke_SelectedIndexChanged()`、`StationaryRNG.SetValue()`     |
| IV range                                    | 六组闭区间，各端 `0..31`                              | 每组最小值不得大于最大值                                                            | `MainForm.Designer.cs` 的 `ivmin* / ivmax*`；`Search_Click()`              |
| Perfect IV Value / Count                    | `0..31` / `0..6`                                      | 结果中大于等于指定值的 IV 数量必须达到 Count                                        | `MainForm.Designer.cs`；`Core/RNGFilters.cs`                               |
| Nature / Hidden Power                       | 25 / 16 项位掩码                                      | 空掩码与全选都表示不缩小结果                                                        | `MainForm.cs::FilterSettings`、`Core/RNGFilters.cs`                        |
| Gender / Ability                            | Any、Male、Female / Any、1、2、H                      | 使用生成结果的内部值筛选                                                            | `MainForm.cs::FilterSettings`、`Core/RNGFilters.cs`                        |
| Shiny                                       | Any、Any Shiny、Square                                | Square 同时要求异色                                                                 | `ShinyOnly`、`SquareShinyOnly`、`Core/RNGFilters.cs`                       |
| Blink                                       | Any、Blink Frame 或 Safe Frame                        | Blink Frame 仅 NPC 0；Safe Frame 仅 NPC 大于 0；Disable Filters 不跳过 Blink 条件   | `FuncUtil.getblinkflaglist()`、`Search7_Normal()`                          |
| Result Limit                                | `1..100000`                                           | 当前 UI 固定为 100000                                                               | `MainForm.cs::MAX_RESULTS_NUM`；PokeRNGKit Worker/Wasm 边界                |

上游实际帧上限是 `1000000000`。当前实现为了避免浏览器在初始化阶段线性推进数百万以上 SFMT 状态，把普通会话的绝对最大帧暂时限制为 `5000000`；该保护限制会在性能证据充分后再评估，不改写上游输入记录。

## 模板与特殊分支

生成脚本 `scripts/generate_gen7_stationary_data.mjs` 读取 `Gen7/PKM7.cs`，并保存版本家族、物种、形态、等级、性别、特性、性格、固定 IV、NPC、Delay、DelayType、同步、锁闪、3V、Totem、Ultra Space、Poke Pelago、OT TSV、Trade、Fateful 与 Ditto Post Nature Lock 标志。

模板归属按 SM / USUM 家族收窄到对应游戏，不把仅属于 Sun/Moon 的模板暴露给 Ultra Sun/Ultra Moon，反之亦然。非概念模板只能修改上游允许的 NPC、Delay 和可用 Raining；其余生成标志由 Domain 对照生成数据锁定。

## 算法

`Search7_Normal()` 同时维护三条连续状态：

1. SFMT 主流按目标帧逐次滑动，每个结果可向前读取不同数量的随机数。
2. `ModelStatus` 独立推进 NPC 闪烁冷却和下雨 phase，决定每个实时时间片跨过多少 SFMT 帧。
3. 当前长帧起点的模型快照在该长帧内复用，长帧结束后才从 `ModelStatus` 复制下一份快照。

因此本模块使用单个会话式 Dedicated Worker，不对帧范围做并行分片。Wasm `begin()` 初始化连续状态，`step()` 每次处理最多 65536 帧，Worker 默认以 2048 帧批次让出事件循环；取消直接终止 Worker，下一次任务重新初始化。

`GenerationContext` 移植 `RNGPool.StationaryDelay7()` 的 DelayType 1–27，并保留 Cry、NPC 数变化、状态重排、Poke Pelago、Trade、固定性格 Ditto、Shiny Charm、Shiny Lock、Fateful Square 与 Forced Shiny 的抽取顺序。

## Worker 与 Wasm 契约

- Module id：`gen7stationary`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：57 个 32 位字
- 结果：9 个 `uint32_t`
- Worker：1 个 Dedicated Worker

```text
Gen7StationaryPanel
  `-- Gen7StationaryWorker
        `-- gen7stationary.worker.ts
              `-- gen7stationary.mjs + gen7stationary.wasm
                    |-- gen7stationary_begin
                    `-- gen7stationary_step
```

结果记录包含 Frame、Realtime、64 位 Random Number、EC、PID、压缩 IV、Nature、Ability、Gender、Hidden Power、Shiny / Square、Synchronize、Blink、Delay、PSV 与 PRV。Worker 核对模块 id、共享契约、API 版本、批次序号、处理计数、结果计数、缓冲区长度和每条结果的领域约束。

## 界面与翻译

页头选择 3DSRNGTool 的 Sun、Moon、Ultra Sun 或 Ultra Moon 档案时，同步 GameVersion、TSV、TRV 与 Shiny Charm，并按现有版本切换流程重置起始帧和可用目标模板。同步只在档案 id 或更新时间改变时执行，之后手动修改不会被普通重渲染覆盖。

桌面端使用上下两行 operational workspace：上方设置区、下方结果表各占整行。设置区内部由 RNG Info 独占首行，目标设置与筛选并列在下一行；整个设置面板只保留一条纵向滚动区域，不再把三列分别裁剪和滚动。RNG Info 与 Gen VII Event、Wild 复用同一组件，显示检索范围、目标帧 ±100、Consider Delay、Delay `+4F`、NPC 与 Timeline；Stationary 不显示 Timeline Leap。自定义目标与筛选使用可折叠区域，移动端继续保留横向结果表滚动。

PokeFinder 已有的简体中文控件词条沿用 `Form/i18n/PokeFinder_zh.ts`，包括“设置”“分类”“御三家”“化石”“同步”“闪耀护符”“性格”“特性”“性别”和“觉醒力量”。PokeFinder 没有对应翻译的 3DSRNGTool 专用标签保留英文源字符串，例如 `Consider Delay`、`Raining`、`Forced Shiny`、`Blink Frame`、`Safe Frame`、`Perfect IV Value` 与 `Perfect IV Count`。

## 当前验证状态

2026-09-01 已在项目所有者授权下运行 `npm run build:web`，TypeScript 与 Vite/PWA 生产构建通过；未运行算法测试、原生夹具或生产页面回归。
已验证 `http://127.0.0.1:4173/` 在 `1895×872`、`1280×720`、`1024×768`、`768×1024` 和 `390×844`
下的既有响应式布局；2026-09-01 另在 `http://127.0.0.1:4181/`、约 `1478×679` 的外部 Chrome 中确认设置区与结果区同宽上下排列。手机端控件恢复 44px 触控高度；所有输入均处于
所属面板边界内，无文档横向溢出。已实际点击 `HP 最大` 输入框并打开“游戏版本”下拉，五种尺寸均能获得焦点或打开菜单，
下拉菜单宽度与触发框一致。另在 `http://127.0.0.1:4183/` 确认 Stationary 的共用 RNG Info 包含 Timeline、NPC 与 `+4F`，且不包含 Timeline Leap；控制台无 warning 或 error。

2026-09-01 在 `http://127.0.0.1:4186/`、`1478×679` CSS 视口、`devicePixelRatio ≈ 1.3` 的外部 Chrome 中重新验证：侧栏展开时工作区宽约 `1078px`，收起时约 `1238px`，两种状态均为设置在上、结果在下；收起状态下设置内部为约 `611px + 611px` 两列，RNG Info 占据整行。DOM 几何检查未发现横向裁剪控件，设置区只有根面板一条纵向滚动区域。

生产算法验收仍须等待项目所有者提交、推送并由 GitHub Actions 部署后，使用项目所有者提供的准确生产 URL 执行。

## 上游与许可

主要上游文件：

- `3DSRNGTool/MainForm_Core.cs`
- `3DSRNGTool/MainForm.cs`
- `3DSRNGTool/MainForm.Designer.cs`
- `3DSRNGTool/Gen7/PKM7.cs`
- `3DSRNGTool/Gen7/Stationary7.cs`
- `3DSRNGTool/Gen7/ModelStatus.cs`
- `3DSRNGTool/Core/StationaryRNG.cs`
- `3DSRNGTool/Core/RNGPool.cs`
- `3DSRNGTool/Core/RNGFilters.cs`
- `3DSRNGTool/RNG/SFMT.cs`
- `3DSRNGTool/Util/FuncUtil.cs`

3DSRNGTool 代码按其 MIT 条款记录来源；PokeRNGKit 整体继续按 `GPL-3.0-or-later` 发布，并保留 PokeFinder 版权声明、对应源码提供义务和商标免责声明。PokeRNGKit 不是 Nintendo、Creatures 或 GAME FREAK 的官方产品，也未获其认可。
