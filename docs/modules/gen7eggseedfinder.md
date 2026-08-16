# 第七世代 Egg Seed Finder

## 功能范围

`gen7eggseedfinder` 实现 3DSRNGTool `Gen7EggSeedFinder` 的两条工作流：使用 127 个鲤鱼王性别结果反推四字 TinyMT 状态，以及使用新存档的 8 蛋性格序列穷举 32 位 TinyMT 初始化 Seed。生产算法只在独立 Web Worker 的 Wasm 实例中运行，不访问远程服务。

## 上游来源

- 主要行为来源：`C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN` revision `359bdd7a9ff7c145fec12302cf43da932923fa62`
- `3DSRNGTool/Subforms/Gen7EggSeedFinder.cs`
- `3DSRNGTool/Subforms/Gen7EggSeedFinder.Designer.cs`
- `3DSRNGTool/Util/TinySeedFinder.cs`
- `3DSRNGTool/Util/MagikarpCalc.cs`
- `3DSRNGTool/RNG/TinyMT.cs`
- `3DSRNGTool/RNG/IRNGState.cs`
- `3DSRNGTool/Util/FuncUtil.cs`
- `3DSRNGTool/Resources/text/lang_zh.txt`

## 输入限制

| 输入           | 上游依据                                    | 范围与行为                                                                                                                                      |
| -------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 鲤鱼王性别序列 | `B_EggSeed127_Click()`                      | 去除全部空白后必须恰好为 127 个字符，且只允许 `0` 和 `1`；公记为 `0`，母记为 `1`。                                                              |
| 性格序列       | `parseNatureList()`、`B_TinySearch_Click()` | 必须恰好为 8 项；上游解析允许十进制 `0..25`，其中实际 TinyMT `% 25` 只可能命中 `0..24`。生产界面保留 `25`，结果必为空。                         |
| ShinyCharm     | `SetFinder()`                               | 布尔值；关闭时每蛋后续推进基数为 `10`，开启时为 `12`。                                                                                          |
| Seed 空间      | `TinySeedFinder.Search()`                   | 固定枚举 `0x00000000..0xFFFFFFFF` 的全部 32 位 Seed；PokeRNGKit 增加 `Minimum Seed` / `Maximum Seed` 作为本地分段与恢复控制，默认仍为完整空间。 |

上游 WinForms 的性格输入同时支持逗号和空格；Web 界面改为 8 个稳定的选择控件，保留相同数值范围。Seed 分段控件是静态浏览器执行所需的扩展，不改变默认完整枚举语义。

## 算法

### 127 鲤鱼王计算器

输入按每 32 位打包为四个 `uint32_t`，最后一字只使用低 31 位。`MagikarpCalc` 的 127 x 127 GF(2) 逆矩阵逐行计算奇偶校验，输出按 TinyMT 有效状态的 `31 + 32 + 32 + 32` 位布局写入 `state0..state3`；展示顺序沿用上游 `PRNGState.ToString()` 的 `state3,state2,state1,state0`，每字固定为 8 位大写十六进制。

### 8 蛋性格检索

每个候选 Seed 按上游 `TinyMT.init()` 初始化并预推进 8 次。前 7 蛋依次消耗性别、性格、特性、三项互异遗传 IV 位置和剩余推进；第 8 蛋只比较性别后的性格。普通流程的后续推进基数为 `10`，ShinyCharm 为 `12`。命中时返回该 Seed 初始化完成后的四字 TinyMT 状态，而不是原始 32 位 Seed 数值。

## Wasm / Worker 契约

- 模块 id：`gen7eggseedfinder`
- API version：`1`
- 操作：`search`、`magikarp`
- Search 输入：闭区间 Seed、8 项性格、ShinyCharm
- Search 结果：每行四个 `uint32_t` TinyMT 状态字
- Magikarp 输入：127 个 `uint8_t` 二进制位
- Magikarp 结果：四个 `uint32_t` TinyMT 状态字
- Worker Pool：默认 `max(1, min(8, hardwareConcurrency - 1))`，最多 8 个独立 Wasm 实例；Seed 范围默认按 `2^20` 项分片

取消会终止并重建当前 Worker Pool，并返回已经按顺序完成的前缀批次；Worker 批次按 `chunkIndex` 恢复确定顺序。完整 `2^32` 搜索是长任务，进度按每个 `2^20` Seed 批次完成情况更新，不使用 `SharedArrayBuffer` 或 Wasm pthread。

## 固定夹具

- 127 个 `1`：`3050EADD,89435273,785B9C60,7E46E861`
- Seed `00000000`、无 ShinyCharm：性格序列 `9,19,23,11,11,10,22,11`
- 上述性格序列检索 `00000000..00000000`：`1969DE6C,0D6F15E9,60127F96,78A495AE`

## 验证

- 已通过：`npm test -- src/features/gen7eggseedfinder`，2 个文件、5 项测试。
- 已通过：`npm run typecheck`。
- 已通过：WinLibs GCC 16.1.0 原生夹具；全部 9 个受影响 Gen VII 原生夹具为 9/9。
- 已通过：Emscripten 6.0.6 定向构建 9 个受影响 Gen VII 模块，包括 `gen7eggseedfinder.mjs` / `gen7eggseedfinder.wasm`。
- 已通过：直接加载真实 Wasm 运行两组固定夹具，结果与上表一致。
- 已通过：`npm run verify` 的 Prettier、ESLint、TypeScript 与 114 个 Vitest 文件共 430 项测试；ESLint 为 0 error，保留 6 条既有 warning。
- 已通过：非受限 `npm run build:web` 完成 2140 个模块转换和 150 项 PWA 预缓存；受限 `verify` 的同一构建步骤因既有 `public/wasm/gen3egg.mjs` 复制 `EPERM` 中断。
- 未运行：外部 Chrome / Edge UI 验收和生产页面算法回归。
