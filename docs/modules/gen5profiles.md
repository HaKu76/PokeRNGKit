# 第五世代存档信息管理与校准

`gen5profiles` 对应 PokeFinder 4.3.2 的 `Profile Manager Gen 5`、`Profile Editor Gen 5` 和 `Profile Calibrator`。模块只负责第五世代存档信息与初始 Seed 参数校准；Profile Manager 与 Calibrator 使用同一套字段定义，但校准搜索在独立 Worker 和 Wasm 实例中运行。

## 功能范围

- 存档信息：新建、编辑、复制、删除、选择、拖动排序，以及 JSON 导入和导出。
- 校准模式：`IV Search`、`Needle Search`、`Seed Search`。
- 平台：Black、White、Black 2、White 2；DS Original/Lite、DSi/DSi XL、3DS；ENG、SPA、FRE、ITA、DEU、JPN、KOR。
- BW2 专属设置：`Memory Link`、`N's Pokémon released`、`Shiny Charm`。BW/BW2 之外的设置不会写入对应 profile 的有效状态。
- 浏览器保持静态和本地优先：IndexedDB 为主存储，独立 localStorage 镜像用于恢复；不使用后端、账号、遥测或云端资料。

## Profile 输入边界

| 字段                                           | 控件格式与范围                                               | 上游依据                                                        |
| ---------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Profile Name                                   | 非空字符串；上游未设置 `maxLength`                           | `Core/Gen5/Profile5.hpp`、`Form/Gen5/Profile/ProfileEditor5.ui` |
| Version                                        | Black、White、Black 2、White 2                               | `Core/Gen5/Profile5.hpp`、`ProfileEditor5.ui`                   |
| Language                                       | ENG、SPA、FRE、ITA、DEU、JPN、KOR                            | `Core/Gen5/Profile5.hpp`、`ProfileEditor5.ui`                   |
| DS Type                                        | DS Original/Lite、DSi/DSi XL、3DS                            | `Core/Enum/DSType.hpp`、`ProfileEditor5.ui`                     |
| TID / SID                                      | 十进制 `0..65535`，最大 5 位；空值读取为 `0`                 | `TextBox.cpp`、`Core/Gen5/Profile5.hpp`                         |
| MAC Address                                    | 十六进制 `0..FFFFFFFFFFFF`，最大 12 位；空值读取为 `0`       | `TextBox.cpp`、`ProfileEditor5.cpp`                             |
| VCount                                         | 十六进制 `0..FF`，最大 2 位；空值读取为 `0`                  | `TextBox.cpp`、`ProfileEditor5.cpp`                             |
| Timer0 Min / Max                               | 十六进制 `0..FFFF`，最大 4 位；空值读取为 `0`                | `TextBox.cpp`、`ProfileEditor5.cpp`                             |
| GxStat / VFrame                                | 十六进制 `0..63`，数值范围 `0..99`，最大 2 位；空值为 `0`    | `TextBox.cpp`、`ProfileEditor5.cpp`                             |
| Keypresses                                     | 9 个数量选项，表示同时按下 `0..8` 个按键；新建时默认全部有效 | `CheckList.cpp`、`ProfileEditor5.ui`、`Profile5.hpp`            |
| Skip L/R                                       | 布尔值                                                       | `Profile5.hpp`、`ProfileEditor5.ui`                             |
| Memory Link、N's Pokémon released、Shiny Charm | 仅 BW2 显示；Memory Link 关闭时 N's Pokémon released 关闭    | `Profile5.hpp`、`ProfileEditor5.ui`                             |
| IV Cache、SHA Cache                            | 仅记录用户选择的文件名；浏览器不读取本地绝对路径             | `ProfileEditor5.cpp`、`ProfileEditor5.ui`                       |

GxStat 和 VFrame 在 Profile Editor、Calibrator 输入与校准结果中按两位十六进制编辑和展示。Profile Manager 表格遵循上游 `ProfileModel5`：TID、SID、GxStat、VFrame 按十进制显示，VCount 和 Timer0 按对应宽度的十六进制显示。

## Calibrator 输入边界

| 字段                    | 范围或格式                                                 | 上游依据                                             |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Seed                    | 十六进制 `0..FFFFFFFFFFFFFFFF`，最大 16 位；空值读取为 `0` | `TextBox.cpp`、`ProfileCalibrator5.cpp`              |
| Date                    | `2000-01-01..2099-12-31`，按真实月日校验                   | DS Date 参数与 `Core/Util/DateTime.hpp`              |
| Hour / Minute / Seconds | Hour `0..23`；Minute `0..59`；Seconds Min/Max `0..59`      | `ProfileCalibrator5.ui`、`ProfileSearcher5.hpp`      |
| VCount Min/Max          | 十六进制 `00..FF`                                          | `ProfileCalibrator5.ui`、`ProfileSearcher5.hpp`      |
| Timer0 Min/Max          | 十六进制 `0000..FFFF`                                      | `ProfileCalibrator5.ui`、`ProfileSearcher5.hpp`      |
| GxStat Min/Max          | 十六进制 `00..63`，数值上限 `99`                           | `ProfileCalibrator5.ui`、`ProfileSearcher5.hpp`      |
| VFrame Min/Max          | 十六进制 `00..63`，数值上限 `99`                           | `ProfileCalibrator5.ui`、`ProfileSearcher5.hpp`      |
| IV Min/Max              | 六项，每项十进制 `0..31`                                   | `ProfileIVSearcher5.hpp`                             |
| Needle sequence         | 最多 100 项，每项方向值 `0..7`；Needle Search 至少 1 项    | `ProfileNeedleSearcher5.hpp`                         |
| Keypresses              | 12-bit 按键掩码                                            | `Core/Gen5/Keypresses.cpp`、`ProfileCalibrator5.cpp` |
| Result limit            | `1..100000`                                                | Web Worker/Wasm 契约上限                             |

所有 Min/Max 成对字段都执行顺序校验。单次校准的笛卡尔积不得超过 `250000000` 个状态；超过时在进入 Worker 前拒绝。

平台默认范围来自 `ProfileCalibrator5.cpp`：

| 游戏与机型    | VCount   | Timer0       |
| ------------- | -------- | ------------ |
| BW + DS       | `50..70` | `C60..CA0`   |
| BW2 + DS      | `70..90` | `10E0..1130` |
| BW + DSi/3DS  | `80..92` | `1140..12D0` |
| BW2 + DSi/3DS | `A0..C0` | `1400..1900` |

GxStat 默认 `06..06`，VFrame 默认 `00..10`；这里的 `10` 是十六进制文本 `0x10`。

## 持久化 schema

- IndexedDB 数据库：`pokerngkit-gen5`。
- Object store：`profile-data`；记录 key：`gen5-profiles`。
- localStorage 镜像 key：`pokerngkit-gen5-profiles-v1`。
- JSON backup format：`pokerngkit.gen5-profiles`，schema version `1`。
- state 结构为 `{ schemaVersion, profiles, selectedProfileId }`；profile 的 `id` 必须唯一，导入会按 id 合并。
- IndexedDB 读取失败、记录损坏或不可用时使用镜像；写入时尽量同时更新两份存储。清理只删除第五世代专属记录和镜像。

这些 key 与第三、四世代 profile 完全隔离，不复用共享 profile 记录。

## Worker 与 Wasm 边界

`Gen5ProfilesWorkerPool` 默认使用最多 4 个 Worker，调用方可请求最多 8 个。任务按 VFrame 区间切分，每个 Worker 都拥有独立 Wasm 实例，不依赖 `SharedArrayBuffer`、pthread 或 cross-origin isolation。

Wasm API version 为 `1`，请求为 39 个 `uint32_t`，结果为 4 个 `uint32_t`：

```text
result = seedLow, seedHigh, seconds | (vcount << 8) | (timer0 << 16), gxstat | (vframe << 8)
```

Worker 在调用前验证契约、指针对齐、HEAP 边界和结果长度，调用后复制结果再释放 `_malloc` 内存。Wasm 内核包含上游 `Nazos`、Gen5 SHA-1 Seed、`MTFast`、`BWRNG` 和 `Utilities5` 的必要逻辑；结果达到上限时返回 `limitReached` 和已处理状态数。

## 验证记录

已运行：

- `npm test -- src/features/gen5profiles`：3 个文件、14 项测试通过，包含无 Wasm 的 UI Preview Engine 固定结果。
- `npx eslint src/features/gen5profiles`：通过。
- `npm run typecheck`：通过。
- MSVC 原生固定夹具：BW/BW2 Seed、IV、Needle、BW2 Memory Link Needle，以及非法范围校验通过。

`dev:ui` 使用独立的确定性预览引擎，不加载 Wasm，也不把预览结果作为算法证据。

原生夹具来自 `Test/Gen5/profilesearcher5.json`，目标 Seed 为 Black `6812116909077463616`、Black 2 `5264333967543063602`。共享入口接入后的 `npm run verify` 已通过 45 个测试文件共 176 项测试、Vite 生产构建和 50 项 PWA 预缓存；Wasm 发布构建和部署页面验收仍待执行。

## 视觉与交互自查

界面采用 HakuStyle 的工作台/数据管理布局：管理器和校准器是两个独立实体表面，结果表保持宽表横向滚动，校准表单在宽屏双栏、窄屏单栏；控件保持 44px 触控高度，主色只用于当前 tab、主操作和进度，错误状态使用语义红色。弹出的 Profile Editor 使用居中的 modal，支持焦点圈定、滚动锁、Esc、点外和取消按钮关闭，并在关闭后恢复触发器焦点；表格行支持鼠标拖动、键盘选择和显式上下移动，页签、动态状态和进度均提供对应 ARIA 语义。

## 来源与许可

算法和字段语义改编自 PokeFinder 4.3.2 的 `Core/Gen5/Profile5.*`、`Core/Gen5/Searchers/ProfileSearcher5.*`、`Core/Gen5/States/ProfileSearcherState5.hpp`、`Core/RNG/SHA1.*`、`Core/Gen5/Nazos.*`、`Core/Gen5/Keypresses.*`、`Core/Util/Utilities.*` 及对应 `Form/Gen5/Profile/**`。保留 PokeFinder 的 GPL-3.0-or-later 许可、上游作者归属和商标免责声明要求；本模块桥接文件中的版权说明与上游来源说明不可删除。
