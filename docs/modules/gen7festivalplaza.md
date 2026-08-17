# 第七世代 Festival Plaza Facility RNG

## 功能范围

`gen7festivalplaza` 实现 3DSRNGTool `Misc RNG Tool -> Festival Plaza` 的设施生成工作流：

- 支持 Sun、Moon、Ultra Sun、Ultra Moon 的 Gen VII SFMT64 连续帧。
- 支持 NPC 眨眼模型、Delay、19 个 Rank 档位，以及 Stars、Facility、NPC 和 Color 筛选。
- 按当前帧 64 位 Random Number 的低 32 位重播 TinyMT，依次生成星级、设施、NPC 和颜色。
- 显示 Index、Actual Hit、Mark、Clock、Facility、Random Number、Real Time 和可选 NPC Status；Mark 按上游 `Frame_Misc` 映射为 `-`、`★`、`?`、`? ★`、`E`，其余值保留十进制。
- 提供单 Dedicated Worker、分批进度、取消、100000 行结果上限、虚拟滚动、排序、CSV 和 Index 回写。

生产 RNG 只在 `gen7festivalplaza` Worker 内的 WebAssembly 执行。React/TypeScript 负责输入规范化、设施池联动、请求校验、结果解码和展示；UI Preview 只生成确定性布局样例，不能作为算法证据。

上游 revision：`359bdd7a9ff7c145fec12302cf43da932923fa62`。

主要上游文件：

- `3DSRNGTool/Subforms/MiscRNGTool.cs`
- `3DSRNGTool/Subforms/MiscRNGTool.Designer.cs`
- `3DSRNGTool/Gen7/FPFacility.cs`
- `3DSRNGTool/Core/RNGPool.cs`
- `3DSRNGTool/Gen7/ModelStatus.cs`
- `3DSRNGTool/Controls/Frame_Misc.cs`
- `3DSRNGTool/Controls/HexMaskedTextBox.cs`
- `3DSRNGTool/Controls/StringItem.cs`
- `3DSRNGTool/Resources/text/lang_zh.txt`
- `Data/FestivalPlazaFacilities.md`

## 已核验输入

| 输入           | 上游依据                                                                        | 范围与行为                                                                         |
| -------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Game           | `MiscRNGTool.Game`、`FPFacility.GameVer`                                        | Sun、Moon、Ultra Sun、Ultra Moon；决定日/月设施池和 Switcheroo 是否可用            |
| Seed           | `HexMaskedTextBox.Mask = "AAAAAAAA"`、`Value`、`SFMT(uint)`                     | 8 位十六进制，`0..FFFFFFFF`；空值按 `0`                                            |
| Starting Index | `StartingFrame.Maximum = FuncUtil.MAXFRAME`                                     | 十进制 `0..1,000,000,000`；无简体中文词条，保留 English source label               |
| Max Results    | `MaxResults.Maximum = FuncUtil.MAXFRAME`、默认 `5000`、`max = min + MaxResults` | 十进制 `0..1,000,000,000`；表示起点后的帧偏移，闭区间实际处理 `Max Results + 1` 帧 |
| NPC            | 默认 `NumericUpDown`、`NPC + 1` 模型数                                          | 十进制 `0..100`；内部模型数为 `NPC + 1`                                            |
| Delay          | `Delay.Maximum = 10000`、`Timedelay = Delay / 2`                                | 十进制 `0..10,000`；整数截断除以 2                                                 |
| Rank           | `Rank.Items`、默认 `SelectedIndex = 18`                                         | 19 档：`<=2`、`3..10`、`11-20` 到 `91-99`、`100+`；默认 `100+`                     |
| Stars          | `Stars.Items`、`FPFacility.Star`                                                | `-` 表示不过滤，或 `1..5`                                                          |
| Facility       | `FPFacility.getList()`、`StringItem.FacilityName`                               | `-` 表示不过滤；候选随 Game 和 Stars 变化，Stars 为 `-` 时按上游使用一星设施池     |
| NPC Type       | `NPCType.Items`、`FPFacility.NPC`                                               | `-` 表示不过滤，或 12 个 English source NPC 类型                                   |
| Color          | `Color.Items`、`FPFacility.Color`                                               | `-` 表示不过滤，或 `0..3`                                                          |
| NPC Status     | `Frame_Misc.status`、`dgv_npcstatus`                                            | 产品侧可选传输；启用时每条结果返回 `NPC + 1` 个状态，显示正值前先减 1              |

当前浏览器将绝对结束帧限制为 `5,000,000`，并将结果限制为 `100,000` 行。以上是静态浏览器保护，不改写上游 WinForms 控件的 `1,000,000,000` 输入上限。

## 算法

每个 SFMT64 帧按 `MiscRNGTool.Search7()` 保持连续状态：

1. 使用 `ModelStatus` 推进到下一个有 SFMT 消耗的实时帧，并保留长帧起始状态。
2. 将当前帧 Random Number 记录为结果随机数，复制当前模型状态并执行 `Delay / 2` 次 `RNGPool.time_elapse7()` 等价推进。
3. `Actual Hit = Index + frameUsed`；设施生成仍使用当前帧 Random Number 的低 32 位作为 TinyMT Seed。
4. TinyMT 连续取四次值：`% 100` 选择星级、`% N` 选择版本/星级设施池、`% 12` 选择 NPC、`% 100` 选择颜色。
5. 应用 Stars、Facility、NPC 和 Color 筛选，再提交结果批次。

设施名称和 NPC 类型保留 `StringItem` 与 WinForms Designer 的 English source。Sun/Moon 的一至三星池移除 `Switcheroo`；Ultra Sun/Ultra Moon 保留。

## 上游缺陷修正

本模块没有照搬两处可由同仓库数据自证的上游错误：

- `FPFacility.cs` 把 `IsMoon` 写成初始化一次的 `Ver == 1 && Ver == 3`，表达式永远为 false；`FestivalPlazaFacilities.md` 明确给出 Moon / Ultra Moon 独立设施池。本模块按当前版本动态判断 `version == Moon || version == Ultra Moon`。
- Rank `21-30` 的 `StarChance` 代码行为是 `25,40,24,0,2`，概率只合计 91%；同文件其他行均合计 100%，`FestivalPlazaFacilities.md` 给出 `25,40,24,9,2`。本模块将 ★4 恢复为 `9%`。

原生夹具分别覆盖 Moon ★4 池、Sun/Ultra Sun 的 Switcheroo 差异和 Rank `21-30` 可生成 ★4，防止回退到错误行为。

## Wasm 契约

模块 id 为 `gen7festivalplaza`，API version `1`，contract version `1`。

```text
gen7festivalplaza_begin(const Gen7FestivalPlazaPackedRequest *request)
gen7festivalplaza_step(uint32_t maximum_states)
gen7festivalplaza_result_ptr()
gen7festivalplaza_result_count()
gen7festivalplaza_step_processed()
gen7festivalplaza_total_processed()
gen7festivalplaza_total_results()
gen7festivalplaza_done()
gen7festivalplaza_limit_reached()
gen7festivalplaza_last_error()
```

请求包含 13 个 `uint32_t`：Seed、最小帧、最大帧、版本、NPC、Delay、Rank、Stars、Facility、NPC Type、Color、NPC Status 开关和结果上限。`-1` 筛选按 `FFFFFFFF` 打包。

每条结果的固定部分包含 10 个 `uint32_t`：Index、Actual Hit、Real Time Frames、64 位 Random Number 的低/高字、Stars、Facility、NPC Type、Color 和 Mark。NPC Status 开启时，固定部分后追加 `NPC + 1` 个有符号状态字；Worker 按请求计算每行宽度并拒绝错位缓冲区。

一个 Dedicated Worker 持有一个连续 Wasm 会话。默认每批处理 16384 帧，C ABI 单批上限为 65536；取消时终止并重建 Worker。模块不依赖 `SharedArrayBuffer`、Wasm pthreads 或跨源隔离。

## 界面

桌面端使用紧凑参数区与结果区双列工作台，结果表是主要滚动区域；窄屏重排为单列。控件逐字复用已有简体中文词条 `圆庆广场`、`设施`、`颜色`、`延时`、`最大结果数`、`等级`、`乱数`、`实际击中` 和 `眨眼状态`。没有简体中文来源的 `Game`、`NPC`、`Starting Index`、`Mark`、`Real Time`、设施名称和 NPC 类型保留 English source。

结果支持列排序、CSV、清空、取消和把某一行 Index 回写为新的 Starting Index。Facility 列保持上游 `Facility ★Stars - N<npc> - C<color>` 组合格式。

## 验证状态

2026-08-17 当前已完成：

- Festival Plaza TypeScript：3 个测试文件，6 项测试通过。
- 全仓 `npm run typecheck` 通过。
- WinLibs GCC `16.1.0`：`gen7festivalplaza` 原生会话夹具 1/1 通过。
- 固定夹具校验 Seed `12345678`、Sun、Rank `100+`、0 NPC、0 Delay 的 `0..4` 五帧，并覆盖 Moon 设施池、Switcheroo 版本限制、Rank `21-30` ★4 概率、输入错误和 0 帧起点。
- 全仓 `npm run verify` 通过：Prettier、ESLint、TypeScript、117 个 Vitest 文件共 437 项测试和生产 Web/PWA 构建；ESLint 保留 6 条既有 TanStack Virtual / React Compiler 非阻断 warning。
- WinLibs GCC `16.1.0` 的 9/9 Gen VII 原生夹具通过；Emscripten `6.0.6` 重建 `gen7wild`、`gen7sos`、`gen7egg`、`gen7event`、`gen7main` 和 `gen7festivalplaza` 成功。
- 外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Wasm 核对固定五帧与原生结果一致、NPC Status、Moon + ★4 设施联动和控制台无 error；390px 视口无横向溢出，相关控件均为 44px。
- 生产页面算法回归未运行：需等待 GitHub Actions 部署完成，由项目所有者提供准确生产 URL 并单独授权；本地 UI、原生夹具和 Wasm 构建不能替代该验收。
