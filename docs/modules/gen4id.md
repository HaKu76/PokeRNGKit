# 第四世代 ID 乱数

`gen4id` 覆盖 PokeFinder 4.3.2 的 `Form/Gen4/IDs4`、
`Core/Gen4/Generators/IDGenerator4`、`Core/Gen4/Searchers/IDSearcher4` 与
`Core/Gen4/States/IDState4`。

## 功能

- Generator：按日期、时间、Delay 和筛选条件生成第四世代 TID、SID、TSV。
- Searcher：按年份、Delay 区间和筛选条件反查候选 Seed。
- 筛选模式：TID、SID、TID/SID、PID、TID/PID、TSV。
- PID 筛选按第四世代规则转换为 `PSV >> 3`，结果保留 Seed、Delay、TID、SID、TSV 与秒数。
- Generator 与 Searcher 使用独立 Worker Pool，批次按 `chunkIndex` 合并，可取消，不使用 pthread 或 `SharedArrayBuffer`。

## 输入边界

| 输入            | 范围                                    | 上游依据                                     |
| --------------- | --------------------------------------- | -------------------------------------------- |
| Year            | `2000..2099`                            | `Form/Gen4/IDs4.cpp`、`IDGenerator4`         |
| Month           | `1..12`                                 | `Form/Gen4/IDs4.ui`                          |
| Day             | 按 Year/Month 的实际日数                | `Form/Gen4/IDs4.cpp`                         |
| Hour            | `0..23`                                 | `Form/Gen4/IDs4.ui`                          |
| Minute / Second | `0..59`                                 | `Form/Gen4/IDs4.ui`                          |
| Delay           | `0..0xFFFFFFFF`，且加上年份偏移不得溢出 | `IDGenerator4` / `IDSearcher4` 的 `u32` 参数 |
| TID / SID       | `0..65535`                              | `IDFilter`                                   |
| TSV             | `0..8191`                               | `IDFilter`                                   |
| PID             | 1 到 8 位十六进制                       | `IDFilter` 的 PID/PSV 处理                   |

Generator 的每个日期秒只产生一个 Delay 状态。Searcher 的每个 Delay 展开
`256 * 24` 个日期时间组合。单次 C ABI 调用最多返回 `100000` 条固定宽度
`uint32_t` 记录，每条记录为 6 个字：

```text
Seed, Delay, TID, SID, TSV, Seconds
```

Searcher 没有实际秒数时使用 `0xFFFFFFFF` 占位，TypeScript 解码为缺省值。

## Wasm / Worker

- API：`gen4id_api_version() == 1`。
- C ABI：`gen4id_generate`、`gen4id_search`、`gen4id_result_ptr`、
  `gen4id_result_count`、`gen4id_last_error`。
- 产物：`gen4id.mjs` 与 `gen4id.wasm`。
- Generator 分片按秒和最多 `100000` 个 Delay；Searcher 分片按最多 16 个 Delay。
- Worker 只传输固定宽度 `ArrayBuffer`，主线程按分片索引恢复顺序。

## 验证

已运行：

```powershell
$env:POKERNGKIT_WASM_MODULES='gen4id'; npm run wasm:test:native
```

结果：`gen4id_native_parity` 通过，覆盖 Generator、Searcher、TID 筛选、首尾结果和非法秒数输入。TypeScript 单元测试与 UI Preview 测试已随模块加入。

完整 `npm run verify` 已通过：30 个 Vitest 文件共 110 项测试、生产 Web 构建与 PWA 43 项预缓存均成功。尚未运行完整 Wasm build 或 Pages 回归。

## 来源与许可

算法语义来自 PokeFinder 4.3.2，源代码与许可证记录见
[`third_party/pokefinder/UPSTREAM.md`](../../third_party/pokefinder/UPSTREAM.md)。
项目保留 GPL-3.0-or-later、上游署名和商标免责声明。
