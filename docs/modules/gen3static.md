# 第三世代 Static Generator / Searcher 算法

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

本文说明 `gen3static` Generator 与 Searcher 的计算规则。实现对齐 PokeFinder 4.3.2 `StaticGenerator3`、`StaticSearcher3` 与 `LCRNGReverse::recoverPokeRNGIV`；浏览器编排使用同一版本化 Wasm 模块的两个独立 Worker Pool。

## 1. PokeRNG

第三世代定点乱数使用 32 位线性同余 RNG：

```text
state[n + 1] = (state[n] * 0x41C64E6D + 0x6073) mod 2^32
output16 = state[n + 1] >> 16
```

`PokeRNGR` 使用对应逆变换向前追溯 PID 和候选初始 Seed。所有乘法和加法都按无符号 32 位回绕。

## 2. Generator 推进

Generator 先把 Seed 推进 `Initial Advances + Offset` 次。每个候选帧复制当前基准状态完成 PID 和 IV 计算，随后外层基准状态推进一次。

结果中的 Advances 为：

```text
Initial Advances + candidateIndex
```

`Offset` 参与 RNG 定位，但不加到显示帧数中。这一语义与 PokeFinder 保持一致。

## 3. PID

Generator 从候选状态连续读取两个 16 位输出，先低位、后高位：

```text
pidLow  = nextUShort()
pidHigh = nextUShort()
PID = pidLow OR (pidHigh << 16)
```

Searcher 从 IV 状态反向恢复后使用 `PokeRNGR`，按上游顺序先恢复 PID 高 16 位，再恢复低 16 位。

## 4. Method 1 与 Method 4

PID 之后读取第一组 IV 随机数 `iv1`：

```text
Method 1: iv1 = nextUShort(); iv2 = nextUShort()
Method 4: iv1 = nextUShort(); skip one RNG advance; iv2 = nextUShort()
```

两种方法的 PID 读取方式相同，差异只在两组 IV 随机数之间是否跳过一次推进。

六项 IV 的位布局为：

```text
HP  =  iv1        AND 31
Atk = (iv1 >> 5)  AND 31
Def = (iv1 >> 10) AND 31
SpA = (iv2 >> 5)  AND 31
SpD = (iv2 >> 10) AND 31
Spe =  iv2        AND 31
```

## 5. 游走宝可梦 IV 缺陷

第三世代红蓝宝石的 Latios/Latias 游走个体存在 IV 读取缺陷。PokeFinder 的兼容规则是：

```text
iv1 = nextUShort() AND 0x00FF
iv2 = 0
```

因此只有 `iv1` 的低 8 位保留，其余位与第二组 IV 都为零。当前预设对 Latios、Latias 启用此规则，并限制为 Method 1。

Searcher 仍按用户输入的完整六项 IV 组合恢复原 RNG 状态，再按缺陷规则显示 `HP / (Atk AND 7) / 0 / 0 / 0 / 0`，与上游 `StaticSearcher3::search` 一致。

## 6. 性格、特性与性别

这些属性直接由 PID 和物种性别阈值计算：

```text
Nature  = PID mod 25
Ability slot  = PID AND 1
Ability index = PersonalInfo.abilities[Ability slot]
```

筛选仍使用 PokeFinder 的特性槽位 `Any / 0 / 1`。结果列则按 `Model/Gen3/StaticModel3.cpp` 显示为 `槽位: 特性名称`：先使用物种和形态从 `personal_rsefrlg.bin` 读取特性 ID，再从 PokeFinder 的 `abilities_en.txt`、`abilities_zh.txt` 或 `abilities_ja.txt` 读取当前界面语言的名称。单特性宝可梦由个人数据决定两个槽位对应的特性，不在界面层猜测或合并。每次计算开始时固定当次 Personal 数据，之后切换预设不会重新解释已有结果。

性别使用 PID 最低 8 位：

- 阈值 `255`：无性别。
- 阈值 `254`：固定雌性。
- 阈值 `0`：固定雄性。
- 其他阈值：`(PID AND 0xFF) < threshold` 为雌性，否则为雄性。

## 7. 闪光

第三世代定点闪光判断使用未右移的训练家异或值：

```text
trainerXor = TID XOR SID
pidXor = (PID >> 16) XOR (PID AND 0xFFFF)
shinyXor = trainerXor XOR pidXor
```

- `shinyXor == 0`：Square。
- `shinyXor < 8`：Star。
- 其他：非闪光。

ID 模块展示的 `TSV = (TID XOR SID) >> 3` 不能直接代入这里。

## 8. Searcher 反向恢复

Searcher 不扫描完整 `2^32` Seed 空间，而是枚举筛选区间内的六项 IV 笛卡尔积。组合索引按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 展开，TypeScript 可以把连续索引范围稳定拆给多个 Worker。

每组 IV 先重新打包为两个 15 位观测值。反向恢复使用上游 `LCRNGReverse::recoverPokeRNGIV` 的整数关系：

- Method 1 根据相邻两次 IV 输出恢复最多 6 个候选 RNG 状态。
- Method 4 根据中间跳过一次推进的关系恢复最多 4 个候选 RNG 状态。
- 15 位 IV 观测缺少最高位，因此每个有效低位候选同时检查相差 `0x80000000` 的状态。

对每个候选状态使用 `PokeRNGR` 反向读取 PID，再计算性格、特性、性别和闪光并应用筛选。通过筛选后继续反推一次，得到结果表中的 Seed。

Searcher 结果第一列是 Seed；Generator 结果第一列是 Advances。两者复用 48 字节 C ABI 记录时，只改变第一个 32 位字段的语义。

## 9. 筛选与快捷设置

IV、性格、觉醒力量、特性、性别和异色筛选在 C++ bridge 中执行，不会改变 RNG 序列或候选 Seed。`gen3static` API 3 使用 25 位性格掩码和 16 位觉醒力量掩码；界面没有勾选或全部勾选时均按 PokeFinder `CheckList` 的 `Any` 语义提交完整掩码。

筛选器布局复用上游 `Form/Controls/Filter.ui`：桌面端左侧放六项 IV 与工具，右侧以紧凑行排列 Ability、Gender、Hidden Power、Nature、Shiny；窄屏降为单列。该结构与 `gen3wild` 复用同一 React 多选控件和网格，Wild 仅在上游对应位置额外插入 Encounter Slot 与 Level。

筛选控件已逐项对照 `Filter.ui` 与 `CheckList.cpp`：

- 性格和觉醒力量为多选。
- 定点与野生共用的多选控件均支持 `Ctrl + Click` 一键清空勾选，显示和请求都回到 `Any` 语义。
- 异色只有 `Any`、`Star`、`Square`、`Star/Square`。
- 性别只有 `Any`、`Male`、`Female`；无性别只作为结果值显示，不是筛选项。
- 特性只有 `Any`、`0`、`1`。
- `Show Stats` 在结果表的六项 IV 与按物种、等级、性格计算的能力值之间切换。
- Generator 的“取消筛选”将全部筛选替换为显式任意范围；Searcher 必须保留 IV 范围，因为它定义反向搜索空间。

IV 名称按钮复用 PokeFinder `Filter.cpp` 行为：

```text
Click:          0..31
Ctrl+Click:    31..31
Alt+Click:     30..31
Ctrl+Alt+Click: 0..0
```

## 10. 觉醒力量

第三世代觉醒属性使用六项 IV 最低位，觉醒威力使用次低位。位顺序为 `HP, Atk, Def, Spe, SpA, SpD`：

```text
typeBits  = sum((IV[i] AND 1) << bit)
powerBits = sum(((IV[i] >> 1) AND 1) << bit)

typeIndex = floor(typeBits * 15 / 63)
power     = 30 + floor(powerBits * 40 / 63)
```

属性索引按第三世代顺序从 Fighting 到 Dark，共 16 种。该计算只依赖结果 IV，在 TypeScript 展示层执行，不改变 Wasm RNG 结果。

## 11. 输入限制

输入限制已对照 PokeFinder `Form/Controls/TextBox.cpp`、`Form/Gen3/Static3.cpp` 和 `Form/Controls/Filter.cpp`：

| 输入             | 上游类型与范围                               | Web 行为                                 |
| ---------------- | -------------------------------------------- | ---------------------------------------- |
| Seed             | `Seed32Bit`，`0..0xFFFFFFFF`，8 位十六进制   | 空输入解析为 `0`；只保留十六进制并转大写 |
| Initial Advances | `Advance32Bit`，`0..4294967295`，10 位十进制 | 只保留十进制                             |
| Max Advances     | `Advance32Bit`，`0..4294967295`，10 位十进制 | 含起点；浏览器任务最多 50,000,000 状态   |
| Offset           | `Advance32Bit`，`0..4294967295`，10 位十进制 | 只保留十进制                             |
| TID / SID        | `TIDSID`，`0..65535`，5 位十进制             | 从当前存档信息读取                       |
| IV min / max     | `0..31`                                      | 最小值不得大于最大值                     |
| Nature           | `CheckList`，25 项多选                       | API 3 使用 25 位掩码；空选择按完整掩码   |
| Hidden Power     | `CheckList`，16 项多选                       | API 3 使用 16 位掩码；空选择按完整掩码   |

Generator 还要求 `Initial Advances + Offset + Max Advances <= 0xFFFFFFFF`。Searcher 的 IV 组合总数不得超过 50,000,000；Web 初始值为六项 `31..31`，保证首次检索可以运行，用户仍可按上游范围规则扩大搜索空间。每次 C ABI 调用最多处理 100,000 个状态或 IV 组合。

## 12. 结果与固定夹具

Generator 的 Seed `0x12345678`、Advances `0` 基线：

```text
PID:           0x84EA0B71
Method 1 IVs:  10 / 12 / 22 / 7 / 29 / 0
Method 4 IVs:  10 / 12 / 22 / 20 / 9 / 4
Roamer IVs:    10 / 4 / 0 / 0 / 0 / 0
Nature index:  15
```

Searcher 的 Groudon、Method 4、`31/31/31/31/31/31` 固定夹具恢复 4 个候选结果。

当前界面包含 PokeFinder 第三世代掌机 Static 的 67 条模板，按 `Starters / Fossils / Gifts / Game Corner / Stationary / Legends / Events / Roamers` 八类组织。分类与宝可梦为独立下拉框，并按当前存档的 Ruby、Sapphire、FireRed、LeafGreen 或 Emerald 版本过滤：Game Corner 只在 FRLG 显示，Events 在 Ruby/Sapphire 隐藏。Bugged Roamer 隐藏 Method 4 并强制 Method 1。

模板数据包含版本、物种、形态、等级和游走缺陷标志，性别阈值与两个特性 ID 来自 `personal_rsefrlg.bin`。物种名称、Deoxys 形态与特性名称使用上游简体中文、英文和日文资源；不包含官方美术素材。

## 13. Web 执行边界

Generator 按 Advances 范围分片，Searcher 按 IV 组合索引分片，每片最多 100,000。两个 Pool 都使用多个独立单线程 Wasm 实例，以 `chunkIndex` 恢复批次顺序，并通过 transferable `ArrayBuffer` 返回结果。

Worker Pool、批次排序、进度、取消和 250,000 条结果上限属于浏览器编排层，不属于 RNG 算法；调整 Worker 数量不能改变相同输入对应的结果内容。

## 14. 上游与验证入口

主要上游文件：

- `Core/Gen3/Generators/StaticGenerator3.cpp`
- `Core/Gen3/Searchers/StaticSearcher3.cpp`
- `Core/RNG/LCRNGReverse.hpp`
- `Form/Gen3/Static3.cpp`
- `Form/Gen3/Static3.ui`
- `Model/Gen3/StaticModel3.cpp`
- `Form/Controls/Filter.cpp`
- `Form/Controls/Filter.ui`
- `Form/Controls/CheckList.cpp`
- `Form/Controls/TextBox.cpp`
- `Core/Resources/Embed/embed_gen3.py`
- `Core/Resources/Embed/embed_personal.py`
- `Core/Resources/i18n/{en,zh,ja}/abilities_*.txt`

仓库验证入口：

- C++ Generator/Searcher 固定夹具：`wasm/modules/gen3static/tests/static3_native_test.cpp`
- TypeScript 边界与觉醒力量：`src/features/static/domain.test.ts`
- UI 预览：`src/features/static/preview/Gen3StaticUiPreviewEngine.test.ts`
- 上游来源与校验和：`third_party/pokefinder/UPSTREAM.md`

运行：

```bash
npm run wasm:test:native
npm test
```
