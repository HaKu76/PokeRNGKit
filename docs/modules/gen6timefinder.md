# 第六世代 Stationary 时间反查

## 功能范围

TF1 对应 `3DSTimeFinder` 的 Gen VI `StationarySearcher6`：按 Citra RTC 日期范围逐秒计算初始 Seed，再复用 PokeRNGKit Gen VI Stationary 的 MT19937 生成和筛选语义。结果保留 Date/Time、Initial Seed、Frame 与定点结果字段。算法在 Dedicated Worker 中运行，Stationary 生成仍由独立 `gen6stationary` Wasm 执行。

## 输入限制

| 输入                          | 范围与行为                                                                | 上游依据                                                     |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Start / End Date/Time         | `2000-01-01 00:00:00` 至 `2000-02-19 17:02:48` 的整秒；Start 不得晚于 End | `Source/Forms/Gen6/Stationary6.cpp`、`Utility::getCitraTime` |
| Save Variable / Time Variable | 32 位十六进制，`0..FFFFFFFF`；来自 Gen VI Profile6                        | `Source/Core/Gen6/Profile6.hpp`、`ProfileLoader.cpp`         |
| Initial / Max Frame           | 上游 `Frame32Bit`，浏览器保护范围 `0..5000000`                            | `StationarySearcher6.cpp`、`Stationary6.cpp`                 |
| Result Limit                  | `1..100000`                                                               | PokeRNGKit Worker 任务上限                                   |

空十六进制输入按 `0` 解释。初始 Seed 公式严格复用上游：`uint32(saveVariable + epoch + timeVariable)`，其中 `epoch` 是 Citra epoch 毫秒值；日期按 `1000` 毫秒步进。

## Worker / Wasm 契约

- `gen6timefinder` Wasm API v1：仅提供 Gen VI 初始 Seed 的 32 位加法。
- `gen6stationarytimefinder.worker.ts` 逐秒调用 `gen6timefinder`，再把 Seed 注入既有 `gen6stationary` 49-word 请求。
- 时间结果为 19 个 `uint32_t`：既有 16-word Stationary 结果，追加 Initial Seed、Epoch low、Epoch high。
- 取消会终止 Worker 并重建实例；跨时间点结果按 Worker 批次累计，达到全局上限时停止后续日期。

## 上游来源与许可

- `3DSTimeFinder/Source/Core/Gen6/StationarySearcher6.cpp`
- `3DSTimeFinder/Source/Core/Gen6/Profile6.hpp`
- `3DSTimeFinder/Source/Core/Util/Utility.cpp`
- `3DSTimeFinder/Source/Forms/Gen6/Stationary6.cpp`

上游 `3DSTimeFinder` 使用 GPL-3.0-or-later；来源、revision 与归属见 [`third_party/3dstimefinder/UPSTREAM.md`](../../third_party/3dstimefinder/UPSTREAM.md)。

## 验证

- `npx vitest run src/features/gen6stationary/timeDomain.test.ts src/features/3dsprofiles/domain.test.ts src/features/gen6stationary/domain.test.ts`：3 个文件、13 项通过。
- `$env:POKERNGKIT_WASM_MODULES='gen6timefinder'; npm run wasm:test:native`：1/1 通过。
- `npm run typecheck`：通过。
- `npm run wasm:build`：未运行，当前环境未激活 Emscripten / `emcmake`。
- 外部 Chrome/Edge 与生产页面算法验收：未运行，按全部 3DS 模块完成后的统一门槛执行。
