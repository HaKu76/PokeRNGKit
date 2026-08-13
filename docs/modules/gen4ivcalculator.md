# 个体值计算器数据源

本文件记录全局个体值计算器使用的 PokeFinder Personal 数据源和第四、第五、第八世代差异。它不再是 G4 页面专属工具，也不存在独立的 G3/G4 展开状态；工具轨 `IV` 按钮在所有工作区打开唯一面板。

## 1. 功能

- 支持 Gen III、Platinum、HeartGold/SoulSilver、BW2、Sword/Shield 和 Brilliant Diamond/Shining Pearl 的个人数据。
- 支持物种、形态、性格、个性和觉醒力量筛选；物种使用与 PokeFinder `ComboBox::enableAutoComplete()` 一致的可编辑、包含匹配、弹出候选和 `NoInsert` 组合框。
- 支持多行等级与六项能力值观察，输出六项 IV 候选范围和下一次可区分等级。
- 中文术语使用“觉醒力量”和“个性”。

## 2. 输入边界

| 输入     | 范围                                                                |
| -------- | ------------------------------------------------------------------- |
| Game     | `Gen III / Platinum / HGSS / BW2 / SwSh / BDSP`                     |
| 物种     | 按所选数据集：`1..386 / 1..493 / 1..493 / 1..649 / 1..898 / 1..493` |
| 形态     | 按所选 PokeFinder Personal 的 `formCount` 与 `formStatIndex`        |
| 性格     | 无或 `0..24`                                                        |
| 个性     | 无或上游特性枚举                                                    |
| 觉醒力量 | 无或 `0..15`                                                        |
| 等级     | `1..100`                                                            |
| HP       | `1..651`                                                            |
| Atk      | `1..437`                                                            |
| Def      | `1..545`                                                            |
| SpA      | `1..435`                                                            |
| SpD      | `1..545`                                                            |
| Spe      | `1..479`                                                            |

## 3. 数据源与兼容导出

不保存按世代拆分的计算器状态。个人数据、物种、能力、个性和三语资源由 `scripts/generate_gen4_iv_data.mjs` 从 PokeFinder 4.3.2 Gen3、Gen4、Gen5、Gen8 resources 生成；G4 Static 继续通过兼容导出读取 Platinum/HGSS 数据。

算法与输入控件对照 PokeFinder `Form/Util/IVCalculator.cpp`、`Core/Util/IVChecker.cpp`、`Core/Util/Nature.cpp`、`Core/Parents/PersonalLoader.cpp` 和 Gen III/IV/V/VIII Personal resources。单元测试位于 `src/features/gen4ivcalculator/domain.test.ts`。

2026-08-13 的生产 UI 验收发现当前 Pages 包仍使用原生物种下拉框，与同一上游 `IVCalculator` 的自动完成设置不一致；源码已改为共享 `AutoCompleteComboBox`，并将入口合并为全局六数据集选择，待新部署后验证鼠标点击、包含筛选、方向键/Enter、游戏切换和形态重置。
