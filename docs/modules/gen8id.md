# 第八世代 ID 乱数

`gen8id` 对应 PokeFinder 4.3.2 的 `Gen 8 TID/SID`。上游模块只有 Generator：输入两段 64 位 Seed、初始推进数、状态数量与一种 ID 筛选模式，生成第八世代 TID、SID、TSV 与 Display TID。模块不读取 Gen 8 Profile，不区分 Sword/Shield 与 BDSP，也没有 Searcher。

生产算法必须在独立 C++/Emscripten WebAssembly 模块中运行，并由 Web Worker 调用。React/TypeScript 只负责表单、领域校验、任务切片、Worker 编排、结果解码与结果表；布局预览引擎不得作为算法实现或结果证据。

## 1. 上游范围

- 页面与输入接线：`Form/Gen8/IDs8.*`。
- 共用筛选控件：`Form/Controls/IDsFilter.*`。
- 数值输入：`Form/Controls/TextBox.*`。
- Generator：`Core/Gen8/Generators/IDGenerator8.*`。
- 状态：`Core/Gen8/States/IDState8.hpp`、`Core/Parents/States/IDState.hpp`。
- 筛选：`Core/Parents/Filters/IDFilter.*`。
- RNG：`Core/RNG/Xorshift.*`、`Core/RNG/RNGList.hpp`。
- 结果表：`Model/Gen8/IDModel8.*`。
- 固定夹具：`Test/Gen8/IDGenerator8Test.cpp`、`Test/Gen8/id8.json`。
- 标签：`Form/i18n/PokeFinder_zh.ts`、`Form/i18n/PokeFinder_ja.ts`。

PokeFinder 基线由本地只读归档的 `CMakeLists.txt` 确认为 4.3.2。本地目录没有 `.git` 元数据，因此不能把它描述为可复核的 Git checkout；第 10 节记录本轮核对文件的 SHA-256。

`IDs8.cpp` 虽然包含 `Profile8` 与 `ProfileLoader` 头文件，但没有读取或使用 Profile。Web 页面不得因此增加版本或档案控件。

## 2. 上游工作流

1. 读取 Seed 0 与 Seed 1。
2. 两个 Seed 同时为 `0` 时拒绝生成；仅一个 Seed 为 `0` 时允许继续。
3. 清空旧结果。
4. 读取 Initial Advances、Max Advances 和当前筛选模式的多行值。
5. 构造 `IDGenerator8(initialAdvances, maxAdvances, filter)`。
6. 使用两段 Seed 生成状态并写入固定五列表格。

上游窗口的设计尺寸和最小尺寸均为 `1200 x 600`，RNG Info、Filters 位于首行，结果表跨越第二行。共用筛选控件的设计尺寸为 `178 x 196`。四个输入框没有独立 fixed/min/max width，实际宽度由 Qt Grid Layout 分配。Web 实现应按 HakuStyle compact workspace 适配桌面与移动端，不复制 `1200px` 的不可响应式最小宽度。

## 3. 输入边界与默认值

下表记录 Qt 控件设置与 Core 参数类型。`TextBox` 的空文本在读取时转换为 `0`；十六进制编辑可接受 `0x` 前缀，但保存到控件后会移除前缀、转为大写并移除无意义前导零。

| 输入             | 默认值   | 进制     | 最小值 | 最大值               | 最大字符数 | 空值 | 上游依据                                    |
| ---------------- | -------- | -------- | ------ | -------------------- | ---------- | ---- | ------------------------------------------- |
| Initial Advances | `0`      | 十进制   | `0`    | `4294967295`         | `10`       | `0`  | `IDs8.cpp` 的 `Advance32Bit`、`TextBox.cpp` |
| Max Advances     | `100000` | 十进制   | `0`    | `4294967295`         | `10`       | `0`  | `IDs8.ui`、`IDs8.cpp`、`TextBox.cpp`        |
| Seed 0           | 空       | 十六进制 | `0`    | `0xFFFFFFFFFFFFFFFF` | `16`       | `0`  | `IDs8.cpp` 的 `Seed64Bit`、`TextBox.cpp`    |
| Seed 1           | 空       | 十六进制 | `0`    | `0xFFFFFFFFFFFFFFFF` | `16`       | `0`  | `IDs8.cpp` 的 `Seed64Bit`、`TextBox.cpp`    |

输入边界还包含以下精确语义：

- `Max Advances` 是生成状态数量，不是包含起点的最大偏移。Core 循环条件为 `cnt < maxAdvances`。
- `Max Advances = 0` 返回 0 行；`9` 返回 Advances `initialAdvances..initialAdvances + 8`；默认 `100000` 返回 100000 个未筛选状态。
- 上游不拒绝 `Initial Advances + Max Advances` 超过 `uint32_t`。结果 Advances 使用 `u32(initialAdvances + cnt)`，超过 `4294967295` 时自然回绕。
- 上游只检查 Seed 0 与 Seed 1 是否同时为 `0`。对应简体中文警告标题为 `缺失seeds`，内容为 `请填写缺失的seed信息`。
- 浏览器任务上限、结果上限与多行筛选文本上限只能作为 PokeRNGKit 的工程保护明确添加，不得描述成 PokeFinder 输入限制。
- Web 输入仍保留上游 `uint32_t` 最大值，但单次浏览器任务最多评估 `250,000,000` 个状态；超过该值在创建 Worker 前拒绝。每个 C++/Wasm 调用同时校验 `chunkOffset + stateCount <= 250,000,000`，使用减法式比较避免无符号加法溢出。

## 4. 筛选语义

Gen 8 页面调用 `enableDisplayTID()`，因此可见模式固定为：

- `TID`
- `SID`
- `TID/SID`
- `PID`
- `TSV`
- `Display TID`

共享控件中的 `TID/PID` 在 Gen 8 保持隐藏。默认模式是 `TID`；切换模式会清空多行文本。一次只能选择一种模式，同一模式内多行值按 OR 匹配。空行忽略，整个文本为空时不启用筛选。

| 模式        | 输入规则                         | 实际比较值                                         |
| ----------- | -------------------------------- | -------------------------------------------------- |
| TID         | 十进制 `0..65535`                | 结果 TID                                           |
| SID         | 十进制 `0..65535`                | 结果 SID                                           |
| TID/SID     | 十进制 `TID/SID`，两端各为 `u16` | TID 与 SID 必须同时相等                            |
| PID         | 十六进制 `0..0xFFFFFFFF`         | `((PID >> 16) XOR (PID & 0xFFFF)) >> 4` 与结果 TSV |
| TSV         | 十进制 `0..8191`                 | 结果 TSV                                           |
| Display TID | 十进制 `0..999999`               | 结果 Display TID                                   |

`IDsFilter` 在编辑文本时移除不符合当前模式的字符并执行边界处理：

- TID 与 SID 超出 `u16` 时钳制为 `65535`。
- PID 超出 `u32` 时钳制为 `0xFFFFFFFF`，控件回填小写十六进制文本。
- TSV 超过 `8191` 时钳制为 `8191`。
- Display TID 超过 `999999` 时钳制为 `999999`。
- TID/SID 最多保留一个 `/`，两端分别按 `u16` 解析与钳制。
- 上游没有限制多行文本的行数或总字符数。

筛选发生在状态生成之后，未命中的状态仍消耗对应 RNG 推进。Web 实现应在 C++/Wasm 内完成筛选，避免默认 100000 个状态全部跨 Worker 传输。

## 5. RNG 与状态生成

### 5.1 Xorshift 初始化与推进

两段 64 位 Seed 各自向左循环移动 32 位，再按本机小端布局组成四个 `u32` 状态。每次 `next()` 执行：

```text
t = state[0]
s = state[3]
t ^= t << 11
t ^= t >> 8
t ^= s ^ (s >> 19)
state = [state[1], state[2], state[3], t]
return t
```

所有位运算均使用 `uint32_t` 回绕语义。初始推进使用 `Xorshift::jump(initialAdvances)`：先逐步推进低 7 位，再用 `Xorshift.cpp` 的 25 组预计算跳跃常量处理其余位。生产实现应复用或等价移植该 C++ 逻辑，不在 TypeScript 中重写 RNG。

### 5.2 有界输出与 RNGList

Generator 使用：

```cpp
RNGList<u32, Xorshift, 2, gen> rngList(seed0, seed1, initialAdvances);
```

其中 `gen` 必须精确调用：

```cpp
rng.next(0x80000000, 0x7fffffff)
```

`Xorshift::next(min, max)` 的上游实现是：

```cpp
u32 diff = max - min;
return (next() % diff) + min;
```

这里的 `max - min` 按 `u32` 回绕为 `0xFFFFFFFF`。因此不能替换成普通无界 `next()`，也不能按常见的包含式 `[min, max]` API 理解；任何移植都必须保留上述 `u32` 取模与加法语义。

`RNGList` 预取两个值。每个外层状态从当前列表位置读取；若结果为 `0`，继续读取下一个值直到非零。外层状态结束后 `advanceState()` 只前移一个基础 RNG 状态，所以遇到零值时后续窗口仍由 `RNGList` 的滑动语义决定，不能把每行简单实现成彼此独立的单次 `next()`。

### 5.3 派生字段

对每个非零 `sidtid`：

```text
TID = sidtid & 0xFFFF
SID = sidtid >> 16
Display TID = sidtid % 1000000
TSV = (TID XOR SID) >> 4
Advances = u32(initialAdvances + cnt)
```

## 6. 结果表

上游结果固定为五列，顺序不可调整：

| 顺序 | English source | 简体中文有效显示 | 类型  | 范围或格式         |
| ---- | -------------- | ---------------- | ----- | ------------------ |
| 1    | Advances       | 帧数             | `u32` | 十进制，可自然回绕 |
| 2    | Display TID    | Display TID      | `u32` | `0..999999`        |
| 3    | TID            | TID              | `u16` | `0..65535`         |
| 4    | SID            | SID              | `u16` | `0..65535`         |
| 5    | TSV            | TSV              | `u16` | `0..8191`          |

Web 结果表应使用稳定列宽、横向滚动、纵向虚拟化与键盘行导航。默认状态数量为 100000，不能把全部 DOM 行一次性渲染。结果数据可用五个 `uint32_t` 传输；也可在经过契约验证后把 TID/SID 打包到一个 `uint32_t`，但 UI 解码后必须恢复上述固定五列。

当前界面采用 HakuStyle operational workspace 与 compact workspace 字体密度：大于 `1180px` 时 RNG Info 与 Filters 双栏排列，`1180px` 及以下重排为单栏；筛选模式与多行值按纵向任务顺序组织，避免中等桌面宽度压缩长标签。输入、命令和结果工具保持至少 `44px` 触控目标，结果行支持鼠标选中、方向键、Home、End、Enter 与 Space，不增加装饰渐变、嵌套卡片或与任务无关的动效。

## 7. 精确标签

简体中文必须采用 `Form/i18n/PokeFinder_zh.ts` 的已完成翻译。`Display TID` 在简体中文和日本语中均为 `unfinished`，因此保留 English source。日本语的 `IDs8`、`IDModel8` 与 `IDsFilter` 条目全部未完成，日文界面全部保留英文源字符串。

| English source                         | 简体中文有效显示     | 位置或说明     |
| -------------------------------------- | -------------------- | -------------- |
| Gen 8 TID/SID                          | 第八世代ID乱数       | 页面标题       |
| RNG Info                               | 乱数信息             | 输入分组       |
| Initial Advances                       | 初始帧               | 输入标签       |
| Max Advances                           | 最大帧数             | 输入标签       |
| Seed 0                                 | Seed 0               | 输入标签       |
| Seed 1                                 | Seed 1               | 输入标签       |
| Filters                                | 筛选项               | 筛选分组       |
| Generate                               | 生成                 | 命令           |
| Missing seeds                          | 缺失seeds            | 警告标题       |
| Please insert missing seed information | 请填写缺失的seed信息 | 警告内容       |
| Advances                               | 帧数                 | 结果列         |
| Display TID                            | Display TID          | 未完成翻译     |
| TID / SID / TSV / PID / TID/SID        | 保留 English source  | 已完成同文翻译 |

MainWindow 导航中的 `IDs` 简体中文为 `ID乱数`。模块名仍按上游页面标题使用 `第八世代ID乱数`，不自行增加“模块”等后缀。

## 8. Wasm / Worker 实现边界

当前实现使用以下独立边界：

- Module id：`gen8id`。
- Contract version：`1`。
- Wasm API version：`2`。
- Operation：仅 `generator`。
- 页面：`src/features/gen8id/Gen8IdPanel.tsx`。
- Domain：`src/features/gen8id/domain.ts`。
- Worker 与 Pool：`src/features/gen8id/worker/`。
- 布局预览：`src/features/gen8id/preview/`。
- Wasm target：`wasm/modules/gen8id/`。

请求至少包含 Seed 0/1 的 low/high `uint32_t`、Initial Advances、状态数量、筛选模式与对应值集合。Worker 和 C ABI 应验证：

- module id、contract version、API version 与 operation。
- Seed 0/1 不得同时为零。
- `chunkIndex`、切片起点、切片状态数量与浏览器任务上限。
- 请求和结果缓冲区长度、指针对齐、堆边界与结果计数。
- TID/SID、TSV、Display TID、PID 派生筛选值的范围。
- Worker 崩溃、协议错误、取消与未知批次后的槽位终止和按需重建。

Pool 使用多个独立 Worker，不依赖 `SharedArrayBuffer`、Wasm pthread、COOP/COEP 或 cross-origin isolation。分片合并必须按 `chunkIndex` 恢复确定顺序。达到结果上限后应终止剩余 Worker，并忽略停止后到达的 Worker 错误；非法分片选项不得把 Pool 留在运行状态。结果上限与状态评估上限属于 PokeRNGKit 的浏览器保护，应在领域校验和 C++ 两侧分别执行无溢出检查。

## 9. 固定夹具

上游 `IDGenerator8Test.cpp` 固定使用：

```text
Initial Advances = 0
Max Advances = 9
Filter = empty
```

四组 Seed：

```text
0x4000000000000000 / 0x4000000000000000
0x8000000000000000 / 0x8000000000000000
0xC000000000000000 / 0xC000000000000000
0xFFFFFFFFFFFFFFFF / 0xFFFFFFFFFFFFFFFF
```

每组精确返回 9 行。第一组前两行是：

```text
Advances 0: Display TID 419776, TID 0,    SID 49216, TSV 3076
Advances 1: Display TID 421832, TID 2056, SID 49216, TSV 3204
```

完整期望结果位于 `Test/Gen8/id8.json`，SHA-256 为 `1443385044BB7B20F914E8D0F5FAB6B732B80235EB5A8348BE79E16D96B5D082`。实现时应把四组九行固定结果用于原生 C++ 夹具，并增加 Seed 同时为零、单 Seed 为零、零状态、筛选、分片、结果上限、协议错误与 Worker 重建覆盖。

## 10. 上游文件 SHA-256

```text
30593C691B0827079260722BC2F7FE490842CFFC85EDDD9BDCB025DAC9207D0B  Form/Gen8/IDs8.cpp
729FF1FFD3E37816FC35D08CEC91380A0160E540F17AF2664686256E8876A9A1  Form/Gen8/IDs8.hpp
CCAA3D004629F751E64771F5940D138016310CF4C0DCD86A9F905D16DF242C30  Form/Gen8/IDs8.ui
F97AAAEF5A0771C4075EB87721BE1919A38AE7448A349C4E2567F2D8A14BDC13  Core/Gen8/Generators/IDGenerator8.cpp
6F2E8D72FF74F51A33A270BB6FA095D85CFAB4A6ABD98C7DCDC99CD47DAFC2C0  Core/Gen8/Generators/IDGenerator8.hpp
D7958FE71E879DC9EC8BD53894231F01062AC89ADB3F24C4814DDBC70FDCC7B5  Core/Gen8/States/IDState8.hpp
2B18D6F362A560B502E5BBF1486AA31E9ABF921D64EBE7135DF4E2434C75EA9E  Core/RNG/Xorshift.cpp
2E7C77D50050C630EFD3361BE489E3D934028D8C7282EE9FDCFEFB2C2F238818  Core/RNG/Xorshift.hpp
DE999DE807EF88258B2A404CB74E7B99FBECCD4EC9F55CDD003643AAB4B4E918  Core/RNG/RNGList.hpp
76A2E79BDC31060337468250FB591B0BA499B54E414B2602915CAC5EF1CDD7DA  Form/Controls/IDsFilter.cpp
115939E847E1BD4DADA67242EBED94E10F415FC83F1ED33A549E9768BCD38B2A  Form/Controls/IDsFilter.ui
51B4F88667748825CE5091600BD2C5EE7F0152912BFC25856004319E41863FCA  Form/Controls/TextBox.cpp
EB9B40AA4791A8597055BCED6710C989C27A4DE0F24E9183089E35148AB67CAF  Model/Gen8/IDModel8.cpp
720904D7704BB204DE71D945DEDDA4E162AAF5CA3CCD4380A90F52B9A57A98C4  Model/Gen8/IDModel8.hpp
66FAE760C8B7391A87EB6B483E2FF54B4684D47B039D7040B31FF28CD588D6A8  Test/Gen8/IDGenerator8Test.cpp
1443385044BB7B20F914E8D0F5FAB6B732B80235EB5A8348BE79E16D96B5D082  Test/Gen8/id8.json
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
D67358790583FEBF22227ABF10B002EBAEC02E797EA08E125093CEA8C36F665F  Form/i18n/PokeFinder_ja.ts
```

## 11. 来源与许可

算法、输入语义、标签和固定夹具改编自 PokeFinder 4.3.2。实现必须保留 PokeFinder 的 GPL-3.0-or-later 许可、上游作者归属、对应源代码提供义务和商标免责声明。PokeRNGKit 不是 Nintendo、Creatures 或 GAME FREAK 的官方产品，也未获得其认可。

## 12. 当前验证状态

- 已完成：上游 Form、Core、Model、共用输入与筛选控件、中日翻译、固定夹具的静态核对，并记录上述 SHA-256；四个模块内上游副本与 PokeFinder 4.3.2 对应文件 SHA-256 一致。
- 已通过：`POKERNGKIT_WASM_MODULES=gen8id npm run wasm:test:native` 的 `gen8id_native_parity` 1/1；覆盖四组 `id8.json` 九行固定结果、每组全部非零分片起点、六种筛选、空筛选、两个 Seed 同为零、单 Seed 为零、零状态、`uint32_t` Advances 回绕、单批上限和 250,000,000 次任务边界。
- 已通过：项目所有者在本地终端运行完整 `npm run verify`；全仓 Prettier、ESLint（0 error、3 条既有 TanStack Virtual warning）、TypeScript、88 个测试文件共 360 项测试、2073 个 Vite 模块的 Web/PWA 生产构建和 62 项 PWA 预缓存全部通过，仅保留大型 chunk 提示。
- 环境记录：受限终端此前在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；后续非受限审批请求因审批服务 502 未启动。项目所有者手动执行同一命令通过，确认不是源码失败。
- 未执行：生产 Wasm、Actions 部署页面算法回归、外部 Chrome/Edge 桌面与移动端交互检查，以及项目所有者最终验收。
- 最终算法结果仍必须等待 GitHub Actions 完成部署，再由项目所有者提供确切生产 URL 并授权回归；本地夹具、预览模式和构建成功不能替代生产页面验收。
