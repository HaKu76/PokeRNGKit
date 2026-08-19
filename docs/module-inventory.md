# PokeRNGKit 模块库存

本文记录完整产品范围、实现状态和上游入口。功能状态以仓库目录、模块文档和原生夹具为证据；“已实现”不等于完成生产页面验收。

## PokeFinder 4.3.2

| 世代或范围 | 已实现模块                                                                                                                                                 | 待实现模块 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Gen III    | IDs、Eggs、GameCube、Static、Wild、Profile Manager、GameCube Seed Finder、IVs to PID、PID to IVs、Jirachi Advancer、PokeSpot、Seed to Time、Spinda Painter | 无         |
| Gen IV     | Eggs、Event、IDs、Static、Wild、Profile Manager、IVs to PID、Seed to Time、Search Coin Flips、Search Calls、Roamer Map、Chained Shiny to SID               | 无         |
| Gen V      | Dream Radar、Eggs、Event、Hidden Grotto、IDs、Static、Wild、Profile Manager / Calibrator、Adjacent Seeds、IV Cache Finder、SHA1 Cache Finder               | 无         |
| Gen VIII   | Profile Manager、IDs、Eggs、Event、Raids、Static、Underground、Wild、Den Map                                                                               | 无         |
| 全局工具   | Encounter Lookup、IV Calculator、Researcher、Settings                                                                                                      | 无         |

PokeFinder 核对入口：

- `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master\Form\MainWindow.cpp`
- `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master\Form\MainWindow.ui`
- `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master\Form\Gen3`
- `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master\Form\Gen4`
- `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master\Form\Gen5`
- `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master\Form\Gen8`

仓库另有 PokeFinder 主菜单之外的 `Initial Seed Finder`、Advance Finder 与宝可病毒查询；它们保留为已实现扩展，不替代上表中的上游模块。

## 3DSRNGTool

主要行为来源：`C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN` revision `359bdd7a9ff7c145fec12302cf43da932923fa62`。

| 编号 | 范围    | 功能                                     | 状态   |
| ---- | ------- | ---------------------------------------- | ------ |
| 1    | Gen VI  | Stationary RNG                           | 已实现 |
| 2    | Gen VI  | Pokemon Link / Transporter RNG           | 已实现 |
| 3    | Gen VI  | Event / Mystery Gift RNG                 | 已实现 |
| 4    | Gen VI  | Wild RNG，包括普通野生、群聚、钓鱼与碎岩 | 已实现 |
| 5    | Gen VI  | DexNav RNG                               | 已实现 |
| 6    | Gen VI  | Poke Radar RNG                           | 已实现 |
| 7    | Gen VI  | Egg RNG                                  | 已实现 |
| 8    | Gen VI  | ID RNG                                   | 已实现 |
| 9    | Gen VI  | Main Seed Finder                         | 已实现 |
| 10   | Gen VI  | TinyMT Timeline Tool                     | 已实现 |
| 11   | Gen VII | Stationary RNG                           | 已实现 |
| 12   | Gen VII | Event / Mystery Gift RNG                 | 已实现 |
| 13   | Gen VII | Wild RNG                                 | 已实现 |
| 14   | Gen VII | SOS RNG                                  | 已实现 |
| 15   | Gen VII | Egg RNG                                  | 已实现 |
| 16   | Gen VII | ID RNG                                   | 已实现 |
| 17   | Gen VII | Main RNG Tool                            | 已实现 |
| 18   | Gen VII | Egg Seed Finder                          | 已实现 |
| 19   | Gen VII | Battle Tree Trainer RNG                  | 已实现 |
| 20   | Gen VII | Festival Plaza Facility RNG              | 已实现 |
| 21   | Gen VII | Poke Pelago 特殊遭遇                     | 已包含 |
| 22   | 公共    | Profile Manager                          | 已实现 |
| 23   | 公共    | KeyBV                                    | 已实现 |
| 24   | 公共    | Misc. RNG Tool                           | 已实现 |
| 25   | 公共    | TSV List                                 | 已实现 |
| 26   | 公共    | IV Range / IV Template                   | 已实现 |
| 27   | 公共    | NTR Helper                               | 不开发 |

## TinyFinder（Gen VI 扩展）

主要行为来源：本地 C:\Users\Hakuhiro\Desktop\project\TinyFinder-main，公开来源为 Bambo-Rambo/TinyFinder。来源、许可证和代码入口见 third_party/tinyfinder/UPSTREAM.md。

| 编号 | 功能                                                   | 状态                                |
| ---- | ------------------------------------------------------ | ----------------------------------- |
| T1   | TinyMT 日期 / Index Searcher                           | 已实现（gen6tinyindex）             |
| T2   | Index 筛选与状态查看                                   | 已实现（gen6tinyindex）             |
| T3   | ID RNG                                                 | 已实现（与 gen6id 合并核对）        |
| T4   | Normal Wild / Friend Safari                            | 已实现（与 gen6wild 合并核对）      |
| T5   | Fishing RNG                                            | 已实现（与 gen6wild 合并核对）      |
| T6   | Rock Smash RNG                                         | 计划                                |
| T7   | Horde RNG                                              | 已实现（与 gen6wild 分支核对）      |
| T8   | Honey Wild RNG                                         | 计划                                |
| T9   | Poke Radar RNG                                         | 已实现（与 gen6pokeradar 合并核对） |
| T10  | Ambush Encounter                                       | 计划                                |
| T11  | DexNav Moving / Searching                              | 已实现（与 gen6dexnav 合并核对）    |
| T12  | Victory Road Swooping                                  | 计划                                |
| T13  | MT Seed Searcher（IV、PID、PID reroll、EC/PID、Horde） | 计划                                |
| T14  | MT 初始 Seed / Time Finder                             | 计划                                |

TinyFinder 已实现模块仍需逐字段检查其特有分支、日期/Index 语义和固定夹具，不能仅凭同名 3DSRNGTool 模块视为完成。

## 3DSTimeFinder 日期/时间反查

主要行为来源：本地 C:\Users\Hakuhiro\Desktop\project\3DSTimeFinder-master，公开来源为 Admiral-Fish/3DSTimeFinder。来源、GPL-3.0 和入口见 third_party/3dstimefinder/UPSTREAM.md。

| 编号 | 世代    | 功能                                  | 状态                   |
| ---- | ------- | ------------------------------------- | ---------------------- |
| TF1  | Gen VI  | Stationary 时间/初始 Seed Searcher    | 已实现（工程验证通过） |
| TF2  | Gen VI  | Event 时间/初始 Seed Searcher         | 已实现（工程验证通过） |
| TF3  | Gen VII | Stationary 时间/初始 Seed Searcher    | 已实现（工程验证通过） |
| TF4  | Gen VII | Event 时间/初始 Seed Searcher         | 已实现（工程验证通过） |
| TF5  | Gen VII | Wild 时间/初始 Seed Searcher          | 已实现（工程验证通过） |
| TF6  | Gen VII | ID 时间/初始 Seed Searcher            | 已实现（工程验证通过） |
| TF7  | Gen VI  | Profile Manager / Editor 时间字段     | 已实现（需核对）       |
| TF8  | Gen VII | Profile Manager / Editor / Calibrator | 已实现（需核对）       |

Options、Language 和结果表通用操作属于应用外壳或模块支撑，不单独作为 RNG 模块提交。

Poke Pelago 生成已按 3DSRNGTool `Stationary7` 的特殊分支纳入 `Stationary RNG`，不再重复建立第二个生产 RNG 模块；其他特殊遭遇仍按对应上游工作流继续核对。

## 界面收纳计划

以下归类是界面入口规划，不改变算法模块、Worker 或 Wasm 的独立边界：

| 类型       | 保留独立工作区                                                                                              | 可收纳到悬浮工具菜单或模块内辅助入口                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| PokeFinder | 各世代 IDs、Eggs、Event、Raids、Static、Underground、Wild、GameCube、Dream Radar、Hidden Grotto、Researcher | Profile Manager、IV Calculator、Encounter Lookup、Seed/Advance 辅助工具、Den Map、Spinda Painter、PokeSpot、Jirachi Advancer |
| 3DSRNGTool | Gen VI / Gen VII Stationary、Event、Wild、Egg、ID，以及主 Seed / Main RNG 工作区                            | Profile Manager、KeyBV、Misc. RNG Tool、TSV List、IV Range / Template、TinyMT Timeline、Egg Seed Finder                      |

收纳规则：

- 核心生成与检索流程始终保留可直接访问的模块入口。
- 只在工具具有全局性、轻量输入或明显依附于当前模块时收纳；不能为了减少导航项而把多个无关任务塞进同一弹层。
- PC 端参数与主要操作尽量位于首屏，页面本身默认不滚动；结果表使用独立滚动区域。内容过多时使用标签和折叠高级设置，不缩小字体或触控目标。
- 移动端使用抽屉、单列重排或专用面板，不要求复刻 PC 的无页面滚动布局。

## 实施顺序

1. PokeFinder 4.3.2 产品模块、3DSRNGTool Gen VII、Gen VI Stationary / Pokemon Link / Event / Wild / DexNav / Poke Radar / Egg / ID 与公共 Profile Manager 已实现；当前不再回退到旧世代 UI 整改，先完成 TF5/TF6 时间反查主线。
2. 3DSRNGTool Gen VI Main Seed Finder 已实现；字段、控件边界和算法以对应 WinForms/Core 源码为准。
3. Gen VI TinyMT Timeline Tool、公共 KeyBV、Misc. RNG Tool、TSV List 与 IV Range / Template 已实现；随后继续 Gen VI 时间反查与 TinyFinder 缺口；`NTR Helper` 除外。
4. TF5/TF6、IV Range / Template、Gen VI 时间反查和 TinyFinder 缺口全部完成后，执行全仓验证、Actions 部署和生产页面回归。
5. 生产页面回归前固定执行八项 UI 门槛：实体不透明悬浮窗、Demo 候选控件、图标居中、自适应列宽、定点三栏布局、Wild 筛选对齐、存档工具悬浮收纳、Encounter Lookup 去除遗留有色粗描边。

## PokemonRNGGuides 最高优先级规划

交叉核对来源为本地 `C:\Users\Hakuhiro\Desktop\project\PokemonRNGGuides-main`，
对应公开项目 `zaksabeast/PokemonRNGGuides` revision
`c0b2bb664f04a4ef052e6dd4d831351703fa4047`。教程只用于确定用户工作流、入口命名和
模块优先级；算法、输入边界和许可证仍以 PokeFinder 4.3.2 与
3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 为准。

| 优先级 | 教程主线缺口或入口                 | 计划动作                                                                                                        | 依据                                                                                        |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| P0     | Gen VII Initial Seed / Time Finder | TF3-TF6 已落地；TF5/TF6 工程验证完成，Profile Calibrator 的存档信息继续使用悬浮菜单                             | Gen VII `Finding Initial Seed with Clocks.mdx`、`Time Finder.js (Citra).mdx`                |
| P1     | Gen VI Initial Seed / Time Finder  | 实现 TF1/TF2（Stationary/Event），并复核 Gen VI Main Seed Finder 与 DexNav/PokeRadar 的时间流程                 | Gen VI `DexNav.mdx`、`PokeRadar.mdx`、`Friend Safari RNG Guide.mdx`                         |
| P2     | Gen VII Egg 配置入口               | 实现公共 `TSV List`，随后实现 `IV Range / IV Template`，覆盖教程中的 ESV/异色和个体值模板工作流                 | Gen VII 两篇 `Egg RNG` 教程明确要求 Edit TSV List；3DSRNGTool `IVRange.cs`、`IVTemplate.cs` |
| P3     | Gen IV 教程工具                    | 评估并实现 `Gen4SeedFinder`、Voltorb Flip Seed/Board；与现有 Gen4 Seed to Time、Advance、Static/Wild 去重       | Gen IV `Swarm.mdx`、`Voltorb Flip.mdx`、`Retail Initial Seed.mdx`                           |
| P4     | Gen V 时间/参数入口                | 复核教程中的 DS 参数、初始 Seed、Dream Radar/Entralink 工具是否已有对应工作区；只补真实缺口                     | Gen V `Find DS Parameters.mdx`、`Retail Find DS Parameters.mdx`、`Dream Radar.mdx`          |
| P5     | TinyFinder 扩展                    | 最后再排 Rock Smash、Honey Wild、Ambush、Victory Road Swooping、MT Seed/Time Finder；这些不在当前教程高频主线中 | `docs/module-inventory.md` TinyFinder T6/T8/T10/T12-T14                                     |

### 侧边栏顺序

按项目所有者确认的共有主线同步调整世代组内顺序：`存档信息/ID -> Seed 相关 -> 定点 ->
野生（DexNav / Poke Radar / Underground 等） -> 蛋 -> 事件 -> 其他辅助扩展`。Main RNG、
时间线和时间反查属于 Seed 相关入口；SOS、Hidden Grotto 等按野生分支就近排列。全局 Profile
Manager、Researcher、TSV List、IV Template 和存档工具继续保留在右下角悬浮菜单，不重复
出现在世代导航中。

### 去重边界

- 已实现的 Gen VII Main、Stationary、Wild、SOS、Egg、Event、Egg Seed Finder、Battle
  Tree、Festival Plaza 与 Gen VI Main Seed、Stationary、Wild、DexNav、Poke Radar 不重做算法，
  只按教程核对入口、字段、流程和缺失分支。
- `PokemonRNGGuides` 中的教程图片、Rust/React 源码和外部 CFW/NTR 操作不复制进产品；只记录
  可由本地静态工具完成的步骤和输入。

### 全世代人工复核

本轮按本地教程目录逐文件检查非翻译正文，共 12 个分组、165 篇指南；结论只用于工作流、
入口和排期，不改变 PokeFinder 4.3.2 与 3DSRNGTool 的产品边界。教程中超出本项目范围的
内容明确标记为不开发，避免把指南站的全部内容误当成 RNG 模块需求。

| 教程分组                          | 指南数量 | 人工确认结论                                                                                                                                          | 对 PokeRNGKit 的动作                                             |
| --------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Gen 2                             | 3        | PokeFinder/3DSRNGTool 范围外                                                                                                                          | 不开发，不新增 Gen II 入口                                       |
| Gamecube                          | 4        | 对应现有 Gen 3 GameCube、Channel、PokeSpot/Jirachi 流程                                                                                               | 只做字段和教程入口核对，不重做算法                               |
| Gen 3                             | 44       | IDs、Static、Wild、Egg、Seed、IV、Pokerus 等均已有对应模块或全局工具                                                                                  | 只补教程流程缺口，不新增同名核心模块                             |
| Gen 4                             | 34       | Static、Wild、Egg、ID、Advance、Seed to Time、Wondercard 已覆盖；Voltorb Flip、Swarm、Gen4SeedFinder 是真实辅助缺口                                   | 进入 P3，先评估工具边界和上游来源                                |
| Gen 5                             | 14       | IDs、Static、Wild、Egg、Event、Hidden Grotto、Dream Radar、Entralink、Cache 已覆盖                                                                    | 进入 P4，复核 DS 参数/初始 Seed 与 Entralink 分支                |
| Gen 6                             | 10       | Stationary、Wild、DexNav、Poke Radar、Egg、ID、Main Seed、TinyMT、Event、Transporter 已覆盖                                                           | 进入 P1，补 TF1/TF2 时间反查并核对教程入口                       |
| Gen 7                             | 19       | Main、Stationary、Wild、SOS、Egg、Event、ID、Egg Seed、Battle Tree、Festival Plaza 已覆盖；教程依赖 Time Finder、TSV 列表、IV 模板和 Island Scan 分支 | 进入 P0，先做 TF3/TF4，再做 TF5/TF6、TSV List、IV Range/Template |
| Brilliant Diamond / Shining Pearl | 8        | TID/SID、Static、Wild、Egg、Advancing 与 PokeFinder 工作流已有 Gen 8 对应模块                                                                         | 只核对教程入口和结果字段，不新增 BDSP 核心算法                   |
| Sword and Shield                  | 3        | Raid Seed 获取与 Raid RNG 对应现有 Gen 8 Raids                                                                                                        | 只核对无 CFW/有 CFW 工作流，不新增模块                           |
| Legends Arceus                    | 1        | 不在 PokeFinder 4.3.2 或 3DSRNGTool 目标范围                                                                                                          | 不开发                                                           |
| Tools and Emulators               | 21       | PokeFinder、PokeReader、模拟器、计时器和 NTR Helper 使用说明                                                                                          | PokeFinder/PokeReader 保持本地工具入口；NTR Helper 明确排除      |
| Transporter                       | 4        | Gen 6 Pokemon Link / Transporter 与离线补丁工作流                                                                                                     | 保持现有 `gen6bank`，只核对字段和教程链接                        |

人工复核后的主线固定为：`Gen 7 Initial Seed / Time Finder -> Gen 6 Initial Seed / Time Finder
-> TSV List / IV Template -> Gen 4 辅助工具 -> Gen 5 参数与时间缺口 -> TinyFinder 扩展`。
Gen 2、Legends Arceus 和 NTR Helper 不得因为教程存在而加入开发范围。
