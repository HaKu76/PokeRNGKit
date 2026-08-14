# 第五世代 Adjacent Seeds

`gen5adjacentseeds` 对应 PokeFinder 4.3.2 的 `Adjacent Seeds`。模块以一个目标日期时间、当前第五世代存档和按键组合为中心，枚举相邻秒数、Timer0 与 IV advances，并为选中结果生成 `Chatot Pitches` 或 `Save Needles` 预览。

## 功能范围

- 游戏：Black、White、Black 2、White 2。
- 遭遇类型：`Wild / Static / Grotto`、`Roamer`。
- 搜索维度：目标时间前后秒数、存档 Timer0 范围、IV advances 范围。
- 结果：Seed、日期时间、Timer0、IV Advance 与六项 IV；目标日期时间、Timer0 Min 和 Initial IV Advance 对应行使用粗体。
- 预览：从结果的初始 PID advance 开始输出 25 项 `Chatot Pitches` 或 `Save Needles`。
- 存档信息沿用独立的第五世代 IndexedDB 与 localStorage 镜像；本模块仅保存轻量表单设置，不增加后端、账号、遥测或运行时 CDN。

## 输入边界

| 字段                | 格式与范围                                                            | 空值与约束                                               | 上游依据                                             |
| ------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Profile             | 已保存的第五世代存档                                                  | 必须选择一个存档                                         | `ProfileDisplay5`、`Profile5.hpp`                    |
| Version             | Black、White、Black 2、White 2                                        | 来自存档                                                 | `Profile5.hpp`                                       |
| Language            | ENG、SPA、FRE、ITA、DEU、JPN、KOR                                     | 来自存档                                                 | `Profile5.hpp`、`Nazos.cpp`                          |
| DS Type             | DS Original/Lite、DSi/DSi XL、3DS                                     | 来自存档                                                 | `DSType.hpp`、`Profile5.hpp`                         |
| MAC Address         | 十六进制 `0..FFFFFFFFFFFF`，最多 12 位                                | 存档空值按 `0`                                           | `ProfileEditor5.cpp`、`TextBox.cpp`                  |
| VCount              | 十六进制 `00..FF`                                                     | 来自存档                                                 | `ProfileEditor5.cpp`、`TextBox.cpp`                  |
| Timer0 Min / Max    | 十六进制 `0000..FFFF`                                                 | Min 不得大于 Max                                         | `ProfileEditor5.cpp`、`Profile5.hpp`                 |
| GxStat / VFrame     | 十六进制 `00..63`，数值 `0..99`                                       | 来自存档                                                 | `ProfileEditor5.cpp`、`TextBox.cpp`                  |
| Memory Link         | 布尔值，仅 BW2 参与初始 PID advances                                  | 来自存档                                                 | `Profile5.hpp`、`Utilities.cpp`                      |
| Date/Time           | `2000-01-01 00:00:00..2099-12-31 23:59:59`                            | 必须是真实日期；Web 输入始终规范化为含秒格式             | `AdjacentSeeds.ui`、`DateTimeEdit.cpp`               |
| Seconds +/-         | 十进制 `0..99`，默认 `1`                                              | Qt `QSpinBox` 未覆写默认范围                             | `AdjacentSeeds.ui`、Qt `QSpinBox` 默认值             |
| Keypresses          | 12-bit 按键掩码，顺序为 `R L X Y A B Select Start Right Left Up Down` | 未选择按键时为 `0`                                       | `AdjacentSeeds.cpp`、`Keypresses.cpp`                |
| Encounter           | `Wild / Static / Grotto`、`Roamer`                                    | 默认前者                                                 | `AdjacentSeeds.ui`                                   |
| Initial IV Advances | 十进制 `0..4294967295`，最多 10 位                                    | 空值按 `0`                                               | `AdjacentSeeds.cpp`、`TextBox.cpp` 的 `Advance32Bit` |
| Max IV Advances     | 十进制 `0..4294967295`，最多 10 位                                    | 空值按 `0`；上游把该值加到 Initial，因此这里表示相对增量 | `AdjacentSeeds.cpp`、`TextBox.cpp` 的 `Advance32Bit` |

跨字段约束为：

```text
Initial IV Advances + Max IV Advances + MT offset <= 4294967295
MT offset = (BW2 ? 2 : 0) + (Roamer ? 1 : 0)
state count = (Seconds * 2 + 1) * Timer0 count * (Max IV Advances + 1)
```

浏览器单次最多生成 `100000` 行；超过时在创建 Worker 任务前拒绝。目标时间之前的偏移若落到 `2000-01-01` 之前，上游 `DateTime::valid()` 会跳过；超过 `2099-12-31` 的正偏移按上游 `DateTime::addSeconds()` 回绕到 `2000-01-01`。

## 算法行为

每个相邻日期时间和 Timer0 组合先使用存档的 Nazo、VCount、MAC、VFrame、GxStat、DS Type、语言和按键值计算 Gen V SHA-1 Seed。Black/White 的 MT IV 从 `Initial IV Advance` 开始，Black 2/White 2 额外推进 2 次；Roamer 再推进 1 次，并按 HP、Atk、Def、SpD、Spe、SpA 的生成顺序还原为表格中的六项能力顺序。

初始 PID advance 保留上游 `Utilities5::initialAdvances()` 的概率表、BW2 Memory Link 与重复抽取规则。预览使用 BWRNG：Chatot 调用 `nextUInt(0x1fff) / 82`，Save Needles 调用 `nextUInt(8)`。生产算法只在独立 C++/Wasm Worker 中运行；TypeScript UI Preview Engine 仅提供确定性界面数据，不作为算法验收证据。

## Worker 与 Wasm 边界

Wasm API version 为 `1`。生成请求使用 24 个固定宽度 word，结果每行使用 8 个 word：

```text
request = profile(11), date/time(6), seconds, buttons, roamer,
          initialIVAdvance, maxIVAdvances, minSecondOffset, maxSecondOffset

result = seedLow, seedHigh, packedDate, packedTime,
         timer0, ivAdvance, packedIVs, pidAdvance | targetBit
```

Worker 在调用前验证模块契约、API 版本、任务类型、分片边界、指针对齐和 HEAP 范围，调用后复制结果再转移 `ArrayBuffer`。Worker Pool 默认按硬件并发量选择最多 4 个独立 Worker，调用方可请求最多 8 个；任务按秒偏移切分，并按 `chunkIndex` 恢复确定顺序。取消或预览与生成互斥时终止并重建 Worker，不依赖 `SharedArrayBuffer`、Wasm pthread、COOP/COEP 或跨源隔离。

## 验证记录

已运行：

- `npx eslint src/features/gen5adjacentseeds`：通过。
- `npm test -- src/features/gen5adjacentseeds`：2 个文件、5 项测试通过。
- `npm run typecheck`：通过。
- 独立 MSVC CMake/CTest 原生夹具：1/1 通过。

原生夹具覆盖 Black Seed `6812116909077463616`、Black 2 Seed `5264333967543063602`、BW/BW2 六项 IV、Save Needles 与 Unova Link 间隔语义、2099 年上界日期回绕、`UINT32_MAX` 单行终止和 32-bit advances 溢出拒绝。完整 Emscripten 构建、共享入口、GitHub Actions 和部署页面回归仍待根配置接入后执行。

## 视觉与交互

HakuStyle 合同为 Royal Blueprint 操作工作台：主要任务是用已校准存档生成并比较相邻 Seed；采用紧凑工作区密度、44px 控件、10px 控件圆角、稳定的 Profile 摘要和可横向滚动的虚拟宽表。设置区与结果区按任务权重分配宽度，`1180px` 以下改为单栏，`720px` 以下重排表单，`460px` 以下操作按钮独占一行。界面不使用卡片嵌套、装饰性渐变、无意义徽章或持续动画；错误、进行中、完成、取消、空结果、禁用、选中、键盘行导航和 reduced motion 都保留独立状态。

## 来源与许可

算法和字段语义改编自 PokeFinder 4.3.2 的：

- `Form/Gen5/Tools/AdjacentSeeds.cpp`、`AdjacentSeeds.ui`
- `Form/Controls/TextBox.cpp`、`DateTimeEdit.cpp`
- `Model/Gen5/AdjacentSeedsModel.*`
- `Core/Gen5/Tools/AdjacentSeedsCalculator.*`
- `Core/Gen5/States/AdjacentSeedsState.hpp`
- `Core/Gen5/Keypresses.*`、`Core/Gen5/Nazos.*`
- `Core/RNG/SHA1.*`、`Core/RNG/MT.*`、`Core/RNG/LCRNG64.hpp`
- `Core/Util/DateTime.*`、`Core/Util/Utilities.*`、`Core/Util/Translator.*`

保留 PokeFinder 的 GPL-3.0-or-later 许可、上游作者归属和商标免责声明要求。`MTJump.txt` 为上游 MT jump table 的原样 vendored 数据，桥接文件中的版权与来源说明不可删除。
