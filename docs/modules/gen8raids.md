# 第八世代团体战乱数

## 功能范围

本模块对应 PokeFinder 4.3.2 `Gen 8 Raids`，仅接受 Sword / Shield Profile。

- 支持 Wild Area、Isle of Armor、Crown Tundra 的 Normal / Rare 巢穴，以及 69 张 Wild Area Event 表。
- 静态数据保留官方 197 张巢穴表、276 个地图巢穴哈希/坐标映射和 `personal_swsh.bin` 的 1192 条个人数据记录。
- 支持 Seed、Initial Advances、Max Advances、Offset、等级、异色/性别/特性/性格/身高/体重/六项 IV 筛选、取消、虚拟滚动、排序和 CSV。
- Template 的 Ability、Gender、Gender Ratio、IV Count、Shiny Type、Gigantamax 为只读；配信 Event 的等级由模板锁定。

## 输入限制

空数字文本按照上游 `TextBox::getUInt()` / `getULong()` 解释为 `0`。HTML 和领域校验同时应用以下边界。

| 输入                   | 范围                                                                                                 | 行为                                                | 上游依据                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| Profile                | Sword / Shield；TID/SID `0..65535`                                                                   | BDSP Profile 拒绝                                   | `Raids.cpp`、`ProfileDisplay8::setup(..., Game::SwSh)`               |
| Seed                   | 十六进制，最多 16 位                                                                                 | 空值 `0`；全零拒绝                                  | `Raids.cpp`、`TextBox.cpp` 的 `Seed64Bit`                            |
| Initial / Max / Offset | 十进制 `uint32_t`，各 `0..4294967295`                                                                | 默认 `0` / `100` / 空；空值为 `0`，三者之和不得溢出 | `Raids.ui`、`Raids.cpp`、`RaidGenerator.cpp`                         |
| Location / Den         | Wild Area `0..99`（跳过索引 `16`）、Isle of Armor `100..189`、Crown Tundra `190..275`、Event `1..69` | Event 禁用 Rarity                                   | `Raids.cpp::locationIndexChanged()`、`Encounters8.cpp::denInfo[276]` |
| Level                  | `1..100`                                                                                             | 普通巢穴默认 `1` 且可编辑；Event 使用模板 Level     | `Raids.ui`、事件表 `Level`                                           |
| Template               | Species `1..898`、Form `0..31`、IV Count `1..6`                                                      | 从巢穴表选择                                        | `Raid.hpp`、`embed_gen8.py`、`personal_swsh.bin`                     |
| Height / Weight        | 两组闭区间，端点 `0..255`                                                                            | 每组最小值不得大于最大值                            | `StateFilter::compareState(State8)`                                  |
| Nature / Hidden Power  | 25 / 16 项位掩码                                                                                     | 至少选择一项；上游 Raid UI 禁用 Hidden Power 控件   | `Filter.ui`、`StateFilter.cpp`、`Raids.cpp`                          |
| Result Limit           | `1..100000`                                                                                          | Worker 与 Wasm 同时限制                             | PokeRNGKit Worker/Wasm 边界                                          |

浏览器单次任务最多评估 `250,000,000` 个状态；该保护限制不改变上游控件的 `uint32_t` 输入边界。

## 算法

每帧以 `Xoroshiro(seed, 0x82A2B175229D6A5B)` 开始。Seed 先按 `Initial Advances + Offset` 递增，再依上游顺序生成 EC、fake SID/TID、PID、异色修正、保底 IV、剩余 IV、Ability、Gender、Nature、Height、Weight。Random Shiny 使用 fake SID/TID 判定后按档案 TSV 修正 PID；Never 强制非异色，Always 强制 Square。Species 849 使用上游 Amped / Low Key 性格表。

## Worker 与 Wasm

- Module id：`gen8raids`；contract / API version：`1`；operation：`generator`
- 请求为 41 个 `uint32_t`，结果为 12 个 `uint32_t`
- 生产算法仅在 Dedicated Worker 内的 C++/Emscripten Wasm 执行；最多 8 个独立 Worker，不使用 SharedArrayBuffer 或 pthread。

`scripts/generate_gen8_raids_data.mjs` 从 PokeFinder 4.3.2 的 `nests.json`、`event1.json..event69.json`、`Encounters8.cpp` 和 `personal_swsh.bin` 生成 TypeScript 与 C++ 数据。保留 PokeFinder GPL-3.0-or-later 版权、归属、源码提供义务和商标免责声明。

数据固定使用 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9`。`nests.json` 的 SHA-256 为 `36F18FD010F32DF50CDFA48DC76A6976C2E1DE7ACFD1A6CF8E664F49FEE95AB4`；69 个事件 JSON 按 `event1.json` 到 `event69.json` 的“文件 SHA-256 + 两个空格 + 文件名 + LF”清单计算，清单 SHA-256 为 `B6BB4E163E093C35CC2F6A10E403B6D8D824E3E53B76771661B36C006CFE3E62`。完整 PokeFinder 文件哈希见 `third_party/pokefinder/UPSTREAM.md`。

## 验证

- `src/features/gen8raids/domain.test.ts`：输入边界、41-word 编码、分片和解码。
- `src/features/gen8raids/preview/Gen8RaidsUiPreviewEngine.test.ts`：预览结果。
- `wasm/modules/gen8raids/tests/gen8raids_native_test.cpp`：API、帧计数、异色分支、零 Seed 和范围错误。

算法结果仍须在 GitHub Actions 部署后，按项目所有者提供的生产 URL 执行回归；本地测试不能替代生产验收。
