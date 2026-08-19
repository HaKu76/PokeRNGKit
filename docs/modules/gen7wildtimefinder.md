# 第七世代 Wild Initial Seed / Time Finder（TF5）

## 功能范围

TF5 对应 `3DSTimeFinder` 的 Gen VII `WildSearcher7`：按 Citra 时间范围逐秒计算 Initial Seed，再为每个时间点从指定起始帧开始枚举草丛或钓鱼野生结果。搜索在 Dedicated Worker 中运行，Gen VII Wild 帧消耗在独立 `gen7wildtimefinder` Wasm 会话中执行。

## 输入限制

| 输入                  | 范围与行为                                                       | 上游依据                                     |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| Game Version          | Sun、Moon、Ultra Sun、Ultra Moon                                 | `Source/Forms/Gen7/Wild7.cpp`                |
| Start / End Date/Time | 不早于 `2000-01-01`，按整秒枚举，时间范围保护为最多 24 小时      | `Source/Core/Gen7/WildSearcher7.cpp`         |
| Tick / Offset         | Tick 为 `0..FFFFFFFF` 十六进制；Offset 为 `0..4294967295`        | `Profile7`、`Utility::calcInitialSeed`       |
| Initial / Max Frame   | `1..5000000`，Initial 不得大于 Max                               | `Wild7.cpp` 的 `Frame32Bit` 与浏览器任务保护 |
| Encounter             | Grass 或 Fish                                                    | `Wild7.cpp` 的 `comboBoxEncounter`           |
| Synchronize           | 关闭或指定 25 种性格；成功判定为 RNG 值 `% 100 >= 50`            | `WildSearcher7.cpp`                          |
| Gender Ratio          | Genderless、♂7:♀1、♂3:♀1、♂1:♀3、♂1:♀7、♂ Only、♀ Only           | `Wild7.cpp` 的七项 `setup` 值                |
| Filters               | Shiny、Gender、Ability、Nature、Hidden Power、Slot、六项 IV 范围 | `WildFilter.cpp`                             |
| Result Limit          | `1..100000`                                                      | PokeRNGKit Worker/Wasm 保护边界              |

## 帧消耗顺序

每帧使用 `SFMT(initialSeed, startFrame)` 和 `RNGList<uint64_t, SFMT, 128>`：同步判定、槽位、等级消耗、笛子消耗、推进 60 帧、EC、PID（闪耀护符时最多 3 次）、六项 IV、Ability、Nature、Gender。草丛槽位累计值为 `19,39,49,59,69,79,89,94,98,99`，钓鱼槽位累计值为 `78,98,99`。

## 架构与许可

- Wasm 模块：`gen7wildtimefinder`，API/Contract version `1`。
- Initial Seed 哈希复用独立 `gen7timefinder` 模块；React 主线程不执行 RNG。
- 上游来源：`3DSTimeFinder/Source/Core/Gen7/WildSearcher7.cpp`、`WildSearcher7.hpp`、`Source/Core/Parents/WildFilter.cpp`。
- 上游采用 GPL-3.0-or-later；来源、归属与修改边界见 `third_party/3dstimefinder/UPSTREAM.md`。

## 当前验证

- 已通过：`$env:POKERNGKIT_WASM_MODULES='gen7wildtimefinder'; npm run wasm:test:native`，原生会话夹具 1/1。
- 已通过：`npm run typecheck`。
- 待完成：Worker/domain 定向测试、Emscripten Wasm 构建、全仓 `npm run verify`、外部 Chrome/Edge 和生产页面回归。
