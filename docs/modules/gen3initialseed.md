# Gen 3 Initial Seed Finder

`gen3initialseed` 提供第三世代的两个初始 Seed 反推工作流。中文界面名称为
`初始Seed检索`；它不是 PokeFinder 4.3.2 中的同名模块，不会把它并入 `gen3id`，
以便后续的 `gen4id` 保持独立边界。

## 范围

- `RS IDs`：由指定 TID/SID 找出 Ruby/Sapphire 初始 16 位 Seed 与对应帧数。
- `Back Seed (FRLG / RSE)`：由目标 32 位 Seed 反推 FireRed/LeafGreen/Ruby/Sapphire/Emerald 可用的 16 位初始 Seed 与帧数；这是 Real96 `FRLGRSEInitialSeedsFinder` 中 `backSeed.cpp` 对应的工作流。
- 结果支持稳定排序、CSV、进度和取消。
- 不读取、写入或上传存档，不依赖档案信息。

不包含时间校验、RTC 反推、第四世代算法或对硬件可达性的额外断言。

## 算法

第三世代 PokeRNG 的正向变换为：

```text
next(seed) = 0x41C64E6D * seed + 0x00006073 mod 2^32
```

反向 PokeRNGR 的变换为：

```text
previous(seed) = 0xEEB9EB65 * seed + 0x0A3561A1 mod 2^32
```

### RS IDs

1. 枚举 `sidState = (SID << 16) | low`，其中 `low` 为 `0..0xFFFF`。
2. 当 `high16(next(sidState)) == TID` 时得到一个匹配的 ID 状态。
3. 从 `previous(sidState)` 连续逆推，直到状态不大于 `0xFFFF`；该状态是初始 Seed，逆推次数是结果帧数。

上游 `RSIDsInitialSeedFinder` 在第一个匹配后返回。本模块保留全部匹配候选，并按 `low` 枚举顺序返回，避免在存在多个可行 Seed 时丢失结果。

### FRLG / RSE

界面中的 `Back Seed (FRLG / RSE)` 页签就是本节的反推器。它不直接替代
`Gen 3 Seed to Time`：前者从目标 32 位 Seed 反推可用的 16 位初始 Seed，后者
负责把 32 位定点结果桥接到 16 位 Seed 与日期时间表。模拟器流程需要的四位
十六进制 Seed 应取反推/桥接得到的 16 位结果，再交给 Target Painting Timer。

从目标 Seed 开始执行第 1 次反向 PokeRNG；每次状态不大于 `0xFFFF` 时记录该 16 位 Seed 与当前反推次数。结果达到 `Max Results` 即停止；若用户把上限设为 `65536`，搜索最多覆盖一个不重复的完整周期 `1..0xFFFFFFFF`。

为避免每个 Worker 从第 1 帧重复逆推，Wasm 通过反向仿射变换的二进制跳转在 `O(log n)` 恢复每个分片的起点。随后每片连续迭代，结果按 `chunkIndex` 重排，因此 Worker 完成顺序不会改变帧顺序。

## 输入限制

| 控件          | 进制与范围                          | 空值                           | 核验来源                                                                          |
| ------------- | ----------------------------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `TID`         | 十进制 `0..65535`，最多 5 位        | 无效                           | `RSIDsInitialSeedFinder.cpp` 的 `sanitizeInput<uint16_t>`                         |
| `SID`         | 十进制 `0..65535`，最多 5 位        | 无效                           | `RSIDsInitialSeedFinder.cpp` 的 `sanitizeInput<uint16_t>`                         |
| `Target Seed` | 十六进制 `0..0xFFFFFFFF`，最多 8 位 | 按仓库通用 Seed 规则解释为 `0` | `backSeed.cpp` 的 `uint32_t targetSeed`；空值行为由本项目 `src/input.ts` 统一约定 |
| `Max Results` | 十进制 `1..65536`，最多 5 位        | 无效                           | Real96 源码接收正整数；`65536` 是本项目一周期内 16 位初始 Seed 的显式上限         |
| Wasm 分片     | `1..500000` 个反推状态              | 不适用                         | `gen3initialseed_find_target` C ABI；上限用于取消延迟和内存边界                   |

`Target Seed` 和 `Max Results` 在 PokeFinder 简体中文翻译中没有可复用的控制翻译，
因此保留英文；模块名称按项目所有者决定使用 `初始Seed检索`。`TID`、`SID`、`Seed`、
`初始种子`、`帧数` 与 `检索` 复用上游已有词条。

## Wasm 与 Worker

- Wasm 目标：`wasm/modules/gen3initialseed`。
- C ABI：`gen3initialseed_find_rs_ids` 与 `gen3initialseed_find_target`，结果为固定 8 字节记录 `{ initialSeed, advances }`。
- `RS IDs` 只有 65536 个状态，使用一个独立 Worker；`FRLG / RSE` 使用多个无共享内存的独立 Worker/Wasm 实例。
- 取消时销毁当前 Worker；迟到批次按 `taskId` 丢弃。未使用 `SharedArrayBuffer`、Wasm pthread、COOP/COEP 或跨源隔离。
- TypeScript 仅处理输入、校验、分片、进度、排序、CSV 与 UI 预览，不在主线程复写生产 RNG 算法。

## 固定夹具与验收

`wasm/modules/gen3initialseed/tests/initial_seed_native_test.cpp` 复用现有 PokeFinder ID Searcher 已记录的 TID `48163`、SID `64377` 夹具，期望候选为 `05A0 / 0` 与 `C19B / 36724`；Target Seed 的最小夹具为 `00006073` 反推一步得到 `0000 / 1`。这些夹具是工程验证入口，不构成项目所有者的算法验收。

本轮未运行原生夹具、Wasm 构建、TypeScript 测试、浏览器预览或算法回归。算法结果只能在 GitHub Actions 部署完成、所有者提供生产 URL 并明确授权后，在该生产页面共同验收。

## 来源与许可证

- [PokeFinder 4.3.2](https://github.com/Admiral-Fish/PokeFinder)：`Core/RNG/LCRNG.hpp` 的 PokeRNG/PokeRNGR 常量，GPL-3.0-or-later。
- [Real96/RSIDsInitialSeedFinder](https://github.com/Real96/RSIDsInitialSeedFinder) `be3a160a1a17d390f0d53887c5110412c786bd31`：RS TID/SID 工作流，GPL-3.0。
- [Real96/FRLGRSEInitialSeedsFinder](https://github.com/Real96/FRLGRSEInitialSeedsFinder) `2150f22d25f5c90fdcbfbd64de14a22d6a447df8`：目标 Seed 反推工作流，GPL-3.0。
- [StarfBerry/PokeRNG](https://github.com/StarfBerry/PokeRNG)：仅登记为后续算法研究参考，未复制代码、数据或构建输入。

完整来源边界和 PokeFinder 文件校验值见 [UPSTREAM.md](../../third_party/pokefinder/UPSTREAM.md)。
