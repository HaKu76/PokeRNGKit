# 第六世代 Stationary RNG

## 功能范围

本模块对应 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VI `Stationary6` 工作流，覆盖 XY、ORAS 与 Transporter 的普通定点、礼物、御三家、化石、游戏内交换、Pokemon Link / Transporter 目标前置消耗，以及 141 个 `PKM6.cs` 目标模板。Pokemon Link / Transporter 的专用工作区仍按模块库存单独实现；本模块只提供定点工作流中的 Bank 目标分支。

算法运行在独立 Dedicated Worker 的 C++/Emscripten Wasm 实例中。React 负责档案联动、输入校验、筛选、Worker 编排、结果解码和展示，未在产品层复制生产 RNG 算法。

## 输入限制

空十六进制 Seed 按 `0` 解释，空十进制按 `0` 解释。上游 `MainForm` 在运行时把 `Frame_min` 与 `Frame_max` 的最大值设为 `1000000000`；浏览器任务为了避免一次性分配过大的 MT 序列，额外限制绝对帧为 `0..5000000`。Delay 的上游 NumericUpDown 范围为 `0..4000`、步进为 `2`，`Consider Delay` 默认选中。

| 输入                     | 进制与范围                                               | 默认/行为                                                                         | 上游依据                                                                           |
| ------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Version                  | X、Y、Omega Ruby、Alpha Sapphire、Transporter            | 由 3DS Profile 选择器同步                                                         | `MainForm.cs`、`Pokemon/GameVersion.cs`                                            |
| Seed                     | 十六进制，最多 8 位，`0..FFFFFFFF`                       | 空值为 `0`                                                                        | `MainForm.Designer.cs`、`RNG/MT.cs`                                                |
| Initial Frame            | 十进制，`0..1000000000`；浏览器 `0..5000000`             | 默认 `0`                                                                          | `MainForm.cs`、`Util/FuncUtil.cs`                                                  |
| Max Frame                | 十进制，`Initial Frame..1000000000`；浏览器 `0..5000000` | 默认值由 Web 工作区设为 `1000`                                                    | `MainForm.cs`、`Util/FuncUtil.cs`                                                  |
| Delay                    | 十进制，`0..4000`，步进 `2`                              | 选择模板时载入 `PKM6.Delay`；`Consider Delay` 默认选中                            | `MainForm.Designer.cs`、`MainForm.cs::SetPersonalInfo`、`Core/RNGPool.cs`          |
| TSV / TRV                | TSV 十进制 `0..4095`；TRV 十进制 `0..15`                 | 从 Profile Manager 同步                                                           | `MainForm.Designer.cs`、`Stationary6.Generate`                                     |
| Synchronize              | None 或 25 种性格                                        | 固定性格模板锁定；可同步模板由用户选择；`Assume Synced` 映射 `RNGPool.TinySynced` | `MainForm.cs::SetPersonalInfo`、`Core/RNGPool.cs`、`Stationary6.Generate`          |
| Target Pokemon           | 十进制 `1..NumOfPkm`                                     | 非 Bank 模板固定为 `1`；Transporter 模板最多 `20`                                 | `PKM6.NumOfPkm`、`MainForm.cs::TargetMon`                                          |
| GenderList               | 最多 20 个字符，每位 `0/1/2`                             | `0` 无性别、`1` 有性别、`2` 梦幻；内部以 base-3 编码为一个 `uint32_t`             | `MainForm.Designer.cs`、`MainForm.cs::getStaSettings`、`Stationary6.Generate_Once` |
| Result Limit             | 十进制 `1..100000`                                       | 默认 `1000`                                                                       | `MainForm.cs::MAX_RESULTS_NUM`                                                     |
| Nature / Hidden Power    | 性格 25 项；觉醒力量 16 项                               | 默认全选                                                                          | `Core/RNGFilters.cs`、`Controls/StringItem.cs`                                     |
| Perfect IV Value / Count | Value `0..31`；Count `0..6`                              | 默认 `31 / 0`                                                                     | `MainForm.Designer.cs`、`Core/RNGFilters.cs`                                       |
| IV range                 | 六组闭区间，各端 `0..31`                                 | 每组最小值不得大于最大值                                                          | `Core/RNGFilters.cs`、主窗体 IV 控件                                               |

自定义 `-` 模板提供 Species `0..721`、Level `0..100`、Gender Ratio、Ability `0..3`、3IV、Always Sync 和 Shiny Lock 控件。`Ability=4` 按上游 `StationaryRNG.UseTemplate` 映射为隐藏特性 `3`。模板的 Level、Gender Ratio、Ability、Nature、固定 IV、保底 IV 数、Always Sync、Shiny Lock、Instant Sync、Bank、OT TSV 和版本过滤均由 `Gen6/PKM6.cs` 与 ORAS Personal 数据生成。

## 算法

`Search6_Normal` 先以 Seed 初始化 MT19937，推进到 Initial Frame 后建立共享滚动序列。每个候选帧执行 `RNGPool.Generate6` 的 Delay 偏移和一次起点推进；非 Always Sync 目标再消耗 60 次。随后按上游顺序生成 EC、Shiny Charm PID rolls、固定/随机 IV、Ability、Nature 和 Gender。Result 的 `Random` 是该帧的当前值，不随 Delay 偏移改变。

Bank 目标在当前宝可梦生成前调用 `Stationary6.Generate_Once`：Johto Starters 等非 IV3 目标推进 10；IV3 目标推进 2，按 GenderList 的 `0/1/2` 选择 3/3/5 个不重复的保底 IV 位置，再按 `4/5/2` 表推进。`Frame Used` 从 Bank 前置生成完成后记录，包含非 Always Sync 的 60 次推进及当前个体消耗。

异色判断使用 `PSV == TSV`，方块异色使用 `PRV == TRV`；In-Game Trade 的 OT TSV 覆盖 Profile TSV。觉醒力量按上游 `Pokemon.Reorder2 = { 0, 1, 2, 4, 5, 3 }` 计算。筛选在 Wasm 侧执行，Worker 只返回固定宽度结果批次；取消时终止 Worker，下一次搜索重建实例。

## Worker 与 Wasm 契约

- Module id：`gen6stationary`
- Contract version：`1`
- Wasm API version：`2`
- Operation：`generator`
- 请求：49 个 `uint32_t` 字；第 49 个 word 为最多 20 位 GenderList 的 base-3 编码
- 结果：16 个 `uint32_t` 字；包含 Frame、Random、EC、PID、六项 IV、metadata、Frame Used、PSV、PRV
- Worker：1 个 Dedicated Worker

固定夹具位于 `wasm/modules/gen6stationary/tests/gen6stationary_native_test.cpp`，覆盖 API 与 C ABI 错误、确定性、普通 60 次消耗、Always Sync、Assume Synced、固定 IV、Hidden Power、PRV/TRV 方块异色、Bank 目标、Transporter 性别前置消耗、Mew/Celebi 5V 和结果上限。

## 数据生成

`scripts/generate_gen6_stationary_data.mjs` 从 `Gen6/PKM6.cs`、`Resources/bytes/personal_ao`、三语 Species/Natures 文本生成 `src/features/gen6stationary/data.ts`。生成器保留源模板的类别、版本、Delay、性格和 Bank 标记，并推导 ORAS Personal 的基础种族值、性别比、Undiscovered Egg Group、3V、Ability `4 -> 3` 与 Transporter Mew/Celebi 5V。`data.ts` 不手工编辑，数据改变时重新运行生成脚本。

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\PKM6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Stationary6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\StationaryRNG.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\RNGPool.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\RNGFilters.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Pokemon\Pokemon.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\RNG\MT.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.Designer.cs`

3DSRNGTool 代码按 MIT 条款记录来源；PokeRNGKit 整体继续按 GPL-3.0-or-later 发布，并保留上游版权与商标免责声明。MT19937 的上游文件包含其原始 Artistic/BSD 许可说明，桥接文件保留 PokeRNGKit GPL 头部和适配来源说明。
