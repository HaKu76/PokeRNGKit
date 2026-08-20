# Gen IV Seed Finder

## 状态

功能实现完成，待统一 Pages 生产页面与外部 Chrome/Edge 验收。模块入口为 Gen IV 侧栏中的“第四世代Seed反查”。

## 范围

- DPPt Coin Flip Seed Finder：按日期、时间、秒数范围和 Delay 范围生成 Seed，并以 MT19937 低位生成 `T/H` 序列筛选。
- HGSS Elm Call Seed Finder：同样的时间/Delay 枚举，以 Gen IV PokeRNG 高 16 位 `% 3` 生成 `E/K/P` 序列筛选。
- 序列筛选沿用 PokemonRNGGuides `matchesSubsequence` 的连续子序列语义。
- 结果包含 Seed、日期时间、Delay 和固定长度序列，可在结果表中直接核对。

## 输入边界

| 输入            | 边界                                   | 来源                                               |
| --------------- | -------------------------------------- | -------------------------------------------------- |
| Year            | `2000..2099`                           | PokemonRNGGuides `Seed4CalcOpts` / Gen IV 日期工具 |
| Month / Day     | `1..12`，按月份和闰年校验日期          | `RngDateSchema`、`RngDateTime`                     |
| Hour / Minute   | `0..23` / `0..59`                      | `RngTimeSchema`                                    |
| Seconds         | 最小 `0..59`，最大 `min..60`           | `DpptCoinFlipSeedFinder`、`HgssElmCallSeedFinder`  |
| Delay           | `0..1,000,000`，范围差不超过 `100,000` | Web 运行时保护；上游为 `u32` 闭区间                |
| Sequence length | `1..32`，且不小于筛选长度              | Worker/Wasm 固定 64 位序列缓冲                     |
| Filter          | DPPt 仅 `H/T`；HGSS 仅 `E/K/P`         | `dpptCoinFlip/utils.ts`、`hgssElmCalls/utils.ts`   |

Wasm 最多返回 `100,000` 条结果，超过上限时任务以明确错误结束，避免浏览器分配不可控数组。空筛选表示不过滤，但仍生成完整显示序列。

## 算法来源

- `C:\Users\Hakuhiro\Desktop\project\PokemonRNGGuides-main\src\rngToolsUi\gen4\shared\getFindableSeeds.ts`
- `...\dpptCoinFlip\seedFinder.tsx` 与 `utils.ts`
- `...\hgssElmCalls\seedFinder.tsx` 与 `utils.ts`
- `...\rng_tools\src\generators\gen4\seed_time\generator.rs` 的 `calc_seed` / `generate_seedtime4s`
- `third_party/pokefinder/Core/RNG/LCRNG.hpp` 的 Gen IV PokeRNG 常量

Seed 计算为：

```text
AB = (month * day + minute + second) & 0xff
Seed = ((AB << 24) | (hour << 16)) + delay + year - 2000
```

生产算法只在 `wasm/modules/gen4seedfinder` 的 Dedicated Worker 中运行；React 负责输入、过滤字符规范化、协议校验和表格展示。

## 文件

```text
src/features/gen4seedfinder/
  domain.ts
  search.ts
  Gen4SeedFinderPanel.tsx
  Gen4SeedFinderPanel.css
  worker/messages.ts
  worker/Gen4SeedFinderWorker.ts
  worker/gen4seedfinder.worker.ts
wasm/modules/gen4seedfinder/
  bridge/gen4seedfinder_bridge.{h,cpp}
  tests/seed_finder_native_test.cpp
  CMakeLists.txt
  module.json
```

## 验证

本地原生夹具覆盖 API 版本、固定日期/Delay 的 `0x11111111` Seed、序列筛选和输入错误。格式检查、TypeScript、Vitest、原生 Wasm 夹具和完整 `npm run verify` 在模块收口时执行并记录到 `docs/progress.md`。

建议 GitHub Desktop 提交标题：`feat: 新增第四世代Seed反查`。
