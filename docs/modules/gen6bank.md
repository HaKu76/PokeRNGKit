# 第六世代 Pokemon Link / Transporter RNG

## 功能范围

本模块对应 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VI Bank 工作流，单独提供 Pokemon Link 与 Poke Transporter 目标搜索。普通定点目标归入 [Gen 6 Stationary](gen6stationary.md)，本模块只显示 `PKM6.Bank` 模板：XY 1 个 Bank 分类含 Celebi 与两个三目标组，ORAS 1 个 Bank 分类含两个三目标组，Transporter 含概念 Transporter 目标、Mew 与 Celebi 三个 20 目标模板，共 8 个模板。

算法使用独立 `gen6bank` Dedicated Worker 和 `gen6bank.mjs/.wasm`。产品层复用已验证的 Gen VI 结果解码与模板数据，但每次搜索都通过独立 `gen6bank` Wasm 入口执行。

## 输入限制

空十六进制 Seed 按 `0` 解释，空十进制按 `0` 解释。上游帧上限为 `1000000000`，浏览器绝对帧保护上限为 `5000000`。Delay 范围为 `0..4000`，`Consider Delay` 默认开启；Transporter GenderList 每位仅接受 `0/1/2`，最多 20 位。

| 输入           | 进制与范围                                               | 默认/行为                                                                      | 上游依据                                                                                   |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Version        | X、Y、Omega Ruby、Alpha Sapphire、Transporter            | 由 3DS Profile 选择器同步；只显示当前版本的 Bank 模板                          | `MainForm.cs::GameVersion_SelectedIndexChanged`、`PKM6.Species_XY/Species_ORAS/Species_VC` |
| Seed           | 十六进制，最多 8 位，`0..FFFFFFFF`                       | 空值为 `0`                                                                     | `MainForm.Designer.cs`、`RNG/MT.cs`                                                        |
| Initial Frame  | 十进制，`0..1000000000`；浏览器 `0..5000000`             | 默认 `0`                                                                       | `MainForm.cs`、`Util/FuncUtil.cs`                                                          |
| Max Frame      | 十进制，`Initial Frame..1000000000`；浏览器 `0..5000000` | 默认 `1000`                                                                    | `MainForm.cs`、`Util/FuncUtil.cs`                                                          |
| Delay          | 十进制，`0..4000`，步进 `2`                              | Bank 模板载入 `16`；`Consider Delay` 默认开启                                  | `MainForm.Designer.cs`、`MainForm.cs::SetPersonalInfo`、`Core/RNGPool.cs`                  |
| Target Pokemon | 十进制，`1..NumOfPkm`                                    | Pokemon Link `1..3`；Transporter `1..20`                                       | `MainForm.cs::Poke_SelectedIndexChanged`、`PKM6.NumOfPkm`                                  |
| GenderList     | 最多 20 个字符，每位 `0/1/2`                             | Pokemon Link 固定 `0`；Transporter 按目标位置输入，Mew/Celebi 目标位置强制 `2` | `Controls/GenderListBox.cs`、`MainForm.cs::getStaSettings`                                 |
| TSV / TRV      | TSV `0..4095`；TRV `0..15`                               | 从 Profile Manager 同步                                                        | `MainForm.Designer.cs`、`Stationary6.Generate`                                             |
| Shiny Charm    | 布尔值                                                   | 从 Profile Manager 同步                                                        | `MainForm.cs::CB_Profile_SelectedIndexChanged`、`StationaryRNG.SetValue`                   |
| Result Limit   | 十进制 `1..100000`                                       | 默认 `1000`                                                                    | Web Worker 任务保护                                                                        |

Bank 模板自身固定 `AlwaysSync` 和 `ShinyLocked`。Mew/Celebi Transporter 模板固定 5 个保底 IV；Legendary Titans 与 Johto Starters 使用上游 `Ability=4 -> 3` 映射及各自的生成顺序。Bank 工作区不显示普通定点的 Synchronize、Shiny Lock、3IV 自定义开关。

## 算法

`gen6bank` 使用与 `Stationary6.Generate` 相同的 MT19937 滚动序列和 49-word 请求布局，但入口只接受 Bank 模板。对目标序号前的每个宝可梦先调用 Bank 前置分支：Johto Starters（无 `IV3`）推进 10；其余目标推进 2，按 GenderList 类型选择 3 个（`0/1`）或 5 个（`2`）不重复保底 IV 位置，再按 `AdvanceTable={4,5,2}` 推进。当前目标从目标前置耗尽位置开始生成，Bank 标记使其 Always Sync，不额外消耗普通定点的 60 帧。

当前目标生成 EC、Shiny Charm PID rolls、固定/随机 IV、Ability、Nature、Gender，并计算 PSV/PRV、异色、方块异色、Hidden Power、Frame Used。Transporter Mew/Celebi 的 OT/性别规则来自 `PKM6.cs` 与 `Stationary6.cs`，不在 TypeScript 中复制 RNG 算法。

## Worker 与 Wasm 契约

- Module id：`gen6bank`
- Contract version：`1`
- Wasm API version：`2`
- Operation：`generator`
- 请求：49 个 `uint32_t` 字；Bank 工作区固定 `Bank=1`，第 49 个 word 为 GenderList 的 base-3 编码
- 结果：16 个 `uint32_t` 字；包含 Frame、Random、EC、PID、六项 IV、metadata、Frame Used、PSV、PRV
- Worker：每个任务使用独立 Dedicated Worker；取消后终止并重建实例

固定夹具位于 `wasm/modules/gen6bank/tests/gen6bank_native_test.cpp`，覆盖 API 版本、空指针错误、Bank 目标确定性、目标前置消耗和结果上限字段。TypeScript 夹具覆盖 Bank 模板过滤、共享 ABI 编码和普通模板拒绝。

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\PKM6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Stationary6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\StationaryRNG.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\RNGPool.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Controls\GenderListBox.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.cs`

3DSRNGTool 代码按 MIT 条款记录来源；PokeRNGKit 整体继续按 GPL-3.0-or-later 发布，并保留上游版权与商标免责声明。
