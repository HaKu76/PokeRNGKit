# 第六世代 TinyFinder MT Seed Searcher

本模块实现 TinyFinder `Subforms/MT` 的 MT Seed 搜索页，覆盖 IV、PID、EC、PID
Reroll、PID Reroll = EC 与 Horde 六类模式。MT19937 初始化、帧消耗、IV 生成、
PID/PSV/PRV、性格、特性和群战跳帧全部运行在 `gen6mtseed` Dedicated Worker 的
独立 Wasm 实例中。

## 已核对输入

| 输入           | 范围或行为                                      | 上游依据                        |
| -------------- | ----------------------------------------------- | ------------------------------- |
| Start/End Seed | 32 位无符号、8 位十六进制；起始值不得大于结束值 | `MTForm.Designer.cs`、`HexBox`  |
| Min Frame      | `0..100000`                                     | `MTForm.Designer.cs`            |
| Max Frame      | `Min Frame..10000000`                           | `MTForm.Designer.cs`            |
| PID/EC         | 32 位十六进制                                   | `MTForm.cs`、`HexBox`           |
| TSV/TRV        | `TSV 0..4095`、`TRV 0..15`                      | `MTForm.Designer.cs`            |
| Shiny          | Any、Star、Square、Star/Square                  | `MTForm.Designer.cs`、`Core.cs` |
| Perfect IVs    | `0..3`；指定完美 IV 使用六位槽位掩码            | `Core.cs::IVPrepare`            |
| IV 上下限      | 每项 `0..31`，下限不得大于上限                  | `Core.cs::CheckIVs`             |
| Nature         | 25 位掩码                                       | `Core.cs::FindIVsNature`        |
| Horde Shinies  | `2..5`                                          | `MTForm.Designer.cs`            |
| Result limit   | `1..100000`，浏览器保护上限                     | PokeRNGKit Worker/Wasm 契约     |

TinyFinder 的 Turbo 选项只影响 Horde 的快速路径。当前 Wasm 保留通用
`SetJumps` 语义，并把该选项作为请求字段，避免在浏览器中复制三份快速 Horde
实现；结果字段保留五只跳帧、同步、Charm、HA 和物种类别。

## 算法与 ABI

- MT 初始化沿用 `MersenneTwister_Fast` 的 624-word 状态与整块 twist。
- 每个 Seed 从 `Min Frame + 62` 预推进；当前 PID 从 `frame + 20` 读取，IV、性格和
  特性按 `FindIVsNature` 的帧偏移生成。
- Horde 依次复现 `HordesResearchAny/TSV`、`CheckAll` 和 `SetJumps`，保留同步、
  Shiny Charm、Hidden Ability、Genderless、Carbink、Smoochum 与 Mime Jr. 分支。
- Wasm API：`33` 个请求 `uint32_t`，`32` 个结果 `uint32_t`；`begin/step` 分步
  运行，单次最多处理 2048 个 Seed，结果上限为 100000 行。

结果字段前 22 项为 Seed、Frame、PID、PSV、PRV、两组 IV、Nature、Ability、辅助
字段；22..26 为 Horde 五只相对跳帧，27 为物种类别，28 为 HA，29..31 预留。

## 页面与文件

- 页面：`src/features/gen6mtseed/Gen6MtSeedPanel.tsx`
- Domain：`src/features/gen6mtseed/domain.ts`
- Worker：`src/features/gen6mtseed/worker/Gen6MtSeedWorker.ts`、`gen6mtseed.worker.ts`
- Wasm bridge：`wasm/modules/gen6mtseed/bridge/gen6mtseed_bridge.cpp`
- 原生夹具：`wasm/modules/gen6mtseed/tests/gen6mtseed_native_test.cpp`

## 验证状态

已通过 `cmake -S wasm -B build/wasm-native -DPOKERNGKIT_WASM_MODULES=gen6mtseed`、
`cmake --build build/wasm-native --target gen6mtseed_native_test -j 2`、
`ctest --test-dir build/wasm-native -R gen6mtseed_native_parity --output-on-failure`、
`npm run typecheck` 与模块 Domain 定向 Vitest。完整 `npm run verify`、Emscripten
生产构建、外部 Chrome/Edge UI 回归和生产页面算法验收尚未运行；算法验收仍需等待
部署完成后由项目所有者提供准确 URL 并授权。

## 上游与许可

主要来源为本地 TinyFinder `Subforms/MT/MTForm.cs`、`Subforms/MT/Core.cs`、
`Subforms/MT/FastHordes/Horde3.cs`、`Horde4.cs`、`Horde5.cs` 与 `RNG/MT.cs`。
保留 TinyFinder、MT19937 原始实现的版权、许可证和免责声明；PokeRNGKit 按
GPL-3.0-or-later 发布。
