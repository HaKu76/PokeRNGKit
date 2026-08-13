# 第三世代 PokeSpot

`gen3pokespot` 对应 PokeFinder 4.3.2 的 XD `PokeSpot` Generator。Food RNG 先产生有效的 PokeSpot 食物调用，Encounter RNG 再为每个食物状态生成等级、IV、能力和筛选结果。

## 上游范围

- Form：`Form/Gen3/Tools/PokeSpot.cpp`、`Form/Gen3/Tools/PokeSpot.ui`
- Core：`Core/Gen3/Generators/PokeSpotGenerator.cpp/.hpp`、`Core/Gen3/States/PokeSpotState.hpp`、`Core/Parents/EncounterArea.hpp`
- 数据：EncounterTableGenerator `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 `Gen3/xd/pokespot.bin`
- 翻译：`Form/i18n/PokeFinder_zh.ts`
- 固定夹具：`Test/Gen3/PokeSpotGeneratorTest.cpp`

简体中文标题使用 `宝可地点`，已完成的 `生成`、`位置`、`宝可梦`、`性格`、`特性`、`性别`、`闪光`、`个体值` 等词条逐字复用。`Seed (Food / Encounter)`、`Food Advances`、`Encounter Advances`、`Offset (Food / Encounter)` 在上游为 unfinished，因此保留英文源字符串；每行按上游布局提供 Food/Encounter 两个输入框。

## 输入限制

| 输入                                        | 上游设置                         | Web/domain 限制                                    |
| ------------------------------------------- | -------------------------------- | -------------------------------------------------- |
| Food/Encounter Seed                         | `InputType::Seed32Bit`           | 十六进制 `0..0xFFFFFFFF`，最多 8 位；空值为 `0`    |
| Food/Encounter Initial/Max Advances、Offset | `InputType::Advance32Bit`        | 十进制 `0..0xFFFFFFFF`，最多 10 位；空值为 `0`     |
| Location                                    | PokeFinder 三个 XD PokeSpot 区域 | `0..2`                                             |
| TID/SID                                     | `Profile3` / `InputType::TIDSID` | 十进制 `0..65535`，最多 5 位；空值为 `0`           |
| IV 筛选                                     | `WildStateFilter`                | 每项最小/最大 `0..31`，且最小值不大于最大值        |
| Nature/Hidden Power/Slot                    | `Filter`                         | 非空掩码分别为 `1..0x1FFFFFF`、`1..0xFFFF`、`1..7` |

上游默认 Food 和 Encounter Max Advances 都是 `10000`，因此默认闭区间组合数为 `(10000 + 1)^2 = 100020001`。domain 拒绝超过该组合上限、任一轴的 `Initial + Offset + Max` 溢出 `uint32_t` 的请求。Worker 按 Food 轴拆分约一百万组合的分片，最多使用 8 个独立 Worker，按 `chunkIndex` 恢复结果顺序；已中止的请求不会创建 Worker。

## Wasm/Worker ABI

API v1 的 `gen3pokespot_generate` 接收固定 29 个 `uint32_t` 参数。每条结果为 16 个 `uint32_t`：`foodAdvances / encounterAdvances / pid / species / slot / 六项 IV / ability / gender / level / nature / shiny`。单次调用最多返回 250000 条；错误码 `2` 表示达到结果上限。Worker 检查 API 版本、结果数量、缓冲区长度和每个字段的合法范围。

## 验证状态

已加入 `wasm/modules/gen3pokespot/tests/pokespot_native_test.cpp`，覆盖 Food/Encounter 闭区间结果及首末记录。按仓库规则，本轮未运行原生夹具、Wasm 构建、TypeScript、性能或浏览器回归；默认一亿组合的实际耗时与移动设备 Worker 数量需部署后评估。

来源 revision、二进制 SHA-256 和 GPL 归属见 [`third_party/pokefinder/UPSTREAM.md`](../../third_party/pokefinder/UPSTREAM.md)。
