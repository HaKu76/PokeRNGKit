# 第六世代野生乱数

## 功能范围

本模块对应 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VI `Wild6` 工作流，覆盖普通野生、Horde、Rock Smash 和 Fishing。支持 X、Y、Omega Ruby、Alpha Sapphire、MT19937 主 Seed、TinyMT Seed、队首修正、闪耀护符、钓竿选择、Horde 选槽、笛子、异色/方块异色、IV、性格、觉醒力量、性别、特性、道具与槽位筛选。

普通 XY 草丛/冲浪完整遭遇表在该 3DSRNGTool revision 的 `LocationTable6.cs` 中为空；界面因此提供自定义槽位输入，不将 Mirage Spots 数据伪称为完整 XY 普通野生表。Horde 的 X/Y 与 OR/AS 版本替换和特殊槽位规则由 `HordeArea6.cs` 在 domain 层展开。

算法只在独立 `gen6wild` Dedicated Worker 和 `gen6wild.mjs/.wasm` 中执行。TypeScript 负责区域数据、输入校验、请求编码、结果解码和界面状态。

## 输入限制

空十六进制和十进制输入按 `0` 解释。上游帧上限为 `1000000000`，浏览器绝对帧保护上限为 `5000000`。

| 输入                      | 进制与范围                                   | 默认/行为                                                                           | 上游依据                                      |
| ------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| Version                   | X、Y、Omega Ruby、Alpha Sapphire             | X/Y 共用 XY 表，OR/AS 共用 ORAS 表                                                  | `MainForm.cs`、`Gen6/PKMW6.cs`                |
| Encounter Type            | Normal、Horde、Rock Smash、Fishing           | 由 `LocationTable6.GetTable()` 决定地点表                                           | `Gen6/Gen6Encounter/LocationTable6.cs`        |
| Seed / Tiny Seed          | 十六进制，最多 8 位，`0..0xFFFFFFFF`         | 空值为 `0`                                                                          | `RNG/MT.cs`、`RNG/TinyMT.cs`                  |
| Initial Frame / Max Frame | 十进制，`0..1000000000`；浏览器 `0..5000000` | Initial 必须小于等于 Max                                                            | `Util/FuncUtil.cs::MAXFRAME`、Web 预算        |
| Delay                     | 十进制，`0..4000`                            | `Consider Delay` 开启时应用于 TinyMT 和主 RNG 起点                                  | `Core/RNGPool.cs::Generate6`、`Gen6/Wild6.cs` |
| Tiny Frame                | 十进制，`0..1000000000`                      | `tinySeed + tinyFrame + frame` 建立独立 TinyMT 输入                                 | `Core/RNGPool.cs`、`Gen6/Wild6.cs`            |
| TSV / TRV                 | TSV `0..4095`；TRV `0..15`                   | 默认从 3DS Profile 同步                                                             | `MainForm.Designer.cs`、`WildRNG.cs`          |
| Encounter Rate            | 十进制，`0..100`                             | Normal/Fishing/Rock Smash 使用遇敌判定                                              | `Gen6/Wild6.cs`                               |
| Party Pokemon             | 十进制，`0..5`                               | Fishing 额外消耗 `3 * PartyPokemon` 个 TinyMT 状态                                  | `Gen6/Wild6.cs::Prepare`                      |
| PID Rolls                 | 十进制，`1..40`                              | 关闭 Shiny Charm 时实际只取 1 次                                                    | `Wild6.cs`、Web 预算                          |
| Sync Nature               | `0..24` 或空值                               | 只有 Synchronize 队首可设置；空值按未选择                                           | `Wild6.cs`、`WildRNG.cs`                      |
| Flute                     | `-1..1`                                      | `+1` 白色、`-1` 黑色、`0` 关闭；等级限制在 `1..100`                                 | `WildRNG.cs::ModifyLevel`                     |
| Slot                      | Normal 12、Horde/Rock Smash 5、Fishing 3     | 机率总和必须为 `100`；零机率槽位允许                                                | `WildRNG.cs::SlotDistribution`                |
| IV 范围                   | 六组闭区间，各端 `0..31`                     | 最小值不得大于最大值                                                                | `Core/RNGFilters.cs`                          |
| Perfect IV                | 数值 `0..31`，数量 `0..6`                    | 结果中达到数值的 IV 数量必须达到 Count；筛选数量不改变遭遇本身的保底 IV 或 RNG 推进 | `Core/RNGFilters.cs`                          |
| Result Limit              | 十进制，`1..100000`                          | 结果达到上限后结束 Worker 任务                                                      | Web Worker 任务保护                           |

## 算法与结果

普通、Rock Smash 和 Fishing 每帧先按上游准备 TinyMT，再推进主 MT `60` 次后生成 EC、PID、保底 IV、随机 IV、Ability、Nature 和 Gender。Fishing 额外执行 `3 * PartyPokemon`、`132` 主 RNG 消耗和 `TinyRand(7) * 30 + 60` 的动态延时；Rock Smash 使用 `TinyRand(3) == 0` 的宝可梦判定。Horde 每帧只准备一次 TinyMT，主 MT 先 `Advance(60)`，随后连续生成五只结果，五只共享同一帧的主 RNG 游标。

结果保留 Frame、Random、EC、PID、六项 IV、Nature、Ability、Gender、Hidden Power、Shiny、Synchronize、Species、Level、Slot、Item、Frame Used、PSV 与 PRV。`tinySynced` 是无时间线输入下的兼容开关，开启后将该帧视为同步成功；本模块不连接主机或 NTR/TCP。

Static / Magnet Pull 的队首随机判定已保留在输入契约中；由于 `LocationTable6.cs` 的六代槽位数据不携带上游静态/磁力属性标记，当前结果不会额外重排槽位。该限制在 UI 不隐藏其余筛选，并记录在本模块文档中。

## 数据

脚本 `scripts/generate_gen6_wild_data.mjs` 从 `LocationTable6.cs` 和 `Resources/text/text_Location_xy_{en,ja,zh}.txt` 生成 `src/features/gen6wild/data.ts`，当前包含 183 个 Horde、Rock Smash、Fishing 和 ORAS Mirage 区域记录。Horde 标量 `Level` 会展开为五只结果使用的等级；Fishing 九槽按 Old Rod、Good Rod、Super Rod 分组。

## Worker 与 Wasm 契约

- Module id：`gen6wild`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：96 个 `uint32_t` 字
- 结果：16 个 `uint32_t` 字
- Worker：每个任务使用独立 Dedicated Worker；取消后终止并重建实例；结果指针执行对齐和 Wasm 堆边界检查

固定夹具位于 `wasm/modules/gen6wild/tests/gen6wild_native_test.cpp`，覆盖 API、无效机率、普通 32 帧和 Horde 32×5 连续生成。TypeScript 夹具覆盖 96-word 编码、结果解码、Horde 槽位展开、输入预算、Hidden Power 和 UI Preview。

## 已验证

- `npm test -- src/features/gen6wild`：2 个文件、5 项测试通过
- `$env:POKERNGKIT_WASM_MODULES='gen6wild'; npm run wasm:test:native`：1/1 原生夹具通过
- `npm run typecheck`：通过
- `npm run verify`：通过；139 个测试文件、514 项测试，Vite/PWA 生产构建通过；Lint 0 error，保留 9 条既有 TanStack Virtual 警告
- `npm run format:check`、`git diff --check`：通过
- 激活本机 Emscripten 后 `$env:POKERNGKIT_WASM_MODULES='gen6wild'; npm run wasm:build`：通过；`public/wasm/gen6wild.mjs` 7440 bytes，SHA-256 `5490544C909FADF410F0A2F3D292354C520269DC1A5041FE1598DDA7B907419C`；`public/wasm/gen6wild.wasm` 14225 bytes，SHA-256 `C5082B38815D6434008656477A574E61980EF675DC0BA2258A974D885152F9DD`

## 界面布局

桌面端使用上下两行工作区，参数区占据上方整行，结果区在下方保持同宽；参数区和结果表分别在自身面板内滚动。RNG Info 与 Stationary、Event 复用同一组件，闭区间与目标帧 ±100 均接入现有请求；普通 Wild 显示禁用的 Timeline 占位，Horde 按上游 `Method == 2 && !IsHorde` 条件隐藏。Gen VI 不显示 NPC 或 Timeline Leap。布局选择器使用模块作用域，避免应用外壳的通用 `*-workspace` 规则把外层单列轨道覆盖为左右两栏。

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Wild6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\WildRNG.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\RNGPool.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Gen6Encounter\LocationTable6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Gen6Encounter\HordeArea6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Gen6Encounter\FishingArea.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\PKMW6.cs`

3DSRNGTool 代码按 MIT 条款记录来源；PokeRNGKit 整体继续按 GPL-3.0-or-later 发布，并保留上游版权与商标免责声明。
