# 第五世代 Dream Radar

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

## 范围

本模块对应 PokeFinder 4.3.2 的 `Dream Radar`，提供 `Generator` 和 `Searcher` 两种操作。目标游戏固定为 Black 2 / White 2，使用最多六个连续 Slot、徽章等级、Memory Link、个体值、性格和觉醒力量条件生成或检索梦境雷达宝可梦。

前端只负责输入、分片、取消、进度、结果归并和展示。BWRNG、MT、初始帧、PID、SHA-1 Seed、按键组合和过滤均在独立 Worker 的 C++/WebAssembly 中执行。模块不使用 pthread、`SharedArrayBuffer`、跨源隔离、后端或运行时 CDN。

## 上游文件

只读核验文件：

```text
12A5BCFA98123BC7297E0D0962D02A0582CB43462BE1C13BC6086F2209E027CE  Form/Gen5/DreamRadar.cpp
05862C3DA5B726DA8E992289422A62A486BA8DCEFBC31B6F562BC8A2CEB78CEC  Form/Gen5/DreamRadar.ui
A3D811876765B68EFC9C9FF6DA89E6E0CB9ED98F4218ABB52A645AF78548EE76  Core/Gen5/Generators/DreamRadarGenerator.cpp
FFB7CF21AFD0956834665EC2177C0E70E053DF43F7EDA7EA541121E4326344C6  Core/Gen5/Generators/DreamRadarGenerator.hpp
722DAD53B74EBE0A0DC2B867091CE69CAEC70DB04C172DC1D2BD3794EB7F1FD2  Core/Gen5/DreamRadarTemplate.hpp
FE7AF75B3BA15B4E47D836126FC29FC47605658C89A61C0F5478AF9000F4F3C4  Core/Gen5/States/DreamRadarState.hpp
996A31CD6FDAC0E7BAF91E04B9B29CDB09F4C19EBB25C8A24476203AB362AC92  Core/Gen5/Searchers/Searcher5.hpp
8AACF12D5C514047EFEFA4EB27CEAA13632D6F4DE7107A67F3914FF1A03FBCFE  Model/Gen5/DreamRadarModel.cpp
33003D597AA0116DC56BFAAF04E13FD36B6D496B87C08A3F5D0BA5093B624003  Model/Gen5/DreamRadarModel.hpp
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
4B85A9BA668A33E6142029477C8D32476D701BB6F9E97E04207A013431846609  Test/Gen5/dreamradar.json
956D7AAE664CF75AF663A2F3593A2B14559A68374168557BC844A9D95E8E0E44  Core/Resources/Personal/Gen5/personal_b2w2.bin
```

Dream Radar encounter table来自 PokeFinder 4.3.2 的 EncounterTableGenerator 子模块提交 `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9`。

## 输入限制

| 控件               | 进制 |       最小值 |             最大值 | 最多字符 |   空值 |   默认值 | 上游来源                                                     |
| ------------------ | ---: | -----------: | -----------------: | -------: | -----: | -------: | ------------------------------------------------------------ |
| `Seed`             |   16 |          `0` | `FFFFFFFFFFFFFFFF` |       16 |    `0` |      `0` | `DreamRadar.cpp` 的 `InputType::Seed64Bit`；`TextBox.cpp`    |
| `Initial Advances` |   10 |          `0` |       `4294967295` |       10 |    `0` |      `0` | `DreamRadar.cpp` 的 `InputType::Advance32Bit`；`TextBox.cpp` |
| `Max Advances`     |   10 |          `0` |       `4294967295` |       10 |    `0` |    `100` | `DreamRadar.cpp` 的 `InputType::Advance32Bit`；`TextBox.cpp` |
| `Badges`           |   10 |          `0` |                `8` |        1 | 不允许 |      `0` | `DreamRadar.ui` 的 `QSpinBox maximum=8`                      |
| `Start Date`       | 日期 | `2000-01-01` |       `2099-12-31` |        - | 不允许 | 当前日期 | `DateEdit.cpp`；`DreamRadar.cpp`                             |
| `End Date`         | 日期 | `2000-01-01` |       `2099-12-31` |        - | 不允许 | 当前日期 | `DateEdit.cpp`；`DreamRadar.cpp`                             |
| IV 最小/最大       |   10 |          `0` |               `31` |        2 | 不允许 |   `0/31` | `Filter` / `StateFilter`                                     |

HTML 控件与 `validateGen5DreamRadarRequest()` 保留完整 `uint32_t` 输入范围，并额外拒绝 `Initial Advances + Max Advances > 4294967295`，避免绝对帧号回绕。浏览器单次任务上限为 250,000,000 次状态计算，结果上限为 100,000 条。

Searcher 要求起始日期不晚于结束日期，并且必须使用过滤器。Generator 可以启用 `Disable Filters`。日期使用本地设置保存，算法输入仍为不带时区的 DS 日期与秒数。

## Slot 与模板

Slot 从 1 到 6 连续读取，遇到第一个 `None` 后停止；至少需要一个 Slot。三只 Genie 只允许出现在 Slot 1。物种顺序与上游 26 条 Dream Radar encounter table 一致：

```text
Slowpoke, Staryu, Porygon, Hoothoot, Igglybuff, Togepi, Shuckle, Smoochum,
Lugia, Ho-Oh, Ralts, Swablu, Beldum, Drifloon, Bronzor, Spiritomb, Riolu,
Rotom, Dialga, Palkia, Giratina, Munna, Sigilyph,
Tornadus (Therian), Thundurus (Therian), Landorus (Therian)
```

性别选项来自 B2W2 personal data。Lugia、Ho-Oh、Dialga、Palkia、Giratina 在 PID 生成时使用模板性别 0，但结果显示为无性别；这是上游算法的必要 RNG 消耗。Rotom 根据最终 PID 的 bit 16 显示普通特性 0 或 1，其余模板固定显示隐藏特性 `H`。

## 算法

目标始终是最后一个连续 Slot。构造阶段按前置 Slot 累计偏移：

- 每个 Genie 先增加 5 个 PID advance 与 13 个 IV advance。
- 每个非最终 Slot 再增加 13 个 IV advance；Legend 或 personal gender 非 255 时增加 5 个 PID advance，否则增加 4 个。
- 因此前置 Genie 合计增加 10 个 PID advance 与 26 个 IV advance。

主 BWRNG 从 `2 * Initial Advances + initialAdvancesBW2(seed, memoryLink)` 开始。Memory Link 未启用时额外消费一次主 BWRNG。MT 使用 Seed 高 32 位，从 `2 * Initial Advances + ivAdvances + 9` 开始，以 8 项 `RNGList` 读取六项个体值；相邻结果前移两项，因此共享四项个体值。

每帧按上游顺序执行：

1. 复制主 BWRNG 并跳过 Slot 的 PID 偏移。
2. 从 MT 窗口读取六项个体值。
3. 复制的 BWRNG 丢弃一次调用，再以 `Shiny::Never` 和目标性别生成 PID。
4. PokeFinder 的 `createPID` 会直接比较 PID ability bit 与参数 2，因此 Dream Radar 调用仍会切换 bit 16；不能按注释将参数 2 简化为“不修改”。
5. 复制的 BWRNG 再推进两次，随后读取性格。
6. 主 BWRNG 读取 `Needle`，循环结束再推进一次；MT 窗口前移两项。

徽章等级表为 `{5, 10, 10, 20, 20, 30, 30, 40, 40}`。Searcher 以 PokeFinder `Searcher5` 的顺序遍历 Timer0、日期、按键和一天内的 86,400 秒，并使用对应版本、语言、DS 类型、MAC、VCount、GxStat 与 VFrame 计算 SHA-1 Seed。

## 表格

Generator 保留上游 16 列，并显示 `Needle`。Searcher 保留上游 19 列，增加 Seed、日期/时间、Timer0 和 Buttons，且不显示 `Needle`。两种结果均可在 IV 与实际能力值之间切换；能力值使用目标 B2W2 personal base stats、结果等级和性格计算。

简体中文严格复用 `PokeFinder_zh.ts` 已完成翻译：`AR搜寻器乱数`、`生成器`、`检索器`、`乱数信息`、`初始帧`、`最大帧数`、`设置`、`筛选项`、`徽章`、`起始日期`、`最后日期`。结果表复用 `帧数`、`异色`、`性格`、`特性`、`觉醒属性`、`觉醒威力`、`性别`、`个性` 与 `日期/时间`；`Slot 1..6`、`Needle`、`Buttons` 和上游未完成的警告保持英文。

## 实现文件

- `wasm/modules/gen5dreamradar/bridge/gen5dreamradar_bridge.cpp`
- `wasm/modules/gen5dreamradar/tests/gen5dreamradar_native_test.cpp`
- `src/features/gen5dreamradar/domain.ts`
- `src/features/gen5dreamradar/worker/gen5dreamradar.worker.ts`
- `src/features/gen5dreamradar/worker/Gen5DreamRadarWorkerPool.ts`
- `src/features/gen5dreamradar/Gen5DreamRadarPanel.tsx`
- `src/features/gen5dreamradar/preview/Gen5DreamRadarUiPreviewEngine.ts`

## 验证

- `domain.test.ts` 固定完整输入范围、连续 Slot、性别限制、Searcher 候选数量、浏览器任务上限、分片覆盖和结果语义。
- `Gen5DreamRadarWorkerPool.test.ts` 固定 Worker 崩溃后的终止与重建行为。
- `Gen5DreamRadarUiPreviewEngine.test.ts` 固定预览行并确认性格、觉醒力量和隐藏特性。
- `gen5dreamradar_native_test.cpp` 完整比较上游 Tornadus、Lugia、Staryu 与 `Staryu -> Slowpoke` 四组各 10 帧，共 40 帧 PID、IV、Nature、Needle、Hidden Power、Ability、Gender、Advance、Level 与 Ability Index，并覆盖非法 Genie Slot、非法分片和 Black 2 SHA Seed。

本地固定向量、原生测试和 Wasm 构建只作为工程证据。算法结果验收仍需 GitHub Actions 部署完成后，由项目所有者提供生产页 URL 并明确授权生产回归。

## 来源与许可

算法、字段语义、encounter table 与 personal data 改编自 PokeFinder 4.3.2。保留 PokeFinder 的 GPL-3.0-or-later 许可、上游作者归属、源码分发义务和商标免责声明。vendored `MT.cpp`、`MT.hpp`、`MTJump.txt`、`RNGList.hpp` 与 `SIMD.hpp` 的版权及来源说明不可删除。
