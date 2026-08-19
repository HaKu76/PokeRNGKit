# 第七世代 Initial Seed / Time Finder（TF3）

## 功能范围

TF3 对应 `3DSTimeFinder` 的 Gen VII Stationary 时间反查入口：按 Citra 时间范围逐秒计算初始 Seed，再复用 PokeRNGKit 的 Gen VII Stationary 连续帧生成与筛选。每条结果包含日期/时间、初始 Seed 和 Stationary Frame 结果。

本模块不复制 Gen VII Stationary 的 RNG 规则，也不在 React 主线程计算 SHA-256。时间枚举和两套 Wasm 实例均运行在 Dedicated Worker 内：`gen7timefinder` 负责上游 SHA-256 初始 Seed，`gen7stationary` 负责 SFMT 定点生成。

## 输入限制

| 输入                        | 范围与行为                                                                            | 上游依据                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Start / End Date/Time       | 不早于 `2000-01-01 00:00:00`；按整秒枚举，Start 不得晚于 End                          | `3DSTimeFinder/Source/Forms/Gen7/Stationary7.cpp` 的最小日期与 `StationarySearcher7.cpp` 的 `epoch += 1000` |
| Tick                        | 十六进制 `0..FFFFFFFF`，默认 USUM `041D9CB9`；SM 默认 `036EC43B`                      | `Profile7.hpp/.cpp`、`ProfileCalibrater7.cpp`                                                               |
| Offset                      | 十进制 `0..4294967295`，默认 `55`                                                     | `Profile7` 的 `u32 offset`                                                                                  |
| Initial / Max Frame         | 继承 Gen VII Stationary：SM 起始帧 `418`、USUM 起始帧 `478`，浏览器绝对上限 `5000000` | `StationarySearcher7.cpp` 与 `gen7stationary` 模块文档                                                      |
| Stationary target / filters | 继承 `docs/modules/gen7stationary.md` 的模板、IV、性格、特性、性别、异色和 Blink 筛选 | `Gen7/Stationary7.cs`、`Core/RNGFilters.cs`                                                                 |
| Result Limit                | `1..100000`；跨所有时间点累计                                                         | PokeRNGKit Worker/Wasm 保护边界                                                                             |

静态浏览器额外限制 `时间点数 × 帧数 <= 5000000`，避免逐秒建立 SFMT 会话时形成无界任务；该限制不改写上游输入类型。

时间内部使用 Citra epoch 毫秒：

```text
epoch = localDateTimeMs + offset - 946684800000
next epoch = epoch + 1000
initialSeed = SHA256::hash(tick, epochLow, epochHigh)
```

## Wasm 与 Worker 契约

- Module id：`gen7timefinder`
- Contract version：`1`
- API version：`1`
- Operation：`time-search`
- `gen7timefinder_initial_seed(tick, epochLow, epochHigh)` 返回 32 位初始 Seed。
- Worker 同时加载 `gen7timefinder.mjs` 与 `gen7stationary.mjs`，逐时间点建立 Stationary 会话；结果为 Stationary 九字结果加 `initialSeed` 与 64 位 epoch，共 12 个 `uint32_t`。
- 取消通过终止 Worker，下一次搜索建立独立 Worker；不依赖 `SharedArrayBuffer`、Wasm pthread 或后端。

## 上游与许可

主要上游文件：

- `3DSTimeFinder/Source/Core/Gen7/StationarySearcher7.cpp`
- `3DSTimeFinder/Source/Core/Util/Utility.cpp`
- `3DSTimeFinder/Source/Core/RNG/SHA256.cpp`
- `3DSTimeFinder/Source/Core/Gen7/Profile7.cpp`
- `3DSTimeFinder/Source/Forms/Gen7/Stationary7.cpp`

`3DSTimeFinder` 按 GPL-3.0-or-later 发布；来源和 revision 记录见 `third_party/3dstimefinder/UPSTREAM.md`。PokeRNGKit 保留上游归属与许可证说明。

## 验证状态

已通过：

- `npx vitest run src/features/gen7stationary/timefinder.test.ts src/features/gen7stationary/domain.test.ts src/features/gen7stationary/preview/Gen7StationaryUiPreviewEngine.test.ts src/features/gen7stationary/worker/Gen7StationaryWorker.test.ts src/features/gen7stationary/worker/Gen7StationaryTimeWorker.test.ts`（5 个文件、15 项测试）
- `npm run verify`（155 个测试文件、556 项测试；Vite/PWA 生产构建 213 项预缓存资源）
- `set POKERNGKIT_WASM_MODULES=gen7timefinder&&npm run wasm:test:native`（原生夹具 1/1）
- 激活 Emscripten 6.0.6 后的定向 `npm run wasm:build`
- `npm run format:check`、`git diff --check`

已验证产物（2026-08-19，Node 24.19.0、npm 12.0.2）：

| 文件                              | 字节数 | SHA-256                                                            |
| --------------------------------- | -----: | ------------------------------------------------------------------ |
| `public/wasm/gen7timefinder.mjs`  |   5121 | `0683AFF7DA64CF4AA0F99A33C27AD1B808425062C2F334F4EFABECABE2D3BA68` |
| `public/wasm/gen7timefinder.wasm` |    835 | `1B05A266188966B7E899D357D53EE7F652BAC28866E932197163E99CEA7AAFDA` |

Worker 初始化期间取消、跨时间点累计结果上限和时间×帧浏览器预算均有定向回归覆盖。生产算法验收仍须 GitHub Actions 部署后由项目所有者提供准确 URL 并授权；外部 Chrome/Edge UI 回归本轮未运行。
