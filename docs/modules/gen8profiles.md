# 第八世代存档信息管理

`gen8profiles` 对应 PokeFinder 4.3.2 的 `Profile Manager Gen 8`、`Profile Editor Gen 8` 与 `Profile Display 8`。模块提供 Sword、Shield、Brilliant Diamond、Shining Pearl 档案的新建、编辑、复制、删除、排序、选择，以及 PokeRNGKit JSON 备份导入导出；IndexedDB 为主存储，localStorage 为镜像和恢复路径。

本模块只管理本地档案，不执行 RNG，不使用 Wasm、Worker、后端、账号、遥测或运行时 CDN。后续第八世代算法模块按 SwSh 或 BDSP 版本组读取已选档案。

## 1. 上游范围

- 核心档案：`Core/Gen8/Profile8.*`、`Core/Parents/Profile.*`。
- 持久化：`Core/Parents/ProfileLoader.*` 中的 `ProfileLoader8`。
- 编辑与管理：`Form/Gen8/Profile/ProfileEditor8.*`、`ProfileManager8.*`。
- 模块选择器：`Form/Gen8/Profile/ProfileDisplay8.*`。
- 表格：`Model/Gen8/ProfileModel8.*`。
- 数值输入：`Form/Controls/TextBox.*`；版本下拉数据绑定：`Form/Controls/ComboBox.*`。
- 版本枚举：`Core/Enum/Game.hpp`。
- 文件路径切换：`main.cpp`、`Form/Util/Settings.*`。
- 标签：`Form/i18n/PokeFinder_zh.ts`、`Form/i18n/PokeFinder_ja.ts`。

PokeFinder 基线为 4.3.2；仓库记录的固定 revision 为 `dd00fe7`。本地只读归档没有 `.git` 元数据，因此本轮只记录文件 SHA-256，不把目录状态描述为可复核的 Git checkout。

## 2. 数据结构

`Profile8` 继承基础 `Profile`，共保存 7 个业务字段。相等比较覆盖全部 7 个字段。

| 字段         | Core 类型      | JSON key     | JSON 缺字段默认值 | 说明                                                          |
| ------------ | -------------- | ------------ | ----------------- | ------------------------------------------------------------- |
| Profile Name | `std::string`  | `name`       | `"-"`             | 名称允许重复；Core 不限制长度                                 |
| Version      | `Game` / `u32` | `version`    | `Game::BD`        | 只由编辑器下拉限制为 4 个 Gen 8 版本                          |
| TID          | `u16`          | `tid`        | `0`               | 十进制显示与编辑                                              |
| SID          | `u16`          | `sid`        | `0`               | 十进制显示与编辑                                              |
| National Dex | `bool`         | `dex`        | `false`           | Manager 表格不显示此列，但档案、编辑器与 Display 都保存或展示 |
| Shiny Charm  | `bool`         | `shinyCharm` | `false`           | `EggGenerator8` 使用此字段                                    |
| Oval Charm   | `bool`         | `ovalCharm`  | `false`           | `Eggs8` 使用此字段调整生成流程                                |

`Profile::operator==` 比较名称、版本、TID 与 SID；`Profile8::operator==` 再比较 National Dex、Shiny Charm 与 Oval Charm。上游没有稳定 id、创建时间或更新时间。

## 3. 游戏版本

编辑器下拉顺序固定，默认选择第一项 Sword。

| 顺序 | English           | 简体中文 | 日本语有效显示    | `Game` 数值             |
| ---- | ----------------- | -------- | ----------------- | ----------------------- |
| 1    | Sword             | 剑       | Sword             | `1 << 24` / `16777216`  |
| 2    | Shield            | 盾       | Shield            | `1 << 25` / `33554432`  |
| 3    | Brilliant Diamond | 晶灿钻石 | Brilliant Diamond | `1 << 26` / `67108864`  |
| 4    | Shining Pearl     | 明亮珍珠 | Shining Pearl     | `1 << 27` / `134217728` |

组合掩码为 `SwSh = Sword | Shield`、`BDSP = BD | SP`、`Gen8 = SwSh | BDSP`。`ProfileLoader8::getProfiles(filter)` 使用位与判断，只返回与过滤掩码有交集的记录。

## 4. 输入边界与默认值

### 4.1 新建编辑器

| 控件         | 默认值   | 进制   | 空值                     | 最小值  | 最大值        | 最大字符数 | 其他验证                                                      |
| ------------ | -------- | ------ | ------------------------ | ------- | ------------- | ---------- | ------------------------------------------------------------- |
| Profile Name | 空字符串 | 文本   | 不允许提交               | 无      | 无            | 上游未设置 | 提交时只用 `trimmed()` 判断是否为空；实际保存原始未 trim 文本 |
| Version      | Sword    | 枚举   | 不存在空值               | Sword   | Shining Pearl | 不适用     | 固定、不可自由输入的 4 项下拉                                 |
| TID          | 空字符串 | 十进制 | `getUShort()` 读取为 `0` | `0`     | `65535`       | `5`        | 非数字被移除；超限值钳制到边界；前导零被移除                  |
| SID          | 空字符串 | 十进制 | `getUShort()` 读取为 `0` | `0`     | `65535`       | `5`        | 与 TID 相同                                                   |
| National Dex | 未勾选   | 布尔   | 不适用                   | `false` | `true`        | 不适用     | 所有版本都可勾选，无版本联动                                  |
| Shiny Charm  | 未勾选   | 布尔   | 不适用                   | `false` | `true`        | 不适用     | 所有版本都可勾选，无版本联动                                  |
| Oval Charm   | 未勾选   | 布尔   | 不适用                   | `false` | `true`        | 不适用     | 所有版本都可勾选，无版本联动                                  |

Profile Name 为空或全空白时，编辑器显示 `Missing name` / `Enter a profile name` 并保持窗口打开。名称有非空白字符时可以提交，但保存内容来自原始 `QLineEdit::text()`，因此首尾空格会被保留。名称没有唯一性、最大长度或字符集限制。

TID/SID 调用 `TextBox::setValues(InputType::TIDSID)`，等价于 `setValues(0, 0xffff, 5, 10)`。上游没有给输入框设置固定像素宽度；有效宽度由 `523 x 100` 的编辑器网格布局分配。名称、版本、复选框也没有独立 fixed/min/max width。

`TextBox` 先保留最大字符数，再移除前导零和非法字符。因此输入超过 5 位时保留前 5 个字符；空文本保持为空，最终读取为 `0`。编辑现有档案时 TID/SID 以无补零十进制文本回填。

### 4.2 三种默认值不能混用

1. 新建编辑器：空名称、Sword、空 TID、空 SID、三个布尔值均为 `false`。
2. JSON 缺字段：`-`、Brilliant Diamond、`0`、`0`、三个布尔值均为 `false`。
3. Profile Display 临时记录：`-`、`12345`、`54321`、三个布尔值均为 `false`，不会写入持久化。

`ProfileDisplay8::updateProfiles()` 的临时版本判断与过滤方向相反：BDSP 过滤器会生成 Sword 临时记录，SwSh 过滤器会生成 Brilliant Diamond 临时记录。该行为与模块过滤语义矛盾，Web 实现应记录为上游缺陷并分别使用正确的 SwSh/BDSP 临时默认版本，不应照搬。

## 5. Profile Manager 行为

- 初始窗口尺寸为 `630 x 300`，关闭时把几何信息写入 `profileManager8/geometry`。
- 打开时按 JSON 现有顺序加载全部 `Game::Gen8` 档案，不自动排序。
- 表格为整行、单选；按钮不会因无选择而禁用。Edit、Duplicate、Delete 在无选择时显示 `No profile selected` / `Please select a profile`。
- 表格固定 6 列：Profile Name、Version、TID、SID、Shiny Charm、Oval Charm。National Dex 不在 Manager 表格中。
- New 打开空白 Editor；确认后把记录追加到 JSON 和表格末尾。
- Duplicate 不打开 Editor，直接复制全部 7 个字段并追加。完全相同的重复记录合法。
- Edit 打开当前记录；确认后按“全部字段相等”在 JSON 中找到第一个原记录并替换，同时更新当前表格行。
- Delete 显示 Yes/No 确认；确认后按“全部字段相等”删除 JSON 中第一个匹配记录，再删除当前表格行。
- Done 关闭 Manager。
- 表格支持内部拖动单行重排；重排完成立即用当前完整顺序替换 `gen8` 数组。
- 新建、编辑确认、复制、删除与重排都会发出 `profilesChanged(8)`。

由于上游用字段相等而不是稳定 id 定位记录，完全相同的重复档案在编辑时可能出现持久化顺序与当前表格顺序短暂不一致。Web 实现应复用现有档案的稳定 id，按 id 修改和删除，同时保留“允许相同名称与相同业务字段”的可见语义。

## 6. Profile Display 行为

- 初始尺寸为 `529 x 106`，显示 Profile、TID、SID、Game、National Dex、Oval Charm、Shiny Charm。
- 每个调用模块传入独立 `prefix` 与版本过滤器；BDSP 模块使用 `Game::BDSP`，Raids 使用 `Game::SwSh`。
- 档案列表首项始终为不持久化的临时 `-` 记录，随后保持持久化顺序。
- 选择保存为 `QSettings` 的 `<prefix>/profile` 数字索引，不是档案标识。重排、插入或删除可能让同一索引指向另一条记录。
- Manager 以独立非模态窗口打开；收到 `profilesChanged` 后重新加载列表并向父模块转发世代编号。
- TID/SID 使用十进制；Game 通过 Translator 显示；三个布尔值显示 Yes/No。

Web 端应沿用现有 `selectedProfileId`，不复制按数组索引持久化选择的上游弱点。不同 Gen 8 功能需要按 SwSh 或 BDSP 过滤档案；过滤后若已选 id 不可用，应显示对应版本组的临时默认记录，但不要写入存储。

## 7. 持久化、导入与导出

### 7.1 PokeFinder 原始语义

- PokeFinder 把所有世代保存在同一个 JSON 文件。默认路径是 Documents 下的 `profiles.json`。
- 文件不存在时创建 `{}`；默认路径丢失时启动后提示用户更新路径。
- Settings 的 `Profiles Path` / `Change` 使用 `getSaveFileName` 选择现有 `.json` 或创建空文件，然后立即切换 `ProfileLoader` 路径。
- JSON 解析失败时 `readJson()` 返回空 JSON；没有迁移、备份、恢复副本或 schema version。
- `gen8` 是数组；每项包含 `name`、`version`、`tid`、`sid`、`dex`、`shinyCharm`、`ovalCharm`。
- 每次增加、更新、删除或重排都重写完整 JSON 文件，使用紧凑 JSON，无换行。
- 增加是数组末尾追加；更新和删除只处理第一个完全相等的记录；重排只替换 `gen8`，不改变其他世代 key。
- Profile Manager 没有 Import、Export 或 Clear All 按钮。切换 Profiles Path 是整份原始档案文件的切换机制，不是结构化合并导入。

### 7.2 PokeRNGKit 持久化语义

- IndexedDB 数据库：`pokerngkit-gen8`；object store：`profile-data`；记录 key：`gen8-profiles`。
- localStorage 镜像 key：`pokerngkit-gen8-profiles-v1`。
- IndexedDB 写入失败但镜像保存成功时，使用 `pokerngkit-gen8-profiles-v1-primary-pending` 标记镜像为较新副本；后续加载优先读取镜像并尝试修复 IndexedDB，避免旧主存储覆盖新操作。
- state 使用 `{ schemaVersion, profiles, selectedProfileId }`。
- 每条记录使用稳定、唯一 id，并保存 `createdAt`、`updatedAt`。
- JSON backup 使用 `pokerngkit.gen8-profiles`、schema version `1` 与 `exportedAt`。
- 导入先完整校验，再按 id 合并；相同 id 覆盖，其他记录保留；任一记录非法则拒绝整个文件。
- 导出包含全部 Gen 8 档案与当前选择；Clear 只清除 Gen 8 记录和镜像。
- 不提供桌面绝对文件路径，也不把原始 PokeFinder `profiles.json` 当作当前备份格式；若未来增加兼容导入，应作为显式、独立的迁移入口。

## 8. 精确标签

日本语 `ProfileEditor8`、`ProfileManager8`、`ProfileDisplay8`、`ProfileModel8` 条目全部为空且标记为 `unfinished`，因此按仓库规则保留 English source，不自行翻译。简体中文 Editor、Manager 与 Model 条目已完成；ProfileDisplay8 整个 context 标记为 `unfinished`，其中有文本的条目在下表标记为“未完成条目”。

| English source                                | 简体中文原文             | 日本语有效显示                                | 状态或位置                           |
| --------------------------------------------- | ------------------------ | --------------------------------------------- | ------------------------------------ |
| Profile Editor Gen 8                          | 第八世代存档信息编辑     | Profile Editor Gen 8                          | Editor 已完成                        |
| Profile Manager Gen 8                         | 第八世代存档信息管理     | Profile Manager Gen 8                         | Manager 已完成                       |
| Profile Display 8                             | Profile Display 8        | Profile Display 8                             | 中文与日文均无完成翻译               |
| Profile Name                                  | 存档名                   | Profile Name                                  | Editor / Model 已完成                |
| Profile                                       | 存档信息                 | Profile                                       | Display 未完成条目                   |
| Manager                                       | 存档信息管理             | Manager                                       | Display 未完成条目                   |
| Version                                       | 版本                     | Version                                       | Editor / Model 已完成                |
| Game                                          | 游戏                     | Game                                          | Display 未完成条目                   |
| TID                                           | TID                      | TID                                           | Editor / Model 已完成                |
| SID                                           | SID                      | SID                                           | Editor / Model 已完成                |
| National Dex                                  | 全国图鉴                 | National Dex                                  | Editor 已完成；Display 同名条目为空  |
| Shiny Charm                                   | 闪耀护符                 | Shiny Charm                                   | Editor / Model 已完成                |
| Oval Charm                                    | 圆形护符                 | Oval Charm                                    | Editor / Model 已完成                |
| New                                           | 新建                     | New                                           | Manager 已完成                       |
| Edit                                          | 编辑                     | Edit                                          | Manager 已完成                       |
| Duplicate                                     | 复制                     | Duplicate                                     | Manager 已完成                       |
| Delete                                        | 删除                     | Delete                                        | Manager 已完成                       |
| Done                                          | 完成                     | Done                                          | Manager 已完成                       |
| Okay                                          | 确认                     | Okay                                          | Editor 已完成                        |
| Cancel                                        | 取消                     | Cancel                                        | Editor 已完成                        |
| Yes                                           | 是                       | Yes                                           | Model 已完成；Display 另有未完成条目 |
| No                                            | 否                       | No                                            | Model 已完成；Display 另有未完成条目 |
| Missing name                                  | 未输入存档名             | Missing name                                  | Editor 已完成                        |
| Enter a profile name                          | 请输入存档名             | Enter a profile name                          | Editor 已完成                        |
| No profile selected                           | 未选择存档信息           | No profile selected                           | Manager 已完成                       |
| Please select a profile                       | 请选择一个存档信息       | Please select a profile                       | Manager 已完成                       |
| Delete profile                                | 删除存档信息             | Delete profile                                | Manager 已完成                       |
| Are you sure you wish to delete this profile? | 确定要删除此存档信息吗？ | Are you sure you wish to delete this profile? | Manager 已完成                       |

版本标签见第 3 节。`Profiles Path` 的简体中文为 `存档信息文件路径`，`Change` 为 `修改`，`Profile File` 为 `存档信息文件`；这些属于全局 Settings，不是 Gen 8 Manager 自身按钮。

## 9. 与现有档案模块的复用点

### 9.1 直接复用

- Gen 4 `nationalDex` 字段、TID/SID 校验、临时默认档案与版本过滤结构。
- Gen 3/4/5 的 schema 校验、唯一 id、JSON backup、按 id 合并导入、IndexedDB 主存储与 localStorage 镜像。
- Gen 5 `useGen5Profiles` 的串行 repository queue、`stateRef`、`busy` 与“保存成功后再发布 state”模式。该实现比 Gen 3/4 基于闭包的并发提交更适合支持快速选择、编辑和拖动重排。
- Gen 5 Manager 的拖动排序、显式上下移动、完整表格键盘操作、导入/导出和居中 Editor modal。
- 现有三代档案的 `selectedProfileId`，避免复制 PokeFinder 的选中索引问题。

### 9.2 Gen 8 差异

- 版本只有 Sword、Shield、Brilliant Diamond、Shining Pearl，不含 DS Type、Language、MAC、Timer0、缓存文件或校准器。
- 业务字段是 `nationalDex`、`shinyCharm`、`ovalCharm`；没有 Gen 3 `deadBattery`、Gen 4 Unown 数据或 Gen 5 Memory Link/N's Pokémon released。
- Profile Manager 不执行 RNG，不需要 Wasm 或 Worker。后续 Gen 8 RNG 模块只消费选中档案。
- 上游 Manager 表格只有 6 列并省略 National Dex；领域模型仍必须保存该字段。
- SwSh 与 BDSP 调用方使用不同版本过滤器，需要两个正确的临时默认档案。
- 新建编辑器默认 Sword，但缺字段 JSON 默认 Brilliant Diamond；实现时应显式区分“新建 draft 默认值”和“兼容解析默认值”。

## 10. 上游文件 SHA-256

```text
2AC04F57405233ED252F9DEBAE0CADCBA9F56A6A1D8CF42355CE7E3AB6885899  Core/Enum/Game.hpp
E3276CF92004414480F26D48F451D9F034EB54B01E6FEDFD468A366153832E8A  Core/Gen8/Profile8.cpp
7ECD8D57A714520497096F1D69B5B0C68672E87EE7F1D46AD00DCD9DD4C72C71  Core/Gen8/Profile8.hpp
696607B87F5D88E21380D5C4119F78A2FB0C4402EFFD2D814706E08EA7E99B0F  Core/Parents/Profile.cpp
0CEA63D0CEC9D0F68003C94FE91BFB8076C6FA514F262945F92907C822D996C0  Core/Parents/Profile.hpp
112DD09BFA55ABFD0684507CA70170FEF3EF862256F7C3C60D27BBA7EBF5A236  Core/Parents/ProfileLoader.cpp
A69BACB80DFC19D03500EF8EF5DE3801D138D3E8FE74B320A9F996BB0108EC14  Core/Parents/ProfileLoader.hpp
83A93A8C18957D45CF391A14E92036E7D158D8DD812BC24BCB27EF60D30D6794  Form/Controls/ComboBox.cpp
F9A4BC8018C5E9D38BEF8170AF4937C51F0292D81693DD5DCAB85C65218C635B  Form/Controls/ComboBox.hpp
51B4F88667748825CE5091600BD2C5EE7F0152912BFC25856004319E41863FCA  Form/Controls/TextBox.cpp
F216F3D15168487B037F0BDC478F3265179B4297B0F0B70A370ED412AEB9AAF2  Form/Controls/TextBox.hpp
4B2D09EECCC36B474C22FE335181B9B16C5A5D27810F174D14DF0E6B30A9D9AC  Form/Gen8/Profile/ProfileEditor8.cpp
B3D9467E2B0FFF759FCDB03C630A7D33C47B4788784E4ABE3A8DCF625F58CFB5  Form/Gen8/Profile/ProfileEditor8.hpp
D71128EE3EF7A04B78EB1E6C89ED2897157CCB2BD808853A6240340F8BDF4D1F  Form/Gen8/Profile/ProfileEditor8.ui
459B9D3E4AC976DE98524A3510BDBCE138BA3C541726AD8802D9D71817B3BEC7  Form/Gen8/Profile/ProfileManager8.cpp
95A4A8E30B15D3939F2803A02CEF79A1FF9F8B636B0D31C9C1BF2B18C40B3101  Form/Gen8/Profile/ProfileManager8.hpp
E7315F77004DF33A43E70D70C65CB8CC849F18896B9FB38E76D7E5E307620E54  Form/Gen8/Profile/ProfileManager8.ui
A23FD36B29158C68E0A733AFC37C326F386B786F5BBBDC0E3C2A8292CB7C96F8  Form/Gen8/Profile/ProfileDisplay8.cpp
7FC48BBF5DAF62E2C1758EF828275859D2561595118EBF1C7DDAC8920E966C66  Form/Gen8/Profile/ProfileDisplay8.hpp
5FCD5F9A142DC4798E8EACDCFB5668ED562DB29A9D2FB6F981E94E5C602752EF  Form/Gen8/Profile/ProfileDisplay8.ui
6FEE2AC2BB742401916552B8FC976E2754A94BCEA6B9922D0B48933289FDB569  Model/Gen8/ProfileModel8.cpp
99407490DCE1C859DFE95A7E2F598F542AB76DC4B356355C0D9B8E6D1350BDB9  Model/Gen8/ProfileModel8.hpp
DD901B2E3D2366CC78FE88ABBB969E9961AAAD4EB9D4772C380E994D6C56B50B  Form/Util/Settings.cpp
4F09496BCB6686E412C617368E11E03B5D34FA41DEAFF6A6B67BA25215A82CE2  Form/Util/Settings.ui
683304CC8B90FE380AF2C81DC1762D0EA5C1EE1D7DF03A51ADA80D1453E1FA18  main.cpp
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
D67358790583FEBF22227ABF10B002EBAEC02E797EA08E125093CEA8C36F665F  Form/i18n/PokeFinder_ja.ts
```

## 11. 实现文件

- `src/features/gen8profiles/domain.ts`
- `src/features/gen8profiles/repository.ts`
- `src/features/gen8profiles/useGen8Profiles.ts`
- `src/features/gen8profiles/Gen8ProfilesPanel.tsx`
- `src/features/gen8profiles/Gen8ProfilesPanel.css`

## 12. 验证

- 已通过：上游 Form、Core、ProfileLoader、输入控件、Model、Settings 与中日翻译的静态核对，并记录上述 SHA-256。
- 已通过：`npm test -- src/features/gen8profiles` 共 2 个测试文件、13 项测试，覆盖四个版本、完整字段、原始名称保存、`uint16_t` 边界、备份格式、重复 id、IndexedDB 镜像、localStorage 回退、镜像较新状态恢复、localStorage 不可用和部分清空失败。
- 已通过：`npm run verify`，包含全仓 Prettier、ESLint、TypeScript、85 个测试文件共 341 项测试，以及 Web/PWA 构建。
- 已知警告：Gen 3 Egg、Gen 3 Wild 与 Gen 5 Hidden Grotto 的 TanStack Virtual Hook 仍触发 3 条 React Compiler 兼容警告；Vite 仍提示主包与大型 Wasm chunk 超过默认 500 kB 阈值。本模块没有新增验证错误。
- 不适用：本模块不含 RNG 算法，因此没有 Wasm、Worker 或原生 C++ 夹具。
- 待验收：部署后的桌面/移动端界面、拖动、键盘、导入导出和浏览器持久化仍需使用外部 Chrome/Edge 与项目所有者共同确认。
