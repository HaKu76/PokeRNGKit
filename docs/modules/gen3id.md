# 第三世代 ID 乱数算法

本文说明 `gen3id` 的计算边界。实现以 PokeFinder 4.3.2 的 `IDGenerator3` 和 `Utilities3::calcSeed` 为核验基线；TypeScript 只负责输入、分片、Worker 调度和结果解码。

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

## 7. Web 执行边界

TypeScript 把大范围拆成最多 100,000 个状态的分片，并交给多个独立 Worker/Wasm 实例。分片只改变任务调度，不改变初始状态、推进序号或 ID 生成顺序；结果按 `chunkIndex` 恢复为确定顺序。

## 8. 验证入口

- C++ 固定夹具：`wasm/modules/gen3id/tests/id3_native_test.cpp`
- TypeScript 边界测试：`src/features/id/domain.test.ts`
- 上游来源与校验和：`third_party/pokefinder/UPSTREAM.md`

运行：

```bash
npm run wasm:test:native
npm test
```
