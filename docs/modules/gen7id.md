# 第七世代 ID 乱数

本模块对应本地优化版 `3DSRNGTool` 的 `Search7_ID()`，第一阶段只实现第七世代 SFMT 主乱数的 ID Generator。复杂的 Stationary、Wild、SOS、Egg、Timeline 和 NTR 校准流程保留到后续模块。来源优先级和差异范围见 `third_party/3dsrngtool/UPSTREAM.md`。

## 算法

每个帧从 SFMT 取一个 `uint64`：低 32 位拆为 TID/SID。结果字段与上游 `Gen7/ID7.cs` 一致：

```text
TID = rand64.low & 0xFFFF
SID = rand64.low >> 16
TSV = (TID XOR SID) >> 4
TRV = (TID XOR SID) & 0xF
Gen7TID = ((SID << 16) | TID) % 1000000
Clock = (rand64 % 17 + correction) % 17
```

SFMT 常量和推进顺序按本地 `3DSRNGTool/RNG/SFMT.cs` 移植到 `wasm/modules/gen7id/bridge/gen7id_bridge.cpp`，TypeScript 只负责表单、Worker 调度、筛选和结果解码。

## 输入限制

| 输入             | 范围与行为                                                           | 上游来源                                                         |
| ---------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Seed             | `0..0xFFFFFFFF`，十六进制；空值按 `0`                                | `MainForm.Designer.cs` 的 `Seed`；`RNG/SFMT.cs`                  |
| Game Version     | Sun/Moon 或 Ultra Sun/Ultra Moon；决定 ID 起始帧                     | `MainForm.Designer.cs` 的 `Gameversion`、`FuncUtil.cs`           |
| Min Advances     | Sun/Moon `1012..1000000000`；Ultra Sun/Ultra Moon `1132..1000000000` | `MainForm.cs` 的运行时上限、`FuncUtil.cs`                        |
| Max Advances     | `Min..1000000000`，包含起始帧；单次 Wasm 调用最多 100000 状态        | `MainForm.cs` 的运行时上限、`FuncUtil.cs`；本项目 C ABI 分片约束 |
| Clock correction | `0..16`                                                              | `MainForm.Designer.cs` 的 `Clk_Correction`                       |
| TID / SID        | `0..65535`                                                           | `Gen7/ID7.cs` 的 `ushort`                                        |
| Full ID          | `0..0xFFFFFFFF`，按 `SID << 16 \| TID` 匹配                          | `Core/IDFilters.cs`                                              |
| Gen7TID          | `0..999999`，六位显示；按补零后的十进制字符串包含匹配                | `Gen7/ID7.cs`、`Core/IDFilters.cs`                               |
| TSV              | `0..4095`                                                            | `Core/IDFilters.cs`                                              |
| Random Number    | 1 到 16 位十六进制；在固定 16 位大写随机数字符串中包含匹配           | `Core/IDFilters.cs`                                              |

## 页面与协议

- 页面：`src/features/gen7id/Gen7IdPanel.tsx`
- Domain：`src/features/gen7id/domain.ts`
- Worker Pool：`src/features/gen7id/worker/Gen7IdWorkerPool.ts`
- Wasm API：`wasm/modules/gen7id/bridge/gen7id_bridge.h`
- Packed state：8 个 `uint32`，共 32 字节；低/高随机数、TID/SID、TSV/TRV、帧、Gen7TID、Clock。
- 导航：独立 `GEN VII` 分组，不改变 Gen III/Gen IV 入口。

## 首版范围

- TID、SID、Gen7TID 与 Random Number 实现单条普通字符串包含匹配。
- Full ID 与 TSV 当前各接受一个精确值。
- 本地工具的正则表达式、多行 ID/TSV/Random Number 列表和注释解析尚未纳入首版；界面不提供这些开关，不能把单值筛选描述为完整 `IDFilters` 复刻。

## 当前验证状态

本轮只完成源码、协议和文档接线；按仓库授权边界尚未运行 lint、typecheck、Vitest、native/Wasm 构建或浏览器验收。后续应先执行格式检查，再由项目所有者授权算法回归。

`MainForm.Designer.cs` 给 `Frame_max` 的设计时上限是 `100000000`，但构造初始化会把 `Frame_min.Maximum` 与 `Frame_max.Maximum` 都覆盖为 `FuncUtil.MAXFRAME`，实际有效上限为 `1000000000`。
