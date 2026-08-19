# 第六世代 TinyFinder 碎岩乱数

状态：已实现 TinyFinder T6 Rock Smash 的 TinyMT 消耗、闪烁时间线、遭遇触发、同步、槽位、笛子、道具槽和危险帧筛选。该模块与 3DSRNGTool Gen VI Wild 独立，结果不生成主 MT 的 EC、PID 或 IV。

## 范围

- 支持 X、Y、Omega Ruby、Alpha Sapphire 的五槽碎岩遇敌表。
- 支持 TinyMT 初始 Seed 或四字状态输入，Index 闭区间检索、结果上限和取消。
- 按 TinyFinder `Wild.RockSmash` 与 `BlinkSystem.Apply` 的顺序推进 TinyMT：首次长闪烁、交互帧 +18、叫声帧 +66、实际交互帧 +276、遭遇/同步/槽位/笛子/道具消耗。
- 输出 TinyMT 状态、Rand#（当前原始 uint32）、遭遇结果、同步、槽位、物种等级、道具槽、延迟、时间线和危险帧标记。

## 输入限制

| 输入             | 范围或行为                                                            | 上游依据                                                                                 |
| ---------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Input Mode       | TinyMT Seed 或四字 TinyMT State                                       | `TinyFinder/Main/Form1.cs::Prepare`、`RNG/TinyMT.cs`                                     |
| Seed / State     | `uint32`，`0..0xFFFFFFFF`；空值按 `0`                                 | `TinyFinder/RNG/TinyMT.cs`                                                               |
| Min Index        | `0..250000`                                                           | `TinyFinder/Main/Form1.Designer.cs::min`                                                 |
| Max Index        | `Min Index..10000000`；浏览器任务上限 5000000 个状态                  | `TinyFinder/Main/Form1.Designer.cs::max`、PokeRNGKit Worker 预算                         |
| First Long Blink | `0..1000`；按 TinyFinder `Location.FirstLongBlinkRand` 或 `_Emu` 填写 | `TinyFinder/Classes/Location.cs`、`Database/LocationsXY.cs`、`Database/LocationsORAS.cs` |
| Interact Frame   | `0..1000`；TinyFinder Rock Smash 默认 `300`                           | `TinyFinder/Classes/EncounterType.cs`、`Main/Form1.Designer.cs::InteractFrame`           |
| ORAS             | 开启后按 TinyFinder 的 ORAS 闪烁修正 `-16` 和笛子消耗                 | `TinyFinder/Utils/BlinkSystem.cs`、`Main/FindResults.cs`                                 |
| Filters          | 触发、同步、危险帧、笛子 `0..4`（0 为不限）、槽位掩码 `0..31`         | `TinyFinder/Main/UISettings.cs::CheckCommon`、`Utils/PrepareRow.cs::isRisky`             |
| Slot data        | 五个物种 `0..721`，等级 `1..100`                                      | `TinyFinder/Database/TableXY.cs`、`TableORAS.cs`                                         |
| Result Limit     | `1..100000`                                                           | PokeRNGKit Worker 任务保护                                                               |

## 算法与协议

Wasm bridge 只实现 TinyFinder 的 TinyMT 消耗，不复用主 MT Wild bridge。每个 Index 使用当前状态的 `CurrentU32()` 作为 Rand#，复制状态执行 BlinkSystem，再依次执行 `RandCall(3)`、`RandCall(100)`、`RandCall(100)`、ORAS 笛子、一次推进和道具槽判定；完成后原状态推进一次进入下一个 Index。时间线按 TinyFinder 的 `TimelineInt.Sort()` 后执行危险帧邻近判断，结果协议最多输出前 8 个时间点。

- Wasm module：`gen6tinyrocksmash`
- API / Contract version：`1` / `1`
- 操作：`generator`
- 请求：27 个 `uint32` 字；结果：24 个 `uint32` 字
- Worker：Dedicated Worker，分批推进，取消时终止并重建 Worker
- 不使用 SharedArrayBuffer、Wasm pthread、NTR/TCP 或后端

## 页面与文件

- 页面：`src/features/gen6tinyrocksmash/Gen6TinyRockSmashPanel.tsx`
- Domain：`src/features/gen6tinyrocksmash/domain.ts`
- Worker：`src/features/gen6tinyrocksmash/worker/Gen6TinyRockSmashWorker.ts`、`gen6tinyrocksmash.worker.ts`
- UI 预览：`src/features/gen6tinyrocksmash/preview/Gen6TinyRockSmashUiPreviewEngine.ts`
- Wasm bridge：`wasm/modules/gen6tinyrocksmash/bridge/gen6tinyrocksmash_bridge.cpp`
- 原生夹具：`wasm/modules/gen6tinyrocksmash/tests/gen6tinyrocksmash_native_test.cpp`

## 验证状态

已通过：任务文件格式化、`npm run format:check`、`git diff --check`、`npm run lint`、`npm run typecheck`、定向 Vitest（2 个文件、4 项测试）、`$env:POKERNGKIT_WASM_MODULES='gen6tinyrocksmash'; npm run wasm:test:native`（1/1）、定向 Emscripten Wasm 构建和完整 `npm run verify`（168 个测试文件、591 项测试及生产 Web 构建）。

## 上游与许可

主要来源：本地 `C:\Users\Hakuhiro\Desktop\project\TinyFinder-main\TinyFinder\Methods\Wild.cs`、`Utils\BlinkSystem.cs`、`Utils\PrepareRow.cs`、`Classes\Index.cs`、`RNG\TinyMT.cs`。TinyFinder 来源和许可证记录见 `third_party/tinyfinder/UPSTREAM.md`；PokeRNGKit 继续按 GPL-3.0-or-later 发布并保留上游署名与免责声明。
