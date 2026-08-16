# 第七世代 Battle Tree Trainer RNG

## 功能范围

`gen7battletree` 实现 3DSRNGTool `Misc RNG Tool -> Battle Tree` 的训练家生成工作流：

- 支持 Sun、Moon、Ultra Sun、Ultra Moon 的 Gen VII SFMT64 连续帧。
- 支持 NPC 眨眼模型、Delay、连胜数和 Trainer ID 筛选。
- 按普通场次、每十场特殊训练家和 50 场以上区间生成训练家编号。
- 显示 Index、Actual Hit、Mark、Clock、Trainer、Random Number 和 Real Time。
- 提供单 Dedicated Worker、分批进度、取消、100000 行结果上限、虚拟滚动、排序和 CSV。

生产 RNG 只在 `gen7battletree` Worker 内的 WebAssembly 执行。React/TypeScript 负责输入规范化、请求校验、结果解码和展示；UI Preview 只生成确定性布局样例，不能作为算法证据。

上游 revision：`359bdd7a9ff7c145fec12302cf43da932923fa62`。

主要上游文件：

- `3DSRNGTool/Subforms/MiscRNGTool.cs`
- `3DSRNGTool/Subforms/MiscRNGTool.Designer.cs`
- `3DSRNGTool/Gen7/BTTrainer.cs`
- `3DSRNGTool/Core/RNGPool.cs`
- `3DSRNGTool/Gen7/ModelStatus.cs`
- `3DSRNGTool/Controls/Frame_Misc.cs`
- `3DSRNGTool/Controls/HexMaskedTextBox.cs`
- `3DSRNGTool/Controls/StringItem.cs`
- `3DSRNGTool/Resources/text/lang_zh.txt`
- `Data/BattleTree.md`

## 已核验输入

下列限制来自上游 WinForms 控件初始化和 Core 参数类型。空 Seed 由 `HexMaskedTextBox.Value` 按 `0` 读取；空十进制输入在浏览器中同样规范化为 `0`，随后执行领域校验。

| 输入           | 上游依据                                                                        | 范围与行为                                                                                             |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Game Version   | `MiscRNGTool.Game`、`BTTrainer.GameVer`                                         | Sun、Moon、Ultra Sun、Ultra Moon；决定每十场特殊训练家表和随机模数 `100 / 114`                         |
| Seed           | `Seed.Mask = "AAAAAAAA"`、`HexMaskedTextBox.Value`、`SFMT(uint)`                | 8 位十六进制，`0..FFFFFFFF`；空值按 `0`                                                                |
| Starting Index | `StartingFrame.Maximum = FuncUtil.MAXFRAME`                                     | 十进制 `0..1,000,000,000`；3DSRNGTool 无简体中文词条，界面保留 English source label                    |
| Max Results    | `MaxResults.Maximum = FuncUtil.MAXFRAME`、默认 `5000`、`max = min + MaxResults` | 十进制 `0..1,000,000,000`；表示 Starting Index 后继续计算的帧偏移，闭区间实际处理 `Max Results + 1` 帧 |
| NPC            | 默认 `NumericUpDown`、`NPC + 1` 模型数                                          | 十进制 `0..100`；内部模型数为 `NPC + 1`                                                                |
| Delay          | `Delay.Maximum`、`Timedelay = Delay / 2`                                        | 十进制 `0..10,000`；使用整数截断除以 2                                                                 |
| Streak         | `Streak.Minimum / Maximum`                                                      | 十进制 `1..10,000`；每十场进入特殊训练家分支                                                           |
| Trainer ID     | `TrainerID.Maximum`、默认 `254`、`BTTrainer.IsDifferentFrom()`                  | 十进制 `0..254`；`0..208` 精确筛选，`209..254` 均表示不过滤                                            |
| Result Limit   | `MainForm.MAX_RESULTS_NUM` 与 Worker/Wasm 边界                                  | `1..100,000`；当前 UI 固定为 `100,000`                                                                 |

上游允许 Starting Index 与 Max Results 各自达到 `1,000,000,000`。当前静态浏览器会话把相加后的绝对最大帧限制为 `5,000,000`，避免初始化 SFMT、眨眼标记和长连续帧时产生无界阻塞；该保护不改写上游输入记录。

## RNG 行为

每个显示帧按上游 `MiscRNGTool.generator7()` 保持同一条连续状态链：

1. 从 Seed 初始化 SFMT64，并推进到 Starting Index。
2. 使用 `NPC + 1` 个模型执行 `ModelStatus.NextState()`，记录 Real Time、Mark 和当前模型快照。
3. 为目标帧创建 RNGPool 视图，先执行 `Delay / 2` 个时间步。
4. 把模型数重置为 2，再执行 2 个时间步，记录 Actual Hit 所需的消耗帧数。
5. 读取下一项 64 位随机数，并按版本、Streak 和 `BTTrainer.Generate()` 生成 Trainer ID。

普通场次的训练家区间为 `0..49`、`30..69`、`50..89`、`70..109`、`90..129` 或 `90..189`。每十场使用版本限定特殊训练家表。编号 `192..205` 显示上游 `StringItem.TrainerName` 的英文名称：Grimsley、Anabel、Wally、Colress、Cynthia、Plumeria、Guzma、Kiawe、Mallow、Sina、Dexio、Red、Blue、Kukui。

## Wasm 契约

模块 id 为 `gen7battletree`，API version `1`，contract version `1`。

```text
gen7battletree_begin(const Gen7BattleTreePackedRequest *request)
gen7battletree_step(uint32_t maximum_states)
gen7battletree_result_ptr()
gen7battletree_result_count()
gen7battletree_step_processed()
gen7battletree_total_processed()
gen7battletree_total_results()
gen7battletree_done()
gen7battletree_limit_reached()
gen7battletree_last_error()
```

请求包含 9 个 `uint32_t`：Seed、最小帧、最大帧、版本、NPC、Delay、Streak、Trainer ID 筛选和结果上限。每条结果包含 7 个 `uint32_t`：Index、Actual Hit、Real Time Frames、64 位 Random Number 的低/高字、Trainer ID 和 Mark。

一个 Dedicated Worker 持有一个连续 Wasm 会话。默认每批处理 16384 帧，C ABI 单批上限为 65536；取消时终止并重建 Worker。模块不依赖 `SharedArrayBuffer`、Wasm pthreads 或跨源隔离。

## 界面

桌面端使用紧凑参数区与结果区双列工作台，结果表是主要滚动区域；窄屏重排为单列。输入区保留上游 `Starting Index` English source label，并逐字复用 3DSRNGTool 已有简体中文词条：`NPC数`、`延时`、`最大结果数`、`连胜数`、`训练家ID` 与 `对战树`。

结果支持列排序、CSV、清空、取消和把某一行 Index 回写为新的 Starting Index。Trainer ID `209..254` 显示为不过滤；`192..205` 显示对应特殊训练家英文名。

## 验证状态

2026-08-16 已完成：

- Battle Tree TypeScript：3 个测试文件，6 项测试通过。
- 全仓 Prettier、TypeScript 与 106 个 Vitest 文件共 410 项测试通过；ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler 非阻断 warning。
- 原生 `gen7battletree` C++ 会话夹具 1/1 通过，固定校验 Seed `12345678` 的 `418..422` 五帧，以及特殊训练家范围、Trainer ID 筛选、Streak 和浏览器帧上限错误。
- Emscripten 6.0.6 成功生成 `gen7battletree.mjs` 与 `gen7battletree.wasm`。
- 默认 41 模块 Emscripten 构建全部通过。
- 非受限生产 Web 构建转换 2107 个模块，生成 `gen7battletree.worker`，PWA 预缓存 58 项。

受限环境的生产 Web 构建在复制 `public/wasm/gen7battletree.mjs` 时返回 `EPERM`；同一构建在非受限环境通过，确认该错误来自沙箱文件复制权限。外部 Chrome 已连接，但浏览器控制安全策略拒绝自动访问 `http://127.0.0.1:5173/`；因此本轮没有记录本地 UI、Worker 控制台或交互证据。生产页面算法回归仍必须等待 GitHub Actions 部署完成，并由项目所有者提供准确生产 URL 后执行。
