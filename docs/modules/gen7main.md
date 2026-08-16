# 第七世代 Main RNG Tool

## 功能范围

`gen7main` 实现 3DSRNGTool `Gen7MainRNGTool` 的三条工作流：读档指针序列反查 Seed、QR 指针序列定位帧、ID 乱数 Seed 反查，以及 Time Calculator。支持 Sun、Moon、Ultra Sun、Ultra Moon；Seed 穷举在多个独立 Web Worker 的 Wasm 实例中执行，不访问远程 API。

## 上游来源

- 主要行为来源：`C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN` revision `359bdd7a9ff7c145fec12302cf43da932923fa62`
- `3DSRNGTool/Subforms/Gen7MainRNGTool.cs`
- `3DSRNGTool/Subforms/Gen7MainRNGTool.Designer.cs`
- `3DSRNGTool/Util/SFMTSeedAPI.cs`（记录原始远程服务行为，本项目不保留运行时调用）
- `3DSRNGTool/Util/FuncUtil.cs`
- `3DSRNGTool/Gen7/ModelStatus.cs`
- `3DSRNGTool/RNG/SFMT.cs`
- Seed 反查并行穷举参考：[Admiral-Fish/needle-searcher](https://github.com/Admiral-Fish/needle-searcher)，GPL-3.0-or-later；归属与修改边界见 [`third_party/needle-searcher/UPSTREAM.md`](../../third_party/needle-searcher/UPSTREAM.md)。

## 输入限制

| 输入                         | 上游依据                                                   | 范围与行为                                                                           |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Game Version                 | `FuncUtil.getstartingframe()`、主窗体版本选择              | Sun、Moon、Ultra Sun、Ultra Moon                                                     |
| Clock sequence               | `button0..16`、`Clock_List`、`SearchSeed()` / `QRSearch()` | 每项十进制 `0..16`；读档和 ID 最少分别 8 / 9 项，最多 16 项；QR 最少 2 项            |
| Offset                       | `Offset.Maximum`、`Get_Clock_Number()`                     | `0..16`，默认 `4`；读档结束位置按 `(clock + 17 - offset) % 17` 写入，QR 不修正       |
| Seed                         | QR 与 Time Calculator 的 `SFMT(uint)` 输入                 | 8 位十六进制，`0..FFFFFFFF`；空值按 `0`                                              |
| QR frame range               | `Frame_min`、`Frame_max`                                   | 十进制 `0..100,000,000`，最小值不得大于最大值                                        |
| Time starting / target frame | `Time_min`、`TargetFrame`                                  | 十进制 `0..100,000,000`；上游默认 SM 起点 `425`，版本起始帧为 `418`，USUM 对应 `478` |
| NPC                          | `NPC.Maximum`                                              | 十进制 `0..50`；算法内部使用 `NPC + 1` 个模型                                        |
| Fidget / Raining             | `Fidget`、`Raining`                                        | 布尔开关；分别启用平均 452 帧 Fidget 冷却和每隔一帧额外推进 2 个 SFMT 输出           |
| Startup                      | `Startup`                                                  | 布尔开关，写入 localStorage；不改变 RNG 请求                                         |

版本起始帧和 Seed 反查 offset：

| 版本                   | 普通起始帧 / offset | ID 起始帧 / offset |
| ---------------------- | ------------------- | ------------------ |
| Sun / Moon             | `418 / 417`         | `1012 / 1012`      |
| Ultra Sun / Ultra Moon | `478 / 477`         | `1132 / 1132`      |

输入控件保留上游的十进制、十六进制和空值语义。浏览器帧上限按上游 `100,000,000`；Seed 反查完整枚举 `2^32` 个 Seed，默认分成 `2^20` Seed 区块并按硬件并发数创建最多 8 个独立 Worker。

## 算法与结果

### Seed 反查

每个 Worker 使用 SIMD 四路 Seed 初始化 SFMT-19937，周期认证后推进普通 `417 / 477` 或 ID `1012 / 1132` 个 64 位输出，逐项比较 `Nextulong() % 17`。ID 模式以第一项计算模 17 的模糊修正，仅接受上游允许的偏移 `15, 16, 0, 1, 2`，结果返回 Seed 与 `0..16` 指针修正。

### QR 定位

按照上游 `QRSearch()` 先推进 `minFrame` 个 `Next()`（每次消耗两个 32 位输出），建立循环指针缓冲；每个窗口匹配成功时返回 `lastClockFrame = frame + length - 1` 和 `afterQrFrame = frame + length + 1`。

### Time Calculator

按 `FuncUtil.CalcFrame()` 与 `ModelStatus.NextState()` 计算 NPC 模型、Fidget 和 Raining 的连续推进。结果保留上游正向/反向计算语义，显示起点推进帧、目标阶段推进帧和换算后的实时秒数。

## Wasm / Worker 契约

- 模块 id：`gen7main`
- API version：`1`
- contract version：共享 `RNG_MODULE_CONTRACT_VERSION`
- 操作：`seed-search`、`qr-search`、`time-calculator`
- Seed 结果：`seed`、`correction` 两个 `uint32_t`
- QR 结果：`lastClockFrame`、`afterQrFrame` 两个 `uint32_t`
- Time 结果：`primaryFrames`、`secondaryFrames` 两个有符号帧数

Seed 搜索使用独立 Worker 实例，不依赖 `SharedArrayBuffer`、Wasm pthreads 或跨源隔离。Worker Pool 以 `chunkIndex` 恢复批次顺序，取消时终止并重建 Worker，迟到消息不会写回当前任务。

## 固定夹具

来自 `odanado/rng-api/tests/test_search.py` 的可复现夹具：

- SM 普通：offset `417`，`6,10,9,15,10,0,2,7,5,8` -> `BD1646F7`
- USUM 普通：offset `477`，`9,10,7,11,12,15,7,7` -> `C31A2F06`
- SM ID 模糊：offset `1012`，`2,14,5,6,10,15,7,6,6` -> `F9337724`，correction `15`
- QR：Seed `BD1646F7`、frame `417`、SM 指针序列 -> `lastClockFrame 426`、`afterQrFrame 428`

原生夹具位于 `wasm/modules/gen7main/tests/gen7main_native_test.cpp`。

## 运行时资产

`src/features/gen7main/assets/Clock_00.jpg` 至 `Clock_16.jpg` 原样来自 3DSRNGTool `Resources/pic`，仅用于 Clock 输入按钮展示；文件不上传、不写入用户存档。上游 MIT 许可证与来源见 [`third_party/3dsrngtool/UPSTREAM.md`](../../third_party/3dsrngtool/UPSTREAM.md)。

## 验证记录

- `npm test -- src/features/gen7main`：3 个测试文件、7 项测试通过。
- `npm run typecheck`：通过。
- `$env:POKERNGKIT_WASM_MODULES='gen7stationary,gen7wild,gen7sos,gen7egg,gen7battletree,gen7event,gen7main,gen7eggseedfinder,gen7id'; npm run wasm:test:native`：9/9 原生夹具通过。
- Emscripten 6.0.6：上述 9 个 Gen VII 模块定向构建通过，生成对应 `.mjs/.wasm`。
- 真实 `gen7main.wasm`：SM `BD1646F7`、USUM `C31A2F06`、SM ID `F9337724 / correction 15` 三组 Seed 夹具通过。
- `npm run verify`：Prettier、ESLint、TypeScript 与 114 个 Vitest 文件共 430 项测试通过；ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler warning。
- 生产 Web/PWA：受限 `verify` 在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；非受限 `npm run build:web` 随后通过 2140 个模块转换并生成 150 项 PWA 预缓存。
- 未运行：外部 Chrome / Edge UI 检查和生产页面算法回归。
