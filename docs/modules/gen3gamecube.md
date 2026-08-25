# 第三世代 GameCube RNG

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

`gen3gamecube` 对应 PokeFinder 4.3.2 的 `GameCube` Generator/Searcher，覆盖 XD、Colosseum 的 Non Shadow/Shadow Locks 和 Pokémon Channel。

## 上游范围

- Form：`Form/Gen3/GameCube.cpp`、`Form/Gen3/GameCube.ui`
- Core：`Core/Gen3/Generators/GameCubeGenerator.cpp/.hpp`、`Core/Gen3/Searchers/GameCubeSearcher.cpp/.hpp`、`Core/Gen3/Profile3.hpp`、`Core/Gen3/ShadowLock.cpp/.hpp`、`Core/Gen3/LockInfo.hpp`
- 共享类型：`Core/Enum/Game.hpp`、`Core/Enum/Method.hpp`、`Core/Enum/ShadowType.hpp`、`Core/Enum/Shiny.hpp`、`Core/Parents/Searchers/StaticSearcher.hpp`
- 数据生成：`scripts/generate-gen3-gamecube-data.mjs`；固定数据为 Non Shadow `69`、Channel `1`、Shadow `77` 条模板
- 翻译：`Form/i18n/PokeFinder_zh.ts`
- 固定夹具：`Test/Gen3/GameCubeGeneratorTest.cpp`、`Test/Gen3/GameCubeSearcherTest.cpp`

`GameCube RNG` 的简体中文词条为 `NGC乱数`，`Channel` 为 `频道`，`Max Advances` 为 `最大帧数`。`Non Shadow Locks`、`Shadow Locks`、`First Shadow Unset` 等词条在上游为 unfinished，按规则保留英文。

## 输入限制

| 输入                                 | 上游设置                             | Web/domain 限制                                                 |
| ------------------------------------ | ------------------------------------ | --------------------------------------------------------------- |
| Seed                                 | `InputType::Seed32Bit`               | 十六进制 `0..0xFFFFFFFF`，最多 8 位；空值为 `0`                 |
| Initial Advances/Max Advances/Offset | `InputType::Advance32Bit`            | 十进制 `0..0xFFFFFFFF`，最多 10 位；空值为 `0`                  |
| Profile                              | `Profile3`                           | 仅 XD 或 Colosseum；TID/SID 为 `0..65535`                       |
| Template species/level               | `StaticTemplate3` / `ShadowTemplate` | species `1..386`，level `1..100`                                |
| IV 筛选                              | `StateFilter`                        | 每项最小/最大 `0..31`，且最小值不大于最大值                     |
| Nature/Hidden Power                  | `StateFilter`                        | 掩码分别为 `1..0x1FFFFFF` 和 `1..0xFFFF`                        |
| Shadow locks                         | `LockInfo`                           | 最多 5 条；nature `0..24`、gender `0..2`、gender ratio `0..255` |

Generator 的请求上限为最多 50000000 个闭区间帧；Searcher 的六项 IV 笛卡尔积同样不得超过 50000000，并在 Worker Pool 中继续拆成最多 100000 个组合的 Wasm 分片。`Initial + Offset + Max` 不得超过 `0xFFFFFFFF`。Channel 在 Wasm ABI 中使用上游 `Game::GC = 96`，XD/Colosseum 分别使用 `32/64`。

## Wasm/Worker ABI

API v1 接收固定 55-word 请求，Generator/Searcher 共享输入布局。每条结果为 12 个 `uint32_t`：`advancesOrSeed / pid / 六项 IV / ability / gender / level / nature+shiny`。Nature 在低 8 位，Shiny 在高位；Worker 复制前校验结果数量、指针对齐、IV、能力、性别、等级、性格和闪光范围。

Generator/Searcher 使用独立 Worker Pool，默认根据 `hardwareConcurrency` 使用最多 8 个 Worker，按 `chunkIndex` 恢复确定顺序；取消会终止并重建 Worker，不依赖 `SharedArrayBuffer` 或 Wasm pthread。

## 验证状态

已加入 `wasm/modules/gen3gamecube/tests/gamecube_native_test.cpp`，覆盖 Channel Jirachi Generator 固定结果。2026-08-13 经项目所有者授权，非受限环境的 `npm run verify` 已通过 Prettier、ESLint、TypeScript、28 个 Vitest 文件共 103 项测试、Vite 构建和 PWA 预缓存；模板数据已静态核对为 `69/1/77`。原生夹具、Wasm 构建、性能、浏览器和生产算法回归未运行。

vendored 上游文件、模板数据和 SHA-256 记录见 [`third_party/pokefinder/UPSTREAM.md`](../../third_party/pokefinder/UPSTREAM.md)。
