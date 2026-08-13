# 第三世代个体值计算器

本文说明全局个体值计算器的输入、反推算法和界面边界。该工具对齐 PokeFinder 4.3.2 `IVCalculator`、`IVChecker` 与 `Nature`，不执行 RNG 搜索，也不占用 Wasm Worker。

## 1. 用途

用户选择第三世代宝可梦、性格和可选觉醒力量，输入一次或多次等级与六项实际能力值，工具返回每项可能的个体值集合以及下一次能够进一步区分候选值的等级。

计算器是应用全局悬浮工具，在 ID 与 Static 工作区均可使用，默认收起。统一工具轨的 `IV` 按钮打开独立计算器面板；Static 筛选区的“个体值计算器”按钮会直接展开同一工具。面板支持点外关闭、`Escape` 和显式关闭按钮；后两种方式会恢复触发按钮焦点。

## 2. 能力值公式

实现逐项移植 `Nature::computeStat`。第三世代不考虑努力值时：

```text
base = floor((2 * BaseStat + IV) * Level / 100)
HP   = base + Level + 10
Stat = floor((base + 5) * NatureModifier)
```

非 HP 能力值的性格修正为 `0.9`、`1.0` 或 `1.1`。未指定性格时，计算器同时接受中性值及非 HP 的 `floor(neutral * 0.9)`、`floor(neutral * 1.1)`，与上游行为一致。

## 3. 反推与多行交集

每行对六项能力值分别枚举 `0..31`：

1. 使用所选性格计算每个 IV 对应的能力值。
2. 按上游 `calculateIVs` 记录命中值的最小值与最大值，并保留两者之间的连续 IV 范围；未指定性格时同时比较中性、上升与下降修正。
3. 多行输入对同一能力项取集合交集。
4. 指定觉醒力量时，再按六项 IV 奇偶组合过滤候选。

候选连续时显示为 `0-2`，不连续时使用 `0-2, 5, 7-8`。没有候选时显示上游“无效值”。第三世代没有 Characteristic，界面不显示该控件。

## 4. 下一级

`Next level` 从最后一行等级的下一级开始检查到 100。若某能力项的相邻候选 IV 在某等级首次产生不同能力值，则返回该等级；候选少于两项或到 100 仍无法区分时保留当前等级。

未指定性格时，上游对“下一级”使用中性性格估算，因此界面保留上游英文提示：`Next level may not be completely accurate without specifying a nature`。

## 5. 输入限制

输入限制已对照 `IVCalculator.cpp::addEntry`：

| 输入         | 范围         | Web 行为                  |
| ------------ | ------------ | ------------------------- |
| Game         | Gen III      | 固定 `Emerald/RS/FRLG`    |
| Pokémon      | `1..386`     | 使用上游第三世代物种名称  |
| Altform      | Deoxys 4 种  | 仅 Deoxys 显示            |
| Nature       | 无或 `0..24` | 下拉框                    |
| Hidden Power | 无或 `0..15` | 下拉框                    |
| Level        | `1..100`     | 每行独立输入              |
| HP           | `1..651`     | 与上游 SpinBox 最大值一致 |
| Atk          | `1..437`     | 与上游 SpinBox 最大值一致 |
| Def          | `1..545`     | 与上游 SpinBox 最大值一致 |
| SpA          | `1..435`     | 与上游 SpinBox 最大值一致 |
| SpD          | `1..545`     | 与上游 SpinBox 最大值一致 |
| Spe          | `1..479`     | 与上游 SpinBox 最大值一致 |

## 6. 实现边界

个体值反推只枚举每项 32 个确定值，属于轻量工具逻辑，使用 TypeScript 可以直接复用到 Static 的“显示能力值”视图并保持即时响应。生产 RNG 算法仍保留在 C++/Emscripten Wasm Worker；本模块不改变该架构边界。

宝可梦选择使用 `AutoCompleteComboBox.tsx`。其行为对应 PokeFinder `Form/Util/IVCalculator.cpp:39` 调用的 `ComboBox::enableAutoComplete()`：可编辑、禁止自由项插入、包含匹配与弹出候选。2026-08-12 的本地 UI 验收中，输入 `皮卡丘` 后可由候选列表和方向键/Enter 选择；生产页的值反推固定输入也已在外部 Chrome 验证。

## 7. 上游与验证入口

主要上游文件：

- `Form/Util/IVCalculator.cpp`
- `Form/Util/IVCalculator.ui`
- `Core/Util/IVChecker.cpp`
- `Core/Util/Nature.hpp`
- `Core/Util/Nature.cpp`
- `Core/Resources/Embed/embed_personal.py`
- `Form/i18n/PokeFinder_zh.ts`
- `Form/i18n/PokeFinder_ja.ts`

仓库验证入口：

- 算法边界：`src/features/ivcalculator/domain.test.ts`
- 界面：`src/features/ivcalculator/Gen3IvCalculator.tsx`
- 基础能力值：`src/features/shared/gen3Personal.ts`
- 物种名称：`src/features/shared/gen3Species.ts`

运行：

```bash
npm test
npm run dev:ui
```

自动化浏览器冒烟只验证界面交互和确定性计算；最终输入与结果验收由项目所有者执行。

生产页 `https://haku76.github.io/PokeRNGKit/` 已验证：新增行后为两行、删除后回到一行；妙蛙种子、Lv.100、勤奋性格、能力值 `231/134/134/166/166/126` 返回六项 IV 均为 `31`，下一级均为 `100`。2026-08-13 已确认生产宝可梦组合框可点击展开和选择；独立悬浮面板样式仍待新部署复验。
