# 第七世代配信 Initial Seed / Time Finder（TF4）

## 功能范围

TF4 对应 `3DSTimeFinder` 的 Gen VII `EventSearcher7`：按 Citra 时间范围逐秒计算初始 Seed，再为每个时间点复用 Gen VII SFMT 配信帧生成与筛选。结果保留 Date/Time、Initial Seed、Frame、PID、EC、六项 IV、Nature、Hidden Power、Gender、Ability 和 Shiny。

时间枚举、初始 Seed 哈希和配信连续帧搜索均在 Dedicated Worker 内执行。React 只负责输入、任务编排、结果解码和表格显示；生产 RNG 不在主线程或 UI 预览引擎中实现。

## 输入限制

| 输入                           | 范围与行为                                                                                               | 上游依据                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Game Version                   | Sun、Moon、Ultra Sun、Ultra Moon；版本值沿用 Gen VII Profile7                                            | `Source/Forms/Gen7/Event7.cpp`、`Source/Core/Gen7/EventSearcher7.cpp`          |
| Start / End Date/Time          | 不早于 `2000-01-01 00:00:00`；按整秒枚举；Start 不得晚于 End                                             | `Event7.cpp` 的 `setMinimumDateTime`、`EventSearcher7.cpp` 的 `epoch += 1000`  |
| Tick                           | 8 位十六进制，`0..0xFFFFFFFF`；空值按 `0`                                                                | `Profile7` 与 `Utility::calcInitialSeed`                                       |
| Offset                         | 十进制 `0..4294967295`；空值按 `0`                                                                       | `Profile7::getOffset`、`Utility::getCitraTime`                                 |
| Initial / Max Frame            | 上游 `Frame32Bit`：十进制 `1..0xFFFFFFFF`，Initial 不得大于 Max；浏览器绝对上限 `5,000,000`              | `Source/Forms/Controls/TextBox.cpp` 的 `InputType::Frame32Bit`、浏览器任务保护 |
| TID / SID                      | 十进制 `0..65535`、5 位；空值按 `0`                                                                      | `Event7.cpp` 的 `InputType::ID`                                                |
| EC / PID                       | 8 位十六进制 `0..0xFFFFFFFF`；空值按 `0`；EC 为 0 时随机，PID 仅 Specified 使用                          | `Event7.cpp` 的 `InputType::Seed32Bit`、`EventSearcher7.cpp::setHidden`        |
| PID Type                       | Random、Nonshiny、Shiny、Specified                                                                       | `Event7.cpp` 的 `PIDType` 映射                                                 |
| Ability / Nature / Gender Lock | Ability 为 `1/2/H` 或 `1/2/H` 随机模式；Nature 为 25 项；Gender 为 `-`、♂、♀；未锁定时按上游消耗随机值   | `Event7.cpp` 的三个锁定控件、`EventSearcher7.cpp`                              |
| Fixed IV                       | 每项未锁定为 `-1`，锁定值 `0..31`                                                                        | `Event7.cpp` 的六个 IV 复选框和 SpinBox                                        |
| Random perfect IVs             | `0..6`，且不得超过未锁定 IV 槽位数；浏览器拒绝会导致上游循环无法结束的组合                               | `Event7.cpp` 的 `spinBoxRandomIVs`、`EventSearcher7.cpp` 的随机 31 IV 循环     |
| Filters                        | Shiny、Gender、Ability、25 Nature、16 Hidden Power、六项 IV 范围；每项 IV `0..31` 且最小值不得大于最大值 | `EventFilter.cpp`、`ResultFilter`                                              |
| Result Limit                   | `1..100000`；跨全部时间点累计                                                                            | PokeRNGKit Worker/Wasm 保护边界                                                |

时间换算沿用上游：

```text
epoch = localDateTimeMilliseconds + offset - 946684800000
next epoch = epoch + 1000
initialSeed = SHA256::hash(tick, epochLow, epochHigh)
```

浏览器额外限制 `时间点数 × (Max Frame - Initial Frame + 1) <= 5,000,000`，用于防止静态页面建立无界长任务；不改变上游 32 位输入类型。空十六进制和十进制输入均先规范化为 `0`，领域层再次执行范围和组合校验。

## RNG 与结果编码

每个时间点从初始 Seed 初始化 SFMT 并推进到 Initial Frame，使用 `RNGList<uint64_t, SFMT, 64>` 维持连续状态。每帧按上游顺序生成 EC、PID、随机完美 IV、剩余 IV、Ability、Nature 和 Gender；Shiny 使用事件 TID/SID 的 TSV，Hidden Power 使用上游六项 IV 顺序。

Wasm 请求为 45 个 `uint32_t`：Seed、帧范围、版本、事件 ID、Profile ID、PID/EC、锁定项、六项固定 IV、筛选掩码、六项 IV 最小值、六项 IV 最大值和结果上限。每条原生结果为 5 个 `uint32_t`：Frame、EC、PID、压缩 IV 和元数据；Worker 追加 Initial Seed 与 64 位 epoch，向 TypeScript 暴露 8 个字的结果。

元数据保持 PokeRNGKit 现有结果表示：Nature 位 `0..4`、Ability 位 `5..6`（1/2/H 为 1/2/3）、Gender 位 `7..8`（1=♂、2=♀、0=无性别）、Hidden Power 位 `9..12`、Star/Square Shiny 位 `13/14`。

## 上游与许可

主要上游文件：

- `Source/Core/Gen7/EventSearcher7.cpp`
- `Source/Core/Parents/EventFilter.cpp`
- `Source/Core/Parents/Result.cpp`、`Result.hpp`
- `Source/Core/RNG/RNGList.hpp`
- `Source/Core/Util/Utility.cpp`
- `Source/Forms/Gen7/Event7.cpp`、`Event7.ui`
- `Source/Forms/Controls/TextBox.cpp`、`TextBox.hpp`

`3DSTimeFinder` 来源、核验 revision、GPL-3.0 和第三方 SFMT/MT 说明见 [`third_party/3dstimefinder/UPSTREAM.md`](../../third_party/3dstimefinder/UPSTREAM.md)。本模块保留上游归属、许可证和静态本地架构边界。

## 工程验证

已通过：

- `npm run typecheck`
- `npx vitest run src/features/gen7event/timeDomain.test.ts src/features/gen7event/preview/Gen7EventTimeUiPreviewEngine.test.ts src/features/gen7event/worker/Gen7EventTimeWorker.test.ts`（3 个文件、8 项测试）
- `$env:POKERNGKIT_WASM_MODULES='gen7eventtimefinder'; npm run wasm:test:native`（原生夹具 1/1）

原生固定输入：Seed `8EAB05D2`、Ultra Sun、Frame `478`，结果为 EC `6AAFDFBC`、PID `1798443D`、IV `8/19/13/18/19/6`、Nature `15`、Ability `1`、Gender `1`、Hidden Power `9`、Shiny `0`，与 `gen7eventtimefinder_native_test.cpp` 的逐字段断言一致。

已通过：全仓 `npm run verify`（158 个测试文件、565 项测试，Vite/PWA 预缓存 214 项）、定向 Emscripten 6.0.6 Wasm 构建、`npm run format:check`、`git diff --check`。

已验证产物（2026-08-19，Node 24.19.0、npm 12.0.2、Emscripten 6.0.6）：

| 文件                                   | 字节数 | SHA-256                                                            |
| -------------------------------------- | -----: | ------------------------------------------------------------------ |
| `public/wasm/gen7eventtimefinder.mjs`  |   8183 | `8759C23CABF0DAC5489854E47C98CF1092CE055FA2B813739C6C80F9A430D728` |
| `public/wasm/gen7eventtimefinder.wasm` |   7246 | `00110E99534F56C8DB6BD5382FE6397242F558EC94C83078F7D244EBA880E1E2` |

外部 Chrome/Edge UI 回归和生产算法验收仍须等待部署后由项目所有者提供实际 URL 并明确授权。
