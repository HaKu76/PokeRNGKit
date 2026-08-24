# 第三世代 ID 乱数算法

本文说明 `gen3id` Generator/Searcher 的计算边界。Generator 以 PokeFinder 4.3.2 的 `IDGenerator3` 和 `Utilities3::calcSeed` 为核验基线；红蓝宝石 ID Searcher 以 `HaKu76/RS-TID-SID-Frame-Finder_CHN` 为行为参考，并使用 PokeFinder 的 PokeRNG/PokeRNGR 参数独立实现。TypeScript 只负责输入、Worker 调度和结果解码。

## 1. 线性同余随机数

第三世代主机游戏使用 32 位线性同余随机数。每次推进都按无符号 32 位整数溢出：

```text
state[n + 1] = (state[n] * multiplier + addend) mod 2^32
output16 = state[n + 1] >> 16
```

两种生成器的参数不同：

| 生成器  | multiplier   | addend     | 使用场景                    |
| ------- | ------------ | ---------- | --------------------------- |
| PokeRNG | `0x41C64E6D` | `0x6073`   | 火红/叶绿/绿宝石、红/蓝宝石 |
| XDRNG   | `0x000343FD` | `0x269EC3` | XD/竞技场                   |

Searcher 使用逆向生成器 PokeRNGR，参数为 multiplier `0xEEB9EB65`、addend `0x0A3561A1`。

`Initial Advances` 先把初始状态推进指定次数。`Max Advances` 是包含起点的最大偏移，因此结果状态数为 `Max Advances + 1`。

## 2. XD / 竞技场

每个候选帧先复制当前 XDRNG 状态，再依次取两个 16 位输出：

```text
TID = nextUShort()
SID = nextUShort()
```

外层基准状态每个候选只推进一次，所以相邻候选帧会重叠使用随机数序列；这与 PokeFinder `generateXDColo` 保持一致。

## 3. 火红 / 叶绿 / 绿宝石

输入 TID 本身作为 PokeRNG 初始状态的低 16 位值：

```text
rng = PokeRNG(TID, Initial Advances)
SID = rng.nextUShort()
```

TID 在所有结果中保持不变，每个候选通过一次 `nextUShort()` 生成 SID 并推进到下一帧。

## 4. 红宝石 / 蓝宝石

每个候选帧复制当前 PokeRNG 状态，再按 SID、TID 的顺序读取：

```text
SID = nextUShort()
TID = nextUShort()
```

外层基准状态每个候选推进一次，因此候选帧同样是滑动窗口，而不是每行独立消耗两个随机数。

### 4.1 红蓝宝石 ID Searcher

Searcher 已知 TID 与 SID 时，枚举 SID 状态的低 16 位，找到满足下一次 PokeRNG 高 16 位等于 TID 的状态。随后先逆推到生成 SID 前的状态，再持续逆推，直到状态不大于 `0xFFFF`：

```text
SID state -> reverse once -> candidate frame state
while state > 0xFFFF: state = PokeRNGR.next(), frame++
initial Seed = state
```

恢复到的逆推次数就是 Generator 中同一 ID 组合的帧数。一个 TID/SID 组合可能有多组 Seed，也可能无解；无解时返回空结果。

PID 模式先计算 PID 两半的异或值，再枚举八个可使该 PID 闪光的 SID：

```text
xor = PID.high XOR PID.low
baseSID = (xor XOR TID) AND 0xFFF8
candidateSID = baseSID .. baseSID + 7
```

当 `TID XOR SID` 等于 PID 两半异或值时显示“方块闪”，其余候选显示“星闪”。Searcher 只返回能映射到 2000 年第一组日期时间的 Seed，与参考程序当前枚举范围一致；无法映射日期的候选会被跳过，不访问空数组。

## 5. TSV

ID 模块展示的 Trainer Shiny Value 为：

```text
TSV = (TID XOR SID) >> 3
```

结果范围是 `0..8191`。定点模块判断第三世代闪光时使用未右移的 `TID XOR SID` 与 PID 两半异或值比较；两处数值名称相近，但不能混用。

## 6. 红蓝宝石日期时间转 Seed

PokeFinder 的日期时间算法不使用秒。令 `d` 为其日期类计算出的年度日序，`h` 为小时，`m` 为分钟：

```text
value = 1440 * d
      + 960 * floor(h / 10)
      + 60 * (h mod 10)
      + 16 * floor(m / 10)
      + (m mod 10)

seed = ((value >> 16) XOR (value AND 0xFFFF)) AND 0xFFFF
```

当前 Web 实现把可验证范围限制为 `2000..2099`，并使用本地日期时间字段复现同一公式。示例：

```text
2000-01-01 00:00 -> 0x05A0
2000-01-02 00:00 -> 0x0B40
```

红蓝宝石实时时钟电池耗尽时使用固定 Seed `0x05A0`。界面启用“无电池”后不再读取日期时间或手动 Seed。

## 7. 输入限制

输入限制已对照 PokeFinder `Form/Controls/TextBox.cpp`、`Form/Gen3/IDs3.cpp` 与 `Form/Controls/DateTimeEdit.cpp`：

| 输入                   | 上游类型与范围                               | Web 行为                                 |
| ---------------------- | -------------------------------------------- | ---------------------------------------- |
| XD / Colosseum Seed    | `Seed32Bit`，`0..0xFFFFFFFF`，8 位十六进制   | 空输入解析为 `0`；只保留十六进制并转大写 |
| FR/LG/E TID            | `TIDSID`，`0..65535`，5 位十进制             | 只保留十进制                             |
| R/S Seed               | `Seed16Bit`，`0..0xFFFF`，4 位十六进制       | 空输入解析为 `0`；只保留十六进制并转大写 |
| Initial / Max Advances | `Advance32Bit`，`0..4294967295`，10 位十进制 | 两者相加不得超过 `0xFFFFFFFF`            |
| TID / SID 筛选         | `0..65535`                                   | 空输入表示不筛选                         |
| TSV 筛选               | `0..8191`                                    | 空输入表示不筛选                         |
| R/S 日期时间           | `2000-01-01 00:00:00..2099-12-31 23:59:59`   | 当前 Web 控件精确到分钟                  |
| Searcher TID / SID     | C# `uint.Parse`；游戏值 `0..65535`           | 5 位十进制；domain 同步校验              |
| Searcher PID           | C# 十六进制 `uint.Parse`，`0..0xFFFFFFFF`    | 8 位十六进制；显示固定 `0x` 前缀         |

Max Advances 包含起点，浏览器单次任务最多处理 50,000,000 个状态；每次 C ABI 调用最多 100,000 个状态。

Searcher 控件文本核对自参考项目 `RNGRecovertest/Form1.Designer.cs`：`TID：`、`SID：`、`PID：`、`计算`，结果列为 Seed、帧数、TID、SID、TSV、异色、日期。原 WinForms 的 TID/SID 输入虽然使用 `uint.Parse`，Web 端按游戏与 C ABI 的 16 位类型收紧为 `0..65535`。

## 8. Web 执行边界

TypeScript 把大范围拆成最多 100,000 个状态的分片，并交给多个独立 Worker/Wasm 实例。分片只改变任务调度，不改变初始状态、推进序号或 ID 生成顺序；结果按 `chunkIndex` 恢复为确定顺序。

`gen3id` API v3 在原 `gen3id_generate` 之外增加 `gen3id_search`，并为 Generator 增加目标 PID、星闪/方块闪和兼容 TSV 过滤。Searcher 使用独立 `Gen3IdSearcherWorkerPool` 和单个 Worker；搜索规模最多为八个 SID 候选，无需分片或多 Worker。取消会终止 Worker，下一任务重新初始化。Generator 返回记录固定为 12 字节，第三个 word 的低 16 位是 TSV，高 16 位是目标 PID 下的闪光类型（`0` 普通、`1` 星闪、`2` 方块闪）：

```text
uint32 advances / tidSID / tsvShiny

其中目标 PID 过滤只在 Generator 请求带有 PID 时启用；TID/SID/TSV 仍然是独立的精确筛选。TSV 仍按 `(TID XOR SID) >> 3` 计算，不能把 TSV 直接代入 PID 闪光判定。
```

日期字段由 Wasm 返回结构化整数，TypeScript 只负责显示与 CSV，不重复日期反查算法。

## 9. 验证入口

- C++ 固定夹具：`wasm/modules/gen3id/tests/id3_native_test.cpp`
- TypeScript 边界测试：`src/features/id/domain.test.ts`
- 输入规范化：`src/input.test.ts`
- 上游来源与校验和：`third_party/pokefinder/UPSTREAM.md`

Searcher 固定夹具：

```text
TID 48163 + SID 64377
-> Seed 05A0, Frame 0, 2000-01-01 00:00
-> Seed C19B, Frame 36724, 2000-02-02 22:03

TID 4 + SID 0 -> 0 results
```

运行：

```bash
npm run wasm:test:native
npm test
```
