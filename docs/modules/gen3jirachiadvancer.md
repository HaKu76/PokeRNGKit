# 第三世代 Jirachi Advancer

`gen3jirachi` 对应 PokeFinder 4.3.2 的 `Jirachi Advancer`。模块将起始 Seed、目标 Seed、最大帧数和暴力搜索范围转换为 Channel Jirachi 菜单操作序列。

## 上游范围

- Form：`Form/Gen3/Tools/JirachiAdvancer.cpp`、`Form/Gen3/Tools/JirachiAdvancer.ui`
- Core：`Core/Gen3/Tools/JirachiPattern.cpp/.hpp`、`Core/RNG/LCRNG.hpp`
- 翻译：`Form/i18n/PokeFinder_zh.ts`
- 固定夹具：`Test/Gen3/JirachiPatternTest.cpp`

简体中文标题使用 `基拉祈帧数查询`；`起始Seed`、`目标Seed`、`最大帧数`、`生成`、`无效帧数`、`无效目标` 使用已完成词条。`Brute Force Range`、`Target is outside of specified advance range`、`Target seed is unobtainable` 在上游为 unfinished，Web 保留英文源字符串。操作 `Reload menu`、`Reject Jirachi`、`Special Cutscene`、`Accept Jirachi` 同样保留上游英文；上游的直接接受哨兵 `255` 在 domain 解码为最终操作 `3`。

## 输入限制

| 输入              | 上游设置                  | Web/domain 限制                                 |
| ----------------- | ------------------------- | ----------------------------------------------- |
| Starting Seed     | `InputType::Seed32Bit`    | 十六进制 `0..0xFFFFFFFF`，最多 8 位；空值为 `0` |
| Target Seed       | `InputType::Seed32Bit`    | 十六进制 `0..0xFFFFFFFF`，最多 8 位；空值为 `0` |
| Max Advances      | `InputType::Advance32Bit` | 十进制 `0..0xFFFFFFFF`，最多 10 位；空值为 `0`  |
| Brute Force Range | `InputType::Advance32Bit` | 十进制 `0..0xFFFFFFFF`，最多 10 位；空值为 `0`  |

目标 Seed 先按上游 `computeJirachiSeed()` 经过菜单和接受 Jirachi 调用转换，再用 `XDRNG::distance()` 得到目标帧。若超过最大帧数返回 `outsideRange`；找不到操作序列返回 `unobtainable`。

## Wasm/Worker ABI

API v1：

```cpp
uint32_t gen3jirachi_calculate(uint32_t startingSeed, uint32_t targetSeed,
                               uint32_t maxAdvances, uint32_t bruteForceRange);
uint32_t gen3jirachi_target_advances();
uintptr_t gen3jirachi_result_ptr();
uint32_t gen3jirachi_result_count();
uint32_t gen3jirachi_last_error();
```

结果缓冲区是操作编码的 `uint32_t` 数组：`0=Reload menu`、`1=Reject Jirachi`、`2=Special Cutscene`、`3=Accept Jirachi`。Worker 校验 API 版本、错误码、结果数量、对齐和堆范围；单次计算使用一个 Dedicated Worker，避免阻塞 UI。

## 验证状态

已加入 `wasm/modules/gen3jirachi/tests/jirachi_native_test.cpp`，覆盖 API 版本、`compute_seed` 固定值和不可获得目标。按仓库授权规则，本轮未运行原生夹具、Wasm 构建、TypeScript 或浏览器回归。

上游算法与 SHA-256 记录见 [`third_party/pokefinder/UPSTREAM.md`](../../third_party/pokefinder/UPSTREAM.md)。
