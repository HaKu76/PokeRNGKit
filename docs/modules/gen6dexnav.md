# 第六世代图鉴导航乱数

## 功能范围

本模块对应 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VI `DexNav` 工作流，覆盖草丛、长草和冲浪三种基础遇敌类型。结果显示 TinyMT 帧、摇晃坐标、槽位/槽位类型、连锁 Boost、队首同步、等级修正、笛子修正、潜力星级、隐藏特性、蛋招式、持有物、强制闪光和物种。

上游 `DexNav.cs` 的 `FindPatch()` 与 `PostCheck()` 目前是 `return true` 的占位实现，因此本模块保留上游的成功路径和随机消耗，不伪造未提供的补丁失败概率。普通草丛/长草使用 12 槽，冲浪使用 5 槽；上游没有在 DexNav 类中提供完整地点物种表，界面提供可编辑物种与等级槽位，未知形态开关将物种固定为 Unown（201）。

算法只在独立 `gen6dexnav` Dedicated Worker 和 `gen6dexnav.mjs/.wasm` 中执行。TypeScript 负责输入校验、请求编码、结果解码和界面状态。

## 输入限制

空十六进制和十进制输入按 `0` 解释。上游没有给出浏览器帧预算；本项目沿用 Gen VI 工作区的浏览器绝对帧保护 `5000000`，原生上限保持 `1000000000`。

| 输入                      | 进制与范围                                   | 默认/行为                                                     | 上游依据                                              |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Tiny Seed                 | 十六进制，最多 8 位，`0..0xFFFFFFFF`         | 空值为 `0`                                                    | `RNG/TinyMT.cs`                                       |
| Initial Frame / Max Frame | 十进制，`0..1000000000`；浏览器 `0..5000000` | Initial 必须小于等于 Max                                      | `Util/FuncUtil.cs::MAXFRAME`、Gen VI Web 预算         |
| Tiny Frame                | 十进制，`0..1000000000`                      | 以 `tinySeed` 初始化 TinyMT 后推进 `Tiny Frame + Frame`       | `Core/RNGPool.cs`、`Gen6/DexNav.cs`                   |
| Encounter Type            | Grass、Tall Grass、Surf                      | 对应上游 `EncounterType 0..2`                                 | `Gen6/DexNav.cs`                                      |
| Active Search             | 布尔                                         | 开启时跳过普通步触发，并保留主动搜索槽位                      | `DexNav.ActiveSearch`                                 |
| Has DexNav                | 布尔                                         | 开启后 30% 概率把槽位类型改为 DexNav                          | `DexNav.HasDexNav`、`Generate()`                      |
| Search Level              | 十进制，`0..999`                             | 决定 Grade 和强制闪光目标值                                   | `DexNav.SearchLevel`、`GetGrade`                      |
| Chain Length              | 十进制，`0..999`                             | 每 5 连锁触发 Boost；49/99 连锁增加闪光检查                   | `DexNav.ChainLength`                                  |
| Shiny Charm               | 布尔                                         | 普通 1 次、持有护符 3 次闪光检查                              | `DexNav.ShinyCharm`                                   |
| Compound Eyes             | 布尔                                         | 调整常见/稀有持有物概率                                       | `DexNav.CompoundEyes`                                 |
| Forced Shiny              | 布尔                                         | 结果强制标记闪光                                              | `MainForm.cs::CB_ForcedShiny`、`Wild6.IsForcedShiny6` |
| Nav HA                    | 布尔                                         | 结果强制标记隐藏特性；仍保留上游 HA 随机消耗                  | `MainForm.cs::CB_NavHA`、`Wild6.DexNavHA`             |
| Nav Unown                 | 布尔                                         | 物种固定为 201                                                | `MainForm.cs::CB_NavUnown`                            |
| Potential                 | 十进制，`0..3`                               | 作为下游固定 IV 星级最低值显示                                | `MainForm.cs::setting6._ivcnt`、`DexNav.Potential`    |
| Flute                     | `-1..1`                                      | `+1` 白笛、`-1` 黑笛、`0` 关闭；按 `FluteBoost 1..4` 修正等级 | `Core/WildRNG.cs::ModifyLevel`、`DexNav.Generate()`   |
| TSV / TRV                 | TSV `0..4095`；TRV `0..15`                   | 从 3DS Profile 同步，用于档案一致性                           | `MainForm.Designer.cs`、ProfileView                   |
| Slot Species / Level      | Species `0..721`；Level `0..100`             | Grass/Tall Grass 至少 12 槽，Surf 至少 5 槽                   | `MainForm.cs::setting6.SpecForm`、`SlotLevel`         |
| Result Limit              | 十进制，`1..100000`                          | 达到上限后停止 Worker 任务                                    | Web Worker 任务保护                                   |

## 算法

每个帧从 `TinyMT(tinySeed)` 推进 `tinyFrame + frame`。非主动搜索先消耗同步与遇敌率状态，再按 50% 触发；触发后按上游 `FindPatch()` 选择上下左右摇晃坐标。生成顺序为槽位类型、Boost、Lead、槽位、占位消耗、Grade、等级 Boost、Flute Boost、HA、潜力、蛋招式、持有物和闪光检查，最后执行 `PostCheck()` 的两次占位消耗。

槽位类型在 `HasDexNav` 开启且 30% 命中时为 DexNav，否则沿用 Grass/Tall Grass/Surf；Boost 在 `(ChainLength + 1) % 5 == 0` 或 4% 随机命中时成立。Grade 边界为 `<5`、`<10`、`<25`、`<50`、`<100`，否则为 5。闪光检查次数按护符、Boost、49/99 连锁叠加，目标值复用上游 `SearchLevel` 分段公式。

## Worker 与 Wasm 契约

- Module id：`gen6dexnav`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：45 个 `uint32_t` 字（包含 13 个物种槽与 13 个等级槽）
- 结果：16 个 `uint32_t` 字；包含 Frame、坐标、槽位、细节位、标记位、物种、等级、Grade、Potential 与 Search Level
- Worker：每个任务使用独立 Dedicated Worker；取消后终止并重建实例；结果指针执行对齐和 Wasm 堆边界检查

固定夹具位于 `wasm/modules/gen6dexnav/tests/gen6dexnav_native_test.cpp`，覆盖 API、主动搜索 32 帧、帧连续性和结果边界。TypeScript 夹具覆盖 45-word 编码、坐标/标记解码、浏览器帧保护和 UI 预览。

## 已验证

- `npm test -- src/features/gen6dexnav`：2 个文件、4 项测试通过
- `npm run typecheck`：通过
- `npm run verify`：通过；141 个测试文件、518 项测试，Vite 转换 2213 个模块，PWA 预缓存 197 项；Lint 0 error，保留 10 条 TanStack Virtual 警告
- `$env:POKERNGKIT_WASM_MODULES='gen6dexnav'; node scripts/wasm.mjs test-native`：1/1 原生夹具通过
- 激活 Emscripten 6.0.6 后 `$env:POKERNGKIT_WASM_MODULES='gen6dexnav'; node scripts/wasm.mjs build`：通过
- `public/wasm/gen6dexnav.mjs`：7490 bytes，SHA-256 `C81F8167D1276F9D0B187421267449127214BAEB922D046D8477830E568E04FB`；`public/wasm/gen6dexnav.wasm`：8980 bytes，SHA-256 `B14937434D5869759467374734AEB36580713445A466E474275A1769D5588313`
- 未运行：外部 Chrome / Edge UI 回归；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\DexNav.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Wild6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\WildRNG.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\RNG\TinyMT.cs`

3DSRNGTool 代码按 MIT 条款记录来源；PokeRNGKit 整体继续按 GPL-3.0-or-later 发布，并保留上游版权与商标免责声明。
