# 第四世代个体值计算器

第四世代个体值计算器是 G4 页面统一工具轨中的独立浮层，不复用第三世代计算器的物种数据、状态或展开键。工具轨 `IV` 按钮打开面板，面板支持点外关闭、`Escape` 和显式关闭按钮；后两种方式会恢复触发按钮焦点。它不执行 RNG 搜索，仅按 Gen IV 个人数据反推能力值对应的 IV 候选。

## 1. 功能

- 支持 Platinum 和 HeartGold/SoulSilver 的个人数据。
- 支持物种、形态、性格、个性和觉醒力量筛选；物种使用与 PokeFinder `ComboBox::enableAutoComplete()` 一致的可编辑、包含匹配、弹出候选和 `NoInsert` 组合框。
- 支持多行等级与六项能力值观察，输出六项 IV 候选范围和下一次可区分等级。
- 中文术语使用“觉醒力量”和“个性”。

## 2. 输入边界

| 输入     | 范围                            |
| -------- | ------------------------------- |
| 物种     | `1..493`                        |
| 形态     | 按 PokeFinder Gen IV form table |
| 性格     | 无或 `0..24`                    |
| 个性     | 无或上游特性枚举                |
| 觉醒力量 | 无或 `0..15`                    |
| 等级     | `1..100`                        |
| HP       | `1..651`                        |
| Atk      | `1..437`                        |
| Def      | `1..545`                        |
| SpA      | `1..435`                        |
| SpD      | `1..545`                        |
| Spe      | `1..479`                        |

## 3. 独立状态与来源

展开状态键为 `pokerngkit-gen4-iv-calculator-expanded`。个人数据、物种、能力、个性和三语资源由 `scripts/generate_gen4_iv_data.mjs` 从 PokeFinder 4.3.2 Gen IV resources 生成；G3 计算器继续使用自己的模块和全局状态。

算法与输入控件对照 PokeFinder `Form/Util/IVCalculator.cpp`、`Core/Util/IVChecker.cpp`、`Core/Util/Nature.cpp`、`Core/Gen4/Profile4.hpp` 和 Gen IV personal resources。单元测试位于 `src/features/gen4ivcalculator/domain.test.ts`。

2026-08-13 的生产 UI 验收发现当前 Pages 包仍使用原生物种下拉框，与同一上游 `IVCalculator` 的自动完成设置不一致；源码已改为共享 `AutoCompleteComboBox`，待新部署后验证鼠标点击、包含筛选、方向键/Enter 和形态重置。
