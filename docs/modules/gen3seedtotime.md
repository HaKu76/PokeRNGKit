# Gen 3 Seed to Time

`gen3seedtotime` 对应 PokeFinder 4.3.2 的 `SeedToTime3`。它将第三世代的 16 位初始 Seed 映射为指定年份中可产生该 Seed 的日期和分钟；输入 32 位 PokeRNG 状态时，会先使用 PokeRNGR 回推到最接近的 16 位初始 Seed，并显示回推帧数。

## 范围

- 仅实现 PokeFinder `Gen 3 Seed to Time`。
- 输入 `16/32-Bit Seed` 与 `Year`，点击 `Find` 后显示 `Time` 列并更新只读的 `Advances`。
- 输入超过 `0xFFFF` 时，界面将 Seed 回写为上游计算出的十六进制原始 Seed，不填充前导零；16 位输入保持原值。
- 不包含第四世代 `SeedToTime4`、RTC 校准、延迟搜索或存档读写。

## 上游行为

1. `calculateOriginSeed()` 用 `PokeRNGR` 连续逆推，直到状态不大于 `0xFFFF`；推进次数写入只读 `Advances`。
2. `calculateTimes()` 按日期、小时、分钟升序枚举一年中的每一分钟，计算游戏的 Seed 值并与 16 位原始 Seed 比较。
3. 年份大于 `2000` 时，保留游戏少算该年份天数的上游日历缺陷：总天数减去 `366`。

生产算法只在 `wasm/modules/gen3seedtotime` 编译出的 Wasm 内运行，且仅由单独的 Dedicated Worker 调用。React 负责输入规范化、状态呈现、结果格式化和取消；不会在 TypeScript 主线程复制 RNG 或时间枚举算法。

## 输入限制

| 控件             | 进制与范围                 | 宽度                          | 空值                                                             | 上游来源                                                                                 |
| ---------------- | -------------------------- | ----------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `16/32-Bit Seed` | 十六进制 `0..0xFFFFFFFF`   | 最多 8 位（可输入 `0x` 前缀） | `TextBox::getUInt()` 解释为 `0`                                  | `Form/Gen3/Tools/SeedToTime3.cpp`、`Form/Controls/TextBox.cpp` 的 `InputType::Seed32Bit` |
| `Year`           | 十进制 `2000..2037`        | 最多 4 位                     | Qt 空文本会转换为 `0`；Web 表单拒绝空值，避免把无效年份传入 Wasm | `Form/Gen3/Tools/SeedToTime3.cpp`                                                        |
| `Advances`       | 只读无符号十进制结果文本框 | 不适用                        | 计算前为空                                                       | `Form/Gen3/Tools/SeedToTime3.ui`、`Form/Gen3/Tools/SeedToTime3.cpp`                      |

简体中文界面逐字复用 `PokeFinder_zh.ts`：`第三世代Seed查询时间`、`16/32位Seed`、`年份`、`帧数`、`查找`、`时间`。`PokeFinder_ja.ts` 的对应词条均为 unfinished，因此日文界面按项目规则保留英文源标签。

## Wasm 与 Worker

- 模块：`wasm/modules/gen3seedtotime`，API v1。
- 单次任务只运行一个 Worker/Wasm 实例；全年最多枚举 `366 * 24 * 60 = 527040` 个分钟，无需多 Worker 分片。
- C ABI 接收两个 `uint32_t`，返回连续 20 字节记录 `year / month / day / hour / minute`；原始 Seed 与回推帧数通过独立 `uint32_t` getter 读取。
- Worker 在下一次 Wasm 调用前拷贝并转移 `ArrayBuffer`，并验证结果个数、字对齐与堆边界。取消会终止当前 Worker，不接收迟到结果。

```c
uint32_t gen3seedtotime_api_version();
uint32_t gen3seedtotime_calculate(uint32_t seed, uint32_t year);
uint32_t gen3seedtotime_origin_seed();
uint32_t gen3seedtotime_advances();
uintptr_t gen3seedtotime_result_ptr();
uint32_t gen3seedtotime_result_count();
uint32_t gen3seedtotime_last_error();
```

## 固定夹具与验收

原生夹具 `wasm/modules/gen3seedtotime/tests/seed_to_time_native_test.cpp` 逐条记录 PokeFinder `Test/Gen3/seedtotime3.json` 的四组时间表和四组 32 位回推结果。其中包括：

- Seed `00000000`、Year `2000` 返回 7 个结果；首条为 `2000-03-30 18:22:00`，末条为 `2000-12-29 02:10:00`。
- Seed `40000000` 先回推为原始 Seed `1AA5`，帧数 `66861`。
- Seed `80000000` 回推为 `19CB` / `10055`，Seed `C0000000` 回推为 `672C` / `44340`。
- Year `1999` 与 `2038` 必须被 C ABI 拒绝。

已添加 TypeScript domain 边界和结果布局测试、原生固定夹具。2026-08-13 经项目所有者授权，使用外部 Chrome 对 `https://haku76.github.io/PokeRNGKit/` 的生产资源 `index-mLBsBTQF.js` 回归真实 Wasm：Seed `0` / Year `2000` 返回 7 条，首条 `2000-03-30 18:22:00`、末条 `2000-12-29 02:10:00`；Seed `40000000` 回写为 `1AA5`，Advances 为 `66861`。其余 32 位回推夹具、非法年份、取消和项目所有者最终验收仍待完成。

## 来源与许可证

- [PokeFinder 4.3.2](https://github.com/Admiral-Fish/PokeFinder)，GPL-3.0-or-later：`Core/Gen3/Tools/SeedToTimeCalculator3.*`、`Form/Gen3/Tools/SeedToTime3.*`、`Model/Gen3/SeedToTimeModel3.*`、`Test/Gen3/seedtotime3.json`。
- 日期实现与测试显示格式核对 `Core/Util/DateTime.*`。
- 文件 SHA-256 与构建输入边界记录于 [UPSTREAM.md](../../third_party/pokefinder/UPSTREAM.md)。
