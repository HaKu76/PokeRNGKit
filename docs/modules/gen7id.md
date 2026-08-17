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
| TID / SID        | 结果为 `0..65535`；普通模式逐行匹配五位补零字符串，正则模式逐行匹配  | `Gen7/ID7.cs`、`Core/IDFilters.cs`                               |
| Full ID          | 多行十六进制或两段 `uint32` 的 `TID/SID`；按 `SID << 16 \| TID` 匹配 | `Core/IDFilters.cs`                                              |
| Gen7TID          | 结果为 `0..999999`；普通模式逐行匹配六位补零字符串，正则模式逐行匹配 | `Gen7/ID7.cs`、`Core/IDFilters.cs`                               |
| TSV              | 多行十进制；有效项为 `0..4095`                                       | `Core/IDFilters.cs`                                              |
| Random Number    | 多行普通字符串包含匹配或逐行正则匹配固定 16 位大写十六进制结果       | `Core/IDFilters.cs`                                              |

## 页面与协议

- 页面：`src/features/gen7id/Gen7IdPanel.tsx`
- Domain：`src/features/gen7id/domain.ts`
- Worker Pool：`src/features/gen7id/worker/Gen7IdWorkerPool.ts`
- Wasm API：`wasm/modules/gen7id/bridge/gen7id_bridge.h`
- Packed state：8 个 `uint32`，共 32 字节；低/高随机数、TID/SID、TSV/TRV、帧、Gen7TID、Clock。
- 导航：独立 `GEN VII` 分组，不改变 Gen III/Gen IV 入口。
- 档案：页头选择 Gen VII 的 3DSRNGTool 档案时同步 Game Version，并按 Sun/Moon `1012` 或 USUM `1132` 更新 Min Advances；Seed、筛选和 Clock correction 不被覆盖。

## 筛选语义

- ID、TSV 和 Random Number 均使用与上游 `TextBox.Lines` 对应的多行文本；空文本表示该项不参与筛选。
- TID、SID 和 Gen7TID 在非正则模式下对补零后的固定宽度十进制字符串执行包含匹配；每一行任意命中即可通过。
- TID、SID 和 Gen7TID 的 `Regular Expression` 使用浏览器 ECMAScript 无标志正则逐行匹配；仅属于 .NET 的正则语法会在搜索前拒绝。`TID/SID` 不受该复选框影响，仍按解析后的 Full ID 集合精确匹配。
- Full ID 每行先移除 ASCII 空格，再截断 `//` 后的注释（注释起点必须位于第一个字符之后）；`TID/SID` 行按十进制解析，其他行按十六进制解析，非法行沿用上游静默丢弃。
- TSV 每行按十进制解析并仅接受 `0..4095`；非法行丢弃，但只要原始文本非空，空集合仍会使结果全部被拒绝。
- Random Number 在非正则模式下对固定 16 位大写十六进制字符串执行大写包含匹配；正则模式逐行匹配，Full ID 的 `Regular Expression` 仍只影响 Random Number 列表。
- `Disable Filters` 对应上游 `ID_Disable`，选中后跳过 ID、TSV 和 Random Number 的全部筛选。

筛选发生在独立 Gen7 ID Worker 中，Worker 先从 Wasm 获取当前分片的完整 SFMT 帧，再按上述 matcher 保留打包结果；React 主线程不执行 RNG 或批量筛选。

## 当前验证状态

已通过 `npm run format:check`、`git diff --check`、Gen7 ID 定向 ESLint、`npm run typecheck`、Gen7 ID 的 13 项 Vitest，以及 `gen7id_native_parity` 原生夹具。未运行浏览器检查和生产页面算法回归；生产算法结果必须等待部署后由项目所有者在目标 URL 验收。

`MainForm.Designer.cs` 给 `Frame_max` 的设计时上限是 `100000000`，但构造初始化会把 `Frame_min.Maximum` 与 `Frame_max.Maximum` 都覆盖为 `FuncUtil.MAXFRAME`，实际有效上限为 `1000000000`。
