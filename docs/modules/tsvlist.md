# 公共 TSV List

本模块实现本地优化版 `3DSRNGTool` 的 `TSVListForm`，用于维护 Gen VI/Gen VII Egg 的 Other TSV 列表。它是全局轻量工具，入口位于右下角悬浮工具菜单，不进入世代侧栏。

## 上游来源

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Subforms\TSVListForm.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm_Egg.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Resources\text\lang_zh.txt`（`B_TSVList=TSV列表`）

上游编辑器逐行调用 `int.TryParse`，只收集 `0..4095` 的整数；主窗体以逗号持久化列表，并将其传给 Egg 的 Other TSV 筛选。算法仍由 [Gen VI Egg](gen6egg.md) 与 [Gen VII Egg](gen7egg.md) 的 Wasm 模块执行，本模块不新增 RNG 实现。

## 输入与持久化

| 项目     | 规则                                                             |
| -------- | ---------------------------------------------------------------- |
| TSV      | `0..4095`，十进制；空白、逗号和分号可作为分隔符                  |
| 重复值   | 保留首次出现顺序，后续重复值丢弃                                 |
| 列表上限 | `4096` 项，与 4096-bit Other TSV 掩码一致                        |
| 空值     | 通过显式“清空”保存为空列表                                       |
| 存储     | `localStorage` 键 `pokerngkit-tsv-list-v1`，保存文本为换行分隔值 |

保存后通过 `pokerngkit-tsv-list-change` 同页事件通知当前 Egg 工作区；跨标签页使用标准 `storage` 事件。Gen VI/Gen VII Egg 首次加载和列表变化时读取该共享列表，仍允许在模块输入框内临时编辑。

## 界面

- 右下角悬浮工具菜单中的 `TSVList` 按钮打开实体浮动面板。
- 文本编辑区显示当前列表，状态区显示有效项数量与 `0..4095` 范围。
- 保存会规范化顺序、去重并忽略非法项；清空会显式写入空列表。
- 面板支持既有 FloatingToolPanel 的焦点收口、Escape、点外关闭、拖动和移动端宽度约束。

## 实现位置

- `src/features/tsvlist/domain.ts`：解析、规范化、持久化和跨组件订阅。
- `src/features/tsvlist/TsvListPanel.tsx`：悬浮编辑面板。
- `src/features/tsvlist/TsvListPanel.css`：面板布局和控件样式。
- `src/features/gen6egg/Gen6EggPanel.tsx`、`src/features/gen7egg/Gen7EggPanel.tsx`：共享列表同步。

## 当前验证

- 已通过：`npx vitest run src/features/tsvlist/domain.test.ts`（3 项）。
- 已通过：TSV List、App、Gen VI/Gen VII Egg 定向 ESLint。
- 已通过：`npm run format:check`、`git diff --check`。
- 已通过：`npm run verify`，包含全仓 ESLint、TypeScript、161 个测试文件共 574 项测试，以及 Vite/PWA 生产构建（2265 个模块、220 项预缓存资源）。
- 未运行：外部 Chrome/Edge UI 回归和生产页面算法验收；两项按项目总体验收门槛执行。
