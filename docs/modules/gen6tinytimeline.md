# Gen VI TinyMT Timeline Tool

状态：已实现本地 TinyMT 时间线生成；NTR/TCP 实时校准不在静态浏览器架构范围内。

## 范围

- 使用四个 32 位 TinyMT 状态字、主乱数起始帧和目标帧生成事件时间线。
- 支持上游 11 种方法：Instant Sync、Cutscenes Sync、Horde、Friend Safari、Poke Radar、Fishing、Rock Smash、Cave Shadow、Normal Wild、XY ID RNG、Groudon/Kyogre。
- 支持 1 至 4 个递增事件，以及 Party Size、Slot Number、Encounter Rate、Chain Length、Boost、ORAS、Delay、Cry、Cry Frame 和 Consider Delay。
- 支持虚拟结果表、CSV、进度、取消、结果上限和 UI Preview；Preview 仅用于布局和交互检查，不作为 RNG 结果验收。

## 输入边界

| 输入                          | 范围与行为                                                          | 上游来源                                                            |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| TinyMT 四字状态               | `0..0xFFFFFFFF`，空值按 `0`                                         | `3DSRNGTool/RNG/TinyMT.cs`、`Subforms/TinyTimelineTool.Designer.cs` |
| Main RNG Frame / Target Frame | `0..1,000,000,000`；浏览器任务限制 Target `<=5,000,000`             | `Subforms/TinyTimelineTool.cs`、`Util/FuncUtil.cs`                  |
| Type Number                   | `1..4`；Cave Shadow 固定 2，XY ID 固定 4，Groudon/Kyogre 固定 3     | `Subforms/TinyTimelineTool.cs`                                      |
| Event Frame                   | `0..1,000,000,000`，按输入顺序不递减                                | `Subforms/TinyTimelineTool.cs`                                      |
| Party Size                    | `1..6`                                                              | `Subforms/TinyTimelineTool.cs`                                      |
| Slot Number                   | `2..3`，Friend Safari                                               | `Subforms/TinyTimelineTool.cs`                                      |
| Encounter Rate                | `0..99`；Friend Safari 默认 13，Fishing 默认 98，Normal Wild 默认 1 | `Subforms/TinyTimelineTool.cs`                                      |
| Chain Length                  | `0..255`，Poke Radar                                                | `Subforms/TinyTimelineTool.cs`                                      |
| Delay / Cry Frame             | `0..1,000,000,000`；未启用 Cry 时 Cry Frame 为 `-1`                 | `Subforms/TinyTimelineTool.cs`                                      |
| Max Results                   | `1..100,000`，浏览器任务保护                                        | PokeRNGKit Worker 契约                                              |

## 算法与协议

核心行为来自上游 `Gen6/TinyTimeline.cs`、`Controls/Frame_Tiny.cs`、`RNG/TinyMT.cs`、`Core/WildRNG.cs`、`Gen6/Horde.cs` 和 `Gen6/PokeRadar.cs`。Wasm bridge 保留事件队列、冷却时间、延迟拆分和 TinyMT 状态记录。静态产品不连接 NTR Helper，不读取 TCP 调试器；需要校准时由用户在事件表中输入观测事件。

- Wasm module：`gen6tinytimeline`
- API / Contract version：`1` / `1`
- 请求 / 结果：22 / 16 个 `uint32` 字
- 执行：单 Dedicated Worker；取消通过终止并重建 Worker 实例完成。

## 验证状态

已通过 `npm run typecheck`、`npm run lint`、定向 Vitest 3/3、原生 C++ 夹具 1/1、Emscripten 6.0.6 定向 Wasm 构建和 `npm run build:web`。原生夹具第一次因 C++ 十六进制字面量编译失败，修正后重新运行通过。产物为 `gen6tinytimeline.mjs` 7,640 bytes，SHA-256 `50E8D20E03359015C8CC28FA5E557499E0A369AB791B602D07158434A29F5208`；`gen6tinytimeline.wasm` 23,892 bytes，SHA-256 `8FC36396E136498DAE09390B85B2A76668054D0B4C81D05E5DF2E6CACDFC5D3C`。

完整 `npm run verify` 首次在 TypeScript 阶段发现方法文本、AbortSignal 与 `gen6mainseed` 类型重导出问题；修正后从头重跑通过：Prettier、TypeScript、151 个 Vitest 文件 / 541 项测试与 Vite/PWA 生产构建均完成，ESLint 0 error，保留 12 条既有 TanStack Virtual warning。未运行外部 Chrome/Edge；算法验收仍需部署完成后由项目所有者提供准确 URL 并授权。

上游版权与许可证：3DSRNGTool 的 GPL-3.0-or-later 归属和 TinyMT 许可记录见 `third_party/3dsrngtool/UPSTREAM.md` 与上游 `licenses/TinyMT.txt`。
