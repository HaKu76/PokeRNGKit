# 第三世代 Static Generator 算法

本文说明 `gen3static` 当前 Generator 的计算规则。实现对齐 PokeFinder 4.3.2 `StaticGenerator3::generate`；Static Searcher 尚未实现。

## 1. 输入与推进

定点生成使用第三世代 PokeRNG：

```text
state[n + 1] = (state[n] * 0x41C64E6D + 0x6073) mod 2^32
output16 = state[n + 1] >> 16
```

生成器先把 Seed 推进 `Initial Advances + Offset` 次。每个候选帧复制当前基准状态完成 PID 和 IV 计算，随后外层基准状态推进一次。

结果中的 Advances 为：

```text
Initial Advances + candidateIndex
```

`Offset` 参与 RNG 定位，但不加到显示帧数中。这一语义与 PokeFinder 保持一致。

## 2. PID

从候选状态连续读取两个 16 位输出，先低位、后高位：

```text
pidLow  = nextUShort()
pidHigh = nextUShort()
PID = pidLow OR (pidHigh << 16)
```

## 3. Method 1 与 Method 4

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

## 4. 游走宝可梦 IV 缺陷

第三世代红蓝宝石的 Latios/Latias 游走个体存在 IV 读取缺陷。PokeFinder 的兼容规则是：

```text
iv1 = nextUShort() AND 0x00FF
iv2 = 0
```

因此只有 `iv1` 的低 8 位保留，其余位与第二组 IV 都为零。当前预设对 Latios、Latias 启用此规则，并限制为 Method 1。

## 5. 性格、特性与性别

这些属性直接由 PID 和物种性别阈值计算：

```text
Nature  = PID mod 25
Ability = PID AND 1
```

性别使用 PID 最低 8 位：

- 阈值 `255`：无性别。
- 阈值 `254`：固定雌性。
- 阈值 `0`：固定雄性。
- 其他阈值：`(PID AND 0xFF) < threshold` 为雌性，否则为雄性。

## 6. 闪光

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

## 7. 筛选与结果

IV、性格、特性、性别和闪光筛选在 C++ bridge 中对生成后的状态执行，不会反向改变 RNG 序列。每条结果以 48 字节定长记录返回，包含 Advances、PID、六项 IV、特性槽、性别、等级、性格和闪光类型。

当前内置首批预设：Mewtwo、Rayquaza、Regirock、Regice、Registeel、Deoxys、Latios、Latias。预设只提供物种、等级、性别阈值和游走缺陷参数，不包含官方美术素材。

## 8. 固定夹具

Seed `0x12345678`、Advances `0` 的基线结果：

```text
PID:           0x84EA0B71
Method 1 IVs:  10 / 12 / 22 / 7 / 29 / 0
Method 4 IVs:  10 / 12 / 22 / 20 / 9 / 4
Roamer IVs:    10 / 4 / 0 / 0 / 0 / 0
Nature index:  15
```

## 9. Web 执行边界

TypeScript 将范围拆成最多 100,000 个状态的分片。Worker Pool、批次排序、进度、取消和结果上限属于浏览器编排层，不属于 RNG 算法；调整 Worker 数量不能改变相同输入对应的状态内容与顺序。

## 10. 验证入口

- C++ 固定夹具：`wasm/modules/gen3static/tests/static3_native_test.cpp`
- TypeScript 边界测试：`src/features/static/domain.test.ts`
- UI 预览测试：`src/features/static/preview/Gen3StaticUiPreviewEngine.test.ts`
- 上游来源与校验和：`third_party/pokefinder/UPSTREAM.md`

运行：

```bash
npm run wasm:test:native
npm test
```
