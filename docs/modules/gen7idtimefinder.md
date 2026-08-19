# 第七世代 ID Initial Seed / Time Finder（TF6）

## 功能范围

TF6 对应 `3DSTimeFinder` 的 `IDSearcher7`：按 Citra 时间范围逐秒计算
Initial Seed，再使用 Gen VII ID7 SFMT 生成指定帧区间的 TID、SID、TSV、TRV、
Gen7TID 和 Clock。时间反查在独立 Worker 中运行，复用既有
`gen7timefinder` 和 `gen7id` Wasm，不在 React 主线程执行 RNG。

## 输入限制

| 输入                             | 范围与行为                                                                                                 | 上游依据                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Game Version                     | Sun、Moon、Ultra Sun、Ultra Moon                                                                           | `3DSTimeFinder/Source/Forms/Gen7/ID7.cpp`      |
| Start / End Date/Time            | 不早于 `2000-01-01`，按整秒枚举，结束时间不得早于开始时间                                                  | `IDSearcher7.cpp`、`DateTime`                  |
| Tick                             | `0..0xFFFFFFFF`，十六进制 8 位；空值按 `0`                                                                 | `Profile7`、`Utility::calcInitialSeed`         |
| Offset                           | `0..4294967295`，十进制；空值按 `0`                                                                        | `Profile7::getOffset`、`Utility::getCitraTime` |
| Initial / Max Frame              | Sun/Moon 起始帧 `1012`，Ultra Sun/Ultra Moon 起始帧 `1132`；浏览器最大帧 `5000000`                         | `Profile7`、`ID7.cpp`、浏览器任务保护          |
| Clock correction                 | `0..16`                                                                                                    | `IDResult` 的 Clock 计算语义                   |
| ID / TSV / Random Number filters | 沿用 ID7 的多行列表、TID/SID/TID-SID/Gen7TID、TSV 和随机值筛选；支持 Regular Expression 与 Disable Filters | `IDFilter.cpp`、`ID7.cpp`                      |
| Result Limit                     | `1..100000`                                                                                                | PokeRNGKit Worker 保护边界                     |

## 计算流程

```text
epoch = localDateTimeMilliseconds + offset - 946684800000
initialSeed = SHA256::hash(tick, epochLow, epochHigh)
ID7 SFMT(initialSeed, frame) -> TID/SID -> TSV/TRV/Gen7TID/Clock
```

每个时间点的 ID 结果由 `gen7id` C ABI 生成，再在 Worker 边界应用既有多行筛选，
结果追加 Initial Seed 与时间戳。结果表使用虚拟滚动，避免时间范围较大时一次性创建全部 DOM 行。

## 架构与许可

- 时间 Worker：`src/features/gen7idtimefinder/worker/`。
- 领域与固定宽度结果协议：`src/features/gen7idtimefinder/timeDomain.ts`。
- UI：`src/features/gen7idtimefinder/Gen7IdTimePanel.tsx`。
- 上游来源：`3DSTimeFinder/Source/Core/Gen7/IDSearcher7.cpp`、`IDSearcher7.hpp`、`Source/Forms/Gen7/ID7.cpp`，以及既有 `gen7timefinder` / `gen7id` 核心。
- 上游 `3DSTimeFinder` 使用 GPL-3.0-or-later；来源、归属与修改边界见 `third_party/3dstimefinder/UPSTREAM.md`。

## 当前验证

- 已通过：TF6 定向 Vitest（1 个文件、3 项测试）与既有 Gen VII ID 测试（2 个文件、15 项测试合计）；`$env:POKERNGKIT_WASM_MODULES='gen7id'; npm run wasm:test:native`（1/1）。
- 已通过：`npm run typecheck`、定向 ESLint、全仓 `npm run verify`（160 个测试文件、571 项测试，Vite/PWA 预缓存 220 项）、`npm run format:check`、`git diff --check`。
- 已通过：激活 Emscripten 6.0.6 后定向 `npm run wasm:build`，复用 `gen7id` 与 `gen7timefinder` 产物可用。
- 待完成：外部 Chrome/Edge 与生产页面回归；按当前目标，待全部 3DS 模块完成后统一执行八项 UI 门槛。
