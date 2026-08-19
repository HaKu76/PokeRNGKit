# 第六世代 TinyMT 日期与 Index 查询

状态：已实现 TinyFinder T1/T2 的本地 TinyMT 日期检索、状态生成和 Index/状态筛选。日期模式不连接 NTR/TCP；用户输入的是校准年份 `01-01 13:00:00` 对应的 TinyMT 初始 Seed。

## 范围

- `Date Searcher`：从指定年份的 `01-01 13:00:00` 基准开始，按所选月份起算到该年末，每秒将 TinyMT Seed 增加 `1000`，输出日期、Seed、Index、Rand# 与 TinyMT 状态。
- `Generator`：从四字 TinyMT 状态生成连续 Index，保留 TinyFinder Index 消费者的 1 次启动推进。
- Index 和 TinyMT 状态支持逐行普通包含筛选与 ECMAScript 正则筛选；支持取消、进度、结果上限、虚拟表和 CSV。

## 输入边界

| 输入                    | 范围或行为                                                         | 上游依据                                        |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| TinyMT state `[3]..[0]` | 四个 `uint32`，`0..0xFFFFFFFF`；空值按 `0`                         | `TinyFinder/RNG/TinyMT.cs`、`Main/Form1.cs`     |
| TinyMT Seed             | `0..0xFFFFFFFF`；空值按 `0`                                        | `TinyFinder/RNG/TinyMT.cs`                      |
| Year                    | `2000..2080`                                                       | `TinyFinder/Main/Form1.Designer.cs`             |
| Month                   | `1..12`；日期模式搜索所选月及之后日期                              | `TinyFinder/Main/FindResults.cs`、README Step 2 |
| Min Index               | `0..250000`；浏览器任务保护                                        | TinyFinder `min` 控件与 PokeRNGKit 任务上限     |
| Max Index               | `Min Index..10000000`                                              | TinyFinder `max` 控件；浏览器任务保护           |
| Date seconds            | 日期模式按所选月份到年末计算；单任务最多 `5000000` 个 Index/秒组合 | PokeRNGKit Worker 任务保护                      |
| Max Results             | `1..100000`                                                        | PokeRNGKit Worker 任务保护                      |

## 算法与协议

TinyMT 常量、初始化循环、8 次预推进、状态转移和 temper 函数来自 TinyFinder `RNG/TinyMT.cs`。日期换算保留 `Calculate.FindSeconds` 的闰年月份偏移行为；Seed 使用 `FindMonthSeed(seed, seconds) = seed + seconds * 1000`。主线程不执行生产 RNG，计算位于 `gen6tinyindex.mjs/.wasm` Dedicated Worker。

- Wasm module：`gen6tinyindex`
- API / Contract version：`1` / `1`
- 操作：`generator`、`dateSearcher`
- 请求：12 个 `uint32` 字；结果：8 个 `uint32` 字
- 取消：终止并重建独立 Worker；不使用 SharedArrayBuffer、Wasm pthread 或 NTR/TCP

## 页面与文件

- 页面：`src/features/gen6tinyindex/Gen6TinyIndexPanel.tsx`
- Domain：`src/features/gen6tinyindex/domain.ts`
- Worker：`src/features/gen6tinyindex/worker/Gen6TinyIndexWorker.ts`、`gen6tinyindex.worker.ts`
- UI 预览：`src/features/gen6tinyindex/preview/Gen6TinyIndexUiPreviewEngine.ts`
- Wasm bridge：`wasm/modules/gen6tinyindex/bridge/gen6tinyindex_bridge.cpp`
- 原生夹具：`wasm/modules/gen6tinyindex/tests/gen6tinyindex_native_test.cpp`

## 验证状态

已通过：TinyMT Index 定向 Vitest（2 个文件、4 项测试）、`npm run typecheck`、`$env:POKERNGKIT_WASM_MODULES='gen6tinyindex'; npm run wasm:test:native`（1/1）、激活 Emscripten 6.0.6 后定向 `npm run wasm:build`、`npm run format:check`、`git diff --check`。浏览器产物 `gen6tinyindex.mjs`（7733 bytes，SHA-256 `381273699382CDB04155F2A66356E685F7D1A616884F5F1921B92F77152DBDC2`）和 `gen6tinyindex.wasm`（6901 bytes，SHA-256 `E5FDB77063C70B0664DAEB755D4C151602391A3E48E377387ECD5EEBDFEEAEB2`）已生成。外部 Chrome/Edge UI 回归和生产页面算法验收尚未运行；生产验收仍需等全部 3DS 模块完成、GitHub Actions 部署并由项目所有者提供准确 URL 后授权。

## 上游与许可

主要来源：`C:\Users\Hakuhiro\Desktop\project\TinyFinder-main\TinyFinder\RNG\TinyMT.cs`、`Utils\Calculate.cs`、`Main\FindResults.cs`、`Classes\Index.cs`。TinyFinder 来源和许可证记录见 `third_party/tinyfinder/UPSTREAM.md`；PokeRNGKit 继续按 GPL-3.0-or-later 发布并保留上游署名与免责声明。
