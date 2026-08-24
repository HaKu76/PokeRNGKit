# Gen IV Swarm RNG

> - 状态：功能模块已实现，工程验证与生产页面回归待完成
> - 模块标识：`gen4swarm`
> - Wasm API：`1`
> - 入口：第四世代侧边栏 `Swarm RNG`

## 功能范围

本模块覆盖第四世代 D/P、Pt、HG、SS 的大量出现（Swarm）遭遇流程：

- `Find advances`：输入已知 MT Seed、目标遭遇和推进区间，按目标出现表筛选命中的帧；
- `Find encounter seed`：输入目标遭遇、最小 Delay、最小 Hour 和所需 MT Advances，按每日遭遇工具的枚举顺序返回第一个可用 Encounter Seed；
- 结果可选中为目标帧，并用 `+1` 记录推进；HGSS 另外提供 Youngster Joey `+2` 的记录按钮；
- D/P、Pt、HG、SS 的遭遇表、地点和版本差异均在本地静态数据中维护，不依赖网络或后端。

本模块不替代 Gen IV Initial Seed / `Gen4SeedFinder` 的日期时间反查。教程中的重启、读取存档时间、Coin Toss、Elm Calls 和跨午夜操作仍是游戏内准备步骤，产品只处理其中的 Encounter Seed 与 Swarm 帧计算。

## 上游依据与许可证

- `C:\Users\Hakuhiro\Desktop\project\PokemonRNGGuides-main\rng_tools\src\generators\gen4\swarm.rs`：遭遇表、MT 输出、双 ARNG 和推进筛选语义；参考 revision `c0b2bb664f04a4ef052e6dd4d831351703fa4047`。
- `C:\Users\Hakuhiro\Desktop\project\PokemonRNGGuides-main\src\rngToolsUi\gen4\swarm\constants.ts`：D/P、Pt、HGSS 的地点与宝可梦对应关系。
- `C:\Users\Hakuhiro\Desktop\project\PokemonRNGGuides-main\guides\Gen 4\Swarm.mdx`：Swarm 教程工作流与输入顺序。
- `Real96/Gen4SwarmDailyEncounterRNGTool` revision `6bc5623008b8fbf87c4450ecdab55946b01815f7`：每日 Encounter Seed 搜索顺序、MT 和 ARNG 参考实现；该项目使用 GPL-3.0。
- `third_party/pokefinder/Core/RNG/MT.*` 与 `third_party/pokefinder/Core/RNG/LCRNG.hpp`：PokeFinder 4.3.2 的 MT/ARNG 基线，按 GPL-3.0-or-later 保留上游署名与许可证边界。

PokeRNGKit 的 C++ bridge 保留 GPL-3.0-or-later 许可声明和上述来源署名；发布 Wasm 产物时必须同时提供对应源码与许可材料。

## 输入边界

| 输入               | 进制       | Web/domain 范围                                          | 上游依据                                           |
| ------------------ | ---------- | -------------------------------------------------------- | -------------------------------------------------- |
| Game               | 枚举       | `dp`、`pt`、`hg`、`ss`                                   | PokemonRNGGuides `SwarmGame`、Real96 游戏选择      |
| Target encounter   | 十进制索引 | D/P `0..27`、Pt `0..21`、HG/SS `0..19`                   | PokemonRNGGuides / Real96 遭遇表长度               |
| Seed               | 十六进制   | `0..0xFFFFFFFF`，最多 8 个十六进制字符；空值按 `0`       | MT `u32` seed、PokeFinder `MT`                     |
| Min / Max Advances | 十进制     | `0..4294967295`；`max >= min`，单次范围差不超过 `100000` | MT 推进 `u32`；浏览器任务工程上限                  |
| Min Delay          | 十进制     | `600..9999`                                              | Real96 `600..9999`；其 `maxDelay=10000` 为半开上界 |
| Min Hour           | 十进制     | `0..23`                                                  | Real96 `0..23`                                     |
| MT Advances        | 十进制     | `0..9999`                                                | Real96 `0..9999`                                   |

`Find advances` 的结果按 `minAdvance..maxAdvance` 闭区间返回。`Find encounter seed` 按 `highByte -> hour -> delay` 顺序枚举，找到第一个目标遭遇后停止；其 seed 结构为 `(highByte << 24) | (hour << 16) | delay`，因此结果的低 16 位包含 Hour/Delay 的游戏时钟字段。

## 算法与接口

对每个 Swarm MT 输出 `r`，模块计算 `ARNG(ARNG(r))`，再以对应版本遭遇表长度取模得到目标索引。MT 使用 624 项状态、标准初始化常数 `0x6C078965`，并与 PokeFinder 的单步 shuffle 语义一致。

Wasm C ABI 使用固定宽度整数和结果指针，不暴露 C++ 容器：

- `gen4swarm_api_version()`；
- `gen4swarm_find_advances(game, seed, targetIndex, minAdvance, maxAdvance)`；
- `gen4swarm_find_seed(game, targetIndex, minDelay, minHour, mtAdvances)`；
- `gen4swarm_result_ptr()` / `gen4swarm_result_count()`；
- `gen4swarm_last_error()`。

Advance 结果固定为两个 `uint32_t`（Advance、Encounter Index），Seed 结果固定为四个 `uint32_t`（Seed、Hour、Delay、MT Advances）。每次任务运行一个 Dedicated Worker 和一个 Wasm 实例，Worker 在握手、请求范围、指针对齐、结果计数和堆范围处拒绝不匹配数据；取消会终止并重建 Worker。

## 文件

```text
src/features/gen4swarm/
|-- domain.ts
|-- domain.test.ts
|-- search.ts
|-- Gen4SwarmPanel.tsx
|-- Gen4SwarmPanel.css
`-- worker/
    |-- messages.ts
    |-- gen4swarm.worker.ts
    `-- Gen4SwarmWorker.ts

wasm/modules/gen4swarm/
|-- CMakeLists.txt
|-- module.json
|-- bridge/
|   |-- gen4swarm_bridge.h
|   `-- gen4swarm_bridge.cpp
`-- tests/
    `-- swarm_native_test.cpp
```

## 固定夹具

原生夹具覆盖以下结果，并检查每日 Seed 结果能从 Advance 0 反向复现：

- D/P `0x0000ABCD`：目标索引 9，Advance `10..20` 命中 `15、17`；
- Pt `0x0000ABCD`：目标索引 0，Advance `0..10` 命中 `2`；
- HG `0x0000ABCD`：目标索引 0，Advance `0..20` 命中 `8`；
- SS `0x0000ABCD`：目标索引 6，Advance `0..10` 命中 `0、4`；
- D/P 目标索引 9 的每日 Seed 搜索结果满足 Hour/Delay 边界，并在 Advance 0 返回同一目标。

## 验证状态

- 已通过：`npm test -- src/features/gen4swarm`（1 个文件、3 项测试）、`npm run format:check`、`git diff --check`、完整 `npm run verify`（176 个测试文件、612 项测试、2312 个生产模块和 236 项 PWA 预缓存）。
- 已通过：`POKERNGKIT_WASM_MODULES=gen4swarm npm run wasm:test:native`（1/1），以及激活 Emscripten 6.0.6 后的定向 `npm run wasm:build`；生成的浏览器产物为 `gen4swarm.mjs`（7360 bytes，SHA-256 `D68D4A4D9FA363158637FCB639F1B7C302050AFEE6E214F3228A434A819C374C`）与 `gen4swarm.wasm`（6286 bytes，SHA-256 `2E62685CF0CD4ACB4EB26D0250BB906A2EAD0E640D6D8F44B043CFAC0AD76496`）。
- 未运行：外部 Chrome/Edge UI、GitHub Pages 生产回归和项目所有者最终验收；这些检查按全部 3DS 模块完成后的统一门槛执行。

建议 GitHub Desktop 提交标题：`feat: 实现第四世代大量出现乱数`
