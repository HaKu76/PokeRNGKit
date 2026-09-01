# 第三世代 Static Generator / Searcher 算法

## 界面布局基线

- 本模块是后续 RNG 面板逐项优化的紧凑参考；完整规则记录于 `docs/ui-design.md`。
- 表单输入、单选下拉、多选下拉、模式标签和同行操作按钮统一为 `30px` 高度，垂直
  间距与 IV 行高同步收紧；该密度只在已核对的模块局部启用。
- `haku-select` 与 `multi-check-control` 使用相同触发框几何和状态，展开菜单严格跟随
  实际触发框宽度，不把左侧字段标签计入菜单宽度。
- 页面专属紧凑密度集中在 `src/features/static/Gen3StaticPanel.css`，共享选择器组件不包含
  第三世代模块判断；标题区存档选择、管理按钮和 Portal 下拉选项同步使用 `30px`。
- 中文界面的 Offset 专用标签显示为“校准帧数”，内部请求字段仍保持 `offset`。
- Generator、Searcher、绿宝石新档御三家三个标题区入口固定为单行；空间不足时由入口容器横向
  滚动，不把第三个入口折到下一行。新档 TID 的 Seed 说明与输入框同宽，最多显示两行。

## 绿宝石新档御三家

Generator 页签在游戏版本为 Emerald、分类为 Starters 时提供独立的“绿宝石新档御三家”入口。
普通 Generator/Searcher 的参数语义保持不变；该入口把御三家目标和 ID 检索拆为两个可验证阶段：

- “御三家 Seed”提供 `TID（建档后不重启）`与 `0000（重启后）`两条明确路径。前者对应命名
  确认时读取 Timer 1，把同一个 16 位值写入 TID 并作为 PokeRNG 初始 Seed；后者对应完成 ID
  生成后重启游戏，御三家生成器从 `0x0000` 重新开始，TID/SID 只参与异色判定。
- TID 接受 `0..65535` 的十进制值。TID Seed 路径允许留空：输入 TID 时按该 Seed 快速前向
  扫描，留空时从目标 IV 状态反推所有可行的 16 位 TID。Seed 0000 路径中目标 Seed 与 TID 已
  解耦，因此要求先输入 TID，再由 ID Generator 为目标 PID 检索兼容 SID。
- TID 留空默认检索 `0..1000000` 帧，`Perfect IV Value / Count` 为 `31 / 6`，异色为
  `Star/Square`。异色设为 `Any` 时只要求高 V；设为 Star、Square 或 Star/Square 时，还要求同一
  RNG 流在御三家目标帧之前实际生成过兼容的 SID。
- 结果表显示 TID、御三家帧、完美个体数、PID、标准
  `PSV = ((PID high XOR PID low) >> 3)`、六项 IV 和其他派生字段。每个高 V 异色目标只保留一行，
  不按 8 个原始闪光 XOR 重复展示。
- 点击 PSV 后跳转第三世代 ID Generator，自动带入 TID、PID 与御三家目标帧。ID Generator 只
  在 TID Seed 路径扫描 `0..targetAdvance-1`，按 Star/Square 过滤同一 RNG 流中实际出现的 SID。
  Seed 0000 路径的 ID 生成与重启后的御三家生成属于两段独立 RNG，默认改为扫描 `0..1000000`
  ID 帧，不再错误要求 ID 帧小于御三家帧。两条路径都显示 SID、TSV、异色类型和 ID 帧。
- 从 ID 结果继续返回 Static 时，才带入选定的 TID/SID 和精确御三家帧进行单帧验证。数学上与
  PID 兼容、但未在各自 ID 搜索边界内实际生成的 SID 不会进入这个闭环。Seed 0000 路径会原样
  保留目标 Seed `0x0000`，不会在返回时误写成 TID。

输入 TID 的路径复用 `gen3static_generate`；TID 留空的路径使用 `gen3static_search_emerald`，按 IV
组合拆给独立 Worker，并在 C++ 内反推候选 TID。单批执行量最多 25,000,000 个状态，总任务最多
250,000,000 个状态：`31/5` 与一百万帧为 187,000,187，可执行；`31/4` 与同一范围为
14,602,014,602，会在启动前拒绝并要求提高完美个体数或缩短帧数。

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- UI 预览与生产 Wasm 使用相同的数量判断；预览不再漏掉 Perfect IV 条件。
- Searcher 先将六项 IV 的闭区间与完美个体条件求交，再按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 编号；例如六项 `0..31`、`31/5` 只产生 `187` 个候选，不会按 `32^6` 计数。六项范围和完美条件仍是 AND 关系，不是互斥模式。
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

Searcher 不扫描完整 `2^32` Seed 空间，而是枚举六项 IV 范围与完美个体条件交集后的候选。组合索引按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 展开，TypeScript 与 C++ bridge 使用同一反向索引，因此连续索引范围可以稳定拆给多个 Worker。

每组 IV 先重新打包为两个 15 位观测值。反向恢复使用上游 `LCRNGReverse::recoverPokeRNGIV` 的整数关系：

- Method 1 根据相邻两次 IV 输出恢复最多 6 个候选 RNG 状态。
- Method 4 根据中间跳过一次推进的关系恢复最多 4 个候选 RNG 状态。
- 15 位 IV 观测缺少最高位，因此每个有效低位候选同时检查相差 `0x80000000` 的状态。

对每个候选状态使用 `PokeRNGR` 反向读取 PID，再计算性格、特性、性别和闪光并应用筛选。通过筛选后继续反推一次，得到结果表中的 Seed。

Searcher 结果第一列是 Seed；Generator 结果第一列是 Advances。两者复用 48 字节 C ABI 记录时，只改变第一个 32 位字段的语义。绿宝石新档固定 TID 使用 Generator 记录；空 TID 反推使用 60 字节 Emerald 记录，其中包含目标帧、TID，以及可选的 ID 帧、SID 和闪光 XOR。React 统一由 PID 计算 PSV；第二阶段使用 ID 模块的 12 字节结果记录。

## 9. 筛选与快捷设置

IV、完美个体、性格、觉醒力量、特性、性别和异色筛选在 C++ bridge 中执行，不会改变 RNG 序列或候选 Seed。`gen3static` API 6 使用 25 位性格掩码和 16 位觉醒力量掩码；界面没有勾选或全部勾选时均按 PokeFinder `CheckList` 的 `Any` 语义提交完整掩码。

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
| Nature           | `CheckList`，25 项多选                       | API 6 使用 25 位掩码；空选择按完整掩码   |
| Hidden Power     | `CheckList`，16 项多选                       | API 6 使用 16 位掩码；空选择按完整掩码   |

Generator 还要求 `Initial Advances + Offset + Max Advances <= 0xFFFFFFFF`。Searcher 的交集候选总数不得超过 50,000,000；Web 初始值为六项 `31..31`，保证首次检索可以运行，用户仍可按上游范围规则扩大搜索空间。每次 C ABI 调用最多处理 100,000 个状态或 IV 组合。

绿宝石新档入口复用 TID 的 `0..65535` 十进制边界。TID Seed 下空值表示自动寻找 TID，非空值
同时作为 16 位 Seed；Seed 0000 下 TID 必填，目标 Seed 固定为 `0x0000`。固定 TID 的第一阶段按
Any 生成目标，再由 ID Generator 验证异色；空 TID 的反推路径可用 Any 只找高 V，也可在第一阶段
要求 Star/Square 并验证目标帧之前存在兼容 SID。

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

完美个体边界夹具使用六项 `0..31`、`Perfect IV Value=31`、`Perfect IV Count=5`：索引 `186` 为全 31 并通过，索引 `187` 超出 `187` 个候选并被 C ABI 拒绝。

当前界面包含 PokeFinder 第三世代掌机 Static 的 67 条模板，按 `Starters / Fossils / Gifts / Game Corner / Stationary / Legends / Events / Roamers` 八类组织。分类与宝可梦为独立下拉框，并按当前存档的 Ruby、Sapphire、FireRed、LeafGreen 或 Emerald 版本过滤：Game Corner 只在 FRLG 显示，Events 在 Ruby/Sapphire 隐藏。Bugged Roamer 隐藏 Method 4 并强制 Method 1。

模板数据包含版本、物种、形态、等级和游走缺陷标志，性别阈值与两个特性 ID 来自 `personal_rsefrlg.bin`。物种名称、Deoxys 形态与特性名称使用上游简体中文、英文和日文资源；不包含官方美术素材。

## 13. Web 执行边界

Generator 按 Advances 范围分片，Searcher 按 IV 组合索引分片，每片最多 100,000。绿宝石新档
固定 TID 使用 Generator Pool；TID 留空使用 Emerald Pool，并按每组 IV 的目标帧工作量动态缩小
分片；点击 PSV 后改由 Gen3 ID Pool 扫描 ID 推进。TID Seed 将 ID 推进限制在御三家目标帧之前，
Seed 0000 默认扫描一百万 ID 帧并在返回时继续使用 Seed `0x0000`。各 Pool 都使用独立单线程
Wasm 实例，以 `chunkIndex` 恢复批次顺序，并通过 transferable `ArrayBuffer` 返回结果。

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
- `pret/pokeemerald src/main.c`：`SeedRngAndSetTrainerId`
- `pret/pokeemerald src/new_game.c`：`InitPlayerTrainerId`
- `pret/pokeemerald src/battle_setup.c`：`CB2_GiveStarter`

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

2026-08-25 已通过：`npm run verify`（178 个测试文件、619 项测试、TypeScript 检查和生产 PWA 构建）、`$env:POKERNGKIT_WASM_MODULES='gen3static,gen3wild,gen4static,gen4wild'; npm run wasm:test:native`（4/4 native 夹具）。Lint 保留 `Gen3StaticPanel.tsx:296` 的既有 Hook 依赖 warning；外部浏览器和生产页面回归仍待项目所有者验收。
