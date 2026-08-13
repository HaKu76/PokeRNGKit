# GameCube Seed Finder

`gen3ngcseed` 对应 PokeFinder 4.3.2 的 `GameCube Seed Finder`，简体中文沿用上游 `NGC Seed查询`。模块覆盖 Pokemon XD: Gale of Darkness、Pokemon Colosseum 和 Pokemon Channel 三种当前 PRNG Seed 查询工作流。

## 范围

- `Gales`：简中显示 `XD`，按双方队首和四个 HP 数值逐轮筛选候选 Seed。
- `Colo`：简中显示 `竞技场`，按训练家与队伍队首逐轮筛选候选 Seed。
- `Channel`：简中显示 `频道`，输入至少 10 条方向模式后搜索候选 Seed。
- Gales/Colo 第一次搜索按上游弹出 Yes/No 询问，决定是否选择对应 `.precalc` 文件；决定保留到模块关闭。文件只在浏览器本地读取，不上传、不持久化。
- 未选择 `.precalc` 时保留上游完整搜索空间；结果为单一 Seed 时提供复制操作。
- Gales、Colo、Channel 三个页签分别保留自己的轮次、结果、进度和终态；切换页签不清空其他页签。
- XD、竞技场、频道使用单行三段页签；窄屏只在页签自身提供横向滚动，不将三个选项折成两行。

不包含 GameCube 主 Generator、定点/暗影宝可梦搜索、PokeSpot、Jirachi、存档或模拟器连接。

## 上游流程

### Gales

第一轮按玩家队首索引确定 Seed 高 16 位的模 5 余数，并枚举全部低 16 位。后续轮次直接对上轮返回 Seed 执行完整搜索。每轮核对双方队首、训练家 TSV、两只宝可梦的 HP IV、HP EV 与上游固定 HP 基值。

上游 `GalesSeedSearcher::searchSeedSkip()` 在第一轮读取 `enemyHPStat[enemyIndex + 5]`，但该数组只有 5 行。这是 PokeFinder 4.3.2 的越界访问，无法作为确定性 Web 算法复现。本项目第一轮使用正常轮次对应的 `enemyHPStat[enemyIndex]`；该差异必须在生产页面使用 PokeFinder 实际结果回归后才能验收。

### Colosseum

第一轮按玩家队首索引确定 Seed 高 16 位的模 8 余数，反向取得对手队首，再生成双方各六只宝可梦并核对训练家索引。后续轮次直接筛选上轮候选。性格、性别与性别比例表逐项对照 `ColoSeedSearcher.cpp`。

### Channel

首轮搜索区间为 `0x40000001..0xFFFFFFFE`，共 `0xBFFFFFFE` 个状态；`0xFFFFFFFF` 不进入枚举。每条模式都从 XDRNG 最高两位读取方向顺序，至少需要 10 条。

结果使用大写十六进制且不补前导零，对应上游 `QString::number(seed, 16).toUpper()`。

## 输入限制

| 控件         | 进制与范围                                                        | 空值                                                                 | 上游来源                                                        |
| ------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `Your lead`  | 5 个固定物种索引                                                  | 不适用                                                               | `GameCubeSeedFinder.cpp` 的 `{150,151,386,384,385}`             |
| `Enemy Lead` | 5 个固定物种索引                                                  | 不适用                                                               | `GameCubeSeedFinder.cpp` 的 `{144,145,146,115,380}`             |
| 四个 HP      | 非空输入为十进制 `1..714`，最多 3 位；直接输入 `0` 会被约束为 `1` | 保持空白；搜索时与 Qt `getUShort()` 一样读取为 `0`                   | `setValues(1, 714, 3, 10)` 与 `TextBox::getUShort()`            |
| `Trainer`    | `Wes / Seth / Thomas`                                             | 不适用                                                               | `GameCubeSeedFinder.ui` 与 `ColoSeedSearcher`                   |
| `Party Lead` | 8 个固定物种索引                                                  | 不适用                                                               | `GameCubeSeedFinder.cpp` 的 `{257,244,260,243,154,245,376,214}` |
| Channel 模式 | 12 种固定顺序，按钮按 `.ui` 的 6 行 2 列排列，至少 10 条          | 少于 10 条点击 Search 时显示上游 `You must have at least 10 entries` | `patterns` map、`.ui` 与 `channelSearch()`                      |
| `.precalc`   | Gales 25 分区；Colo 24 分区；小端 `uint32_t`                      | 可不选择                                                             | `GameCubeSeedFinder.cpp`                                        |

简中逐字复用上游已完成词条。`Round #%1`、四个 HP、Precalc、Channel 不足 10 条提示和复制相关词条在 `PokeFinder_zh.ts` 中 unfinished，因此保留英文源标签。

## Precalc 文件

Gales 文件头为 25 个小端 `uint32_t` 计数，分区索引为 `playerIndex * 5 + enemyIndex`。Colo 文件头为 24 个计数，分区索引为 `partyLead + 8 * trainer`。文件体按分区连续保存小端 `uint32_t` Seed；读取时通过 `DataView.getUint32(..., true)` 显式解码，不依赖浏览器宿主字节序。

导入时执行三层校验：

1. 文件长度至少容纳完整头部。
2. `头部字节 + sum(counts) * 4` 必须等于文件长度。
3. 复现 Qt 默认 `qChecksum(..., Qt::ChecksumIso3309)`：Gales 必须为 `0xD75B`，Colo 必须为 `0x097B`。

校验以流式方式执行；筛选时每次最多读取 200,000 个 Seed，再交给 Worker Pool 按 50,000 个状态分片，避免把整个大型文件同时复制到多个 Worker。

## Wasm 与 Worker

- Wasm 目标：`wasm/modules/gen3ngcseed`，API v1。
- Gales/Colo 无 Precalc 首轮按 256 个低 16 位值分片；Channel 按 2,000,000 个 Seed 分片。
- 候选轮次按 50,000 个 Seed 分片，最多使用 8 个独立 Worker/Wasm 实例。
- Worker 校验 API 版本、`taskId`、`chunkIndex`、处理数量、结果数量、指针对齐和 Wasm 堆边界。
- Pool 按 `chunkIndex` 恢复确定顺序，最终按数值排序并去重。取消会终止并重建 Worker，不接收迟到批次。
- React/TypeScript 只负责校验、Precalc 结构读取、分片、进度和显示；XDRNG 搜索逻辑只在 C++/Wasm 中运行。

```c
uint32_t gen3ngcseed_api_version();
uint32_t gen3ngcseed_search_gales(
  uint32_t playerIndex, uint32_t enemyIndex,
  uint32_t enemyHpLeft, uint32_t enemyHpRight,
  uint32_t playerHpLeft, uint32_t playerHpRight,
  const uint32_t* seeds, uint32_t seedCount,
  uint32_t lowStart, uint32_t lowCount
);
uint32_t gen3ngcseed_search_colo(
  uint32_t partyLead, uint32_t trainer,
  const uint32_t* seeds, uint32_t seedCount,
  uint32_t lowStart, uint32_t lowCount
);
uint32_t gen3ngcseed_search_channel(
  const uint32_t* patterns, uint32_t count,
  uint32_t startSeed, uint32_t stateCount
);
uintptr_t gen3ngcseed_result_ptr();
uint32_t gen3ngcseed_result_count();
uint32_t gen3ngcseed_last_error();
```

## 固定夹具与验收

已添加 TypeScript 输入/结果布局/Qt CRC 边界测试与 C++ C ABI 非法输入夹具。当前上游仓库没有对应 Searcher JSON 固定结果，且 Gales 第一轮存在已记录越界，因此算法验收必须等待 GitHub Actions 部署完成后，由项目所有者提供生产 URL 并明确授权，再与 PokeFinder 4.3.2 逐模式核对。

本轮未运行 ESLint、TypeScript、Vitest、原生夹具、Wasm/Web 构建、浏览器预览或生产回归。已添加测试和构建入口不等于这些检查已经通过。

## 来源与许可证

- [PokeFinder 4.3.2](https://github.com/Admiral-Fish/PokeFinder)，GPL-3.0-or-later：`GameCubeSeedFinder.*`、Gales/Colo/Channel Searcher、`LCRNG.hpp`、`TextBox.cpp` 与翻译文件。
- Qt `qChecksum` 算法依据 Qt 6 官方 `QByteArray` 源码，许可证为 LGPL-3.0-only / GPL-2.0-only / GPL-3.0-only / 商业许可多重许可；本项目只独立实现已公开的 CRC-16-CCITT 计算过程，不引入 Qt 运行时。
- 文件 SHA-256、上游差异和 bridge 修改边界见 [UPSTREAM.md](../../third_party/pokefinder/UPSTREAM.md)。
