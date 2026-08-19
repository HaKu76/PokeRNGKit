# 第六世代 TinyFinder 蜂蜜野生乱数

状态：已实现 TinyFinder T8 Honey Wild 的 TinyMT 消耗、地点表、闪烁延迟、同步、槽位、笛子、道具槽和危险帧筛选。

## 输入与上游限制

| 输入                 | 范围或行为                                                                                             | 上游依据                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Game                 | X、Y、Omega Ruby、Alpha Sapphire；地点表按 TinyFinder `TableXY` / `TableORAS` 分支选择                 | `Database/LocationsXY.cs`、`LocationsORAS.cs`、`TableXY.cs`、`TableORAS.cs` |
| Seed / State         | TinyMT `uint32` 或四字状态；空值按 `0`                                                                 | `RNG/TinyMT.cs`                                                             |
| Index                | Min `0..250000`，Max `Min..10000000`，浏览器任务上限 5000000                                           | `Main/Form1.Designer.cs`、Worker 任务预算                                   |
| First Long Blink     | `0..1000`；零值由地点表或用户输入补齐                                                                  | `Location.FirstLongBlinkRand` / `_Emu`                                      |
| Honey Delay          | `0..1000`；模拟器模式 XY `114` / ORAS `118`，普通模式按 Bag Advances 使用 XY `110/112`、ORAS `120/126` | `Main/FindResults.cs`、`Utils/BlinkSystem.cs`                               |
| Party / Bag Advances | Party `1..6`；地点 Bag Advances `0..100`，零值按 XY `27` / ORAS `15`                                   | `Main/Form1.cs`、`Main/FindResults.cs`                                      |
| Encounter table      | 普通草地、洞穴、长草、花田、沼泽为 12 槽；水面为 5 槽                                                  | `Classes/Location.cs::HasHoneyWild`、`TableXY.cs`、`TableORAS.cs`           |
| Filters              | 同步、危险帧、笛子 `0..4`、槽位掩码 `0..0xFFF`                                                         | `Main/UISettings.cs`、`Utils/PrepareRow.cs::isRisky`                        |
| Result Limit         | `1..100000`                                                                                            | PokeRNGKit Worker 任务保护                                                  |

## 算法与协议

每个 Index 先输出当前 `CurrentU32()`，再推进 `party * 3 + getBagAdvances() - 1`，设置 Honey/Horde 共用的短闪烁前置，ORAS 首帧减 4，按 `ActualDelay = longBlinkRand + honeyDelay` 推进闪烁，随后执行同步、槽位、ORAS 笛子、一次推进和道具槽。TinyFinder 的 Honey 分支不设置触发遭遇标记；页面仅展示同步、槽位、宝可梦、等级、道具槽、笛子、延迟和时间线。普通槽位分布为 `10/10/10/10/10/10/10/10/10/5/4/1`，水面为 `50/30/15/4/1`。

- Wasm module：`gen6tinyhoney`
- API / Contract version：`1` / `1`
- 请求：44 个 `uint32` 字；结果：24 个 `uint32` 字
- Worker：Dedicated Worker，分批推进，取消时终止并重建
- 不使用 SharedArrayBuffer、Wasm pthread、NTR/TCP 或后端

## 页面与文件

- 页面：`src/features/gen6tinyhoney/Gen6TinyHoneyPanel.tsx`
- 数据生成：`scripts/generate_gen6_tiny_honey_data.mjs`
- Domain / Worker：`src/features/gen6tinyhoney/domain.ts`、`worker/`
- Wasm bridge：`wasm/modules/gen6tinyhoney/bridge/gen6tinyhoney_bridge.cpp`
- 原生夹具：`wasm/modules/gen6tinyhoney/tests/gen6tinyhoney_native_test.cpp`

## 上游与许可

主要来源：本地 `C:\Users\Hakuhiro\Desktop\project\TinyFinder-main\TinyFinder\Methods\Wild.cs`、`Utils\BlinkSystem.cs`、`Utils\PrepareRow.cs`、`Classes\Location.cs`、`Database\LocationsXY.cs`、`LocationsORAS.cs`、`TableXY.cs`、`TableORAS.cs`、`RNG\TinyMT.cs`。TinyFinder 来源和许可证记录见 `third_party/tinyfinder/UPSTREAM.md`。
