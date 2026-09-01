# 第六世代配信乱数

## 功能范围

本模块对应 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VI `Event RNG` 工作流，支持 X、Y、Omega Ruby、Alpha Sapphire 和本地 `.wc6` / `.wc6full` 配信卡导入。界面保留物种、形态、等级、固定 IV、保底随机 V 数、Ability / Nature / Gender 锁定、PID Type、自 ID、蛋、其他信息、TID/SID/EC/PID 与完整结果筛选。

算法在独立 `gen6event` Dedicated Worker 和 `gen6event.mjs/.wasm` 中执行。TypeScript 只负责输入校验、Wonder Card 解析、请求编码、结果解码和界面状态，不复制生产 MT19937 算法。

## 输入限制

空十六进制和十进制输入按 `0` 解释。上游帧上限为 `1000000000`，浏览器绝对帧保护上限为 `5000000`。

| 输入                      | 进制与范围                                    | 默认/行为                                                      | 上游依据                                                    |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Version                   | X、Y、Omega Ruby、Alpha Sapphire              | 由 3DS Profile 同步；ORAS 每帧执行两次 Event6 并返回第二次结果 | `MainForm.cs::IsORAS`、`Gen6/Event6.cs`                     |
| Seed                      | 十六进制，最多 8 位，`0..FFFFFFFF`            | 空值为 `0`                                                     | `MainForm.Designer.cs`、`RNG/MT.cs`                         |
| Initial Frame / Max Frame | 十进制，`0..1000000000`；浏览器 `0..5000000`  | 默认 `0..1000`；Initial 必须小于等于 Max                       | `MainForm.cs::Search6_Normal`、`Util/FuncUtil.cs::MAXFRAME` |
| Delay                     | 十进制，`0..4000`，步进 `2`                   | 默认 `0`；`Consider Delay` 决定是否应用                        | `MainForm.Designer.cs`、`Core/RNGPool.cs::Generate6`        |
| TSV / TRV                 | TSV `0..4095`；TRV `0..15`                    | `Your ID` 时使用 Profile 值，否则由 Wonder Card TID/SID 计算   | `MainForm.cs::getEventSetting`                              |
| Species / Form            | Species `0..721`；Form 为 Personal 表记录范围 | 物种变化后重置越界 Form                                        | `MainForm_Event.cs`、`Pokemon/PersonalTable.cs`             |
| Level                     | 十进制 `0..100`                               | Wonder Card 偏移 `0xD0`                                        | `MainForm_Event.cs::Event_RawData`                          |
| 固定 IV                   | 每项未锁定或 `0..31`                          | 固定项与保底随机 V 数合计不得超过 5                            | `MainForm.cs::getEventSetting`                              |
| 保底随机 V 数             | 十进制 `0..5`                                 | Wonder Card `0xFC..0xFE` 映射为 `1..3`                         | `MainForm_Event.cs::Event_RawData`、`Gen6/Event6.cs`        |
| Ability                   | 固定模式 `0..3`；随机模式 `0..1`              | 随机模式分别生成 `1/2` 或 `1/2/H`                              | `StringItem.eventabilitystr`、`Gen6/Event6.cs`              |
| Nature                    | `0..24`                                       | 未锁定时由 `rand(25)` 生成                                     | `Gen6/Event6.cs`                                            |
| Gender                    | `0..2`                                        | 未锁定时使用 ORAS Personal 性别比；固定/无性别物种不消耗随机数 | `Core/EventRNG.cs`、`Util/FuncUtil.cs`                      |
| TID / SID                 | 十进制 `0..65535`                             | `Your ID` 关闭时计算 Event TSV/TRV                             | `MainForm.Designer.cs`、`MainForm.cs::getEventSetting`      |
| EC / PID                  | 十六进制 `0..FFFFFFFF`                        | EC 为 `0` 时随机；PID 只在 `Specified` 时使用                  | `Gen6/Event6.cs`                                            |
| Result Limit              | 十进制 `1..100000`                            | 默认 `100000`                                                  | Web Worker 任务保护                                         |

## Wonder Card

`.wc6` 读取 `0x108` 字节；`.wc6full` 跳过前 `0x208` 字节后读取同一核心结构。当前解析以下上游字段：Card Type `0x51`、TID `0x68`、SID `0x6A`、EC `0x70`、Species `0x82`、Form `0x84`、Nature `0xA0`、Gender `0xA1`、Ability `0xA2`、PID Type `0xA3`、IV 区 `0xAF`、Your ID `0xB5`、Level `0xD0`、Egg `0xD1` 与 Specified PID `0xD4`。非宝可梦卡、截断文件和超出 Gen VI 范围的字段会被拒绝。

ORAS Personal 性别比由 `Resources/bytes/personal_ao` 生成。脚本 `scripts/generate_gen6_event_data.mjs` 输出 `src/features/gen6event/data.ts` 与 `wasm/modules/gen6event/bridge/gen6_event_personal.inc`，覆盖 `0..721` 物种和 912 个形态记录。

## 算法

`RNGPool.Generate6()` 先按 `Consider Delay` 应用 Delay，再额外推进一次。Event6 的单次生成顺序为 EC、PID、固定/保底 IV、随机 IV、Ability、Nature、Gender。XY 每帧调用一次；ORAS 先生成并丢弃一次，再返回第二次生成结果。结果 `Random` 保留当前帧的 MT 值，`Frame Used` 对应上游 `RNGPool.index + 1`。

PID Type 保留上游四种行为：Random、Nonshiny、Shiny、Specified。Random / Specified 在 PSV 命中 TSV 时标记异色；Nonshiny 命中时翻转 `0x10000000`；Shiny 在 `Other Information` 开启时按 TID/SID 重写高 16 位。筛选覆盖六项 IV、完美 IV 数量、性格、觉醒力量、性别、特性、异色和方块异色。

## Worker 与 Wasm 契约

- Module id：`gen6event`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：54 个 `uint32_t` 字
- 结果：16 个 `uint32_t` 字；包含 Frame、Random、EC、PID、六项 IV、metadata、Delay、Frame Used、PSV 与 PRV
- Worker：每个任务使用独立 Dedicated Worker；取消后终止并重建实例

固定夹具位于 `wasm/modules/gen6event/tests/gen6event_native_test.cpp`，覆盖 API、空指针错误、XY、ORAS 双生成、固定 EC/PID/Ability/Nature/Gender/IV、结果上限和无效请求。TypeScript 夹具覆盖 54-word 编码、性别比、结果解码、Hidden Power、`.wc6` / `.wc6full` 和浏览器输入保护。

## 界面布局

桌面端使用上下两行工作区：控制区占据上方整行，结果区在下方保持同宽；控制面板和结果面板使用有界高度并分别滚动。普通生成模式使用与 Stationary、Wild 共用的 `RNGInfo` 卡片，闭区间与目标帧 ±100 均接入现有请求；Gen VI Event 按上游条件不显示 Timeline、Timeline Leap 或 NPC。模块专属选择器固定外层单列轨道，避免应用外壳的通用 `*-workspace` 规则把两块面板重新排成左右两栏。

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Event6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\EventRNG.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\RNGPool.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm_Event.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Pokemon\PersonalTable.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Resources\bytes\personal_ao`

3DSRNGTool 代码按 MIT 条款记录来源；PokeRNGKit 整体继续按 GPL-3.0-or-later 发布，并保留上游版权与商标免责声明。
