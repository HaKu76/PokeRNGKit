# 公共 IV Range / IV Template

本模块实现 3DSRNGTool 的 `IVRange` 与 `IVTemplate` 公共辅助工具，入口位于右下角悬浮工具菜单。它不新增 RNG 算法，通过同页事件将范围和双亲 IV 应用到 Gen VI/Gen VII Egg 工作区。

## 上游来源

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Subforms\IVRange.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Subforms\IVRange.Designer.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Subforms\IVTemplate.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Subforms\IVTemplate.Designer.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Controls\StringItem.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm_CtrlGroup.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm_Egg.cs`

## 输入规则

六项统计顺序固定为 `HP, Atk, Def, SpA, SpD, Spe`。IV Range 选项和闭区间如下：

| 选项          | 范围     |
| ------------- | -------- |
| `-`           | `0..31`  |
| `Perfect`     | `31..31` |
| `Fantastic`   | `30..30` |
| `Very Good`   | `26..29` |
| `Pretty Good` | `16..25` |
| `Decent`      | `1..15`  |
| `No Good`     | `0..0`   |

IV Template 严格接受 `Name = 1,2,3,4,5,6`，名称不能为空，必须恰好六项，每项为整数 `0..31`。默认模板为 `Perfect`、`6Zero`、`HPIce` 和 `HPFire`。`Set as Male` / `Set as Female` 保留上游英文标签。

## 实现位置

- `src/features/ivtools/domain.ts`：范围映射、模板解析/格式化、localStorage 和事件协议。
- `src/features/ivtools/IvToolsPanel.tsx`：IV Range / IV Template 标签页、增删改存和应用操作。
- `src/features/ivtools/IvToolsPanel.css`：实体悬浮面板、候选控件和移动端布局。
- `src/features/gen6egg/Gen6EggPanel.tsx`、`src/features/gen7egg/Gen7EggPanel.tsx`：接收范围和双亲 IV 应用事件。

## 持久化与边界

模板保存于 `localStorage` 键 `pokerngkit-iv-tools-v1`，同页和跨标签页通过共享事件更新。应用范围只更新 Egg 的 `ivMin` / `ivMax`；应用模板只更新对应父亲或母亲的六项 IV，不覆盖其他孵化参数。

## 当前验证

- 已通过：`npx vitest run src/features/ivtools/domain.test.ts`（3 项）。
- 已通过：改动文件 ESLint、`npm run typecheck`、`npm run format:check` 和 `git diff --check`。
- 已通过：完整 `npm run verify`，包含 162 个测试文件共 577 项测试、Vite 转换 2268 个模块和 PWA 220 项预缓存资源。
- 未运行：外部 Chrome/Edge UI 回归和生产页面算法验收；两项按全部 3DS 模块完成后的统一验收门槛执行。
