# 第六世代主乱数 Seed 检索

本模块实现 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `Gen6MTSeedFinder`。它按两个野生宝可梦的完整六项个体值，或单个野生宝可梦的个体值范围、性格与帧范围，检索第六世代主乱数 Seed。算法、输入边界和结果字段均以指定 revision 的 WinForms、`MTSeedFinder.cs` 与 `RNG/MT.cs` 为准。

## 算法

模块使用上游 `MersenneTwister_Fast` 的 624-word 状态和整块 twist 行为。每个 Seed 初始化 MT 后预推进 `63` 次：

- 两只野生模式：从 `63 + minFrame1` 开始生成第一段个体值，在 `minFrame1..maxFrame1` 内匹配六项连续值；随后跳过 `minFrame2 - maxFrame1 - 1`，在第二段匹配第二只宝可梦。命中后重新从 Seed 推进 `63 + 7 + frame1`，读取两只宝可梦的性格。
- 单只范围模式：从 `63 + minFrame` 生成个体值窗口；命中后重新推进 `63 + 7 + frame`，按 `((Nextuint() * 25) >> 32)` 匹配性格，再按 `((Nextuint() * 252) >> 32)` 生成 Gender。
- 上游把单只模式的帧 `0` 作为未命中哨兵，本项目保留该行为。

整数计算在 Wasm 中使用 `uint32_t` / `uint64_t`；React 只负责输入规范化、Seed 分片、Worker 编排、结果解码和虚拟表格展示。

## 已核对输入

| 输入                 | 范围或行为                                           | 浏览器控件                   | 上游依据                                                 |
| -------------------- | ---------------------------------------------------- | ---------------------------- | -------------------------------------------------------- |
| Seed 最小值 / 最大值 | 完整 `uint32`，`0..0xFFFFFFFF`；空十六进制输入按 `0` | 最多 8 位十六进制            | `Gen6MTSeedFinder.cs`、`HexMaskedTextBox.cs`             |
| 两只模式的宝可梦 IV  | 恰好 6 项，逐项 `0..31`                              | 空格、逗号、斜线或短横线分隔 | `FuncUtil.parseIVs`                                      |
| 两只模式帧 1         | `0..4000`，最小值不大于最大值                        | 两个十进制输入               | `Gen6MTSeedFinder.Designer.cs`                           |
| 两只模式帧 2         | `0..10000`，`maxFrame1 <= minFrame2 <= maxFrame2`    | 两个十进制输入               | `Gen6MTSeedFinder.Designer.cs`、`MTSeedFinder.setFinder` |
| 单只模式下限 / 上限  | 每项 `0..31`，且 `lower <= upper <= lower + 2`       | 两个六项 IV 输入             | `Gen6MTSeedFinder.cs`                                    |
| 单只模式帧           | `0..4000`，最小值不大于最大值                        | 两个十进制输入               | `Gen6MTSeedFinder.Designer.cs`                           |
| 单只模式性格         | `0..24`，按上游性格索引                              | 25 项候选下拉                | `Gen6MTSeedFinder.cs`、`StringItem.naturestr`            |
| 单只模式 Seed 范围   | `maxSeed - minSeed <= 0x10000000`                    | Domain 与 Wasm 双重拒绝      | `Gen6MTSeedFinder.cs`                                    |

## Wasm 与 Worker 契约

- Module id：`gen6mainseed`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`searcher`
- 请求：22 个 `uint32_t`，依次为模式、全局 Seed 范围、当前分片 Seed 范围、四个帧边界、性格和两组六项 IV。
- 结果：6 个 `uint32_t`，依次为 Seed、Frame1、Nature1、Frame2、Nature2、Gender。
- 默认分片为 `4096` 个 Seed，最多 8 个独立 Worker/Wasm 实例；主线程按 `chunkIndex` 恢复 Seed 顺序。
- 取消通过终止当前 Worker 实例实现，不依赖 `SharedArrayBuffer`、Wasm pthread 或跨源隔离。

## 页面与文件

- 页面：`src/features/gen6mainseed/Gen6MainSeedPanel.tsx`
- 样式：`src/features/gen6mainseed/Gen6MainSeedPanel.css`
- Domain：`src/features/gen6mainseed/domain.ts`
- Worker：`src/features/gen6mainseed/worker/Gen6MainSeedWorkerPool.ts`、`gen6mainseed.worker.ts`
- UI 预览：`src/features/gen6mainseed/preview/Gen6MainSeedUiPreviewEngine.ts`
- Wasm bridge：`wasm/modules/gen6mainseed/bridge/gen6mainseed_bridge.cpp`
- 原生夹具：`wasm/modules/gen6mainseed/tests/gen6mainseed_native_test.cpp`

## 固定夹具

Seed `00000000`、两只模式第一段 `1..6`、第二段 `10..15`：

```text
IV1 = 14 6 18 4 0 10
IV2 = 21 14 11 19 13 28
Frame1 = 1, Nature1 = 3
Frame2 = 10, Nature2 = 8
```

Seed `00000000`、单只模式帧 `1..6`、IV 范围 `0..31`、Nature `3`：

```text
Frame1 = 1, Nature1 = 3, Gender = 154
```

## 验证状态

当前已完成 TypeScript Domain、Worker Pool 与 UI 预览夹具代码，以及 C++ bridge、原生夹具、Worker/UI 接入和格式收尾准备。按仓库验证门槛，尚未运行 Vitest、TypeScript、原生夹具、Wasm 构建、Web 构建或外部浏览器回归；这些检查需在项目所有者明确授权具体命令或生产 URL 后执行。算法验收仍必须等待 GitHub Actions 部署并由项目所有者提供准确站点 URL。

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Subforms\Gen6MTSeedFinder.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Subforms\Gen6MTSeedFinder.Designer.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Util\MTSeedFinder.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\RNG\MT.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Resources\text\lang_zh.txt`

保留 3DSRNGTool、Mersenne Twister 原始实现的版权、许可证、免责声明和上游归属；PokeRNGKit 继续按 GPL-3.0-or-later 发布。
