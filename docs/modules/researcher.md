# Researcher 研究工具

`researcher` ports the PokeFinder 4.3.2 global `Researcher` utility. It keeps
the upstream four RNG groups, ten ordered custom expressions, result search,
and the separate 32-bit/64-bit result projections. Generation runs in a
dedicated Worker; the UI preview uses a deterministic sample and never
replaces the production RNG path.

## 功能

- 32-bit: `LCRNG`、`LCRNG[R]`、`XDRNG`、`XDRNG[R]`、`ARNG`、`ARNG[R]`、
  `Mersenne Twister`。
- 64-bit: `BWRNG`、`BWRNG[R]`、`SFMT`、`Xoroshiro`、`Xoroshiro (BDSP)`。
- 独立支持 `TinyMT` 四 Seed 和 `Xorshift` 两个 64 位 Seed。
- 10 个 Custom 按上游顺序求值，可引用当前 PRNG、上一行 PRNG、较早的
  Custom，以及上一行较早的 Custom。
- `Search` 从已生成结果中查找，`Next` 从当前选中行之后继续查找。

## 输入边界

| 控件               | 进制、范围和宽度                                                                                   | 空值行为       | 上游依据                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| 32-bit Seed        | 十六进制 `0..0xFFFFFFFF`，最多 8 字符                                                              | `0`            | `Form/Controls/TextBox.cpp` `Seed32Bit`、`Form/Util/Researcher.cpp`                |
| 64-bit Seed        | 十六进制 `0..0xFFFFFFFFFFFFFFFF`，最多 16 字符                                                     | `0`            | `TextBox.cpp` `Seed64Bit`、`Researcher.cpp`                                        |
| TinyMT Seed 0..3   | 十六进制 `0..0xFFFFFFFF`，最多 8 字符                                                              | `0`            | `TextBox.cpp` `Seed32Bit`、`Researcher.cpp`                                        |
| Xorshift Seed 0..1 | 十六进制 `0..0xFFFFFFFFFFFFFFFF`，最多 16 字符                                                     | `0`            | `TextBox.cpp` `Seed64Bit`、`Researcher.cpp`                                        |
| Initial Advances   | 十进制 `0..0xFFFFFFFF`，最多 10 字符                                                               | `0`            | `TextBox.cpp` `Advance32Bit`、`Researcher.ui`                                      |
| Max Advances       | 十进制 `0..0xFFFFFFFF`，最多 10 字符                                                               | `0`            | `TextBox.cpp` `Advance32Bit`、`Researcher.ui`                                      |
| Custom literal     | 控件先按十六进制字符过滤，最多 10 字符，控件值 `1..0xFFFFFFFF`；`Hex` 决定最终按 16 或 10 进制解析 | 空值表示不计算 | `Researcher.cpp` `textBoxRValue1..10`、`TextBox::setValues(1, 0xffffffff, 10, 16)` |
| Search value       | 十六进制输入框最多 16 字符；`Value (Hex)` 未选中时按十进制读取                                     | `0`            | `Researcher.cpp`、`TextBox.cpp` `Seed64Bit`                                        |

网页端单次任务将 `Max Advances` 限制为 `250000`，用于控制固定宽度结果
在浏览器内的内存占用；上游输入控件本身仍保留 `u32` 范围。生成行数严格
等于 `Max Advances`，不是 `Max Advances + 1`。初始帧与最大帧数的组合必须
满足 `Initial Advances + Max Advances - 1 <= 0xFFFFFFFF`。

## Worker / Wasm 契约

- API 版本为 `1`；manifest 只声明 Wasm 实际提供的 `generator`，Search 在
  TypeScript 结果层执行。
- `researcher_begin` 接收 8 个 Seed words、初始帧和 10 个 packed Custom；
  `researcher_generate` 每批最多生成 `10000` 行并保留上一批状态。
- 每行固定 23 个 `uint32_t`：`Advances` 1 个、PRNG 2 个、10 个 Custom
  各 2 个（低字、高字）。Worker 校验指针、对齐、堆范围、批次数量和任务
  顺序后才复制结果。
- 不使用 `SharedArrayBuffer`、pthread 或 cross-origin isolation；取消任务
  会终止当前 Worker，下一次生成自动创建新实例。

为避免 C++ 未定义行为，桥接层将除数为 0 的 `/` 和 `%` 结果定义为 `0`，
并将移位量限制为 `rhs & 63`。这两项是 Web ABI 的明确安全定义，不改变
正常输入的上游结果。

## 视觉与交互契约

- 平台以桌面键鼠为主并支持触控窄屏；产品类型为 operational workspace，
  主任务是连续生成、检索并比较 PRNG 状态。
- 沿用应用现有语义 token 与 Royal Blueprint 工作台合同，采用 compact workspace
  密度、圆角控件和高不透明表面；不增加第二套主题或签名特效。
- 桌面端四个 RNG 页签保持单行，窄屏重排为两列；Custom 与结果宽表保持
  横向滚动，不压缩数值、控件或上游标签。
- 生成、取消、失败、空结果、选中行与搜索未命中均有独立状态；页签提供
  程序化关联，进度条暴露数值语义，结果行支持键盘选择。
- 不使用嵌套卡片、装饰性渐变、玻璃、发光、徽章或持续动画。

## 来源与许可

算法与 UI 语义来自 PokeFinder 4.3.2：

- `Form/Util/Researcher.cpp`、`Form/Util/Researcher.ui`
- `Form/Controls/TextBox.cpp/.hpp`
- `Model/Util/ResearcherModel.cpp/.hpp`
- `Core/Parents/States/ResearcherState.hpp`
- `Core/RNG/LCRNG64.hpp`、`MT.*`、`SFMT.*`、`TinyMT.*`、`Xoroshiro.*`、
  `Xorshift.*`

对应 GPL-3.0-or-later 源文件以受限快照形式保存在
`wasm/modules/researcher/upstream/Core/RNG/`，桥接层保留上游署名、许可证
和商标免责声明。项目仍为完全静态、本地优先实现。

## 验证

- `npx eslint src/features/researcher`：通过。
- `npm run typecheck`：通过。
- `npm test -- src/features/researcher`：3 个文件、11 项测试通过。
- 模块独立 CMake/CTest：`researcher_native_parity` 通过，覆盖 14 种 RNG
  首值、跨行 Custom、批次上限与 `u32` 帧边界。根 `wasm/CMakeLists.txt`
  接入后，统一 `wasm:test:native` 才会发现此测试。
