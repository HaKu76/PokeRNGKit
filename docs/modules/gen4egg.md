# 第四世代孵化乱数 Generator / Searcher

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

> - 模块标识：`gen4egg`
> - PokeFinder 基线：4.3.2 revision `dd00fe7`
> - Worker / Wasm API：`2`
> - 生产模型：静态前端、独立 Web Worker、独立 Emscripten Wasm

## 1. 覆盖范围

- 游戏：Diamond、Pearl、Platinum、HeartGold、SoulSilver。Diamond/Pearl/Platinum 共用 DPPt 继承规则，HeartGold/SoulSilver 共用 HGSS 继承规则。
- 操作：Generator 使用蛋生成 Seed 与蛋领取 Seed；Searcher 枚举 `ab/cd/delay` 组成的第四世代初始 Seed。
- 蛋生成：MT19937 生成 PID；异国孵化启用时，使用 ARNG 最多重抽四次。
- 蛋领取：PokeRNG 生成两组基础 IV、三个遗传能力索引和三个亲代来源。
- 亲代：父母 A / B 各自保存六项 IV 与性别类型，严格复用 `EggSettings::isValid()` 的组合约束。
- 筛选：异色、性别、特性、性格、觉醒属性与六项 IV。
- 结果：显示蛋生成帧、蛋领取帧、PID、异色、性格、特性、六项 IV 或遗传来源、觉醒属性、觉醒威力、性别和个性。HGSS Generator 额外显示电话；DPPt Generator 可计算 Poketch 操作量。

界面复用项目既有三栏操作工作区、固定高度结果区、虚拟滚动、排序、CSV、进度和取消交互。UI 预览引擎只用于界面开发，不作为 RNG 结果证据。

## 2. 输入边界

| 输入                   | 范围 / 行为                                                       | 上游依据                                                                     |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Seed (Held / Pickup)   | 十六进制 `00000000..FFFFFFFF`，最多 8 位；空值按 `0`              | `Form/Gen4/Eggs4.cpp` 的 `InputType::Seed32Bit`、`Form/Controls/TextBox.cpp` |
| Initial / Max Advances | 十进制 `0..4294967295`；`Initial + Max` 不得溢出 `uint32_t`       | `Eggs4.cpp` 的 `InputType::Advance32Bit`、Core `u32` 参数                    |
| Offset (Held / Pickup) | 十进制 `0..4294967295`；与 Initial、Max 的组合不得溢出 `uint32_t` | `Eggs4.cpp`、Generator 构造参数                                              |
| Searcher Delay         | 十进制 `0..4294967295`，闭区间，最小值不得大于最大值              | `Eggs4.cpp` 的 `InputType::Advance32Bit`、`EggSearcher4`                     |
| TID / SID              | 十进制 `0..65535`                                                 | `Profile4`                                                                   |
| Parent IV              | 每项 `0..31`                                                      | `Form/Gen4/EggSettings.cpp/.ui`                                              |
| Filter IV              | 每项 `0..31`，最小值不得大于最大值                                | `Filter.ui`、`StateFilter`                                                   |
| Nature / 觉醒属性      | 25 / 16 项掩码；Web 空选择按全选处理                              | PokeFinder CheckList 与 Filter 语义                                          |
| Egg Specie             | `EggSettings.cpp` 的 `allowed[]` 中不超过 493 的 221 个物种       | `Form/Gen4/EggSettings.cpp`                                                  |

Generator 默认 Seed 均为空（按 `0`），蛋生成帧 `0..100`，蛋领取帧 `0..1000`，Offset 为空（按 `0`）。Searcher 默认蛋生成帧 `0..30`，蛋领取帧 `0..1000`，Delay `600..2000`。Web 领域层另外限制单次 Generator 组合不超过 100,000,000，Searcher Seed 不超过 50,000,000，结果不超过 100,000。

## 3. 亲代与物种

合法亲代组合为：雄性 + 雌性、百变怪 + 雌性、雌性 + 百变怪、雄性 + 百变怪、百变怪 + 雄性、无性别 + 百变怪、百变怪 + 无性别。除此之外的组合在 UI、领域校验和 Wasm 边界均被拒绝。

`src/features/gen4egg/data.ts` 从 `EggSettings.cpp` 的 `allowed[]` 机械整理 221 个蛋种，并从 Gen4 Personal 数据读取性别比例。DPPt 与 HGSS 在 1..493 范围内的性别字节一致。尼多兰♀使用特殊伴生种 `29 -> 32`，电萤虫使用 `314 -> 313`，PID 的 `0x8000` 位决定采用本种或伴生种性别比例。

## 4. 算法差异

### DPPt

遗传能力依次从固定缩减表选择：第一项可选六项，第二项排除 HP，第三项再排除 Defense。该规则可能重复覆盖先前遗传能力，保持 PokeFinder `EggGenerator4` 的 DPPt 行为。

DPPt Generator 结果支持 Poketch 计算：

```text
Advances < 12:
  Happiness Double Taps = 0
  Coin Flip Taps = Advances
  Do not switch to the happiness application at all

Advances >= 12:
  target = Advances - 12
  Happiness Double Taps = floor(target / 12)
  Coin Flip Taps = target % 12
```

当 `target < 12` 时，额外提示 `Switch to the happiness application once but do not click`。这些 Poketch 文案在上游没有简体中文翻译，因此保持英文原文。

### HGSS

三个遗传能力从逐步缩减的可用能力列表选择，不会重复。Generator 结果显示电话 `E / K / P`，不显示 DPPt Poketch 操作入口。

### 异国孵化

先读取 MT19937 PID。若当前 PID 非异色，则以该 PID 初始化 ARNG，并最多调用四次 `next()`；任一次得到异色 PID 即停止。异色判定、性别、特性槽位和性格均对最终 PID 执行。

## 5. Searcher

Searcher 的种子空间为：

```text
256 * 24 * (Max Delay - Min Delay + 1)
seed = ((ab << 24) | (cd << 16)) + delay
```

其中 `ab` 为 `0..255`，`cd` 为 `0..23`，实际计算使用 `((ab << 24) | (cd << 16)) + delay`，以保留超过 `0xFFFF` 的 Delay 进位；结果表的 Delay 列为 Seed 的低 16 位，与上游 `EggModel4` 一致。每个候选 Seed 同时作为蛋生成 Seed 和蛋领取 Seed，使用 Searcher 配置的帧数范围、亲代、物种、异国孵化和筛选条件生成结果。结果附加 Seed 与 Delay，并保持 Worker 分片的 `chunkIndex` 顺序。

## 6. Wasm 与 Worker

请求固定为 50 个 `uint32_t`。Generator 结果固定为 23 个 `uint32_t`，Searcher 结果固定为 25 个 `uint32_t`。C++ 使用 `static_assert` 固定记录宽度；Worker 在复制结果前检查 API、错误码、结果数量、内存对齐、结果范围和单次 100,000 条上限。

```text
Gen4EggPanel
  |-- Gen4EggWorkerPool (Generator)
  `-- Gen4EggWorkerPool (Searcher)
        `-- Dedicated Worker x N
              `-- gen4egg.mjs + gen4egg.wasm
                    |-- gen4egg_generate
                    `-- gen4egg_search
```

Worker 初始化严格验证 `moduleId = gen4egg`、共享契约版本、API v1 和 Generator/Searcher 能力。Pool 最多建议使用 8 个 Worker，按 `chunkIndex` 有序交付批次；取消时终止全部 Worker，后续任务重新初始化。模块不使用 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。

## 7. 固定夹具

`wasm/modules/gen4egg/tests/egg4_native_test.cpp` 使用 TID `12345`、SID `54321`、双亲全 31 IV、蛋生成/领取帧 `0..9`：

- Diamond 首条：PID `2357136044`，Nature `19`，IV `0/31/0/31/26/31`，遗传 `0/2/0/2/0/1`，觉醒属性 `6`，威力 `66`。
- Diamond 异国孵化首条：PID `2745925320`，Nature `20`。
- HeartGold 首条：IV `31/0/0/31/26/31`，遗传 `2/0/0/2/0/1`，觉醒属性 `5`，威力 `66`。
- Searcher Delay `0..0` 的首个 Seed 为 `0`，首条 PID 与 Diamond Generator 相同。

TypeScript 测试覆盖亲代组合、字段范围、溢出、Generator/Searcher 分片、48-word 编码、23/25-word 解码、Poketch 边界和 UI 预览的流式结果与取消。

## 8. 来源与许可

- 表单与输入：`Form/Gen4/Eggs4.cpp/.hpp/.ui`、`Form/Gen4/EggSettings.cpp/.hpp/.ui`。
- 算法：`Core/Gen4/Generators/EggGenerator4.cpp/.hpp`、`Core/Gen4/Searchers/EggSearcher4.cpp/.hpp`、`Core/Gen4/States/EggState4.cpp/.hpp`、`Core/Parents/Daycare.cpp/.hpp`、`Core/RNG/MT.cpp/.hpp`、`Core/RNG/LCRNG.hpp`。
- 存档：`Core/Gen4/Profile4.cpp/.hpp`。
- 表格：`Model/Gen4/EggModel4.cpp/.hpp`。
- 夹具：`Test/Gen4/EggGenerator4Test.cpp`、`Test/Gen4/egg4.json`。

PokeFinder 代码和派生算法按 GPL-3.0-or-later 保留原作者版权与归属。完整 vendored 文件、校验值、修改边界和源码分发说明见 [`third_party/pokefinder/UPSTREAM.md`](../../third_party/pokefinder/UPSTREAM.md)。

## 9. 验证记录

2026-08-14 已运行：

- `npm test -- src/features/gen4egg`：2 个测试文件、11 项测试通过。
- `npm run lint`：0 error；保留 Gen3 Egg/Wild 的两条 TanStack Virtual 既有 warning。
- `npm run typecheck`：通过。
- `$env:POKERNGKIT_WASM_MODULES='gen4egg'; npm run wasm:test:native`：`gen4egg_native_parity` 1/1 通过。Diamond、异国孵化、HGSS、Searcher 和 23/25 word 结构宽度断言全部实际运行。
- `npm run format:check` 与 `git diff --check`：通过。
- `npm run verify`：受限文件环境首次在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；相同源码状态在受限环境外完整通过 39 个测试文件、151 项测试、Vite 生产构建和 48 项 PWA 预缓存。

浏览器、部署站点和生产算法回归需等待项目所有者提供部署 URL 并单独授权。
