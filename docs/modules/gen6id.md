# 第六世代 ID 乱数

本模块实现本地优化版 `3DSRNGTool` 的 Gen VI `ID6` / `Frame_ID` 工作流。它从用户提供的 TinyMT 四字状态生成连续 ID 帧，并提供 TID、SID、完整 TID/SID、TSV、TRV、Random Number 与 TinyMT 状态筛选。来源优先级和差异范围见 `third_party/3dsrngtool/UPSTREAM.md`。

## 算法

每个结果先保存当前 TinyMT 状态，再调用一次 `Nextuint()`：

```text
Random = TinyMT.Nextuint()
TID = Random & 0xFFFF
SID = Random >> 16
TSV = (TID XOR SID) >> 4
TRV = (TID XOR SID) & 0xF
```

状态推进、输出函数和四个状态字顺序按上游 `RNG/TinyMT.cs` 与 `Gen6/ID6.cs` 保留。界面按上游 `PRNGState.ToString()` 的显示顺序提供 `[3] [2] [1] [0]`，结果中的状态列也按该顺序显示。React 只负责输入、校验、筛选编排和结果展示；TinyMT 搜索只在独立 Dedicated Worker 的 `gen6id.mjs/.wasm` 中运行。

## 已核对输入

| 输入                    | 范围或行为                                                                | 浏览器行为                  | 上游依据                                           |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------- |
| TinyMT state `[3]..[0]` | 四个 `uint32`，`0..0xFFFFFFFF`；空值按 `0`                                | 八位十六进制，单项最多 8 位 | `RNG/TinyMT.cs`、`Controls/Frame_ID.cs`            |
| Min Frame               | `0..1,000,000,000`                                                        | `0..5,000,000`              | `MainForm.cs`、`FuncUtil.MAXFRAME`；浏览器任务保护 |
| Max Frame               | `Min Frame..1,000,000,000`，包含终点                                      | 不超过浏览器上限            | `MainForm.cs`、`FuncUtil.MAXFRAME`                 |
| Max Results             | 桌面程序受 `MAX_RESULTS_NUM` 约束                                         | `1..100,000`                | `MainForm.cs`；Worker 任务保护                     |
| ID mode                 | TID、SID 或完整 TID/SID                                                   | 三态单选                    | `MainForm.Designer.cs`、`Core/IDFilters.cs`        |
| TID / SID               | 结果 `0..65535`；普通模式按五位补零字符串包含匹配，正则模式逐行匹配       | 多行文本；空行不产生命中    | `Core/IDFilters.cs`                                |
| Full ID                 | 每行十六进制 `uint32`，或十进制 `TID/SID` 两段；空格移除、`//` 后注释截断 | 多行精确集合                | `Core/IDFilters.cs`                                |
| TSV                     | `0..4095`；非法项沿用上游忽略行为                                         | 多行十进制集合              | `Core/IDFilters.cs`                                |
| Random / State          | 上游 ID6 过滤使用状态字符串；本项目同时提供 Random 与 TinyMT 状态列筛选   | 普通包含或 ECMAScript 正则  | `Core/IDFilters.cs`、`Gen6/ID6.cs`                 |

正则模式在搜索开始前一次性编译；非法表达式拒绝任务。`Disable Filters` 会跳过所有 ID、TSV 和状态筛选。结果上限在 Worker 内执行，达到上限后停止继续取帧。

## Wasm 与 Worker 契约

- Module id：`gen6id`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：6 个 `uint32_t` 字，四个 TinyMT 状态字、起始帧和帧数量
- 结果：8 个 `uint32_t` 字，Frame、Random 和四个状态字；其余字保留为 ABI 对齐空间
- 单 Dedicated Worker；每批最多 2,048 帧，不依赖 `SharedArrayBuffer`、Wasm pthread 或跨源隔离

## 页面与文件

- 页面：`src/features/gen6id/Gen6IdPanel.tsx`
- Domain：`src/features/gen6id/domain.ts`
- Worker：`src/features/gen6id/worker/Gen6IdWorker.ts`、`gen6id.worker.ts`
- UI 预览：`src/features/gen6id/preview/Gen6IdUiPreviewEngine.ts`
- Wasm bridge：`wasm/modules/gen6id/bridge/gen6id_bridge.cpp`
- 原生夹具：`wasm/modules/gen6id/tests/gen6id_native_test.cpp`

## 固定夹具

初始状态 `[11111111, 22222222, 33333333, 44444444]`（结果按 `[3]..[0]` 显示）从 Frame 0 开始：

| Frame | Random     |     TID |     SID |    TSV | TRV | Next state                            |
| ----: | ---------- | ------: | ------: | -----: | --: | ------------------------------------- |
|     0 | `44DDDDDC` | `56796` | `17629` | `2448` | `1` | `22222222,33333333,99999800,66666666` |
|     1 | `FF111D50` |  `7504` | `65297` | `3620` | `1` | 见原生夹具逐字校验                    |

## 验证状态

已通过：`npm test -- --run src/features/gen6id`（2 个文件、4 项测试）、`npm run typecheck`、`npm run format:check`、`git diff --check`、gen6id 原生夹具（1/1）、激活 Emscripten 6.0.6 后的定向 Wasm 构建，以及完整 `npm run verify`。完整验证包含 147 个 Vitest 文件、531 项测试、Vite 转换 2230 个模块和 PWA 预缓存 206 项资源；ESLint 0 error，保留 12 条既有 TanStack Virtual `react-hooks/incompatible-library` warning。外部 Chrome/Edge UI 回归与生产页面算法验收尚未运行；生产验收仍必须等待 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。

定向 Emscripten 6.0.6 产物：gen6id.mjs 为 7516 bytes，SHA-256 为 0C24067B6A6EC0A798E83AA9BBB2DBE3C7323D4D52AC06C09EC41DCBE1E4AB8D；gen6id.wasm 为 4644 bytes，SHA-256 为 3EF9A2FC8FBA2C1E6597F101AA06A3A0063A038A620823EA38F58973D6AEF5FB。

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\ID6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Controls\Frame_ID.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\IDFilters.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\RNG\TinyMT.cs`

3DSRNGTool 来源按其 MIT 条款记录；TinyMT 相关上游版权与免责声明保持不变。PokeRNGKit 继续按 GPL-3.0-or-later 发布，并保留上游版权、商标和来源说明。
