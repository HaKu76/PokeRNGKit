# 第六世代孵化乱数

## 功能范围

`gen6egg` 实现 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VI Egg 工作流。工作区包含当前蛋、帧范围生成、接受/拒绝蛋延迟、双亲遗传、异色检查和结果筛选。生产算法只在独立 Dedicated Worker 与 `gen6egg.mjs/.wasm` 中运行；React 负责输入校验、协议编排、结果展示和 CSV。

## 已核对输入

| 输入                 | 上游范围或行为                                                | 浏览器行为                                    | 上游依据                                                |
| -------------------- | ------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| Main Seed            | `uint32`，`0..0xFFFFFFFF`；空值由数值控件读取为 `0`           | 十六进制八位，空值为 `0`                      | `MainForm.Designer.cs`、`MainForm_Core.cs::Search6_Egg` |
| Frame min / max      | `0..100,000,000`，最小值不得大于最大值                        | 最大帧限制为 `5,000,000`，避免浏览器任务失控  | `MainForm.cs::Frame_min/Frame_max`、`FuncUtil.MAXFRAME` |
| Egg Seed Key0 / Key1 | 两个 `uint32`，空值为 `0`                                     | 十六进制八位                                  | `MainForm.Designer.cs`、`MainForm_Egg.cs`               |
| TSV / TRV            | TSV `0..4095`；TRV `0..15`                                    | 十进制 TSV、十六进制 TRV                      | `MainForm.Designer.cs`、`Core/EggRNG.cs`                |
| Gender ratio         | Genderless、1:1、7:1、3:1、1:3、1:7、Male-only、Female-only   | 性别比切换会同步 Ditto/Nido Type 约束         | `MainForm_Egg.cs::Egg_GenderRatio_SelectedIndexChanged` |
| Parent IVs           | 每项 `0..31`，六项                                            | 空值规范化为 `0`                              | `MainForm.Designer.cs`、`Gen6/Egg6.cs`                  |
| Parent ability       | Normal 1、Normal 2、Hidden，内部值 `0..2`                     | Female Ditto 时使用 Male ability              | `MainForm.cs::getEggRNG`、`Core/EggRNG.cs`              |
| Parent item          | None、Everstone、Destiny Knot、六个 Power Item，内部值 `0..8` | 双 Everstone / 双 Power Item 保留随机父方选择 | `Core/EggRNG.cs`、`Gen6/Egg6.cs`                        |
| Other TSV list       | 每项 `0..4095`；非法项忽略，重复项折叠                        | 最多 4096 项并编码为 4096-bit mask            | `MainForm_Egg.cs::Loadlist`、`Gen6/Egg6.cs`             |
| Result limit         | 桌面程序使用 `MAX_RESULTS_NUM`                                | `1..100,000`                                  | `MainForm.cs`、Web Worker 任务保护                      |

跨字段行为与上游一致：双亲不能同时为 Ditto；Genderless/Male-only 要求 Female Ditto；Female-only 禁用 Female Ditto；Nido Type 只对 1:1 性别比可用；Other TSV 只有开启 Shiny Charm、Masuda Method 或 Gen VI 接受蛋时才生效。

## RNG 顺序

`MainForm_Core.cs::Search6_Egg` 先用 Main RNG Seed 推进到最小帧，并用滚动的 20 项 MT 缓冲保留上游 `RNGPool` 消耗顺序。搜索前先生成当前蛋：它使用用户输入的 Key0/Key1，结果行标记为 `Current`，不参加筛选。每个帧结果在接受蛋模式使用 16 延迟，拒绝蛋模式使用 0 延迟；接受蛋且没有 Shiny Charm/Masuda 时将 Main RNG PID 传入 `Egg6.Generate`，其他模式按上游重抽 PID。

`Gen6/Egg6.cs` 的顺序为：性别、性格、Everstone 父方、Ability、Power Item 父方、3 或 5 个遗传 IV 位置、非遗传 IV、EC、PID/异色重抽和 Other TSV 检查。双 Power Item 先随机选择父方，再由 Destiny Knot 补足遗传位置；结果保留男方/女方 IV 遗传 mask、PSV、PRV、Hidden Power 和当前行标记。

## Wasm 与 Worker 契约

- Module id：`gen6egg`
- Contract version：`1`
- Wasm API version：`2`
- Operation：`generator`
- 请求：154 个 `uint32_t` 字
- 结果：20 个 `uint32_t` 字

请求包含 Main Seed、帧起点/数量、Key0/Key1、TSV/TRV、性别比、父母道具/能力/IV、模式 flags 和 4096-bit Other TSV mask。结果包含 Frame、Random、64 位 Egg Seed、EC、PID、六项 IV、metadata、Hidden Power、遗传 mask、PSV/PRV。metadata bit 12 表示 Current 行。

每次搜索使用一个独立 Dedicated Worker；Worker 批次最多处理 `2,048` 帧，取消后终止并重建实例。结果缓冲区按 20-word 对齐检查，API 或 contract 版本不匹配时拒绝初始化。本模块不依赖 `SharedArrayBuffer`、Wasm pthread 或跨源隔离。

## 验证状态

已通过：

- `npm test -- --run src/features/gen6egg`：2 个文件、4 项测试
- `npm run typecheck`
- `npm run format:check`
- `git diff --check`
- `$env:POKERNGKIT_WASM_MODULES='gen6egg'; npm run wasm:test:native`：1/1 原生夹具

原生夹具覆盖 Current 行、Main RNG PID、接受蛋 16 延迟、EC/PID/IV 固定值、Egg Seed、双 Power Item 随机父方和结果数量。Emscripten 生产构建、外部 Chrome/Edge UI 回归和生产页面算法验收仍待执行；生产验收必须在 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。

Emscripten 6.0.6 定向构建已通过：`public/wasm/gen6egg.mjs` 为 7547 bytes，SHA-256 `7BB1E3CC00E5C98208EB14A82403C3220CAB9CE5C637D835F73EABCC3CF399F6`；`public/wasm/gen6egg.wasm` 为 10475 bytes，SHA-256 `D1980DE45AFD7376BC998E4BE8B9712F492F79039996347D538EFCDA4FFAC868`。构建过程仅有 CMake 4.3.1 与 Emscripten shared-library 支持提示，不影响本模块 executable 产物。

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.cs::getEggRNG`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm_Core.cs::Search6_Egg`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm_Egg.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\EggRNG.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\Egg6.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Core\RNGPool.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\RNG\MT.cs`

3DSRNGTool 来源按其 MIT 条款记录；MT19937 保留原始 BSD 风格版权与免责声明。PokeRNGKit 继续按 GPL-3.0-or-later 发布，并保留上游版权、商标和来源说明。
