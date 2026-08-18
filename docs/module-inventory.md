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
| 3    | Gen VI  | Event / Mystery Gift RNG                 | 计划   |
| 4    | Gen VI  | Wild RNG，包括普通野生、群聚、钓鱼与碎岩 | 计划   |
| 5    | Gen VI  | DexNav RNG                               | 计划   |
| 6    | Gen VI  | Poke Radar RNG                           | 计划   |
| 7    | Gen VI  | Egg RNG                                  | 计划   |
| 8    | Gen VI  | ID RNG                                   | 计划   |
| 9    | Gen VI  | Main Seed Finder                         | 计划   |
| 10   | Gen VI  | TinyMT Timeline Tool                     | 计划   |
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
| 23   | 公共    | KeyBV                                    | 计划   |
| 24   | 公共    | Misc. RNG Tool                           | 计划   |
| 25   | 公共    | TSV List                                 | 计划   |
| 26   | 公共    | IV Range / IV Template                   | 计划   |
| 27   | 公共    | NTR Helper                               | 不开发 |

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

1. PokeFinder 4.3.2 产品模块、3DSRNGTool Gen VII 与公共 Profile Manager 已实现。
2. 下一模块为 3DSRNGTool Gen VI Event / Mystery Gift RNG；字段、控件边界和算法以对应 WinForms/Core 源码为准。
3. 继续核对其余模块库存，不提前合并不同上游工作流；`NTR Helper` 除外。
4. 全部模块完成后执行全仓验证、Actions 部署和生产页面回归。
