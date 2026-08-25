# PokeRNGKit 项目进度与交接

## 2026-08-25 完美个体筛选扩展与工程验证

- 新增：Gen III、Gen IV、Gen V、Gen VI Egg 和 Gen VIII 相关 Generator/Searcher
  工作区统一支持 `Perfect IV Value` 与 `Perfect IV Count`，语义为六项个体值中
  不低于指定值的项目数量至少达到指定数量；默认值为 `31 / 0`，范围为 `0..31 / 0..6`。
- 接入：共享筛选控件、domain 校验、Worker 请求编码、Wasm bridge、API 版本与请求长度，
  并同步 TypeScript/C++ 固定请求夹具、预览测试、模块文档和简体中文标签。
- 更新：贡献记录第二条赞助人改为“厉害啊”，新增“千一”于 2026-08-25 贡献 20 RMB
  用于 AI Token；记录总额为 120 RMB。
- 已通过：`npm run format:check`、`git diff --check`、`npm run verify` 和
  `npm run wasm:test:native`；177 个测试文件、615 项测试、69 个 CTest、TypeScript 检查、
  Vite 生产构建和 PWA 预缓存均成功。构建保留既有大 chunk 警告，Lint 保留 1 条
  `Gen3StaticPanel.tsx` Hook 依赖警告。
- 未运行：`npm run verify:full`，本机未发现 `emcc`、`em++` 或 `emcmake`；外部 Chrome/Edge
  视觉验收、生产页面算法回归和 Windows EXE 实机验收也未运行。
- Git：当前分支为 `main`，本轮功能与文档改动已完成本地提交；推送 `origin/main` 时
  GitHub 443 连接被重置，网络恢复后需重试推送。

## 2026-08-25 贡献记录更新

- 修正：第二条赞助记录的赞助人名称改为“厉害啊”，保留 2026-08-23、50 RMB 和 AI Token 用途。
- 新增：第三条赞助记录为“千一”于 2026-08-25 赞助 20 RMB，用于 AI Token；贡献记录总额更新为 120 RMB。

## 2026-08-24 第三世代 Seed 工具合并

- 调整：侧栏将 `初始Seed检索`、`Seed查询时间` 和 `GameCube Seed查询` 合并为
  一个 `Seed工具` 入口，进入后使用三页签切换具体工作流。
- 保留：三个功能的 Wasm、Worker、输入限制、结果表和算法文档仍然独立；统一
  工作区让页签切换不卸载面板，因此已有输入、结果和检索状态不会被清空。
- 接入：Tips 中的 Back Seed 与 Seed to Time 快捷入口改为打开统一 Seed 工具并
  自动切换到对应页签。
- 已通过：本轮触及文件的 `npm run format:files`、全仓
  `npm run format:check` 与 `git diff --check`。
- 未运行：测试、Lint、TypeScript、构建、Wasm、浏览器验收和生产回归；这些仍需
  项目所有者对具体命令或 URL 授权。

## 2026-08-24 Gen III Back Seed 与 Seed to Time 流程标注

- 澄清：第三世代 `Initial Seed Finder` 的 `FRLG / RSE` 页签就是 Real96
  `FRLGRSEInitialSeedsFinder/backSeed.cpp` 的 Back Seed 反推流程，功能未丢失；
  现在页签显式显示为 `Back Seed (FRLG / RSE)`，并补充 Tips 入口。
- 修正：Tips 将 `Gen 3 Seed to Time` 放在定点 Searcher 得到的 32 位 Seed 与
  模拟器 Target Painting Timer 之间，明确其职责是桥接得到四位十六进制 16 位
  Seed；Back Seed 作为 FRLG/RSE 的独立反推分支保留。
- 保留：Target Painting Timer 只服务模拟器，默认十进制校准值为 `30`，不实现
  实机 Painting Reseeding。
- 调整：Target Painting Timer 已移入“第三世代Seed工具”的独立页签，右下角工具
  Rail 不再显示其入口；Tips 仍为全局浮窗，并可直接切换到该页签。回填定点
  Generator 的四位十六进制 Seed 行为保持不变。
- 调整：第四世代 `Swarm RNG` 已从右下角工具 Rail 移入第四世代侧边栏，作为独立
  工作区保留每日 Encounter Seed、MT 推进与目标帧记录流程；不与仅有 Swarm 遭遇
  表开关的第四世代野生乱数合并。
- 已完成：代码与文档已定向格式化；本轮未运行测试、Lint、TypeScript、构建、Wasm
  或浏览器验收。
- 下一步：由项目所有者决定是否授权工程验证、浏览器验收或提交。

## 2026-08-24 Actions #172 ESLint 修复

- 定位：GitHub Actions `32652282635` 在 `npm run verify -> npm run lint` 检查 `public/sw-update.js` 时因 Service Worker 全局 `self` 缺少声明而失败，Windows EXE、Pages 和生产部署步骤因此被跳过。
- 修复：为 `public/sw-update.js` 增加 ESLint `/* global self */` 声明，不改变 Service Worker 的安装、激活、接管和旧页面刷新逻辑。
- 已通过：本地 `npm run verify`；Prettier、ESLint、TypeScript、177 个 Vitest 文件共 615 项测试、Vite 生产构建和 PWA 预缓存均成功。构建保留既有大 chunk 非阻断提示。
- 当前：修复尚未提交或推送，等待项目所有者确认后再进入 GitHub Actions 重跑；外部 Chrome/Edge UI 验收和生产页面算法回归未运行。

## 2026-08-24 模块会话状态缓存与贡献记录

- 修复：应用按模块键缓存本页面会话中已访问的工作区；从定点乱数切换到野生乱数再返回时，表单输入、检索结果、排序和操作上下文不再因组件卸载而重置。
- 边界：非当前模块通过原生 `hidden` 与 `inert` 隐藏并禁止交互，仍保留 React 状态；刷新页面恢复现有默认状态，不把可能很大的结果集写入 localStorage 或 IndexedDB。
- 更新：贡献榜新增“厉害啊”于 2026-08-23 贡献 50 RMB 用于 AI Token 的记录，并增加日期列；记录总额同步更新为 100 RMB。
- 已通过：本轮触及文件格式化、全仓格式检查和 `git diff --check`。
- 未运行：测试、Lint、TypeScript、构建、浏览器切换回归和生产页面回归；本轮未取得对应具体命令或 URL 的授权。

## 2026-08-23 PWA 版本更新与旧缓存修复

- 修复：移除 `vite-plugin-pwa` 的简单自动注入注册脚本，改为应用启动时显式注册 Service Worker；新 Service Worker 接管已有页面后自动刷新，避免用户继续停留在旧版 JS/CSS。
- 迁移：新增 Service Worker 激活桥，在已有旧 Service Worker 控制的窗口中主动导航到新入口，覆盖旧用户第一次回访时仍先命中旧预缓存的场景。
- 防护：Service Worker 注册使用 `updateViaCache: "none"`，检查更新时跳过浏览器 HTTP 缓存。
- 更新：用户切回页面时立即检查更新，已打开页面每 5 分钟主动检查一次；入口 `index.html`、`sw.js` 和 Web Manifest 在 Cloudflare Pages 使用重新验证缓存头。
- 保留：继续使用 Workbox 的 `skipWaiting`、`clientsClaim`、预缓存和离线回退，不清理用户 IndexedDB/localStorage 存档数据。
- 已通过：本轮触及文件格式化和 `git diff --check`。
- 未运行：测试、Lint、TypeScript、构建、浏览器缓存迁移验收和生产回归；需要部署后在已有 Service Worker 的浏览器中确认自动刷新行为。

## 2026-08-23 第三、四世代顶部存档选择兜底

- 新增：在第三世代静态、野生、孵化、GameCube、PokeSpot，以及第四世代定点、野生、孵化、配信模块的页面标题区域恢复轻量存档选择。
- 统一：顶部选择器复用共享 HakuStyle `Select`，按当前模块过滤兼容游戏版本；空存档时保留 `-` 占位和统一存档浮窗入口，可直接新建或导入存档。
- 保留：Gen5/Gen8 面板已有的存档选择和六/七代现有的 3DS 选择不变；顶部选择结果继续写入现有 IndexedDB/localStorage 存档控制器。
- 已通过：本轮触及文件格式化和 `git diff --check`。
- 未运行：测试、Lint、TypeScript、构建、浏览器验收和生产回归；当前改动等待项目所有者确认页面标题区的控件密度与选择行为。

## 2026-08-22 临时图片产物清理

- 移除：删除未跟踪的 `ui-audit-2026-08-21/` 审计目录，其中包含 75 张 UI 截图和 1 个审计 JSON；删除根目录 `ui-audit-current.png` 临时截图。
- 保留：`public/favicon.ico`、第四世代漫游宝可梦、七世代时钟、八世代地图、Spinda 和赞助信息等产品运行所需图片资源未改动。
- 更新：`.gitignore` 新增 `ui-audit-*`、`ui-audit-current.png` 和本地 `release/` 忽略规则；`release/` 目录仅忽略，未删除。
- 已通过：本轮文件格式化、`npm run format:check` 和 `git diff --check`。
- 未运行：测试、构建、浏览器验收和生产回归；本轮仅处理仓库清理与忽略规则。

## 2026-08-22 浮窗滚动槽与档案弹窗描边复查（待项目所有者视觉验收）

- 修复：普通 `profile-modal` 移除品牌色顶部描边，保留中性 `1px` 边框，避免与固定 UI 契约中的普通面板样式冲突。
- 修复：浮窗正文滚动层改为固定垂直滚动槽，浮窗切换内容或下拉菜单时不再因 `auto` 滚动条出现/消失造成布局跳动；结果表内部横向滚动规则未改动。
- 已确认：源码横查未发现产品 TSX 中的原生 `<select>`，共享下拉统一使用 `Select` 自定义控件。
- 已通过：本轮文件格式化和 `git diff --check`；未运行测试、构建、外部 Chrome/Edge 视觉验收或生产页面回归。
- 当前：本轮修改尚未提交；既有 `release/`、`ui-audit-2026-08-21/` 和 `ui-audit-current.png` 未跟踪产物保持不变。

## 2026-08-22 第八世代控制行容器断点复查（待项目所有者视觉验收）

- 修复：第八世代配信与孵化面板的顶层 `control-row`、第四世代配信的 `gen4event-controls` 和第七世代定点的 `gen7stationary-controls` 纳入主内容容器的 `1080px` 响应式断点；侧栏和浮动 Rail 占用空间后，控制区会在实际内容宽度不足时切换为单列，避免固定最小列造成裁剪或横向挤压。
- 修复：上述控制行和三栏控制区的直接子 section 在收窄时允许 `min-width: 0`，与现有 workspace、control-grid 的收拢规则保持一致。
- 已通过：`npm run format:files -- src/styles.css`、`npm run format:check`、`git diff --check`；源码横查确认其余顶层控制布局已由 workspace/control-grid 断点覆盖。
- 未运行：测试、构建、外部 Chrome/Edge 视觉验收和生产页面回归；当前规则仍需项目所有者在第八世代配信/孵化面板的桌面、中等宽度和窄视口共同确认。
- 当前：本轮仅修改 `src/styles.css` 与本交接记录；提交后保持未推送，既有 `release/`、`ui-audit-2026-08-21/` 和 `ui-audit-current.png` 未跟踪产物保持不变。

## 2026-08-22 第五世代结果区高度收敛（待项目所有者视觉验收）

- 优化：第五世代静态和野生结果面板取消 `780px`/`600px` 固定最小高度，改由结果表滚动区使用视口相关的 `clamp` 高度，减少无结果时的底部空白。
- 保留：结果表自身的横向滚动、虚拟列表和移动端操作空间；未修改算法、筛选字段或结果列定义。
- Git：功能变更已提交为 `ad0d879`；当前 `main` 已同步至 `origin/main`，未跟踪的 `release/`、`ui-audit-*` 文件未纳入提交。
- 已通过：`npm run format:check`、`git diff --check`、`npm run verify`；其中 177 个测试文件、615 项测试和生产 Web/PWA 构建均通过。
- 未运行：外部 Chrome/Edge 视觉验收仍待项目所有者连接浏览器并确认；当前自动化结果不能替代第五世代静态/野生在桌面、中等宽度和窄视口下的人工验收。

## 2026-08-22 高频布局遮挡与页签截断（待项目所有者视觉验收）

- 修复：桌面主内容为固定工具 Rail 预留右侧空间，移动端预留底部空间，降低浮动工具覆盖末端控件的风险。
- 修复：Gen VIII Raids 在内容容器收窄时切换为两列，Gen VIII Static 三栏使用更紧凑的自适应比例。
- 修复：Gen VII 定点控制区移除 `620px` 固定最小高度，结果区使用响应式高度；中等宽度下允许结果区自然收缩，避免控件被推离视口。
- 修复：统一存档浮窗页签取消省略号截断，文字居中并允许换行；窄视口改为两列并提高页签高度。
- 已通过：本轮 CSS 与进度文档已格式化，`npm run format:check` 和 `git diff --check` 无错误。
- 未运行：本轮外部 Chrome/Edge 视觉验收、生产页面回归和 Windows EXE 实机验收；仍需项目所有者共同确认 Rail 覆盖、Gen VIII/Gen VII 几何和窄视口页签表现。

## 2026-08-22 工程验证与 Git 同步

- 更新：修正顶部交接记录，确认 `a519b1d docs: 更新 UI 验证记录` 已同步至 `origin/main`。
- 已通过：`npm run format:files -- docs/progress.md`、`npm run format:check`、`git diff --check` 和完整 `npm run verify`；Vitest 为 177 个测试文件、615 项测试，Web 生产构建和 PWA 预缓存成功。
- 当前：`main` 将包含本次文档修正并推送至 `origin/main`；未跟踪的 `release/`、`ui-audit-2026-08-21/` 和 `ui-audit-current.png` 保留，不纳入提交。
- 未运行：外部 Chrome/Edge 视觉验收、GitHub Pages 生产页面算法回归和 Windows EXE 实机验收；这些仍需项目所有者在对应外部环境中共同确认。

## 2026-08-22 高频 UI 自检第三轮（工程修复完成，待项目所有者视觉验收）

- 修复：共享 Select、自动完成和多选菜单改为通过 Portal 挂载到 `document.body`，按触发器实时计算视口内的固定位置、宽度和最大高度，避免被面板、section 或浮窗内容裁剪。
- 修复：浮窗内容滚动层不再因下拉打开切换为 `overflow: visible`，滚动条轨道保持稳定；浮窗外点关闭、滚轮和触摸锁定均识别 Portal 菜单。
- 修复：Select 和多选触发器的长中文标签允许换行，自动完成选项不再省略文本；浮窗键盘焦点陷阱跳过 Portal 菜单。
- 工程验证：`npm run format:check`、`npm run lint`、`npm run typecheck`、`npm test`（177 个文件、615 项测试）和 `npm run build:web` 均已通过；构建仅保留既有 chunk 大小提示。
- 已提交并推送 UI 修复：`6c5273e style: 修复共享菜单与浮窗滚动布局`；交接记录已合并为 `a519b1d docs: 更新 UI 验证记录` 并同步至 `origin/main`。
- 待验收：外部 Chrome/Edge 当前未连接，尚未进行实际视口截图和下拉展开验收。

## 2026-08-22 高频 UI 自检第二轮（待工程验证与项目所有者视觉验收）

- 修复：NGC Seed 的标签、控制区和结果区共享同一自适应宽度，移除窄工作区会触发横向挤压的 `520px` 固定最小列。
- 修复：共享数字输入在网格内拉伸到所属轨道，避免左对齐后留下不一致的右侧空白；IV 范围输入统一为 `64px` 可读轨道。
- 修复：共享 Select 和自动完成菜单允许长选项换行显示，菜单保持视口内宽度，不再用省略号截断选项文本。
- 更新：补齐第七世代 ID、定点、野生和时间反查入口的中文世代前缀，页面标题与侧栏命名保持一致。
- 待验收：外部 Chrome/Edge 未连接，本轮尚未进行实际视口截图和下拉展开验收。

## 2026-08-22 高频 UI 二次收紧（工程验证已通过，待项目所有者视觉验收）

- 优化：杂项乱数的十六进制输入限制为可读的紧凑宽度，文本区域继续保留完整可用宽度。
- 修复：等级筛选与等级显示的双输入框共用 `56px` 轨道；IV 筛选的两个数值列固定为 `60px`，避免宽面板拉伸或数值被挡住。
- 修复：浮窗内容层打开共享下拉时暂时解除内部滚动裁剪，菜单不再被浮窗正文滚动容器截断。
- 优化：第六世代 TinyMT 时间线的控制面板、事件结果表列和第五世代 SHA1 Cache 日期/档案区收紧固定轨道，减少宽屏冗余。
- 已通过：本轮完成 `npm run verify`，Prettier、ESLint、`tsc -b`、177 个 Vitest 文件共 615 项测试、Vite 生产构建与 PWA 预缓存均成功；构建保留既有大 chunk 警告。
- 待验收：本轮未进行外部 Chrome/Edge 视觉验收；浮窗下拉裁剪、控件宽度和结果表几何仍需由项目所有者在页面中确认。

## 2026-08-22 高频控件与结果表几何收紧（待项目所有者视觉验收）

- 修复：共享菜单定位估算与自定义下拉的 `360px` 最大宽度统一，靠近右侧的长选项可按同一边界切换对齐方向。
- 优化：杂项乱数双列输入固定为紧凑的 `220px` 内容轨道；数字输入在普通工作区和浮窗中限制最大宽度，移动端仍恢复为全宽。
- 修复：等级筛选的双输入框统一为 `56px`，IV 筛选标题改为 flex 居中；第三、四代静态与第三代野生结果表的重复 IV 列收紧为 `56px`，同步缩小表面最小宽度。
- 已通过：`npm run format:files -- ...`、`npm run format:check`、`git diff --check`、`npm run verify`；Vitest 为 177 个测试文件、615 项测试，生产 PWA 构建成功。
- 未运行：没有可用的外部 Chrome/Edge 会话；下拉展开、浮窗滚动槽和各视口几何仍需项目所有者共同进行视觉验收。

## 2026-08-22 共享下拉与杂项乱数布局收紧（已通过工程验证，待项目所有者视觉验收）

- 优化：共享多选、自动完成和自定义下拉菜单改为内容自适应宽度，保留触发器宽度作为最小值，并限制在视口内，减少窄控件造成的横向空白。
- 修复：共享菜单定位的宽度估算与新的最大宽度策略保持一致，靠近视口右侧时仍可选择可用的对齐方向。
- 优化：杂项乱数浮窗收窄至 `640px`，输入网格保持紧凑双列，数值输入使用等宽数字，结果卡片保留稳定的可读最小宽度。
- 已通过：`npm run format:files -- src/features/shared/useMenuPlacement.ts src/styles.css src/features/miscrng/MiscRngPanel.css`、`npm run format:check`、`git diff --check`、`npm run verify`；Vitest 为 177 个测试文件、615 项测试，生产 PWA 构建成功。
- 未运行：当前没有新的外部 Chrome/Edge 会话；下拉实际展开宽度、菜单边界定位和杂项乱数各视口布局仍需项目所有者共同进行视觉验收。

## 2026-08-22 静态工作区与结果列收紧（待项目所有者视觉验收）

- 修复：PokeSpot 的成对 Seed / 帧数输入在三栏布局的临界宽度保留完整轨道，并继承共享输入的实体背景与中性色 `1px` 边框。
- 优化：第三、四代定点及第三代野生的虚拟结果表将六项两位 IV 列统一收紧为 `62px`，减少重复列占用；其余信息列、数据顺序与表格内部横向滚动保持不变。
- 规则：三栏工作区按内容分别分配宽度；含一标签双输入的左栏必须先满足双输入的最小可读宽度，不能由筛选栏的剩余比例挤压。
- 未运行：本轮尚未在外部 Chrome/Edge 进行视觉核验；需在 360/768/1280px 及桌面宽度确认 PokeSpot 双输入、静态/野生表头及 IV 数据列。

## 2026-08-22 浮层滚动锁统一（已通过工程验证）

- 修复：浮动工具、移动端模块抽屉、第六/七代 3DS、第五世代和第八世代档案编辑器，以及 HakuStyle Demo 不再直接切换 `body` 的 `overflow` 或增加右侧补偿内边距。
- 统一：新增共享滚动锁，在浮层可见期间阻止背景的滚轮、触摸与分页键滚动链，同时持续保留根滚动槽，避免打开浮窗时滚动条消失或工作区横向跳动。
- 已通过：`npm run format:files -- <9 个本轮文件>`、`npm run format:check`、`git diff --check` 与 `npm run verify`；Vitest 为 177 个测试文件、615 项测试，生产 PWA 构建成功。
- 未运行：外部 Chrome/Edge 中的滚轮、触摸、嵌套档案编辑器和 360/768/1280px 视觉复核；这仍需与项目所有者共同完成。

## 2026-08-22 共享菜单与浮窗滚动自检（已通过工程验证）

- 修复：顶部品牌壳移除随当前世代变化的重复副标题，保留固定产品名，避免导航元数据和页面世代标题重复占位。
- 修复：共享 `Select`、自动完成和多选菜单按视口边界自动选择左右对齐，并使用不小于触发器的可读宽度；长物种名和筛选项不再被 section 宽度直接截断。
- 优化：浮窗主体统一采用标题固定、内容区占剩余空间的稳定滚动轨道，切换内容高度时不再改变面板内部基线；字段内文本控件统一允许收缩并填满所属列，复选框、结果表和图标按钮保持独立几何规则。
- 优化：第三世代静态筛选器的标签列和输入列改为自适应比例，减少野生等级、槽位等筛选行的左侧空白。
- 已通过：定向格式化、`npm run format:check`、`git diff --check`、`npm run lint`、`npm run typecheck`、`npm test -- --run`（177 个测试文件、615 项测试）和 `npm run build:web`。
- 未运行：当前没有可用的外部 Chrome/Edge 会话；菜单实际左右定位、浮窗滚动槽和 360/768/1280px 视口仍需项目所有者共同做视觉验收。

## 2026-08-22 共享令牌与工作区响应式复查（已通过工程验证）

- 修复：补齐旧模块仍在使用的共享语义令牌别名，恢复多世代面板的边框、背景、文字、危险状态和等宽字体声明，避免因变量缺失导致样式静默失效。
- 优化：为主内容增加容器查询；当侧栏占用空间导致内容宽度收窄时，工作区、控制区和表单网格按断点收拢，避免固定最小列宽造成控件裁剪和无效空白。
- 统一：图标按钮使用 `44px` 触控尺寸、零额外内边距和网格居中；工作区与控制网格的同级 section 统一拉伸到共享高度基线。
- 已通过：`npm run format:files -- src/styles.css docs/progress.md`、`npm run format:check`、`git diff --check` 和 `npm run verify`；Vitest 为 177 个测试文件、615 项测试，Web 生产构建成功。
- 未运行：当前没有可用的外部 Chrome/Edge 会话，因此本轮未做浏览器视觉验收；下拉是否仍被裁剪、各视口收拢、图标居中和浮窗滚动槽仍需项目所有者共同确认。

## 2026-08-22 共享下拉与浮窗布局修复（已通过工程验证）

- 修复：共享 `Select`、自动完成和多选控件统一根据视口空间向上或向下展开，并避免被面板 `overflow` 裁剪。
- 修复：浮动工具锁定页面滚动时保留滚动槽宽度，打开和关闭面板不再造成内容横向跳动。
- 优化：杂项乱数输入改为网格内自适应，移除人为的数字/文本输入宽度上限；侧栏标题去除重复世代前缀，保留完整 `title` 和搜索匹配。
- 已通过：`npm run format:check`、`git diff --check`、`npm run verify`；其中 Vitest 为 177 个测试文件、615 项测试，Web 生产构建成功。
- Git：本地 `main` 已提交本轮修改；当前 `origin/main` 暂领先 1 个提交，推送因 GitHub 443 暂不可达待重试。
- 未运行：本轮未启动本地 UI 或外部 Chrome/Edge；下拉遮挡、浮窗滚动槽和各视口布局仍需项目所有者共同验收。

## 2026-08-22 UI 几何统一规则（进行中）

- 规则：同一工作区行内的 section 必须共享最高内容高度；宽度按内容重要性分配，不强制等宽。第三世代静态工作区固定为“乱数信息较窄、设置居中、筛选较宽”。
- 规则：查询表单与结果表必须使用明确的 `12px` 以上间距；结果表首行直接贴合表头，不使用重复的顶部占位。
- 规则：数值输入必须保留完整可读内容，不能因全局控件 padding、原生数字微调器或网格最小宽度而裁切；下拉菜单不得被 section、圆角或 overflow 裁掉。
- 规则：移除 `progress-track` 装饰进度条；进度数字保留在 metrics/status 区域，后续新增模块不得恢复该模式。
- 当前状态：已从 36 个旧模块渲染点移除 `progress-track`，并清理关联 CSS；第三世代静态、NGC Seed、基拉祈帧数查询、IV 筛选与 IV Calculator 已先完成共享样式调整，其他模块继续按同一规则逐页复核。
- 静态复核：产品 TSX 的原生 `<select>` 为 0；可见下拉均通过共享候选控件实现。
- 已通过：本轮 39 个触及文件的 `npm run format:files -- ...` 与 `git diff --check`。
- 未通过：`npm run format:check` 仅报告既有未跟踪审查产物 `ui-audit-2026-08-21/audit.json`，未改写该产物。
- 未运行：本轮未运行测试、构建或生产回归；等待项目所有者使用外部 Chrome/Edge 共同验收。

## 2026-08-22 档案浮窗描述修正

- 更正：统一浮窗仍保留第三、第四、第五、第六/七代 3DS 和第八代全部档案功能；仅将 3DS 档案页签的描述改为“第六、七代存档信息管理”，不删除其他世代入口。
- 保留：3DS 档案编辑器内部标题和实际存档功能不变；页签描述与世代归属分开维护。

## 2026-08-22 下拉裁剪与静态面板宽度复查（待项目所有者验收）

- 修复：共享 `Select`、自动完成和多选控件打开时，所在普通面板允许菜单溢出并提升层级，避免下拉选项被面板圆角或相邻列裁掉；菜单补充最小可读宽度。
- 优化：第三世代定点、野生、蛋、GameCube 及第四世代同类静态控制区改为三栏等宽自适应，`static-panel` 与 `static-rng-panel` 不再使用固定的不同列宽。
- 优化：NGC Seed 进度条移入结果面板，补齐 `progressbar` 的最小值、最大值和当前值，消除表单与结果之间的孤立进度横线。
- 未运行：本轮未运行测试、构建、外部 Chrome/Edge 或生产回归；待项目所有者授权具体 UI URL 后共同验收。
- 当前限制：工作区继续保留既有未提交改动和审查截图产物，本轮不提交、不推送。

## 2026-08-22 NGC 标签与静态控制行对齐复查（待项目所有者验收）

- 修复：NGC Seed 的 XD、竞技场、频道模式切换改为三等分，不再按标签文字长度分配按钮宽度。
- 优化：`gen3static-control-grid` 保留乱数信息、设置、筛选三栏的差异化宽度，同时让同一行 section 按最高内容自动拉伸到统一高度。
- 优化：第三世代 ID 检索输入区取消固定 `620px` 上限，填充当前工作区宽度，减少右侧无效空白。
- 未运行：本轮尚未运行测试、构建、外部 Chrome/Edge 或生产回归；待项目所有者共同验收。

## 2026-08-22 IV 筛选表头对齐复查（待项目所有者验收）

- 修复：共享 `iv-filter` 的表头文字与行内个体值快捷按钮统一居中，三列标题与对应输入列保持同一网格基线。
- 未运行：本轮尚未运行测试、构建或生产回归；待项目所有者共同验收。

## 2026-08-22 多选菜单宽度与 IV 列宽复查（待项目所有者验收）

- 修复：多选菜单改为挂在实际触发按钮的控制容器内，不再把包含字段标签的整行宽度当作下拉宽度。
- 优化：IV 表格的个体值标签列、最小列和最大列收窄并固定上限，表头与行继续共享相同列轨道。
- 未运行：本轮尚未运行测试、构建或生产回归；待项目所有者共同验收。

## 2026-08-21 全模块外部 Chrome UI 复核（待项目所有者验收）

- 已验证：使用外部 Chrome `http://127.0.0.1:5173/` 逐一切换当前侧栏的 74 个真实模块入口，并为每个入口执行视口截图采集。
- 已验证：74 个入口均无水平溢出；可见主工作区原生 `<select>` 数量均为 `0`；模块切换过程中未记录控制台 error/warn。
- 已验证：统一存档信息悬浮窗从第八世代模块打开后，第三世代、第四世代、第五世代、3DS 和第八世代五个标签页均可切换；各标签页保持实体背景、无原生 `<select>` 和无水平溢出。
- 已确认：`src/App.tsx` 中的 `nav[hidden]` 是旧版导航的隐藏兼容 DOM，不参与布局或交互；当前可见侧栏唯一来源为 `moduleNavigationGroups`。本轮保留该用户已有结构，不顺手删除大段历史 DOM。
- 当前限制：`ui-audit-2026-08-21/audit.json` 是此前生成的审查产物，仍保留旧标题记录；本轮逐入口结果已在外部 Chrome 会话中重新采集，但未改写该生成文件。
- 待验收：项目所有者使用外部 Chrome/Edge 逐模块查看截图与浮窗；在所有者确认前不提交、不推送、不进行 Pages 生产算法回归。

## 2026-08-21 浮动工具滚动槽稳定性复查（待项目所有者验收）

- 修复：根页面固定垂直滚动槽，打开或关闭浮动工具时不再因 `body { overflow: hidden }` 移除滚动条而产生横向布局跳动。
- 更新：浮动面板、个体值计算器和遇敌查询内容区使用动态视口高度，桌面与移动视口的可视边界保持一致；面板内部滚动仍由各自内容容器承担。
- 已验证：外部 Chrome `http://127.0.0.1:5173/` 打开/关闭研究工具和杂项乱数工具前后 `body`、`html` 宽度均为 `1462px`；面板背景为实体色；上述面板原生 `<select>` 数量为 `0`；控制台无 error/warn。
- 已通过：`npm run format:files -- src/styles.css`、`git diff --check`。
- 未通过：`npm run format:check` 仅报告保留的审查产物 `ui-audit-2026-08-21/audit.json`，未改写该生成文件；未运行完整测试、构建或生产算法回归。
- 待验收：项目所有者使用外部 Chrome/Edge 检查浮动工具开关、滚动槽、实体背景和剩余 UI 清单；本轮不提交、不推送。

## 2026-08-21 Gen VI 页面标题与统一存档浮窗复核（待项目所有者验收）

- 修复：`src/App.tsx` 补齐第六世代定点时间反查、配信时间反查、MT Seed 检索和 MT 初始 Seed / Time Finder 的页面主标题与版本映射，不再回退到第四世代野生乱数。
- 已验证：外部 Chrome `http://127.0.0.1:5173/` 逐项切换上述四个入口，`h1` 与侧栏/面板标题一致；控制台无 error/warn。
- 已验证：统一存档信息浮窗为实体不透明背景，滚动槽位保持稳定，第三至第八世代五个标签页均可切换；Gen V、3DS、Gen VIII 标签页无嵌套浮窗或遮挡。
- 已通过：`npm run format:files -- src/App.tsx docs/progress.md`、`git diff --check`。
- 未通过：`npm run format:check` 仅报告保留的审查产物 `ui-audit-2026-08-21/audit.json`，未改写该生成文件；未运行完整测试、构建或生产算法回归。
- 待验收：项目所有者使用外部 Chrome/Edge 检查标题、统一存档浮窗、各标签页和现有 UI 清单；本轮不提交、不推送。

## 2026-08-21 全局 UI 控件描边与布局复查（待项目所有者验收）

- 统一：主内容工作区、研究工具与存档信息浮窗中的文本输入、文本域和原生残留下拉，统一为 Ant Neutral HakuStyle 的 `44px` 高度、`10px` 圆角、`1px` 安静中性描边、hover 和 focus ring。
- 修复：带前缀输入框改为外框承载描边，避免内部 input 出现双重描边；IV Calculator 表格输入保留无缝单元格样式，并补充统一的键盘焦点反馈。
- 修复：浮窗内容使用稳定滚动条槽位，切换面板时不再因滚动条出现/消失造成布局跳动；杂项乱数输入、结果网格和 Gen V 双输入轨道收窄并按可用空间自适应。
- 保留：checkbox、radio、file input、隐藏输入和复合控件不套用普通文本输入描边规则；共享 HakuStyle `Select` 继续作为下拉入口。
- 已通过：定向 `npm run format:files`、完整 `npm run format:check`、`git diff --check`。
- 待验收：项目所有者使用外部 Chrome/Edge 逐项检查 input 描边、杂项乱数、浮窗滚动条、双输入框宽度、列宽和 section 间距；本轮不提交、不推送，未运行浏览器、构建或生产回归。
- 当前工作区：保留未跟踪 `release/` 打包目录，不纳入本轮修改或提交。

## 2026-08-21 Windows portable EXE 交付收口（配置已完成）

- 移除：Windows `nsis` 安装器目标及其配置，避免一次构建生成安装 EXE 和便携 EXE 两套产物。
- 收口：electron-builder 仅构建 Windows x64 `portable` 目标，最终文件名固定为 `PokeRNGKit.exe`；Actions 只上传该单一 EXE。
- 保留：桌面应用继续使用 Electron 原生壳、静态 `dist` 资源和本地 Worker/Wasm，不新增安装器、后端或运行时 CDN。
- 已通过：定向 `npm run format:files`、`npm run format:check`、`git diff --check`、`npm run typecheck` 和 package 配置断言；确认唯一构建目标为 `portable/x64`，没有 `nsis` 配置。
- 未通过（环境限制）：`npm run desktop:package` 已读取新配置并进入 Electron Windows x64 打包，但在 Electron 运行时目录重命名阶段返回 `EPERM`，未生成 EXE；这与源码和目标配置无关，Actions 仍需重新构建确认产物。
- 未运行：本轮配置变更后的 Windows Actions 构建、EXE 启动和生产页面回归，等待提交后的 Actions 结果与项目所有者共同验收。

## 2026-08-21 全局 Select 与侧栏命名统一（已完成工程验证）

- 统一：将 `src/features` 中全部 59 个原生 `<select>` 迁移为共享 HakuStyle `Select`，保留 `value`、`defaultValue`、`onChange(event.target.value)`、分组、禁用项和键盘操作兼容；源码已无原生 `<select>` 标签。
- 统一：侧边栏核心入口按世代前缀规范命名，第三世代为“第三世代 ID/野生/孵化乱数”，第四至第七世代同样使用“第 N 世代”前缀，避免同一导航层级混用简称和世代全称。
- 新增：Windows 原生桌面壳配置，Electron 应用从独立 `desktop` 目录通过受限 `app://` 协议加载静态站点，并在 Actions 生成 portable EXE；不新增后端，继续复用浏览器端 Worker/Wasm。
- 新增：`npm run desktop:package` 在缺少 `dist/index.html` 时使用 `BASE_PATH=./` 完整构建桌面资源；Actions 复用已下载的生产 `dist`，避免丢失 Wasm 文件。
- 已通过：任务文件格式化、`git diff --check`、`node --check desktop/main.mjs` 和完整 `npm run verify`（Prettier、ESLint、TypeScript、177 个测试文件共 615 项测试、2317 个生产模块和 239 项 PWA 预缓存资源）。
- 本地打包：electron-builder 已完成配置解析、Electron 运行时下载和应用目录初始化；当前 Windows 工作区在解压 Electron 运行时阶段长时间无产物，已中止，不将该环境阻塞误判为应用代码失败。portable EXE 交由 Windows Actions 生成，当前工作区未留下 `release` 产物。
- 修复：首次 Actions run `32400111335` 在依赖安装阶段失败；本地使用同一 `npm ci --engine-strict` 已通过，锁文件新增依赖的 `resolved` 地址已统一为官方 npm registry，避免 runner 继续依赖不可用镜像。
- 已通过：Actions run `32401120273` 的 `build`、GitHub Pages `deploy`、`windows-desktop` 和依赖安装；`windows-desktop` artifact 已上传，大小约 218 MB，包含 NSIS 安装 EXE 与 portable EXE。生产地址为 `https://haku76.github.io/PokeRNGKit/`。
- 未运行：外部 Chrome/Edge UI 验收、生产算法回归和 Windows 实机 EXE 启动验收；这些需要项目所有者在对应外部环境中共同确认，不能用 Actions 结果替代。

## 2026-08-20 Gen IV Gen4SeedFinder（已完成工程验证）

- 新增：Gen IV `Gen4SeedFinder` 主工作区，覆盖 DPPt Coin Flip 与 HGSS Elm Call 两条教程路径；按 PokemonRNGGuides 的日期/秒数/Delay 枚举和连续序列筛选语义生成 Seed、时间、Delay 与序列结果。
- 新增：独立 `gen4seedfinder` C++/Wasm bridge、Dedicated Worker、固定 10-word 结果协议、React domain 校验、中文文案、Gen IV 侧栏入口、模块文档和原生夹具。
- 输入保护：日期合法性、秒数跨分钟推进、Delay 范围上限、序列长度/字符集和 100,000 条结果上限均在 domain 与 Wasm 双重校验。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、`npm run typecheck`、`npx vitest run src/features/gen4seedfinder/domain.test.ts --pool=threads --maxWorkers=2`（1 个文件、3 项测试）、`POKERNGKIT_WASM_MODULES=gen4seedfinder npm run wasm:test:native`（1/1）和完整 `npm run verify`（177 个测试文件、615 项测试、2316 个生产模块、239 项 PWA 预缓存）。
- 未运行：Emscripten 浏览器 Wasm 产物构建、外部 Chrome/Edge UI 检查和 GitHub Pages 生产回归；这些仍按全部 3DS 模块完成后的统一门槛执行。
- 下一步：继续实现 P3 的 Voltorb Flip Seed / Board Generator；随后再进入统一 3DS/UI 与 Pages 生产验收。Gen V DS 深审仍按排期暂缓。

## 2026-08-20 Windows EXE 交付定义修正

- 决策：Windows 最终交付改为类似 PokeFinder / 3DSRNGTool 的直接桌面原生可执行程序；不是把静态站点和 PowerShell 启动器封装成自解压 portable 包。
- 更新：最终交付采用 Electron 原生壳的单一 Windows x64 portable EXE，不提供 NSIS 安装器；Worker/Wasm 资源继续随桌面应用本地加载。
- 排期：原生桌面壳、便携 EXE、Worker/Wasm 资源加载和 GitHub Actions 构建链顺延到全部功能与 Pages 生产回归之后。

## 2026-08-20 第三世代侧栏中文标签补齐

- 调整：按 `PokeFinder_zh.ts` 已核对译文，将第三世代 `Seed to Time`、`Static` 和
  `Wild` 侧栏标签改为“第三世代Seed查询时间”“第三世代定点乱数”“野生乱数”。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`。
- 未运行：完整测试、构建、外部 Chrome/Edge UI 检查和 GitHub Pages 生产回归；这些仍按统一验收门槛执行。

## 2026-08-20 侧边栏 Seed/ID 顺序调整

- 调整：Gen III、Gen IV、Gen V、Gen VI、Gen VII 侧边栏恢复 `ID -> Seed/Time Finder`
  顺序；Gen VIII 继续保持 ID 入口在前。
- 保留：Gen V / Gen VIII 存档信息管理继续由右下角浮动工具打开，不恢复侧边栏档案入口。
- 主要文件：`src/App.tsx`。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`。
- 未运行：完整测试、构建、外部 Chrome/Edge UI 检查和 GitHub Pages 生产回归；这些仍按统一验收门槛执行。

## 2026-08-20 侧边栏 Seed/ID 顺序与野生中文收口（已完成工程验证）

- 调整：按 `存档信息/ID -> Seed 相关 -> 定点 -> 野生 -> 蛋 -> 事件` 主线，
  将 Gen III、Gen IV、Gen V、Gen VI、Gen VII 侧边栏的 Seed、Time Finder 或
  Adjacent Seeds 入口置于对应 ID 入口之前；Gen VIII 无独立 Seed 入口，保持 ID 在前。
- 补齐：Gen VII Wild 简体中文的分类和队首能力标签；`gen8WildSlotModifier`
  遵循上游无简中词条时保留英文源标签，避免英文资源混入中文。
- 保留：Gen V / Gen VIII 存档信息管理继续由右下角浮动工具打开，应用级 controller
  共享选择、编辑和校准状态，不恢复侧边栏档案入口。
- 主要文件：`src/App.tsx`、`src/features/gen7wild/Gen7WildPanel.tsx`、
  `src/i18n.ts`、Gen V/Gen VIII Profile 浮窗及其文档。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、
  `npm run verify`（176 个测试文件、612 项测试、TypeScript、ESLint、Vite/PWA
  生产构建 2312 个模块和 238 项预缓存资源）。
- 未运行：Emscripten 原生/Wasm 检查、外部 Chrome/Edge UI、GitHub Pages 生产回归和
  项目所有者最终验收；这些仍按全部 3DSRNGTool 模块完成后的统一门槛执行。
- 当前 Git：提交 `513d933` 已推送到 `origin/main`，`main` 工作区干净；等待
  Actions 部署，不宣称生产页面已更新。
- 下一步：等待部署结果，再按项目所有者提供的准确 Pages URL 与外部 Chrome/Edge
  会话执行共同验收。

## 2026-08-20 统一 3DS/UI 验收与 Windows Actions 产物链（进行中）

- 修复：Actions run `32363436005` 的前端完整验证通过后，69 个原生夹具只有 `gen6mainseed_native_parity` 失败；复核确认测试把 Seed `0` 的 frame `15..20` IV 错写为 frame `10..15` 目标，并在单只模式传入违反 `upper <= lower + 2` 的 `0..31` 区间。本轮改为真实第二只 IV 与 frame 1 精确范围，不修改生产算法。
- 已通过：定向 `POKERNGKIT_WASM_MODULES=gen6mainseed npm run wasm:test:native`（1/1）及完整 `npm run wasm:test:native`（69/69）。
- 修复：右下角工具 Rail 外壳恢复实体 `surface` 背景、安静中性边框和统一阴影；工具按钮、存档信息和研究工具仍保持原有互斥浮层行为。
- 更新：GitHub Actions 将 Pages 使用的同一份 `production-dist` 上传为跨 job artifact，并新增 Windows portable job，生成自解压 `PokeRNGKit.exe` 与 ZIP 备份包；启动器只监听 `127.0.0.1`，不新增后端或运行时 CDN。
- 排期：Gen IV `Gen4SeedFinder` / Voltorb Flip 与 Gen V DS 参数、Initial Seed、Entralink 深审按项目所有者要求暂缓；Swarm RNG 已完成并移出当前缺口。
- 当前状态：Gen VII Stationary 已具备左侧乱数信息、中间设置、右侧筛选、下方结果的源码布局；Gen VII Wild 已具备筛选宽度约束。Pages 生产回归仍需新部署后的准确 URL 和外部 Chrome/Edge 会话。
- 已通过：`npm run verify`（176 个测试文件、612 项测试、TypeScript、ESLint、Vite/PWA 生产构建）；另通过 `npm run format:check`、`git diff --check` 和 Windows 启动器 PowerShell 语法解析。
- 旧生产基线：外部 Chrome 打开 `https://haku76.github.io/PokeRNGKit/`，当前资源仍为 `index-C0iXIKgu.js` / `index-BYpSXk4U.css`；控制台无 error/warn，但 Rail 外壳仍透明，Gen VII Stationary 仍为旧的设置/结果左右布局。该页面明显早于当前源码，不作为本轮验收通过证据。
- 未运行：本轮尚未运行 Windows Actions、新提交对应的生产页面回归或项目所有者最终验收；Windows 自解压包仍待 Actions 首次产出后在 Windows 实机打开验证。
- 下一步：提交推送后等待 Actions 完成；随后使用项目所有者提供的生产 URL 按八项 UI 清单逐项记录证据。

## 2026-08-20 Gen IV Swarm RNG（已完成工程验证）

- 新增：第四世代侧边栏 `Swarm RNG` 工作区，覆盖 D/P、Pt、HG、SS 的遭遇表和地点选择；其每日 Encounter Seed、MT 推进与目标帧记录流程独立于第四世代野生乱数的 Swarm 遭遇表开关。
- 新增：`Find advances` 按已知 MT Seed 和推进范围筛选目标 Swarm；`Find encounter seed` 按 Real96 工具的高字节、Hour、Delay 与 MT Advances 顺序返回第一个每日 Encounter Seed。
- 算法：在独立 C++/Wasm bridge 中实现 Gen IV MT19937、双 ARNG 和版本遭遇表取模；Dedicated Worker 负责握手、范围校验、结果复制和取消重建。
- 交互：结果可选中为目标帧，支持 `+1` 和 HGSS Youngster Joey `+2` 推进记录；游戏与遭遇选择复用 `AutoCompleteComboBox`。
- 来源：PokemonRNGGuides Gen 4 Swarm、Real96 `Gen4SwarmDailyEncounterRNGTool` revision `6bc5623008b8fbf87c4450ecdab55946b01815f7`、PokeFinder MT/ARNG；许可与输入边界见 `docs/modules/gen4swarm.md`。
- 已通过：`npm test -- src/features/gen4swarm`（1 个文件、3 项）、`npm run format:check`、`git diff --check`、完整 `npm run verify`（176 个测试文件、612 项测试、2312 个生产模块和 236 项 PWA 预缓存）。
- 已通过：`POKERNGKIT_WASM_MODULES=gen4swarm npm run wasm:test:native`（1/1）与激活 Emscripten 6.0.6 后的定向 `npm run wasm:build`；生成 `gen4swarm.mjs`（7360 bytes）和 `gen4swarm.wasm`（6286 bytes），产物按仓库规则保持忽略、不提交。
- 未运行：外部 Chrome/Edge、生产页面回归和项目所有者最终验收；按全部 3DS 模块完成后的统一门槛执行。
- 下一步：Swarm 已完成；Gen IV `Gen4SeedFinder` / Voltorb Flip 与 Gen V DS 深审按当前排期暂缓，进入统一 3DS/UI 与 Pages 生产验收。

## 2026-08-20 3DSTimeFinder TF7/TF8 Profile 收口（已完成工程验证）

- 新增：3DS 存档信息悬浮工具加入 Profile Manager / Gen VII Profile Calibrator 模式切换；
  校准命中结果可直接带 Tick/Offset 打开 Profile View 创建档案。
- 补齐：Gen VII Profile7 的 Tick（十六进制）与 Offset（十进制）字段、桌面/移动端显示、
  schema 1 旧档案迁移默认值，以及 Stationary、Wild、Event、ID 时间反查对档案参数的同步。
- 算法：复用 `gen7timefinder` Initial Seed Wasm，在 Dedicated Worker 中按上游
  `ProfileSearcher7` 的正负 Tick/Offset 枚举和 `uint32` 回绕语义计算；浏览器组合上限为
  5,000,000，结果上限为 100,000。
- 文档：更新 `docs/modules/3dsprofiles.md`、`docs/module-inventory.md`，TF7/TF8 标记为工程验证通过。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、全仓 ESLint、
  `npm run typecheck`、3DS Profile/Calibrator/Repository 定向 Vitest（3 个文件、13 项），
  以及完整 `npm run verify`（175 个测试文件、609 项测试、2308 个生产模块和 235 项 PWA 预缓存）。
- 已通过：`POKERNGKIT_WASM_MODULES=gen7timefinder npm run wasm:test:native`（1/1）；
  激活 Emscripten 6.0.6 后定向 `gen7timefinder` `npm run wasm:build`。
- 未运行：外部 Chrome/Edge UI 与生产页面算法回归；这些检查仍按全部 3DS 模块完成后的统一门槛执行。
- 当前 Git：本条目对应的 TF7/TF8 与侧边栏样式改动已完成工程验证，提交与推送在本轮收口执行。

## 2026-08-20 UI 验收清单收口（已完成工程验证）

- 修复：浮动工具面板和 Encounter Lookup 移除顶部有色强调线，恢复实体背景与静默中性边框；Encounter Lookup 结果列改为内容自适应，长地点名称可换行。
- 优化：Gen VII Stationary 控制区改为左侧乱数信息、中间设置、右侧筛选，结果表独占下方；窄屏自动恢复单列，避免控件互相遮挡。
- 优化：Gen VII Wild 筛选字段、候选控件和输入补充 `min-width: 0` / 最大宽度约束，防止等级、槽位等筛选项撑出左侧列。
- 修复：Gen VI TinyFinder MT Seed / MT Seed Time 纳入 Gen VI 顶部上下文与档案工具判断，避免新模块显示错误的世代标题或工具状态。
- 优化：侧边栏、导航和分组内容统一隐藏滚动条，同时保留必要的内容滚动；模块长标题和分组标题限制在可用宽度内单行省略，并保留完整 `title` 提示。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、`npm run lint`、`npm run typecheck`。
- 已通过：完整 `npm run verify`（174 个测试文件、606 项测试及生产 Web/PWA 构建）。
- 未运行：外部 Chrome/Edge UI 与生产页面算法回归；继续按全部 3DS 模块完成后的统一门槛执行。

## 2026-08-20 TinyFinder T10 Ambush Encounter（已完成工程实现与本地验证）

- 新增独立 `gen6tinyambush` TinyMT Wasm、Dedicated Worker、XY Victory Road Outside
  地点数据和伏击遭遇工作区；X/Y 共用 TinyFinder Map 327 的 12 槽表，默认 Min Index
  遵循 XY `Bag Advances = 27`。
- 按 TinyFinder `Wild.Ambush()` 严格实现槽位随机、Rand100、同步随机和物品槽消耗；
  不引入 Honey/Rock Smash 的闪烁、延迟、笛子或触发参数。支持 Seed / State、Index
  范围、同步与槽位掩码筛选、结果上限、虚拟结果表和 CSV。
- 接入 Gen VI 侧栏、三语文案、模块库存、固定宽度请求/结果协议和 `wasm/CMakeLists.txt`。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、改动范围
  ESLint、`npm run typecheck`、Ambush 定向 Vitest（2 个文件、5 项）、
  `$env:POKERNGKIT_WASM_MODULES='gen6tinyambush'; npm run wasm:test:native`（1/1）、
  完整 `npm run verify`（172 个测试文件、600 项测试及生产 Web/PWA 构建），以及在
  Emscripten 6.0.6 环境中运行的定向 `npm run wasm:build`。
- 未运行：外部 Chrome/Edge UI 和生产页面算法回归；继续按全部 3DS 模块完成后的统一
  验收门槛执行。

## 2026-08-20 TinyFinder T12 Victory Road Swooping（已完成范围审查）

- 核对：TinyFinder README 将 Victory Road Outside 的 Map 327 12 槽表称为
  `Swooping`，但源码没有独立的 Swooping 方法；`EnctrKey.Ambush`、`Wild.Ambush()`、
  `AmbushTable` 与 Swooping 使用完全相同的槽位、同步和物品消耗。
- 更新：T12 标记为已包含在 `gen6tinyambush`，文档记录 Fearow/Skarmory/Hydreigon
  槽位分组及 3DSRNGTool `+40` 操作延迟；不重复引入第二套 RNG 算法。
- 验证：已对本地 TinyFinder `README.md`、`Methods/Wild.cs`、`Classes/EncounterType.cs`、
  `Database/Data.cs`、`Database/TableXY.cs` 逐项核对；未新增运行时代码。

## 2026-08-20 TinyFinder T8 Honey Wild（已完成工程实现）

- 新增独立 `gen6tinyhoney` TinyMT / BlinkSystem Wasm、Dedicated Worker、地点数据生成器和蜂蜜野生工作区。
- 从 TinyFinder XY/ORAS `Locations*` 与 `Table*` 解析 238 个地点/遇敌表，保留地点 NPC、Bag Advances、首次长闪烁和版本差异。
- 支持普通 12 槽与水面 5 槽分布、Honey Delay、同步、危险帧、笛子、槽位、结果上限和 CSV。
- 已通过：任务文件格式化、定向 Vitest（2 个文件、4 项测试）、`npm run typecheck`、`npx eslint`、`$env:POKERNGKIT_WASM_MODULES='gen6tinyhoney'; npm run wasm:test:native`（1/1）。
- 已通过：完整 `npm run verify`（170 个测试文件、595 项测试及生产 Web/PWA 构建）；为适配当前 8.47 MB 主包，将 Workbox 预缓存上限从 8 MiB 更新为 12 MiB。
- 未运行：Emscripten Wasm 构建、外部 Chrome/Edge UI 和生产页面算法回归；后两项继续按全部 3DS 模块完成后的统一验收门槛执行。

# 2026-08-20 TinyFinder T13 MT Seed Searcher（已完成工程实现与本地验证）

- 新增：独立 `gen6mtseed` MT19937 Wasm、Dedicated Worker、六类搜索模式和虚拟结果表，覆盖 IV、PID、EC、PID Reroll、PID Reroll = EC 与 Horde；保留 TinyFinder 的 IV、性格、特性、PSV/PRV、Nice Spinda 和 Horde 跳帧语义。
- 接入：第六世代侧栏、三语文案、33-word 请求 / 32-word 结果 ABI、分步 Worker、结果上限、CSV、模块文档和原生夹具。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、模块 ESLint、`npm run typecheck`、`npx vitest run src/features/gen6mtseed/domain.test.ts --pool=threads --maxWorkers=2`（3 项）、`POKERNGKIT_WASM_MODULES=gen6mtseed npm run wasm:test:native`（1/1）以及完整 `npm run verify`（173 个测试文件、603 项测试及生产 Web/PWA 构建）。
- 未运行：Emscripten 生产构建（当前环境未提供 `emcc`）、外部 Chrome/Edge UI 和生产页面算法回归；后两项继续按全部 3DS 模块完成后的统一验收门槛执行。

# 当前目标：完成 3DSRNGTool 全范围后统一 UI 验收

## 2026-08-20 TinyFinder T14 MT 初始 Seed / Time Finder（已完成工程实现与本地验证）

- 新增：独立 `gen6mtseedtime` MT19937 Wasm、Dedicated Worker、目标时间与目标日期两种检索模式；保留 `FindSavePar`、XY/ORAS Save Frame 偏移、`Seed + 1000` 秒推进和 200,000 帧日期扫描。
- 接入：第六世代侧栏、三语文案、10-word 请求 / 8-word 结果 ABI、分步 Worker、秒数与结果上限保护、虚拟结果表、CSV、模块文档和原生夹具。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、模块 ESLint、`npm run typecheck`、`npx vitest run src/features/gen6mtseedtime/domain.test.ts --pool=threads --maxWorkers=2`（3 项）、`POKERNGKIT_WASM_MODULES=gen6mtseedtime npm run wasm:test:native`（1/1）以及完整 `npm run verify`（174 个测试文件、606 项测试及生产 Web/PWA 构建）。
- 未运行：Emscripten 生产构建（当前环境未提供 `emcc`）、外部 Chrome/Edge UI 和生产页面算法回归；这些检查按全部 3DS 模块完成后的统一验收门槛执行。
- Git：T14 与群战结果字段修正已分别提交；当前本地 `main` 领先 `origin/main`，多次 `git push origin main` 均因 GitHub HTTPS 连接被重置，待网络恢复后重试。

- 当前主线：TinyFinder T1-T14 已落地，进入 3DSRNGTool 全范围收口与统一 UI 验收准备。
- 验收门槛：上述范围全部完成并部署后，按项目所有者确认的八项清单完成外部 Chrome/Edge 生产页面验收；在此之前不宣称 3DS 功能或 UI 已最终完成。
- 当前状态：TF5、TF6、公共 TSV List、IV Range / IV Template、TinyFinder T10 Ambush、
  T12 Swooping 范围审查、T13 MT Seed Searcher 与 T14 MT 初始 Seed / Time Finder 已完成；
  外部页面回归保留到全部 3DS 模块完成后统一执行。

## 2026-08-20 TinyFinder T6 Rock Smash（已完成工程实现与本地验证）

- 新增独立 `gen6tinyrocksmash` TinyMT / BlinkSystem Wasm 与 Dedicated Worker，避免改变现有 `gen6wild` 的 3DSRNGTool 主 MT 结果。
- 接入第六世代导航、三语文案和 TinyFinder Rock Smash 工作区；支持 Seed / State、Index 范围、五槽遇敌表、闪烁参数、触发/同步/危险帧/笛子/槽位筛选、时间线和 CSV。
- 修正槽位掩码的 1–5 编号偏移，并按 TinyFinder `RandU32` 的先推进后取值语义复核闪烁消耗；原生夹具覆盖五个槽位的独立过滤。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、`npm run lint`、`npm run typecheck`、定向 Vitest（2 个文件、4 项测试）、定向原生夹具（1/1）、定向 Emscripten Wasm 构建和完整 `npm run verify`（168 个测试文件、591 项测试及生产 Web 构建）。

## 2026-08-20 侧边栏长标题与滚动条样式修复（已完成工程验证）

- 修复：侧边栏模块标题在固定宽度下保持单行省略号，保留原有 `title` 完整名称提示；分组标题继续遵循相同截断规则。
- 优化：侧栏本体锁定溢出，导航内容仍可在模块较多时滚动，但 Chrome、Edge、Firefox 和兼容 WebKit 的滚动条均不显示，避免出现可见滚动条占位。
- 影响：仅调整 `src/styles.css` 的导航布局和溢出行为，不改变模块路由、键盘焦点、数据流或 RNG 算法。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`。
- 未运行：测试、TypeScript、构建和外部 Chrome/Edge UI 回归；本轮为 CSS-only 修复，最终浏览器验收仍按全部 3DS 模块完成后的统一门槛执行。

## 2026-08-20 TinyFinder T1/T2 TinyMT 日期与 Index 查询（已完成工程验证）

- 新增：Gen VI TinyMT `Date Searcher` 与 `Generator`，日期模式按所选月份到年末枚举，每秒沿用 TinyFinder 的 `Seed + 1000` 规则；Generator 从四字状态生成连续 Index。
- 新增：Index / TinyMT 状态普通包含和正则筛选、结果上限、进度、取消、虚拟结果表与 CSV；生产 RNG 只在 `gen6tinyindex` Dedicated Worker/Wasm 中执行。
- 接入：第六世代侧栏、引擎标题和 API 版本文案；新增 `docs/modules/gen6tinyindex.md`，库存 T1/T2 更新为已实现。
- 已通过：TinyMT Index 定向 Vitest（2 个文件、4 项测试）、`npm run typecheck`、`$env:POKERNGKIT_WASM_MODULES='gen6tinyindex'; npm run wasm:test:native`（1/1）、任务文件格式化、`npm run format:check`、`git diff --check`。
- 已通过：在用户级 Emscripten 6.0.6 环境中运行 `cmd /c "call C:\\Users\\Hakuhiro\\emsdk\\emsdk_env.bat && set POKERNGKIT_WASM_MODULES=gen6tinyindex && npm run wasm:build"`；生成 `gen6tinyindex.mjs`（7733 bytes，SHA-256 `381273699382CDB04155F2A66356E685F7D1A616884F5F1921B92F77152DBDC2`）与 `gen6tinyindex.wasm`（6901 bytes，SHA-256 `E5FDB77063C70B0664DAEB755D4C151602391A3E48E377387ECD5EEBDFEEAEB2`）。
- 未运行：外部 Chrome/Edge UI 与生产页面算法验收；后两项继续按全部 3DS 模块完成后的统一门槛执行。
- 下一步：实现 TinyFinder T10 Ambush，复用本模块的地点数据、TinyMT 和 Worker/Wasm 协议边界。

## 2026-08-20 3DSTimeFinder TF1 Gen VI Stationary 时间反查（已完成工程验证）

- 新增：Gen VI Stationary TF1 时间/初始 Seed Searcher，按 `StationarySearcher6` 逐秒枚举 Citra epoch，使用 Save Variable、Time Variable 与 Epoch 的 32 位加法计算 Initial Seed。
- 接入：六代 Profile Manager 新增 Save Variable / Time Variable 字段并兼容旧档案；定点面板新增 TF1 时间模式、日期范围、时间结果列和 Worker 取消。
- Wasm：新增 `gen6timefinder` API v1 与 `gen6stationarytimefinder` Dedicated Worker；Stationary 算法继续复用既有 `gen6stationary` Wasm，时间结果为 19-word 固定协议。
- 已通过：TF1/存档/定点定向 Vitest（3 个文件、13 项）、`npm run typecheck`、`$env:POKERNGKIT_WASM_MODULES='gen6timefinder'; npm run wasm:test:native`（1/1）、任务文件格式化、`npm run format:check` 和 `git diff --check`。
- 未运行：`npm run wasm:build`，当前环境缺少已激活的 Emscripten / `emcmake`；外部 Chrome/Edge UI 与生产页面算法验收按全部 3DS 模块完成后的统一门槛执行。
- 下一步：实现 Gen VI TF2 Event 时间反查，复用 `EventSearcher6` 的结果和筛选语义。

## 2026-08-20 3DSTimeFinder TF2 Gen VI Event 时间反查（已完成工程验证）

- 新增：Gen VI Event TF2 时间/初始 Seed Searcher，按 `EventSearcher6` 逐秒枚举 Citra epoch，复用既有 Event 54-word Wasm 请求和 16-word 结果。
- 接入：Gen VI Event 面板新增 TF2 时间模式、日期范围、Date/Time 与 Initial Seed 结果列；保留 Wondercard 导入、PID 类型、锁定字段和筛选逻辑。
- 已通过：TF2/Gen VI Event 定向 Vitest（3 个文件、9 项）、定向 ESLint、`npm run typecheck`、`$env:POKERNGKIT_WASM_MODULES='gen6timefinder,gen6event'; npm run wasm:test:native`（2/2）、任务文件格式化、`npm run format:check` 和 `git diff --check`。
- 未运行：`npm run wasm:build`，当前环境缺少已激活的 Emscripten / `emcmake`；外部 Chrome/Edge UI 与生产页面算法验收按全部 3DS 模块完成后的统一门槛执行。
- 下一步：核对 TinyFinder 六代真实缺口，随后统一整理剩余 3DS 模块库存并准备验收。

## 2026-08-20 公共 IV Range / IV Template（已完成工程验证）

- 新增：实现 3DSRNGTool `IVRange` 与 `IVTemplate` 的全局本地浮动工具，复用 `AutoCompleteComboBox`，支持六项档位、严格六项模板、默认模板、新增/删除/保存和双亲应用。
- 接入：`Apply Range` 同步 Gen VI/Gen VII Egg 的 `ivMin` / `ivMax`；`Set as Male` / `Set as Female` 通过同页事件更新对应双亲六项 IV；模板保存到 `pokerngkit-iv-tools-v1`。
- UI：新增 IV Tools 悬浮入口，保持实体面板、焦点管理、Escape、点外关闭、拖动和移动端布局；不新增 RNG/Wasm 算法。
- 已完成：上游 `IVRange.cs`、`IVTemplate.cs`、`StringItem.cs`、`MainForm_CtrlGroup.cs`、`MainForm_Egg.cs` 输入边界和统计顺序核对；模块文档、需求和库存已更新。
- 已通过：`npx vitest run src/features/ivtools/domain.test.ts`（3 项）、改动文件 ESLint、`npm run typecheck`、`npm run format:check` 和 `git diff --check`。
- 已通过：完整 `npm run verify`，包含 162 个测试文件共 577 项测试、Vite 转换 2268 个模块和 PWA 220 项预缓存资源；仅保留既有主包超过 500 kB 的构建提示。
- 待完成：提交推送；外部 Chrome/Edge UI 回归和生产页面算法验收按全部 3DS 模块完成后的统一验收门槛执行。

## 工程验证耗时优化决策

- 现状：`tsc -b` 已使用项目引用增量缓存；Vite/PWA 全量构建仍必须生成所有 Worker、Wasm 资源和预缓存，不能用局部构建替代发布门槛。
- 基准：本机默认 `npm test` 的 159 个测试文件、568 项测试约 57 秒通过；强制 Vitest `threads` 池并发 4 在 Windows 上耗时约 148 秒并出现 3 个 worker 启动超时，因此不切换默认测试池。
- 决策：开发循环使用 `npx vitest run <module-test-files>`、`npx eslint <changed-files>`、定向 `POKERNGKIT_WASM_MODULES=<module>` 原生/Wasm 检查；提交前继续使用完整 `npm run verify` 与 `npm run verify:full`。
- 适用范围：增量 TypeScript、按修改文件 lint、按模块测试和按目标构建是多数 TS/Vite/Vitest 仓库都可复用的优化方向；测试池、Worker 数量、缓存策略和全量构建拆分不能直接照搬，必须在目标仓库和操作系统上以实际耗时、稳定性和资源占用重新基准测试。
- 文档化：已将上述分层验证原则写入 `docs/ai-development.md`，作为跨项目可复用的方法；本仓库的具体命令、基准和提交前全量门槛仍以本节实测记录为准。

## 2026-08-20 公共 TSV List（已完成工程实现）

- 新增：实现 3DSRNGTool `TSVListForm` 的本地 Web 版本，支持逐行、逗号、空白和分号分隔，按上游规则去重并忽略非法 TSV。
- 接入：TSV List 进入右下角悬浮工具菜单，使用 localStorage `pokerngkit-tsv-list-v1` 持久化，并通过同页/跨标签页事件同步 Gen VI 与 Gen VII Egg 的 Other TSV 输入。
- 约束：TSV 保持 `0..4095`，最多 4096 项，与两代 Egg 的 4096-bit Other TSV 掩码一致；不连接 NTR/TCP，不上传数据。
- UI：补充实体浮动面板、保存/清空、有效项数量、范围状态和移动端布局；侧边栏长标题统一单行省略号，滚动能力保留但隐藏可见滚动条。
- 已通过：TSV List 定向 Vitest（3 项）、定向 ESLint、TypeScript、任务文件格式化、`git diff --check`。
- 已通过：完整 `npm run verify`，包含 161 个测试文件共 574 项测试、Vite/PWA 生产构建 2265 个模块和 220 项预缓存资源。
- 待完成：提交推送，以及外部 Chrome/Edge 与生产页面回归；后两项按全部 3DS 模块完成后的统一验收门槛执行。

## 2026-08-19 3DSTimeFinder TF5 Gen VII Wild 时间反查（已完成）

- 新增：加入独立 `gen7wildtimefinder` Wasm、Dedicated Worker、时间枚举、领域校验、原生夹具和三栏参数工作台，支持 Grass/Fish、同步、性别比、闪耀护符与 WildFilter 筛选。
- 算法：按 `3DSTimeFinder` `WildSearcher7` 的 SFMT 128 项 RNGList 和帧消耗顺序实现同步、槽位、等级/笛子消耗、60 帧推进、EC、PID 重掷、六项 IV、Ability、Nature、Gender；Initial Seed 复用 `gen7timefinder` SHA-256 Worker。
- 接线：Gen VII 侧栏新增 TF5 入口，新增固定宽度 C ABI、请求/结果校验、取消、结果上限和 PWA Worker 产物。
- 已通过：`npx vitest run src/features/gen7wildtimefinder/timeDomain.test.ts`（3 项）；`$env:POKERNGKIT_WASM_MODULES='gen7wildtimefinder'; npm run wasm:test:native`（1/1）；激活 Emscripten 6.0.6 后定向 `npm run wasm:build`；`npm run verify`（159 个测试文件、568 项测试、Vite/PWA 219 项预缓存）；`npm run format:check`、`git diff --check`。
- 未运行：外部 Chrome/Edge UI 与生产页面算法验收；按当前目标，待全部 3DS 模块完成后统一执行八项 UI 门槛。

## 2026-08-20 3DSTimeFinder TF6 Gen VII ID 时间反查（已完成工程验证）

- 新增：加入独立 `gen7idtimefinder` 时间领域、Dedicated Worker、预览引擎和三栏工作台；按 `IDSearcher7` 逐秒枚举 Citra 时间并输出 Initial Seed、帧、TID、SID、TSV、TRV、Gen7TID 和 Clock。
- 复用：不新增重复 C++ RNG；Worker 复用 `gen7timefinder` Initial Seed SHA-256 Wasm 与 `gen7id` SFMT Wasm，再应用既有 ID 多行、TSV、Random Number、正则和 Disable Filters 语义。
- 接线：Gen VII 侧栏新增 TF6 入口，结果表使用虚拟滚动，补充固定十字结果协议、取消、时间/Seed 元数据和模块文档。
- 已通过：TF6 定向 Vitest（1 个文件、3 项测试）与既有 Gen VII ID 测试合计 2 个文件、15 项测试；`$env:POKERNGKIT_WASM_MODULES='gen7id'; npm run wasm:test:native`（1/1）；`npm run typecheck`、定向 ESLint、全仓 `npm run verify`（160 个测试文件、571 项测试、Vite/PWA 预缓存 220 项）、`npm run format:check`、`git diff --check`。
- 已通过：激活 Emscripten 6.0.6 后定向 `npm run wasm:build`，复用 `gen7id` 与 `gen7timefinder` 浏览器 Wasm 产物可用；CMake 仍提示 4.3.1 对 Emscripten shared library 的非阻断警告，当前 target 为 executable。
- 待完成：外部 Chrome/Edge 和生产页面回归；按当前目标，待全部 3DS 模块完成后统一执行八项 UI 门槛，未完成前不宣称 TF6 最终验收。

## 2026-08-19 3DSTimeFinder TF4 Gen VII Event 时间反查（已完成）

- 新增：加入独立 `gen7eventtimefinder` Wasm、Dedicated Worker、领域校验、预览引擎、三栏参数工作台、虚拟结果表、CSV、取消和空结果状态。
- 新增：按 `EventSearcher7` 复用 Gen VII Event 的 EC、PID、IV、Ability、Nature、Gender、Hidden Power、Shiny 和筛选语义；结果增加 Date/Time 与 Initial Seed。
- 修复：收口 45-word ABI 的 TypeScript 偏移、无性别元数据校验和随机性别编码；TF4 导航入口移到 TF3 时间反查旁，符合 `存档信息/ID -> Seed 相关 -> 定点 -> 野生 -> 蛋 -> 事件` 主线。
- 已通过：`npm run typecheck`、TF4 定向 Vitest（3 个文件、8 项测试）和 `$env:POKERNGKIT_WASM_MODULES='gen7eventtimefinder'; npm run wasm:test:native`（1/1）。
- 已通过：`npm run verify`（158 个测试文件、565 项测试，Vite/PWA 预缓存 214 项）、`npm run format:check`、`git diff --check` 和 Emscripten 6.0.6 定向 `npm run wasm:build`。
- 已验证产物：`gen7eventtimefinder.mjs` 8183 bytes，SHA-256 `8759C23CABF0DAC5489854E47C98CF1092CE055FA2B813739C6C80F9A430D728`；`gen7eventtimefinder.wasm` 7246 bytes，SHA-256 `00110E99534F56C8DB6BD5382FE6397242F558EC94C83078F7D244EBA880E1E2`。
- 未运行：外部 Chrome/Edge UI 回归和生产算法验收；全部 3DSRNGTool 模块完成后，按项目所有者列出的 8 项 UI 清单统一验收，须使用已连接外部浏览器。

> - 最近更新：2026-08-20
> - 当前分支：`main`
> - 当前阶段：公共 TSV List、IV Range / IV Template 已实现并通过提交前全量验证
> - 工作区状态：当前工作区干净，`main` 与 `origin/main` 对齐于 `7befd11`
> - 下一步：实现 Gen VI TF1/TF2 时间反查，随后评估 TinyFinder 独有缺口

## 2026-08-19 3DSTimeFinder TF3 Gen VII Stationary 时间反查（已完成）

- 新增：加入 `gen7timefinder` Wasm 初始 Seed 哈希模块，按 `3DSTimeFinder` 的 `SHA256::hash(tick, epochLow, epochHigh)` 计算 Citra epoch 对应的 32 位初始 Seed。
- 新增：Gen VII Stationary 面板支持 TF3 时间模式，按整秒日期范围枚举时间，复用既有 Stationary Worker/Wasm 生成和筛选，结果增加 Date/Time 与 Initial Seed。
- 新增：补充 `docs/modules/gen7timefinder.md` 与集中需求池 `docs/roadmap.md`，记录全世代教程共用主线、优先级、状态和排除项。
- 更新：按项目所有者确认的共有主线，将后续审查与侧栏规则固定为 `存档信息/ID -> Seed 相关 -> 定点 -> 野生 -> 蛋 -> 事件 -> 其他辅助扩展`；教程入口审查不再统一延后到最后。
- 修复：跨时间点累计结果在当前时间点达到上限但仍有后续时间时，正确报告 `resultLimitReached`；补充 Worker 初始化取消和该边界的回归测试。
- 已通过：5 个 TF3 定向测试文件、`npm run verify`（155 个测试文件、556 个测试）、`npm run format:check`、`git diff --check`。
- 已通过：`set POKERNGKIT_WASM_MODULES=gen7timefinder&&npm run wasm:test:native`（1/1）和 Emscripten 6.0.6 定向 Wasm 构建；`gen7timefinder.mjs` 5121 bytes，`gen7timefinder.wasm` 835 bytes。
- 未运行：外部 Chrome/Edge UI 回归和生产算法回归；需等待 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前阶段：TF3 Stationary 时间反查已完成；下一目标为 TF4 Event 时间反查
> - 工作区状态：TF3 核心、Worker、面板、导航、契约、测试和文档存在未提交修改，待提交推送
> - 下一步：提交并推送 `feat: 实现第七世代定点时间反查`，随后开始 TF4 Event

## 2026-08-19 3DSRNGTool 公共 Misc. RNG Tool

- 新增：实现 `miscrng` 全局轻量工具，收纳上游 `MiscRNGTool` 中尚缺的捕获率、暴击/摇晃结果、Random N 比较和 Pokerus 菌株解析。
- 新增：按 `Core/Capture.cs` 保留 Gen VI 高位随机字节、Gen VII 低位随机字节、状态/精灵球/图鉴/O 力量倍率、四次摇晃和 Always Capture 语义；按 `Gen7/Pokerus7.cs` 保留触发值、低三位筛选和菌株掩码。
- 接入：Misc. RNG Tool 进入右下角悬浮工具 Rail，使用实体浮动面板、Capture/Random N/Pokerus 三个标签、输入校验、错误、清空、键盘焦点、Escape、点外关闭和移动端单列布局。
- 更新：补充 `docs/modules/miscrng.md`、需求、模块库存、三语文案和域层测试；连续帧搜索继续由现有 Gen VII Main、SOS、Battle Tree 与 Festival Plaza 独立工作区负责，避免重复引擎。
- 已通过：`npx vitest run src/features/miscrng/domain.test.ts`（5/5）、`npm run format:check`、`git diff --check`。
- 已通过：完整 `npm run verify`；Prettier、ESLint（0 error / 0 warning）、TypeScript、Vitest（153 个文件、550 项测试）和 Vite/PWA 生产构建（210 项预缓存资源）均完成。
- 未运行：外部 Chrome/Edge UI 回归和生产页面算法验收；需等待部署后由项目所有者提供准确 URL 并授权。
- 排序更新：项目所有者要求将本地 `PokemonRNGGuides` 教程作为后续规划最高优先级；已按非翻译正文逐文件完成全世代人工复核（12 个分组、165 篇指南），确认 Gen 2、Legends Arceus 和 NTR Helper 不属于产品范围，后续先做 Gen VII/Gen VI 3DSTimeFinder，再做 TSV List 与 IV Range / IV Template，TinyFinder 扩展后移。
- 复核结论：Gen 3-8 的教程主线均已有对应核心模块；当前真正影响教程闭环的缺口是 Gen 7/Gen 6 时间反查、Gen 7 TSV/IV 模板，以及 Gen 4 Voltorb Flip/Swarm/Gen4SeedFinder 和 Gen 5 DS 参数/时间分支。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前 HEAD：`0de90b1`（`docs: 完成全世代教程人工复核`）
> - 当前阶段：公共 Misc. RNG Tool 已完成工程闭环；PokemonRNGGuides 全世代人工复核已完成并重排后续计划
> - 工作区状态：全世代教程复核文档已格式化、提交并推送，工作区干净
> - 验证状态：Misc. RNG Tool 定向测试和完整 `npm run verify` 已通过；外部浏览器未运行

## 2026-08-19 3DSRNGTool 公共 KeyBV

- 新增：实现 `keybv` 本地战斗视频解析工具，支持 Gen VI `0x6E60` 与 Gen VII `0x6BC0` 两种尺寸，读取两份匹配文件并恢复最多六只队伍记录。
- 新增：按上游 `BVBreaker.cs`、`PKX.cs` 的 party offset、密钥流 XOR、加密零值、LCRNG 加解密、四块重排和 checksum 规则解析 Species、四位 TSV 与一位十六进制 TRV。
- 接入：KeyBV 作为轻量全局工具进入右下角悬浮菜单，支持文件选择、拖放、尺寸状态、清空、错误、结果表、键盘焦点和移动端单列布局；不上传、不写回文件、不连接 NTR/TCP。
- 更新：补充 `docs/modules/keybv.md`、需求、模块库存和三语文案；沿用现有 Gen VII 物种数据与 Ant Neutral HakuStyle 实体浮动面板。
- 已通过：`npx vitest run src/features/keybv/domain.test.ts`（4/4）、`npm run format:check`、`git diff --check`。
- 已通过：完整 `npm run verify`；Prettier、ESLint（0 error / 0 warning）、TypeScript、Vitest（152 个文件、545 项测试）和 Vite/PWA 生产构建（210 项预缓存资源）均完成。
- 未运行：外部 Chrome/Edge UI 回归和生产页面算法验收；需等待部署后由项目所有者提供准确 URL 并授权。
- 下一步：实现 3DSTimeFinder TF3/TF4（Gen VII Stationary/Event），再实现 TF1/TF2（Gen VI Stationary/Event）。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前 HEAD：`38e1c5f`（`feat: 实现第六世代TinyMT时间线工具`，KeyBV 尚未提交）
> - 当前阶段：公共 KeyBV 已完成工程闭环，下一模块为 `Misc. RNG Tool`
> - 工作区状态：KeyBV 功能、导航、三语、需求、库存和模块文档存在未提交修改
> - 验证状态：KeyBV 定向测试和完整 `npm run verify` 已通过；外部浏览器未运行

## 2026-08-19 3DSRNGTool Gen VI TinyMT Timeline Tool

- 新增：实现 `gen6tinytimeline` 四字 TinyMT 状态、11 种方法、1 至 4 个事件、方法参数、Delay、Cry、Consider Delay、ORAS 与 Poke Radar Boost 的本地时间线工作区。
- 新增：接入独立 22/16-word Wasm C ABI 与单 Dedicated Worker，保留 TinyStatus 事件队列、冷却时间、延迟拆分、Horde 五只 Flute/Item、Poke Radar 五个摇草块、虚拟结果表、CSV、进度和取消。
- 调整：静态浏览器不连接 NTR/TCP；实时校准改为本地事件表输入。模块继续使用 Ant Neutral HakuStyle 的 44px 控件、实体面板、共享候选下拉和结果区滚动。
- 已通过：`npm run typecheck`、`npm run lint`、定向 Vitest 3/3、`npm run build:web`；`POKERNGKIT_WASM_MODULES=gen6tinytimeline npm run wasm:test:native` 在修正 C++ 十六进制字面量后通过 1/1。第一次原生夹具在编译阶段失败，未执行算法断言。
- 已通过：激活 Emscripten 6.0.6 后定向 `npm run wasm:build`；`gen6tinytimeline.mjs` 7,640 bytes，SHA-256 `50E8D20E03359015C8CC28FA5E557499E0A369AB791B602D07158434A29F5208`；`gen6tinytimeline.wasm` 23,892 bytes，SHA-256 `8FC36396E136498DAE09390B85B2A76668054D0B4C81D05E5DF2E6CACDFC5D3C`。
- 修复：首次完整 `npm run verify` 在 TypeScript 阶段发现 TinyMT 方法文本、AbortSignal 与 `gen6mainseed` 类型重导出问题；补充显式类型后从头重跑通过。
- 修复：为 12 个既有 TanStack Virtual 调用增加 `react-hooks/incompatible-library` 定点豁免；保留全仓 React Compiler 规则，不改变虚拟列表业务逻辑。定向 `npm run lint` 从 0 error / 12 warning 收敛为 0 error / 0 warning。
- 已通过：定点处理后从头运行完整 `npm run verify`；Prettier、ESLint（0 error / 0 warning）、TypeScript、Vitest（151 个文件、541 项测试）和 Vite/PWA 生产构建（2,240 个模块、210 项预缓存资源）均完成。
- 未运行：外部 Chrome/Edge UI 回归和生产页面算法验收；需等待 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。
- 下一步：核对公共 KeyBV，并按悬浮工具菜单规则落地轻量全局工具。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 功能起点：`c11f451`（`docs: 更新第六世代主Seed交接状态`）
> - 当前阶段：Gen VI TinyMT Timeline Tool 已完成工程闭环；下一模块为公共 KeyBV
> - 变更范围：TinyMT Timeline 功能、导航、三语、Wasm/C++、TanStack Virtual 警告收口和对应文档
> - 验证状态：完整 verify、定向原生夹具和生产 Wasm 构建已通过；外部浏览器未运行

## 2026-08-19 3DSRNGTool Gen VI Main Seed Finder 与全局工具入口

- 新增：实现 `gen6mainseed` 两只野生个体值和单只个体值范围两种检索模式；保留上游 MT19937 初始化、整块 twist、63 次预推进、连续 IV 窗口、性格、Gender 和帧 0 哨兵语义。
- 新增：接入独立 `gen6mainseed` Wasm/C ABI、最多 8 个单线程 Worker、Seed 分片、确定顺序、进度、取消、CSV、清空、错误、空结果和 TanStack Virtual 结果表；新增模块文档、需求、技术栈和库存记录。
- 优化：3DSRNGTool Profile Manager 从左侧隐藏模块导航收纳到右下角悬浮工具菜单，并保持全局可见；Researcher 同样由右下角悬浮工具菜单打开。3DS 档案编辑 modal 进入浮动面板后仍独立接管焦点。
- 修复：清理 Gen VI Main Seed bridge 未使用的辅助代码和 UI 未使用异常变量，补齐嵌套 modal 的点外关闭与 Tab 焦点例外。
- 已完成：`npm run format:files --` 本轮触及文件、`npm run format:check`、`git diff --check`。
- 未运行：Vitest、ESLint、TypeScript、原生夹具、Emscripten/Wasm 构建、Web 构建和外部 Chrome/Edge；仓库规则要求对具体工程检查或 URL 明确授权后再运行。算法验收仍需部署后由项目所有者提供准确 URL 并授权。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前 HEAD：`22f568a`（`style: 统一正式工作台与 Demo 组件样式`）
> - 当前阶段：Gen VI Main Seed Finder 已实现，功能提交 `f50c0e9` 已提交并推送；下一模块为 Gen VI TinyMT Timeline Tool
> - 工作区状态：本轮包含 Gen VI Main Seed Finder、3DS Profile Manager/Researcher 悬浮入口和对应文档改动，功能代码已提交并推送
> - 验证状态：格式检查与空白检查已运行；测试、构建、原生/Wasm 和外部浏览器回归未运行

## 2026-08-19 HakuStyle Demo 对齐第二轮

- 优化：正式工作台的浅色与深色中性令牌重新对齐 `?demo=hakustyle`，统一页面底色、实体表面、弱表面、边界、正文和次要文字；主内容宽度、页标题分隔、侧栏间距和折叠 Rail 搜索入口同步采用 Demo 几何，页头 `Ready` 状态改用与 Demo 相同的 Lucide 勾选图标。
- 优化：通用输入、原生下拉、自动完成、多选候选、分段切换、主次操作、运行状态、进度条、结果头部、表格与浮动工具面板统一为 44px 控件、10px 控制圆角、12px 菜单圆角、16px 普通面板和 18px 浮动面板；原生下拉增加与 Demo 一致的 Chevron 图标和深浅色适配，旧有不透明焦点描边改用半透明 focus ring。
- 优化：直接对齐 Gen VIII Raids、Static、Underground、Wild、Profiles、Egg、Event 与 Den Map 的模块样式，避免懒加载或高优先级模块 CSS 恢复 40px 控件、8px 面板、透明次按钮和旧下拉表面；保留虚拟表既有行高，未改动滚动定位计算。
- 影响：仅调整 CSS 令牌、布局和组件状态，不改变 React 数据流、模块字段、输入范围、RNG 算法、Worker、Wasm 或持久化。
- 已通过：本轮代码文件定向 `npm run format:files -- ...`、全仓 `npm run format:check`、`git diff --check` 和触及 CSS 的粗描边静态复扫；未发现非透明 2/3px focus outline、3px inset 状态环或 2/3px 方向边框。
- 未运行：ESLint、TypeScript、Vitest、Web/Wasm 构建和本地 UI 预览；项目所有者本轮未授权具体检查命令或 URL。
- 未运行：外部 Chrome / Edge 的 390px、1280px、桌面与深浅色 UI 回归；当前没有已连接的外部浏览器，不能使用应用内浏览器替代。
- 下一步：项目所有者连接外部 Chrome / Edge 并明确授权实际 URL 后，对正式工作台与 `?demo=hakustyle` 进行同屏回归；浏览器回归收口后继续 Gen VI Main Seed Finder，不提前进入后续 3DSRNGTool 模块。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前 HEAD：`c879129`（`style: 清理工作台粗描边并统一 Demo 样式`）
> - 当前阶段：HakuStyle Demo 对齐第二轮已完成代码与静态格式收尾，等待外部浏览器回归
> - 工作区状态：`src/App.tsx`、`src/styles.css`、8 个 Gen VIII 模块 CSS 与 5 个旧模块焦点态 CSS 存在未提交 UI 修改，未暂存、未提交、未推送
> - 验证状态：定向格式化、全仓 Prettier、空白检查和粗描边静态复扫已通过；测试、构建和外部浏览器回归未运行

## 2026-08-19 HakuStyle UI 组件收敛

- 优化：严格对齐 `?demo=hakustyle` 的实体表面与安静边界，普通工作面板移除粗顶边和普通阴影，改为实体背景加 1px 中性边界。
- 清理：移除正式工作台、Demo、Gen V-VIII、研究工具和 Gen VIII Den Map 中的 3px 焦点光环、内嵌选中条和白色粗标记；焦点统一为 2px 透明混合色环，选中与悬停统一使用填充背景。
- 优化：共享自动完成与多选候选控件改用 Lucide 箭头和勾选图标，统一 44px 控件、10px 控制圆角、12px 实体候选层、填充高亮和克制浮层阴影；同步收敛 Gen V-VIII 的重复局部样式。
- 保留：浮动工具面板、弹窗和候选下拉仍保留克制的层级阴影；错误、警告、在线状态和地图位置继续使用语义色，但不再依赖粗描边。
- 影响：仅调整 CSS 材质、边界和状态表达，不改变 React 结构、交互、输入范围、RNG 算法、Worker、Wasm 或持久化。
- 已通过：定向 `npm run format:files -- ...`、全仓 `npm run format:check`、`git diff --check`，以及粗描边模式静态复扫；`src` 中不再存在 3px outline、3px 状态环、`inset 3px` 或 2/3px 方向边框。
- 未运行：ESLint、TypeScript、Vitest、Web/Wasm 构建和本地预览；本轮不包含算法或运行时改动，仓库规则要求这些检查取得具体授权后再执行。
- 未运行：外部 Chrome / Edge UI 回归和生产页面验收；当前没有外部浏览器连接，待部署后由项目所有者提供准确 URL 并授权。
- 下一步：继续按 PokeFinder/3DSRNGTool 库存推进 Gen VI Main Seed Finder；PokemonRNGGuides 流程排序与借鉴模块、EXE 适配保持最后阶段。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - Git 功能基线：`d3405e8`（`feat: 实现第六世代 ID 乱数`）
> - 当前阶段：HakuStyle UI 描边、实体表面和候选控件收敛已完成，下一模块为 Gen VI Main Seed Finder
> - 工作区状态：正式 App 与 `?demo=hakustyle` 共用固定 Ant Neutral HakuStyle 契约；普通面板无粗描边和 broad shadow，浮动层保留必要层级阴影
> - 验证状态：定向格式化、全仓 Prettier、空白检查和粗描边静态复扫已通过；外部 Chrome / Edge 未连接，浏览器回归待后续连接后执行

## 2026-08-18 3DSRNGTool Gen VI ID RNG

- 新增：实现独立 gen6id 工作区，覆盖 TinyMT 四字状态、连续 ID 帧、TID/SID/完整 TID-SID、TSV、TRV、Random Number 与状态筛选。
- 算法：复用上游 Gen6/ID6.cs、Controls/Frame_ID.cs、Core/IDFilters.cs 与 RNG/TinyMT.cs；每帧先保存状态再取 Nextuint()，按上游计算 TID、SID、TSV 和 TRV。
- 契约：新增 wasm/modules/gen6id，6-word 请求、8-word 结果、Wasm API version 1、Contract version 1、单 Dedicated Worker 和 public/wasm/gen6id.mjs/.wasm。
- 界面：增加 Gen VI 导航、0..5,000,000 浏览器帧保护、100000 行结果上限、三态 ID 筛选、正则/禁用筛选、进度、取消、虚拟结果表和 CSV。
- 文档：增加 docs/modules/gen6id.md，更新需求和模块库存；TinyFinder 与 Bambo-Rambo 研究资料记录在 third_party/tinyfinder/UPSTREAM.md、third_party/bambo-rambo/UPSTREAM.md。
- 已通过：`npm test -- --run src/features/gen6id`（2 个文件、4 项测试）和 `npm run typecheck`。
- 已通过：格式收尾、git diff --check、gen6id 原生夹具 1/1、激活 Emscripten 6.0.6 后的定向 Wasm 构建；gen6id.mjs 7516 bytes，SHA-256 0C24067B6A6EC0A798E83AA9BBB2DBE3C7323D4D52AC06C09EC41DCBE1E4AB8D；gen6id.wasm 4644 bytes，SHA-256 3EF9A2FC8FBA2C1E6597F101AA06A3A0063A038A620823EA38F58973D6AEF5FB。
- 已通过：完整 `npm run verify`；Prettier、TypeScript、Vitest（147 个测试文件、531 项测试）和 Vite/PWA 生产构建（2230 个模块、206 项预缓存资源）均完成；ESLint 0 error，保留 12 条既有 TanStack Virtual `react-hooks/incompatible-library` warning。
- 未运行：外部 Chrome / Edge UI 回归和生产页面算法验收；外部浏览器尚未连接，生产验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代 ID 乱数`，随后进入 Gen VI Main Seed Finder；TinyFinder/3DSTimeFinder 扩展按库存排期，PokemonRNGGuides 侧栏流程重排与可借鉴模块最后处理。

> - 最近更新：2026-08-18
> - 当前分支：`main`
> - Git 功能基线：`8754548`（`feat: 实现第六世代孵化乱数`）；当前工作区正在收口 Gen VI ID RNG
> - 当前阶段：Gen VI ID RNG 已实现，待提交推送；下一模块为 Gen VI Main Seed Finder
> - 工作区状态：正式 App 与 `?demo=hakustyle` 共用固定 Ant Neutral HakuStyle 契约；本轮包含 Gen VI ID 的 TinyMT 四字状态、ID/TSV/TRV/Random/状态筛选、Dedicated Worker/Wasm、固定高度虚拟结果表、三语界面和模块文档
> - 验证状态：Gen VI ID 定向 Vitest、TypeScript、格式检查、原生夹具、Emscripten 6.0.6 定向 Wasm 构建和完整 `npm run verify` 已通过；外部 Chrome / Edge 未连接，浏览器回归待后续连接后执行

## 2026-08-18 3DSRNGTool Gen VI Egg RNG

- 新增：实现独立 `gen6egg` 工作区，覆盖 Current 蛋、Frame Range、Accept/Reject 延迟、Main RNG PID、双亲 IV/Ability/性别/Ditto/道具、Nido Type、Shiny Charm、Masuda Method、Other TSV 与完整结果筛选。
- 算法：复用上游 `MainForm_Core.cs::Search6_Egg`、`MainForm.cs::getEggRNG`、`Core/EggRNG.cs`、`Gen6/Egg6.cs`、`Core/RNGPool.cs` 与 `RNG/MT.cs`；保留 20 项 MT 滚动缓冲、接受蛋 16 延迟、拒绝蛋 0 延迟、双 Power Item 随机父方、Current 行和 Female IV inheritance mask。
- 契约：新增 `wasm/modules/gen6egg`，154-word 请求、20-word 结果、Wasm API version 2、Contract version 1、独立 Worker 和 `public/wasm/gen6egg.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6egg.md`，同步 README、需求、技术方案和模块库存；记录上游 WinForms 输入边界、Current 行、接受/拒绝延迟、请求布局和验证限制。
- 已通过：`npm test -- --run src/features/gen6egg`（2 个文件、4 项测试）、`npm run typecheck`、`npm run format:check`、`git diff --check`、`$env:POKERNGKIT_WASM_MODULES='gen6egg'; npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后 `$env:POKERNGKIT_WASM_MODULES='gen6egg'; npm run wasm:build`。
- 产物：`public/wasm/gen6egg.mjs` 7547 bytes，SHA-256 `7BB1E3CC00E5C98208EB14A82403C3220CAB9CE5C637D835F73EABCC3CF399F6`；`public/wasm/gen6egg.wasm` 10475 bytes，SHA-256 `D1980DE45AFD7376BC998E4BE8B9712F492F79039996347D538EFCDA4FFAC868`。
- 修复：远端 HakuStyle Demo 的工具面板状态重置从 effect 移入工具切换事件处理器，消除 React `set-state-in-effect` lint error；保留 Demo 作为后续 UI 风格基线，不参与 RNG 算法。
- 已通过：合并 `origin/main` 后完整 `npm run verify`（145 个测试文件、527 项测试、Vite 转换 2225 个模块、PWA 预缓存 203 项）；Lint 0 error，保留 12 条既有 TanStack Virtual `react-hooks/incompatible-library` warning。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无外部调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。网络 `git pull` 曾重试两次因连接重置失败，随后使用已获取的 `origin/main` 对象完成本地快进合并。
- 下一步：提交并推送 `feat: 实现第六世代孵化乱数`；随后核对并实现 Gen VI ID RNG。

## 2026-08-18 3DSRNGTool Gen VI Poke Radar RNG

- 新增：实现独立 `gen6pokeradar` 工作区，覆盖 TinyMT Seed/Frame、帧范围、Party Size、Chain Length、Boost、音乐状态、四个宝可梦摇草块、一个不可踩空块和 9×9 概览。
- 算法：复用上游 `Gen6/PokeRadar.cs` 与 `RNG/TinyMT.cs` 的消耗顺序；保留 `23/43/63/83` GoodRate、音乐触发、连锁/Boost 闪光阈值和 `Patch.X/Y` 坐标映射。
- 界面：增加帧范围与生成参数、进度、取消、100000 行结果上限、CSV、固定高度虚拟结果表，以及 `B/G/S/X/C` 草块概览。
- 契约：新增 `wasm/modules/gen6pokeradar`，8-word 请求、16-word 结果、Wasm API version 1、Contract version 1、独立 Worker 和 `public/wasm/gen6pokeradar.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6pokeradar.md`，同步 README、需求、技术方案和模块库存；记录 TinyMT、帧范围、队伍数量、连锁长度、GoodRate、闪光阈值、坐标映射和浏览器任务上限。
- 已通过：`npm test -- src/features/gen6pokeradar`（2 个文件、4 项测试）、`npm run verify`（143 个测试文件、522 项测试、Vite 转换 2218 个模块、PWA 预缓存 200 项）、`npm run format:check`、`git diff --check`、`$env:POKERNGKIT_WASM_MODULES='gen6pokeradar'; node scripts/wasm.mjs test-native`（1/1）和激活 Emscripten 6.0.6 后的 `node scripts/wasm.mjs build`。
- Lint：0 error、11 条 TanStack Virtual `react-hooks/incompatible-library` warning，其中 1 条来自本模块虚拟结果表。
- 产物：`public/wasm/gen6pokeradar.mjs` 7565 bytes，SHA-256 `5285F825A7E98462E079928F310C7F3722A56C0772268FB2713263AA2DC794DC`；`public/wasm/gen6pokeradar.wasm` 6743 bytes，SHA-256 `2173E008765E425837148DDBFD30297C32519A696F094C876195579955F07F7B`。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无外部调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代宝可雷达乱数`；随后核对并实现 Gen VI Egg RNG。

## 2026-08-18 3DSRNGTool Gen VI DexNav RNG

- 新增：实现独立 `gen6dexnav` 工作区，覆盖 Grass、Tall Grass、Surf 的主动搜索与普通触发、摇晃坐标、槽位类型、连锁 Boost、搜索等级、Potential、Flute、隐藏特性、蛋招式、持有物和闪光检查。
- 算法：复用上游 `Gen6/DexNav.cs` 与 `RNG/TinyMT.cs` 的消耗顺序；保留 `FindPatch()` / `PostCheck()` 成功占位行为，Nav HA、Unown 和强制闪光与上游 MainForm 设置联动。
- 界面：增加 Tiny Seed/Frame、遇敌类型、主动搜索、图鉴导航遇敌、搜索等级、连锁长度、潜力星级、笛子、档案 TSV/TRV、13 槽可编辑物种/等级、进度、取消、100000 行结果上限、CSV 和固定高度虚拟结果表。
- 契约：新增 `wasm/modules/gen6dexnav`，45-word 请求、16-word 结果、Wasm API version 1、Contract version 1、独立 Worker 和 `public/wasm/gen6dexnav.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6dexnav.md`，同步 README、需求、技术方案和模块库存；记录 `DexNav.cs` 的输入边界、Grade/Boost/闪光检查和上游占位限制。
- 已通过：`npm test -- src/features/gen6dexnav`（2 个文件、4 项测试）、`npm run verify`（141 个测试文件、518 项测试、Vite 转换 2213 个模块、PWA 预缓存 197 项）、`npm run format:check`、`git diff --check`、`$env:POKERNGKIT_WASM_MODULES='gen6dexnav'; node scripts/wasm.mjs test-native`（1/1）和激活 Emscripten 6.0.6 后的 `node scripts/wasm.mjs build`。
- Lint：0 error、10 条 TanStack Virtual `react-hooks/incompatible-library` warning，其中 1 条来自本模块虚拟结果表。
- 产物：`public/wasm/gen6dexnav.mjs` 7490 bytes，SHA-256 `C81F8167D1276F9D0B187421267449127214BAEB922D046D8477830E568E04FB`；`public/wasm/gen6dexnav.wasm` 8980 bytes，SHA-256 `B14937434D5869759467374734AEB36580713445A466E474275A1769D5588313`。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无外部调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代图鉴导航乱数`；随后核对并实现 Gen VI Poke Radar RNG。

## 2026-08-18 3DSRNGTool Gen VI Wild RNG

- 新增：实现独立 `gen6wild` 工作区，覆盖 X、Y、Omega Ruby、Alpha Sapphire 的普通野生、Horde、Rock Smash 和 Fishing；支持队首能力、笛子、钓竿、Horde 选槽、闪耀护符、异色/方块异色、IV、性格、觉醒力量、性别、特性、道具与槽位筛选。
- 算法：复用上游 `Wild6`、`WildRNG`、`RNGPool` 的 TinyMT/MT19937 消耗顺序；普通、碎岩、钓鱼和群聚分别保留动态延迟、队伍消耗和五只连续生成规则；算法只在独立 Dedicated Worker 和 Wasm 中执行。
- 数据：从 `LocationTable6.cs`、`HordeArea6.cs`、`FishingArea.cs` 和三语地点资源生成 183 个区域记录；上游 revision 缺少完整 XY 普通野生槽位时使用可编辑自定义槽位，并在模块文档记录限制。
- 界面：增加版本、遭遇类型、地点、Seed、Tiny Seed、帧范围、Delay、队伍数量、钓竿、队首能力、笛子、槽位与完整结果筛选，支持进度、取消、100000 行结果上限、CSV、排序和固定高度虚拟结果表。
- 契约：新增 `wasm/modules/gen6wild`，96-word 请求、16-word 结果、Wasm API version 1、Contract version 1、独立 Worker 和 `public/wasm/gen6wild.mjs/.wasm`。
- 已通过：`npm test -- src/features/gen6wild`（2 个文件、5 项测试）、`npm run verify`（139 个测试文件、514 项测试、Vite/PWA 生产构建）、`npm run format:check`、`git diff --check`、`POKERNGKIT_WASM_MODULES=gen6wild npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后的 `POKERNGKIT_WASM_MODULES=gen6wild npm run wasm:build`。
- 产物：`public/wasm/gen6wild.mjs` 7440 bytes，SHA-256 `5490544C909FADF410F0A2F3D292354C520269DC1A5041FE1598DDA7B907419C`；`public/wasm/gen6wild.wasm` 14225 bytes，SHA-256 `C5082B38815D6434008656477A574E61980EF675DC0BA2258A974D885152F9DD`。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无外部调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代野生乱数`；随后核对并实现 Gen VI DexNav RNG。

## 2026-08-18 HakuStyle UI Demo 与正式工作台基线

- 新增：增加独立 `?demo=hakustyle` 预览入口，使用 Ant Neutral 单一主题展示工作台侧栏、配置表单、筛选、结果表、进度、浮动工具、三类面板和下拉选框。
- 优化：标准密度固定为 16px 正文 / 44px 控件，并同步调整面板内边距、字段间距、导航行高和结果行几何；浅色、深色、系统跟随主题偏好写入 localStorage，系统模式监听操作系统变化。
- 优化：侧栏展开宽度进一步收窄为 224px（1120px 以下为 216px），收起 Rail 为 64px；搜索框到首个世代、各世代之间的垂直间距进一步压缩为 4px，世代数字提升为 17px 且与 `GEN III` 同一中线；数字与 `Open Modules` 共用 44px 外框，分组按钮内间距收紧；模块项移除重复图标和小字描述，底部 `hs-demo-rail-footer` 已删除；收起时不展示下拉项，点击世代数字会展开侧栏并打开对应层级；折叠状态写入 localStorage，图标按钮提供 tooltip。
- 修复：移除侧栏顶部 `hs-demo-rail-header` 模块；世代数字图标与 `Open Modules` 使用同一 `44px` 方形外框尺寸，并同步分组按钮轨道，展开与收起状态保持居中。
- 修复：桌面菜单按钮只切换侧栏折叠，移动端按钮只切换抽屉；移除选中导航项的 `3px border-left`，改用填充选中背景；同步将 HakuStyle 的普通状态标记限制为 `1px`，避免高描边重新出现。
- 优化：浮动面板统一居中显示，并按档案、个体值计算器、遇敌查询功能使用不同宽度；标题栏支持 Pointer Events 拖动与键盘方向键位移，位置受视口边界限制；加入缓冲式抽屉/面板进入动效和 reduced-motion 回退；深浅切换改为图标按钮，文字只通过 tooltip 与 `aria-label` 提示。
- 新增：浮动工具改为单一折叠触发器，桌面端鼠标进入后向上展开、离开后收起，移动端以点击触发器切换；工具按钮彼此独立等距。键盘焦点可展开工具且鼠标点击焦点不会钉住展开态；工具面板支持 scrim、显式关闭、`Escape` 关闭、焦点圈定和触发器焦点恢复。Demo 内所有下拉均统一为输入 + 按钮的候选控件，支持打开、键盘方向键、Enter、Escape 与鼠标选择；下拉预览保留实体候选层，采用默认宽度、键盘与移动端贴边策略。
- 清理：所有待确认项已经由项目所有者确认，移除临时 `UI review` 区块；移除 `PANEL STATES`、`PANEL PREVIEW` 等说明性 eyebrow 文案，保留实际面板标题和操作。
- 设计契约：Ant Neutral、响应式工作台、标准密度、圆润控件、实体内容面、solid-backed glass 导航、Apple/博客式缓冲动效；普通面板不使用不透明大范围 `box-shadow` 描边，仅保留状态焦点环和必要的层级边界。
- 新增：正式 `App` 接入相同的 Ant Neutral 令牌、三态主题、224px / 64px Rail、搜索和按世代默认收纳导航；保留 `?demo=hakustyle` 作为独立审查入口，真实模块面板和 RNG/Worker 业务不替换。
- 优化：正式工作台的右下角工具 Rail 复用 Demo 行为，桌面端悬停展开、离开收起，移动端点击切换；浮动按钮使用 Lucide 图标，保留面板居中、拖动、scrim、Escape 与焦点恢复。
- 固化：新增 `.agents/skills/web-frontend-style/references/pokerngkit-ui-contract.md` 与 `docs/ui-design.md`，并在 `AGENTS.md`、`docs/ai-development.md` 中将契约设为后续 UI 的强制基线。
- 文件：`src/App.tsx`、`src/styles.css`、`src/HakuStyleDemo.tsx`、`src/hakuStyleDemo.css`、`src/theme.ts`、`src/i18n.ts`、`src/main.tsx`、`docs/ui-design.md`、`.agents/skills/web-frontend-style/SKILL.md`、`.agents/skills/web-frontend-style/references/pokerngkit-ui-contract.md`。
- 已通过：本轮编辑后重新运行定向 `npm run format:files -- ...`、`npm run format:check`、`git diff --check`，以及 HakuStyle Skill 校验。
- 已启动：`npm run dev:ui`，本地预览地址为 `http://127.0.0.1:5173/?demo=hakustyle`；服务器当前保持运行。
- 已通过：`powershell -ExecutionPolicy Bypass -File .agents/skills/web-frontend-style/scripts/validate.ps1`（Skill is valid）。
- 待人工确认：当前 Demo 视觉决策已收口；外部 Chrome / Edge 未连接，未执行自动浏览器回归。
- 下一步：完成格式与 Skill 校验后提交并推送本次正式 UI 基线；未获具体授权前不运行测试、构建或浏览器回归。

## 2026-08-18 3DSRNGTool Gen VI Event / Mystery Gift RNG

- 新增：实现独立 `gen6event` 工作区，支持 X、Y、Omega Ruby、Alpha Sapphire、物种/形态/等级、固定 IV、保底随机 V、Ability / Nature / Gender 锁定、四种 PID Type、Your ID、Egg、Other Information 与 TID/SID/EC/PID。
- 算法：复用上游 Event6 的 MT19937 生成顺序；XY 每帧生成一次，ORAS 每帧生成两次并返回第二次；Wonder Card 读取 `.wc6` / `.wc6full`，Personal 性别比由 `personal_ao` 生成脚本维护。
- 界面：增加 Gen VI Event 导航、三语标签、配信卡导入、完整 IV/性格/觉醒力量/性别/特性/异色筛选、进度、取消、结果上限、CSV 和固定高度虚拟结果表。
- 契约：新增 `wasm/modules/gen6event`，54-word 请求、16-word 结果、Wasm API version 1、Contract version 1、独立 Dedicated Worker 与 `public/wasm/gen6event.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6event.md`，同步 README、需求、技术方案、模块库存和生成数据来源；记录 Wonder Card 偏移、输入边界、XY/ORAS 差异和许可证。
- 已通过：`npm test -- src/features/gen6event`（2 个文件、7 项测试）、`npm run verify`（137 个 Vitest 文件、509 项测试、Vite 转换 2202 个模块、PWA 预缓存 191 项约 20.7 MiB）、`npm run format:check`、`git diff --check`、`npm run typecheck`、`POKERNGKIT_WASM_MODULES=gen6event npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后的 `POKERNGKIT_WASM_MODULES=gen6event npm run wasm:build`。
- 产物：`public/wasm/gen6event.mjs` 7465 bytes，SHA-256 `BC5BB0996D616E0A829F9DDE56775B8901755F48DD7547E6D049C78C30C8D7A5`；`public/wasm/gen6event.wasm` 10929 bytes，SHA-256 `1806DD932DCF259435E02C7B459DE3481FA7CBF0C9F7066B7B6925034A27027F`。
- Lint：0 error、8 条 TanStack Virtual `react-hooks/incompatible-library` warning，其中 1 条来自本模块结果表，属于现有 React Compiler 兼容性提示。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无 9222/9223/9515 调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代配信乱数`；随后进入 Gen VI Wild RNG。

## 2026-08-18 3DSRNGTool Gen VI Pokemon Link / Transporter RNG

- 新增：实现独立 `gen6bank` 工作区，只显示 XY、ORAS、Transporter 的 8 个 Bank 模板；普通 Stationary 模板不会混入 Bank 搜索。
- 算法：复用已验证的 Stationary6 MT19937 ABI 和结果结构，在独立 Wasm 入口执行目标前置消耗、GenderList base-3 解码、3/5 个保底 IV 位置、4/5/2 表、Mew/Celebi 5V、PSV/PRV 和筛选。
- 界面：增加 Gen VI Bank 导航、Bank-only 模板选择、Target Pokemon、Transporter GenderList 和 Gen VI Profile 联动；每次搜索创建独立 Worker，取消后重建。
- 契约：新增 `wasm/modules/gen6bank`，49-word 请求、16-word 结果、Wasm API version 2、Contract version 1 和 `public/wasm/gen6bank.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6bank.md`，同步 README、需求、技术方案和模块库存；记录 8 个模板、输入边界、前置消耗和上游来源。
- 已通过：`npm test -- src/features/gen6stationary src/features/gen6bank`（3 个文件、9 项测试）、`npm run verify`（135 个 Vitest 文件、502 项测试、Vite 转换 2196 个模块、PWA 预缓存 188 项约 20.6 MiB）、`npm run format:check`、`git diff --check`、`POKERNGKIT_WASM_MODULES=gen6bank npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后的 `POKERNGKIT_WASM_MODULES=gen6bank npm run wasm:build`。
- Lint：0 error、7 条既有 TanStack Virtual `react-hooks/incompatible-library` warning，无本模块新增 warning。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无 9222/9223/9515 调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代宝可梦连接与虚拟传送乱数`；随后进入 Gen VI Event / Mystery Gift RNG。

## 2026-08-18 3DSRNGTool Gen VI Stationary RNG

- 新增：实现 `gen6stationary`，覆盖 XY、ORAS、Transporter 的普通定点、礼物、御三家、化石、游戏内交换和 Pokemon Link / Transporter 目标前置消耗；从 `Gen6/PKM6.cs` 生成全部 141 个目标模板。
- 算法：增加运行时滚动 Mersenne Twister、Delay/60 次非同步消耗、Shiny Charm PID rolls、固定/随机 IV、3V/5V、Ability、Nature、Gender、PSV/PRV、异色/方块异色、OT TSV 覆盖和 Pokemon Bank 前置消耗；算法只在独立 Worker 的 Wasm 中执行。
- 界面：增加 3DS Profile 联动、三语分类/模板、Seed、帧范围、Delay、同步性格、Bank 目标、Transporter GenderList、自定义目标、TSV/TRV、闪耀护符、完整筛选、结果上限、取消、CSV 和固定高度虚拟结果表。
- 契约：新增 `wasm/modules/gen6stationary`，49-word 请求、16-word 结果、Wasm API version 2、Contract version 1、原生固定夹具和 `public/wasm/gen6stationary.mjs/.wasm`。
- 已通过：`npm test -- src/features/gen6stationary`（2 个文件、6 项测试）、`npm run verify`（134 个 Vitest 文件、499 项测试、Vite/PWA 预缓存 186 项约 20.6 MiB）、`npm run format:check`、`git diff --check`、`POKERNGKIT_WASM_MODULES=gen6stationary npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后的 `POKERNGKIT_WASM_MODULES=gen6stationary npm run wasm:build`。
- Lint：0 error、7 条既有 TanStack Virtual `react-hooks/incompatible-library` warning；本模块的模板依赖 warning 已修复。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无 9222/9223/9515 调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：进入 Gen VI Pokemon Link / Transporter RNG；开始前先读取对应 WinForms/Core 输入设置、目标数据和前置消耗规则。

## 2026-08-18 3DSRNGTool 存档信息管理

- 新增：实现独立 `3dsprofiles` Profile Manager，覆盖 X、Y、Omega Ruby、Alpha Sapphire、Transporter、Sun、Moon、Ultra Sun、Ultra Moon 档案的新建、编辑、删除、排序、清空、JSON 备份导入导出与旧 XML 迁移。
- 存储：使用 IndexedDB `pokerngkit-3dsrngtool/profile-data/profiles`、localStorage 镜像和待同步标记；保持与 PokeFinder 各世代档案数据隔离。
- 接入：页头选择器向 Gen VII Stationary、Wild、SOS、Egg、Event、Main RNG Tool、ID 工作区同步上游 ProfileView 会写入的版本、TSV、TRV、Shiny Charm 或四字 Egg State；普通重渲染不会覆盖手动输入。
- 文档：增加 `docs/modules/3dsprofiles.md`，同步 README、需求、技术方案、模块库存和 Gen VII 模块文档。
- 已通过：`npm test -- src/features/3dsprofiles` 的 2 个测试文件、9 项测试；`npm run typecheck`；`npm run lint`（0 error，6 条既有 TanStack Virtual warning）；`npm run format:check`；`git diff --check`；`npm run verify`（132 个 Vitest 文件、493 项测试，Vite 转换 2186 个模块，PWA 预缓存 183 项约 20.9 MiB）。
- 未运行：外部 Chrome / Edge UI 回归；此前外部 Chrome 接管本地页面连续超时，未取得可复核的档案编辑、移动端列表或 Gen VII 联动证据。生产算法回归仍需部署后由项目所有者提供 URL 并授权。
- 当前：代码和工程验证已收口，提交与推送待完成。
- 下一步：完成定向测试、全仓 `npm run verify`，提交并推送 Profile Manager；随后核对 Gen VI Stationary RNG，不提前进入其他 Gen VI 或公共工具。

## 2026-08-18 第八世代巢穴地图

- 新增：实现 PokeFinder 4.3.2 `Den Map` 静态地图工具，覆盖 Wild Area、Isle of Armor、Crown Tundra 三个区域和全部 276 个巢穴索引。
- 界面：增加区域与巢穴选择、地点名称、全局巢穴索引、原图坐标和红色点位标记；桌面使用控制区/地图区双栏，窄屏改为单栏并保留独立地图滚动。
- 数据：复用 `gen8raids` 的 `GEN8_DEN_INFO`，保留上游 Special index `16`；原样复制三张地图资源并记录尺寸和 SHA-256。
- 本地化：区域控件使用 `PokeFinder_zh.ts` 的“巢穴点位分布”“旷野地带”“铠岛”“王冠雪原”，地点名称使用上游 SwSh 地点资源。
- 已通过：`npm test -- src/features/gen8denmap` 的 4 个域测试、`npm run lint`、`npm run format:check`、`npm run verify` 和 `git diff --check`；完整验证覆盖 130 个测试文件、484 项测试和 Vite/PWA 生产构建。
- 未完成：外部 Chrome 在接管并刷新 `http://127.0.0.1:5173/` 时连续超时，未取得 DOM、图片加载、区域切换和响应式回归证据；Edge 未运行。
- 下一步：收口并推送 Gen 8 Den Map，然后进入 3DSRNGTool Profile Manager；不提前进入其他 3DSRNGTool 公共工具。

## 2026-08-18 第八世代野生乱数

- 新增：实现 PokeFinder 4.3.2 `Gen 8 Wild` BDSP Generator，覆盖 Grass、Honey Tree、Rock Smash、Surfing、Old Rod、Good Rod、Super Rod 入口，以及昼夜、宝可追踪、大量出现、丑丑鱼、Great Marsh / Trophy Garden Replacement 和甜甜蜜树槽位。
- 算法：增加 `gen8wild` C++/Wasm API v1、48-word 请求、12-word 结果、128 项 Xorshift RNGList、完整队首修正、Unown 形态、EC/PID、异色、IV、Ability、Gender、Nature、Height、Weight、Item、Characteristic、Stats 和筛选。
- 界面：增加 BDSP Profile、双 Seed、推进与 Offset、设置/筛选标签、21 列虚拟结果表、IV/能力值切换、排序、CSV、结果上限、进度、取消和清空；导航编号为 52，Researcher 顺延为 53。
- 修复：取消筛选不再覆盖 Honey Tree 的单槽约束；补齐上游 Wild8 的 Super Luck、Hustle、Vital Spirit 队首入口；响应式结果表保持固定独立滚动区。
- 数据：从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 与 PokeFinder `personal_bdsp.bin` 生成 BD/SP 各 124 个区域、21 个甜甜蜜树地点和 494 条 Personal 数据；来源哈希见 `docs/modules/gen8wild.md`。
- 已通过：`npm run typecheck`；全量 `npm run wasm:test:native` 的 51/51 原生夹具（含 `gen8wild_native_parity`）；完整 `npm run wasm:build`。Wasm 产物 `public/wasm/gen8wild.mjs` 7394 bytes，SHA-256 `44E1DB693A67EC6B15B8547DBDA16562EC668004429881D0561405AC233BD35F`；`public/wasm/gen8wild.wasm` 62151 bytes，SHA-256 `2741E0C560FEF2476DE111D09A2DB4C3CDEAF4CD02475F4E9377A306AA8FBA2E`。
- 已通过：`npm run format:check`、`git diff --check`、`npm run verify`（Lint 0 error、6 条既有 warning；129 个 Vitest 文件、480 项测试；Vite 转换 2176 个模块，PWA 预缓存 177 项约 19.1 MiB）。
- 已通过：外部 Chrome `http://127.0.0.1:5173/` 的 Gen 8 Wild 回归；BDSP Grass、双 Seed `111`、100000 结果上限、4 Workers 和结果区滚动正常，模块控制台无错误。一次大幅滚轮手势触发浏览器连接超时，但页面随后完成滚动，未复现应用冻结。
- 说明：最终收口时重新配置 native-debug 后，`gen3id_native_test` 与单独的 `gen8wild_native_parity` 进程均出现无 CPU 进展的环境停滞并已终止；此前相同源码的全量 51/51 结果仍有效，本轮 Wasm CMake 变更仅增加 `HEAPU32` 运行时导出。
- 待验证：Edge 实机回归；生产页面算法回归仍需 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交推送 Gen 8 Wild 后进入 Gen 8 Den Map；不提前进入 3DSRNGTool Profile Manager。

## 2026-08-18 虚拟结果表滚动卡死修复

- 复现：Gen 8 Static 双 Seed 输入 `111`，保留默认 Max Advances `100000` 后生成结果；在 `1380px` 以下单列布局向下滚动时页面失去响应。
- 根因：响应式断点将模块面板改为 `height: auto`，但没有为虚拟结果容器保留确定高度。约 100,000 条结果形成约 4,000,000px 的虚拟内容并反向撑高滚动区，TanStack Virtual 将大量记录错误判断为可见，最终创建百万级单元格并耗尽 renderer 内存；异常 renderer 曾占用约 4.7 GB。
- 修复：Gen 8 Static 与 Gen 8 Raids 的响应式结果区增加 `clamp(440px, 56vh, 680px)`；Gen 7 Wild、Gen 7 SOS 与 Gen 7 Egg 的单列虚拟表固定为 `520px` 并取消 flex 拉伸。
- 横查：检查 `src/features` 中全部 33 个 `useVirtualizer` 模块。Gen 7 Stationary、Event、Battle Tree、Festival Plaza、Main，以及 Gen 8 Egg、Event、Underground 等自动高度布局已经为实际滚动元素设置固定或 clamp 高度；Gen 3、Gen 4、Gen 5 与其余模块未发现相同根因。
- 已通过：最终重跑 `npm run verify` 的全仓 Prettier、ESLint、TypeScript、127 个 Vitest 文件共 473 项测试、2169 个模块的 Web/PWA 构建与 171 项约 18.27 MiB 预缓存；ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler warning。Vitest 退出码为 `0`，结束时记录 Gen 4 Egg Preview 与 Gen 5 SHA1 Cache Worker 两条非阻断 fork worker 终止超时提示。最后一次 `git diff --check` 通过。
- 未运行：本轮只修改 CSS 与文档，未改变 C++、Wasm API、Worker、算法或生成数据，因此未重建原生夹具和 Emscripten 模块。
- 浏览器：按既有授权重新打开外部 Chrome，在 `http://127.0.0.1:5173/` 的 `1280x900` 视口使用真实 Worker/Wasm 生成 Gen 8 Static Seed `111 / 111`、默认 Max Advances `100000`。表格可视高度 `411px`、虚拟内容高度 `4,000,042px`，顶部只渲染 21 行，滚动到末帧 `99999` 后只渲染 20 行，页面总高度保持约 `1,721px`；状态为“已完成”，生成按钮仍可用，控制台无 warning/error。
- 内存：原异常 renderer 曾占用约 `4.7 GB`；修复后高数据量结果停留末帧并观察 5 秒，全部 Chrome renderer 的最大工作集约从 `406.5 MB` 变为 `408.7 MB`，未再持续膨胀。
- 断点：外部 Chrome 确认 Gen 8 Raids 在 `1280x900` 的结果区约 `504px`；Gen 7 Wild 与 SOS 在 `1120x900` 的虚拟表均为 `520px`、`flex: 0 0 auto`；Gen 7 Egg 在 `900x900` 的虚拟表同为 `520px`、`flex: 0 0 auto`。四个模块的实际滚动元素均保持 `overflow: auto`，控制台无 warning/error。
- 下一步：本修复随 `fix: 修复虚拟结果表滚动卡死` 推送后恢复 Gen 8 Wild。

## 2026-08-17 第八世代地下大洞窟乱数

- 新增：实现 PokeFinder 4.3.2 `Gen 8 Underground` Generator，仅支持 Brilliant Diamond / Shining Pearl；上游没有 Searcher，Web 端未扩展 Sword / Shield 或反向检索。
- 数据：从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9`、PokeFinder `personal_bdsp.bin`、Egg Move 表与本地化资源生成 BD/SP 各 18 个区域、141 条蛋招式和 494 条 Personal 数据；文件大小、SHA-256 与日文招式回退规则已写入模块文档和上游记录。
- 算法：增加 `gen8underground` C++/Wasm API v1、54-word 请求、12-word 结果、256 项 Xorshift RNGList、普通/特殊物种、Diglett Bonus、完整队首、EC/PID、异色、IV、Ability、Gender、Nature、Height、Weight、Item、Egg Move、Stats 和上游 StateFilter。
- 界面：增加 BDSP Profile、双 64 位 Seed、推进与 Offset、Story/Level Flag、18 个地点、物种多选、设置/筛选标签、完整筛选、最多 8 个独立 Worker、取消、100000 行结果上限、20 列虚拟表、排序、CSV 和 IV/能力值切换；导航编号为 51，Researcher 顺延为 52。
- 修复：Worker 初始化期间取消会终止并重建实例，不再误报完成；768px 控制区提前切为单列，结果表固定为独立滚动区域，窄屏物种操作避开悬浮工具并保持 44px 触控目标。
- 已通过：`npm run verify` 的 Prettier、ESLint、TypeScript、127 个 Vitest 文件共 473 项测试、2169 个模块的 Web/PWA 构建与 171 项约 18.27 MiB 预缓存；ESLint 为 0 error，仅保留 6 条既有 TanStack Virtual warning。
- 已通过：50/50 原生夹具；Emscripten 6.0.6 构建默认 49 个独立模块。`gen8underground.mjs` 为 7,615 bytes，`gen8underground.wasm` 为 68,926 bytes，对应 SHA-256 已写入模块文档。
- 重跑：首次 `npm run verify` 因根 `build/` 中手工 Emscripten 临时夹具被 ESLint 扫描而停止；确认该目录为 `.gitignore` 生成物后，将两个文件可恢复地移入 `.tmp/gen8underground-fixture/`，第二次完整验证通过，未扩大 ESLint 忽略范围。
- 浏览器：外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Worker/Wasm 生成固定 10 帧的 60 条结果，首条 `818C829E / C67596B5 / Species 198 / Egg Move 413 / 17 / 28-1-23-10-31-20` 与原生夹具一致；物种全部取消返回 0 条，启用 Disable Filters 后恢复 60 条。
- 布局：390、768、1280 与 1920px 下无整页横向溢出，结果表保持独立横纵滚动且首行与表头间距为 0；中英日窄屏标签、悬浮工具安全区和控制台无 warning/error 均已检查。
- 未验收：本地测试、原生/Wasm 构建和 UI 检查只能作为工程证据；GitHub Actions 部署后仍需由项目所有者提供准确生产 URL 并授权算法回归。
- 下一步：完成最终格式与全仓验证，提交并推送 `feat: 实现第八世代地下大洞窟乱数`；随后进入 Gen 8 Wild，不提前进入 Den Map 或 3DSRNGTool Profile Manager。

## 2026-08-17 第八世代定点乱数

- 新增：实现 PokeFinder 4.3.2 `Gen 8 Static` Generator，仅支持 Brilliant Diamond / Shining Pearl；上游没有 Searcher，也没有 Sword / Shield Static，Web 端未自行扩展。
- 数据：从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 `Gen8/encounters.json` 与 PokeFinder `personal_bdsp.bin` 生成 9 类 47 个模板和 494 条紧凑 Personal 数据；生成脚本、文件大小与 SHA-256 已写入模块文档和上游记录。
- 算法：增加 `gen8static` C++/Wasm API v1、41-word 请求、11-word 结果、Xorshift + 32 项 RNGList 普通定点、Xorshift EC + XoroshiroBDSP 游走、Fateful Square、Synchronize、Cute Charm、保底 IV、Ability、Gender、Nature、Height、Weight、Characteristic、Stats 和完整 StateFilter。
- 界面：增加 BDSP Profile、9 类模板、None/Cute Charm/Synchronize 队首、双 64 位 Seed、推进、只读 Level/Ability/Shiny/IV Count、完整筛选、最多 8 个独立 Worker、取消、100000 行结果上限、16 列虚拟表、排序、CSV 和 IV/能力值切换；导航编号为 50，Researcher 顺延为 51。
- 修复：将 `gen8static` 的 TypeScript/C++ 生成产物加入 `.prettierignore`，避免 Prettier 把 `personal_data.inc` 说明行合并为非法 C++；重新运行生成脚本后原生编译恢复。
- 已通过：完整应用层验证的 Prettier、ESLint、TypeScript、124 个 Vitest 文件共 462 项测试、2163 个模块的 Web/PWA 构建与 164 项预缓存；ESLint 为 0 error，仅保留 6 条既有 TanStack Virtual warning。
- 已通过：49/49 原生夹具；默认 48 个 Emscripten 模块构建完成，`gen8static.mjs` 为 7,490 bytes、`gen8static.wasm` 为 19,282 bytes。首次 `npm run verify:full` 在应用层与原生阶段通过后，因当前 PowerShell 未激活 Emscripten 而停止；加载 `C:\\Users\\Hakuhiro\\emsdk\\emsdk_env.ps1` 后补跑 `npm run wasm:build` 成功，无需安装或更换工具链。
- 固定夹具：Seed `1234567887654321 / 8765432112345678`、TID `12345`、SID `54321` 的 Turtwig 首帧与第 9 帧、Omanyte、Heatran Cute Charm、Articuno Synchronize 与 Hidden Ability、Jirachi Never Shiny、Mesprit、Cresselia 逐字段匹配；1,000,000 帧跳表与朴素 Xorshift 推进一致，零 Seed、推进溢出、浏览器范围保护和结果上限错误分支通过。
- 浏览器：外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Worker/Wasm 生成 Turtwig 固定 10 帧，首帧 `220345D0 / 2203506A / 4-23-15-30-19-26`，第 9 帧 `E8D55A32 / 0FEB047B / 16-12-0-15-29-20`；390、768、1280 与 1920px 下无整页横向溢出，窄屏结果表保留独立横向滚动，首行与表头间距为 0，控制台无 warning 或 error。
- 未验收：本地测试、原生/Wasm 构建和 UI 检查只能作为工程证据；GitHub Actions 部署后仍需由项目所有者提供准确生产 URL 并授权算法回归。
- 下一步：完成最终格式检查，提交并推送 `feat: 实现第八世代定点乱数`；随后进入 Gen 8 Underground，不提前进入 Wild、Den Map 或 3DSRNGTool Profile Manager。

## 2026-08-17 第八世代团体战乱数

- 新增：实现 PokeFinder 4.3.2 `Gen 8 Raids`，覆盖 Sword / Shield 的 Wild Area、Isle of Armor、Crown Tundra 普通与稀有巢穴，以及 69 张 Wild Area Event 表。
- 数据：生成并内置 197 张普通巢穴表、69 张 Event 表、276 个巢穴哈希/坐标映射和 1192 条 `personal_swsh.bin` 记录；生成脚本、来源 revision 与 SHA-256 已写入模块文档和上游记录。
- 算法：增加 `gen8raids` C++/Wasm API v1、41-word 请求、12-word 结果、Xoroshiro 团体战生成、保底 IV、异色修正、Ability、Gender、Nature、Height、Weight、Toxtricity 性格分支和完整 StateFilter。
- 界面：增加 Profile、区域、巢穴、稀有度、Event、模板、等级、推进与筛选工作流；支持最多 8 个独立 Worker、取消、100000 行结果上限、虚拟滚动、16 列排序结果表和 CSV。
- 修复：默认值按上游恢复为 Max Advances `100`、Offset 空值读取 `0`、Level `1`；Event 等级由模板锁定，Event 模式禁用 Rarity，Seed 全零与推进和溢出均由 HTML 和领域层共同拒绝。
- 构建：`Gen8RaidsPanel` 改为 React 按需加载，979.02 kB 数据块独立输出，主包由约 8.74 MB 降至 7,762.09 kB，避免 PWA 的 8 MiB 单文件预缓存上限失败；默认 Wasm 清单已加入 `gen8raids`。
- 已通过：完整 `npm run verify:full` 退出码 `0`；Prettier、TypeScript、122 个 Vitest 文件共 456 项测试、2157 个模块的 Web/PWA 构建、161 项约 17.98 MiB 预缓存、48/48 原生夹具和默认 47 个 Emscripten 模块全部完成。ESLint 为 0 error，仅保留 6 条既有 TanStack Virtual warning。
- 环境：原生测试弹窗来自当前 Codex 进程未继承用户 PATH 中的 WinLibs 目录，导致测试程序找不到 `libstdc++-6.dll`；刷新用户和系统 PATH 后 `gen8raids_native_test.exe` 单独退出码为 `0`，后续原生检查必须先刷新当前进程 PATH。
- 浏览器：外部 Chrome 已连接，`http://127.0.0.1:5173/` 可被发现；页面重新加载、DOM 和控制台读取连续超过浏览器连接等待上限，本轮未取得真实 Worker/Wasm 页面证据，也未改用内置浏览器替代。
- 未验收：本地工程检查、原生/Wasm 构建均不能替代生产算法验收；GitHub Actions 部署后仍需由项目所有者提供准确生产 URL 并授权回归。
- 下一步：提交并推送 `feat: 实现第八世代团体战乱数`，随后优先实现 Gen 8 Static；暂不进入 Underground、Wild、Den Map 或 3DSRNGTool 范围。

## 2026-08-17 第八世代配信乱数

- 新增：增加 `gen8event` C++/Wasm API v1、45-word 请求、11-word 结果、BDSP 个人数据、Dedicated Worker Pool、领域校验、UI Preview 与三层 TypeScript 测试。
- 算法：按 PokeFinder 4.3.2 的 Xorshift、`RNGList`、Event Generator、StateFilter 与 StaticModel8 实现 EC、PID、保底 IV、特性、固定性别、性格、身高、体重、能力值和筛选；蛋配信使用当前 BDSP Profile TSV。
- 修复：按 Event8 界面语义补全 Nonshiny、Random、Star、Square、Static 五种 PID Type，拒绝 `.wb8` 越界 PID Type，并以八位十六进制回填 EC/PID 和回填 Level；异色筛选只保留上游实际存在的 Any、Star、Square、Star/Square。
- 修复：Gen 8 Event 与 Gen 8 Egg Worker 的堆边界检查改用实际导出的 `HEAPU32.byteLength`，不再访问未导出的 `HEAPU8`；Wasm 导出面和算法不变。
- 界面：增加 BDSP Profile 与 Manager 入口、`.wb8` 本地导入、物种自动完成、设置/筛选标签、16 列虚拟结果表、IV/能力值切换、排序、CSV、清空、进度和取消；`1280px` 以下重排为单栏。
- 文档：增加 `docs/modules/gen8event.md`，同步 README、库存、需求、技术方案与 PokeFinder 来源记录；上游路径统一为 `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master`，下一模块改为 Gen 8 Raids。
- 已通过：Node.js `24.19.0`、npm `12.0.2`；`npm test -- src/features/gen8event src/features/gen8egg` 的 6 个测试文件共 25 项测试；`gen8event_native_parity` 原生夹具 1/1；Emscripten `6.0.6` 重建 `gen8event.mjs/.wasm`。
- 已通过：完整 `npm run verify` 的全仓 Prettier、ESLint、TypeScript、120 个 Vitest 文件共 449 项测试、2150 个模块生产 Web/PWA 构建与 156 项预缓存；ESLint 为 0 error，保留 6 条既有 TanStack Virtual warning，Vitest 保留一次不影响退出码的 fork 终止超时提示；最后一次 `git diff --check` 通过。
- 重跑：首次 `npm run wasm:build` 因当前 PowerShell 未激活 Emscripten 而停止；加载 `C:\\Users\\Hakuhiro\\emsdk\\emsdk_env.ps1` 后定向构建通过，未重新安装工具链。
- 浏览器：外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Worker/Wasm 生成 Manaphy 固定 10 帧；首行 `220345D0 / 8FD266FA / 15-30-31-19-31-31`，末行 `E8D55A32 / 6541C199 / 31-30-0-21-31-31`，控制台无 warning 或 error。
- 未验收：本地测试、原生/Wasm 构建和 UI 检查只能作为工程证据；GitHub Actions 部署后仍需由项目所有者提供准确生产 URL 并授权算法回归。
- 下一步：提交并推送 `feat: 实现第八世代配信乱数`，再开始 Gen 8 Raids；不提前进入 3DSRNGTool Profile Manager。

## 2026-08-17 第七世代 Festival Plaza Facility RNG

- 新增：增加 `gen7festivalplaza` C++/Wasm API v1、13-word 请求、10+N-word 结果、`begin()` / `step()` 连续会话、原生会话夹具、单 Dedicated Worker、领域校验和三层 TypeScript 测试。
- 算法：按 3DSRNGTool `MiscRNGTool.Search7()`、`ModelStatus`、`FPFacility` 和 TinyMT 重播实现 Sun、Moon、Ultra Sun、Ultra Moon 的 NPC 眨眼、Delay、19 个 Rank、星级、设施、NPC 类型和颜色筛选。
- 修复：Moon / Ultra Moon 使用独立设施池；Sun / Moon 一至三星移除 Switcheroo；Rank `21-30` 的 ★4 概率恢复为 `9%`；修复共享 Gen VII 起始帧 `0..1` 的无符号下溢。
- 界面：增加设施池联动、NPC Status、Mark 映射、进度、取消、100000 行结果上限、虚拟滚动、排序、CSV、清空和 Index 回写；移动端 390px 无横向溢出，相关控件保持 44px 高度。
- 文档：增加 `docs/modules/gen7festivalplaza.md`，同步 README、库存、需求、技术方案、三语文案和 Wasm 清单。
- 已通过：Node.js `24.19.0`、npm `12.0.2`；Festival Plaza 3 个测试文件共 6 项测试；全仓 `npm run verify` 的 Prettier、ESLint、TypeScript、117 个 Vitest 文件共 437 项测试和生产 Web/PWA 构建，ESLint 保留 6 条既有非阻断 warning。
- 已通过：WinLibs GCC `16.1.0` 的 9/9 Gen VII 原生夹具；Emscripten `6.0.6` 重建 `gen7wild`、`gen7sos`、`gen7egg`、`gen7event`、`gen7main` 和 `gen7festivalplaza`；外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Wasm 核对固定五帧、NPC Status、Moon ★4 设施联动和控制台无错误。
- 未运行：GitHub Pages 生产页面算法回归；仍需部署完成后由项目所有者提供准确 URL 并单独授权，不能用本地 UI 或 Wasm 夹具替代。
- 提交：`3089f9d feat: 实现第七世代圆庆广场乱数` 已推送到 `origin/main`。
- 下一步：开始实现 3DSRNGTool Profile Manager；继续保留 `NTR Helper` 为明确排除项。

## 2026-08-17 第七世代 Main RNG Tool 与 Egg Seed Finder

- 新增：增加 `gen7main` 的读档/ID Clock Seed 反查、QR 指针帧定位与 Time Calculator；Seed 全空间检索使用最多 8 个独立 Worker 和 `2^20` Seed 分片，不保留 3DSRNGTool 的远程 API 依赖。
- 新增：增加 `gen7eggseedfinder` 的新存档 8 蛋性格检索与 127 鲤鱼王计算器；完整 32 位 Seed 空间默认按 `2^20` 项分片，取消返回已经按 `chunkIndex` 完成的前缀结果。
- 修复：将 Gen VII SFMT 状态长度从错误的 `N=157` 改为上游 `N=156`，同步更新 Battle Tree 固定夹具；Stationary、Wild、SOS、Egg、Battle Tree、Event、Main 与 ID 原生结果均重新验证。
- 修复：逐行对照 `MagikarpCalc.mul()`，将逆矩阵输出从错误的四组 32 位改为 TinyMT 的 `31 + 32 + 32 + 32` 位有效状态布局；127 个 `1` 的正确结果为 `3050EADD,89435273,785B9C60,7E46E861`。
- 界面：增加 Main RNG Tool 与 Egg Seed Finder 导航、三语文案、Clock 图片、双工作区表单、进度、取消、CSV、错误和空结果状态；Egg Seed Finder 标签页与进度条补齐可访问语义，127 位输入只忽略空白，不再静默删除非法字符。
- 文档：增加 `docs/modules/gen7main.md`、`docs/modules/gen7eggseedfinder.md` 与 `third_party/needle-searcher/UPSTREAM.md`，同步 README、库存、需求、技术方案、Wasm 清单和 PWA JPG 缓存规则。
- 已通过：Node.js `24.19.0`、npm `12.0.2`；`npm run verify` 的 Prettier、ESLint、TypeScript 与 114 个 Vitest 文件共 430 项测试，ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler warning。
- 已通过：WinLibs GCC `16.1.0` 重新配置原生构建缓存后，9 个受影响 Gen VII 原生夹具为 9/9；Emscripten `6.0.6` 重建同一组 9 个 Gen VII `.mjs/.wasm`。
- 已通过：直接加载真实 Wasm，Main RNG Tool 返回 SM `BD1646F7`、USUM `C31A2F06`、SM ID `F9337724 / correction 15`；Egg Seed Finder 的 127 鲤鱼王和 Seed `0` 性格夹具均与模块文档一致。
- Web 构建：受限 `npm run verify` 在复制既有 `public/wasm/gen3egg.mjs` 时返回 Windows `EPERM`；非受限 `npm run build:web` 随后完成 2140 个模块转换，并在全部 Gen VII Wasm 重建后生成 150 项、约 16.8 MiB 的 PWA 预缓存，仅保留既有大 chunk warning。
- 提交：`6867fe5 fix: 修复第七世代 SFMT 状态长度`、`3d057c2 feat: 实现第七世代主乱数工具`、`f2e241e feat: 实现第七世代孵化Seed检索` 已推送到 `origin/main`。
- 未运行：外部 Chrome / Edge UI 检查和生产页面算法回归。UI 预览不能替代真实 Wasm 验收；生产回归仍需 GitHub Actions 部署完成后由项目所有者提供准确 URL 并单独授权。
- 下一步：实现 Festival Plaza Facility RNG；先核对 3DSRNGTool 的窗体、输入类型、生成算法、简体中文词条和固定数据，不提前混入 Profile Manager。

## 2026-08-16 第七世代 Event RNG

- 新增：增加 `gen7event` C++/Wasm API v1、58-word 请求、9-word 结果、`begin()` / `step()` 连续会话、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 算法：按 `Search7_Normal()`、`Event7.Delay()` 与 `Event7.Generate()` 移植 SFMT64 连续帧、NPC Blink 模型、SM / USUM Event Delay、No Dex / Your ID 丢弃生成、四种 PID Type、固定 IV、保底随机 V、Ability / Nature / Gender 锁定和完整筛选。
- 配信卡：支持本地 `.wc7` 与 `.wc7full`，按上游偏移解析 Species、Form、Level、Ability、Nature、Gender、IV、TID/SID、PID Type、PID、EC、Egg 与 Your ID；文件不离开浏览器。
- 边界：SM 起始帧 `418`、USUM `478`，上游帧上限 `1,000,000,000`、浏览器保护 `5,000,000`；NPC `0..100`、Delay `0..4000`、TSV `0..4095`、TRV `0..F`、TID/SID `0..65535`、结果上限 `100,000`。
- 界面：增加配信设置、Wonder Card 导入、全部锁定项与其他信息、IV 与状态筛选、进度、取消、虚拟滚动、排序、CSV 和清空；逐字复用上游简体中文词条，并补齐 1280px 展开侧栏双列适配与移动端 44px 触控目标。
- 文档：增加 `docs/modules/gen7event.md`，同步 README、库存、需求和技术方案；下一模块改为 Main RNG Tool，并记录后续实现 3DSRNGTool Profile Manager。
- 已通过：Event 3 个 TypeScript 测试文件共 8 项测试；`npm run verify` 的 Prettier、ESLint、TypeScript 与 109 个 Vitest 文件共 418 项测试；ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler 非阻断 warning。
- Web 构建：`npm run verify` 最后在受限环境复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；随后非受限 `npm run build:web` 通过 2113 个模块转换，生成 139 项、约 16.8 MiB 的 PWA 预缓存，仅保留既有大 chunk 警告。
- 浏览器：外部 Chrome 在 `http://127.0.0.1:5174/` 完成 UI Preview；验证 43 条结果、首帧 478、错误与清空状态、Your ID / Other Information 联动，以及 390 / 768 / 1280 / 1536 / 1920px 布局。页面无横向溢出，虚拟表首行与表头间距为 0，控制台无 warning 或 error。
- 原生/Wasm：受限原生夹具无法读取 WinLibs GCC，受限 Emscripten 激活无法写入 `C:\Users\Hakuhiro\emsdk\emsdk_set_env.ps1`；两次非受限重跑均被自动审批服务 `502 Bad Gateway` 阻止，命令未启动。该状态不等于原生夹具或真实 Wasm 已通过。
- 下一步：完成最终格式检查后独立提交并推送 `feat: 实现第七世代配信乱数`，再开始 Main RNG Tool；不得提前把本地 UI Preview 作为生产页面算法验收。

## 2026-08-16 第七世代 Battle Tree Trainer RNG

- 新增：增加 `gen7battletree` C++/Wasm API v1、9-word 请求、7-word 结果、`begin()` / `step()` 连续会话、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 算法：按 `MiscRNGTool.generator7()`、`RNGPool`、`ModelStatus` 与 `BTTrainer.Generate()` 移植 SFMT64 连续帧、NPC 眨眼模型、`Delay / 2`、重置为 2 个模型后的额外 2 帧，以及普通/每十场特殊训练家生成。
- 边界：Seed 为 8 位十六进制且空值按 `0`；Starting Index / Max Results 上游上限 `1,000,000,000`，当前浏览器绝对帧保护 `5,000,000`；NPC `0..100`、Delay `0..10,000`、Streak `1..10,000`、Trainer ID `0..254`，其中 `209..254` 均表示不过滤。
- 界面：增加版本、Seed、Starting Index、Max Results、NPC、Delay、Streak、Trainer ID，结果显示 Index、Actual Hit、Mark、Clock、Trainer、Random Number 与 Real Time，并支持进度、取消、虚拟滚动、排序、CSV、清空和 Index 回写。
- 文档：增加 `docs/modules/gen7battletree.md`，同步 README、库存、需求和技术方案，并把实际 3DSRNGTool 上游路径统一为 `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN`；下一模块改为 Event。
- 工具链：Node.js `24.19.0`、npm `12.0.2`；安装并激活 Emscripten `6.0.6`，另安装 WinLibs GCC `16.1.0` 作为 Windows 原生夹具编译器。
- 已通过：`npm test -- src/features/gen7battletree`，3 个测试文件、6 项测试；仅 `gen7battletree` 的原生 C++ 会话夹具 1/1；仅 `gen7battletree` 的 Emscripten 构建并生成 `.mjs` / `.wasm`。
- 全仓验证：Prettier、TypeScript 与 106 个 Vitest 文件共 410 项测试通过；ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler 非阻断 warning。受限环境的 Vite 构建在复制 `public/wasm/gen7battletree.mjs` 时返回 `EPERM`，非受限 `npm run build:web` 随后通过 2107 个模块转换并生成 58 项 PWA 预缓存。
- Wasm：默认 41 模块的 Emscripten 6.0.6 完整构建通过；`gen7battletree.mjs`、`gen7battletree.wasm` 与生产 Worker bundle 均已核对存在。
- 浏览器：外部 Chrome 已连接，但浏览器控制安全策略拒绝自动访问 `http://127.0.0.1:5173/`，且仓库规则禁止改用应用内浏览器绕过；本轮未记录 UI、Worker 控制台或交互证据。
- 交付：按项目所有者本轮授权，本模块完成完整工程检查后独立提交并推送，再开始 Event。

## 2026-08-15 第四世代阶段性交接清理

- 移除：删除已失去恢复用途的 `docs/gen4-development.md`；第四世代长期事实继续由 `docs/modules/gen4*.md`、`docs/module-inventory.md` 和 `src/features/shared/rngModuleContract.ts` 维护。
- 更新：README、AI 开发入口与技术栈不再引用阶段性交接文档，避免已完成模块继续依赖重复且可能过时的说明。

## 2026-08-15 第七世代 Egg RNG

- 新增：增加 `gen7egg` C++/Wasm API v1、187-word 请求、20-word 结果、`begin()` / `step()` 连续会话、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 算法：移植 TinyMT、`Egg7` 性别/性格/特性/遗传/IV/EC/PID/球种生成顺序，支持闪耀护符、异国孵化、尼多型、同图鉴、其他 TSV、闪数提醒、Frame Range、Egg Number 与 Shortest Path。
- 路径：按 `Gen7EggPath.Calc()` 的 Accept / Reject 等权前向图计算最短路径；使用增量线性松弛代替保存全部 Egg 结果和重复嵌套传播，浏览器执行目标上限为 `5,000,000`。
- 界面：增加四字 TinyMT 状态、双亲与孵化设置、完整筛选、三种模式、进度、取消、虚拟滚动、排序、CSV、清空、当前/领取后状态回写与 Egg Number / Shortest Path 摘要。
- 边界：同步校验百变怪与性别比、尼多型、同图鉴、其他 TSV、闪数提醒和不变之石的上游跨字段行为；Frame / Target 保留上游 `1,000,000,000` 输入上限，蛋数为 `1..10,000`。
- 文档：增加 `docs/modules/gen7egg.md`，并同步 README、库存、需求和技术方案；下一模块改为 Battle Tree。
- 已通过：`npm test -- src/features/gen7egg`，3 个测试文件、10 项测试；`npm run typecheck`；`npm run lint` 为 0 error，保留 6 条 TanStack Virtual / React Compiler 非阻断 warning；仅 `gen7egg` 的原生 C++ 会话夹具 1/1 通过。
- 已通过：全量 `npm run verify` 中的 Prettier、ESLint、TypeScript 与 103 个 Vitest 文件共 404 项测试；Vite 随后完成 2102 个模块转换。
- 受限：生产 Web 构建在 Vite 将既有 `public/wasm/gen3egg.mjs` 复制到 `dist/wasm/gen3egg.mjs` 时返回 Windows `EPERM`；申请在非受限环境重跑 `npm run build:web` 时审批服务返回 `502 Bad Gateway`，命令未启动。该结果不等于 Web 构建通过。
- 未运行：未生成 `gen7egg` Emscripten 产物，未使用外部 Chrome / Edge 做本地 UI 或 Worker 检查，未执行生产页面算法回归。
- 交付：本阶段完成本地验证后由项目所有者提交；Codex 不提交、不推送，交付后暂停工作。

## 2026-08-15 Gen VII Wild 测试修复

- 根因：非 Fishing 遭遇错误地把分类 `Timedelay` 换算到仅供钓鱼使用的 `pokemonDelay`，普通野生与 Berry Tree 因此生成 `6 / 4` 并触发 `1..2` 领域校验；现仅在 Fishing 分支按上游 `((Timedelay + 4) / 2)` 派生，其他分类写入不参与算法的合法 ABI 占位值 `1`。
- 根因：`scripts/generate_gen7_wild_data.mjs` 把 `EncounterArea7.SlotType` 的物种槽位映射误导出为 `WildRNG.SlotDistribution` 概率表；现分别读取两份上游数据，重新生成 56 组总和为 100 的概率分布，并增加 281 个区域、全部昼夜槽位与 Fishing 冒泡变体的不变量测试。
- 修复：UI Preview 测试改为验证结果槽位范围与物种/形态属于所选遭遇表，不再错误固定第一槽位。
- 已通过：`npm test -- src/features/gen7wild`，3 个测试文件、8 项测试全部通过；`npm run verify` 的全仓 Prettier、ESLint（0 error、5 条既有 TanStack Virtual / React Compiler warning）、TypeScript 与 100 个 Vitest 文件共 394 项测试通过。
- 受限：`npm run verify` 的 `build:web` 在复制既有 `public/wasm/gen3egg.mjs` 到 `dist/wasm/gen3egg.mjs` 时返回 Windows `EPERM`；申请在非受限环境重跑 `npm run build:web` 时审批服务返回 `502 Bad Gateway`，命令未启动。
- 环境：Node.js `24.13.0`、npm `11.6.2`，低于仓库锁定的 Node.js `24.19.0`、npm `12.0.2`；下一步由项目所有者使用锁定工具链运行完整 `npm run verify`，或提交后由 GitHub Actions 完成生产构建。

## 2026-08-15 Gen VII Actions 验证修复

- 阻断：Actions run `31867793978` 的 `npm run verify` 在 ESLint 阶段因 `Gen7WildRequest` 未使用而退出，后续 typecheck、测试与构建未执行。
- 修复：移除 Wild 面板未使用类型，并修正 Stationary / Wild / SOS 生成数据的字面量推断、只读索引、结果键访问和 Worker 活动任务窄化；不改变 RNG 算法或请求 ABI。
- 已通过：`npm run lint` 退出码为 `0`，仅保留五个 TanStack Virtual / React Compiler 非阻断警告；`npm run typecheck`、`npm run format:check` 与 `git diff --check` 通过。
- 未运行：未运行单元测试、原生夹具、Wasm/Vite 构建或浏览器检查；等待项目所有者提交修复并由 Actions 重新执行完整 `verify`。

## 2026-08-15 第七世代 SOS RNG

- 新增：增加 `gen7sos` C++/Wasm API v1、77-word 请求、14-word 结果、`begin()` / `step()` 连续会话、原生会话夹具、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 算法：覆盖 Pokemon Generation 的 Main SFMT64 / 战斗 SFMT32 双流、Call Prediction 的 `SOSRNG.Generate()`、Caller/Ally、天气槽位、Rate 1 / Rate 2、链长保底 IV、HA、同步、槽位、等级、道具与结果筛选。
- 界面：增加 Pokemon Generation / Call Prediction 分段工作流、Caller 与九个 Ally 槽位、完整战斗条件、Pokemon/Calls 筛选、进度、取消、虚拟滚动、排序、CSV、选中行 Path Finder 和清空。
- Path Finder：按 `MiscRNGTool.SOSPathFinder()` 生成 Nothing / CallOnly / Both 三组条件；根据上游实际访问范围只重算目标帧前 27 帧，避免浏览器保留无限时间线。
- 文档：增加 `docs/modules/gen7sos.md`，记录上游输入边界、77/14-word 契约、`Rate 2` 的来源差异、Path Finder 窗口和结果列；README、需求、技术方案与库存同步将下一模块改为 Egg。
- 未运行：本轮未获测试、类型检查、原生夹具、Wasm 构建、Vite 构建、性能或浏览器检查授权；源码和夹具存在不等于算法或界面已通过。
- 交付：按项目所有者要求本模块完成后先交由项目所有者提交；不执行提交、推送或构建。
- 下一步：实现 Gen VII Egg，继续保留当前未提交的 Wild 与 SOS 改动。

## 2026-08-15 第七世代 Wild RNG

- 新增：增加 `gen7wild` C++/Wasm API v1、91-word 请求、11-word 结果、`begin()` / `step()` 连续会话、原生会话夹具、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 数据：从 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 生成 SM / USUM 四版本昼夜遭遇数据，覆盖普通地点 180 条、Fishing 40 条、Ambush Encounters 40 条、Berry Tree 21 条、Ultra Beast 10 条与 Island Scan 56 条。
- 算法：移植 SFMT、`Search7_Normal()`、`ModelStatus`、Wild Delay、六类遭遇、Fishing Bubbling / Overview、Ambush Trigger / Delay2 / Wild Cry、完整 Lead、Shiny Charm、固定 3V、槽位、等级、道具与筛选顺序；连续状态不做帧分片。
- 界面：增加 Gen VII Wild 导航与双列工作台，支持版本、分类、特殊宝可梦、地点、昼夜、遭遇参数、Lead、完整筛选、进度、取消、100000 行结果上限、虚拟滚动、排序、CSV 和清空。
- 文档：增加 `docs/modules/gen7wild.md`，记录控件进制、范围、空值、跨字段约束、91/11-word 契约、浏览器 `10000000` 绝对帧保护和上游来源；README、需求、技术方案与库存同步将下一模块改为 SOS。
- 未运行：本轮未获测试、类型检查、原生夹具、Wasm 构建、Vite 构建、性能或浏览器检查授权；源码和夹具存在不等于算法或界面已通过。
- 交付：按项目所有者要求继续完成全部第七世代剩余功能，期间不提交、不推送、不构建；全部完成后统一交付项目所有者提交。
- 下一步：实现 Gen VII SOS，先核对 `SOSRNG.cs`、`SOSResult.cs`、`SOSAllies.cs`、`Data/SOSCall.md` 和 MainForm 的 Chain / Ally 输入边界。

## 2026-08-15 第七世代 Stationary RNG

- 决定：项目所有者指定当前第七世代主模块顺序为 `Stationary -> Wild -> SOS -> Egg -> Battle Tree -> Event`；本轮先完成 Stationary，下一模块为 Wild。
- 新增：增加 `gen7stationary` C++/Wasm API v1、57-word 请求、9-word 结果、`begin()` / `step()` 连续会话、原生固定夹具、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 数据：从 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `Gen7/PKM7.cs` 生成 228 条 SM/USUM 版本限定模板，覆盖普通定点、礼物、交换、Poke Pelago、Totem、传说、Ultra Beast 与 Ultra Space Wilds。
- 算法：移植 SFMT、`Search7_Normal()`、`ModelStatus`、Raining phase、Blink / Safe Frame、DelayType 1..27、Trade、Pelago、Ditto 固定性格、Shiny Lock、Forced Shiny、Shiny Charm 与固定 3V；连续状态不做帧分片。
- 界面：增加 Gen VII Stationary 导航与双列工作台，支持版本、模板、NPC、Delay、自定义目标、完整筛选、进度、取消、100000 行结果上限、虚拟滚动、排序、CSV 和清空；移动端控件保持至少 44px 触控目标。
- 修复：模板测试改为直接核对固定 3V 与 In-Game Trade 数据不变量；CSV 按表格显示格式导出特性、性别、异色、同步与 PRV；清空结果同时重置状态、进度、错误和摘要。
- 静态核对：逐段对照 `MainForm_Core.cs::Search7_Normal`、`MainForm.cs::getsetting/getStaSettings`、`Stationary7.cs`、`ModelStatus.cs`、`RNGPool.cs`、`SFMT.cs`、`FuncUtil.cs` 与 `PKM7.cs`，并记录输入限制和浏览器 `5000000` 绝对帧保护上限。
- 已通过：对本任务全部文件运行 `npm run format:files -- <files>`，全仓 `npm run format:check` 输出 `All matched files use Prettier code style!`，`git diff --check` 无输出。
- 未运行：本轮未获测试、类型检查、原生夹具、Wasm 构建、Vite 构建、性能或浏览器检查授权；源码和夹具存在不等于算法或界面已通过。
- 交付：项目所有者本轮自行提交、推送和构建；历史记录中的 Codex 提交/推送授权不用于本轮。GitHub Actions 部署后，由项目所有者提供准确生产 URL 并单独授权回归。
- 下一步：开始 Gen VII Wild，先核对其 Qt/WinForms 输入设置、Core 参数、模板数据和普通野生分支边界。

## 2026-08-15 全模块范围授权与库存纠正

- 决定：项目所有者将活动范围扩大为完整 PokeFinder 4.3.2，以及除 `NTR Helper` 外的全部 3DSRNGTool 功能；此前“仅第三世代”的决定不再适用，但保留原记录作为历史轨迹。
- 授权：项目所有者明确授权 Codex 自主开发、运行 `npm run verify`、`npm run wasm:test:native` 与 `npm run wasm:build`、逐模块提交并推送；全部模块部署后，在 `https://haku76.github.io/PokeRNGKit/` 使用外部 Chrome 或 Edge 完成一次生产回归。
- 库存：PokeFinder Gen III、Gen IV、Gen V 与全局工具已齐；Gen VIII Profiles、IDs 与 Eggs 已实现，仍缺 Event、Raids、Static、Underground、Wild 与 Den Map。完整状态写入 `docs/module-inventory.md`。
- 3DSRNGTool：Gen VII ID 已完成；其余 Gen VI、Gen VII 与公共工具全部计划实现，仅 `NTR Helper` 明确排除。
- 架构：继续保持纯静态、本地优先、C++/Emscripten Wasm + 独立 Web Worker；不因 NTR 功能增加后端、本地桥接、浏览器扩展、原始 TCP 或云端服务。
- 界面：项目所有者要求 PC 端参数和主要操作尽量收纳在首屏，页面滚动主要留给结果表；复杂模块使用标签、紧凑字段网格和折叠高级设置。轻量全局工具、档案与辅助输入可合并到悬浮工具菜单，核心 Generator/Searcher 保持独立工作区。侧边栏整体外壳必须直角，内部导航项可保留交互圆角。
- 下一步：完成 Gen 8 Eggs 的工程检查、提交与推送，然后实现 PokeFinder Gen 8 Event。

## 2026-08-15 Gen 8 Eggs 实现

- 新增：`gen8egg` C++/Wasm API v1、BDSP 个人数据、原生固定夹具、Dedicated Worker Pool、领域校验、UI 预览与三层 TypeScript 测试。
- 新增：Gen 8 Eggs 工作区接入侧栏、Gen 8 Profile、全局个体值计算器、三语键、虚拟结果表、排序、CSV、进度与取消。
- 核对：对照 PokeFinder 4.3.2 `Eggs8`、`EggSettings`、`EggGenerator8`、`EggState8`、`EggModel8`、`egg8.json` 与简中翻译，记录 64/32 位输入、双亲、护符、红线、特殊蛋种和结果列边界。
- 优化：侧边栏整体外壳改为直角；Gen 8 Eggs 在宽屏使用并排 RNG 与设置/筛选标签，结果表独立滚动，`1280px` 以下重排。
- 已通过：`npm run wasm:test:native` 37/37，包含 `gen8egg_native_parity` 的 Bulbasaur、Nidoran、Volbeat / Illumise 固定结果与输入错误边界。
- 已通过：`npm run verify` 的 Prettier、ESLint（0 error、3 条既有 warning）、TypeScript 和 91 个 Vitest 文件共 373 项测试；2079 个 Vite 模块完成转换。
- 受限：`verify` 的 `build:web` 在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；非受限重试因审批服务 502 未启动。该状态与此前同一路径的受限终端问题一致，但本轮没有项目所有者手动通过记录。
- 未运行：`npm run wasm:build` 因当前会话缺少 Emscripten 与 `emcmake` 在 doctor 阶段停止；常见本机路径未发现 emsdk。CMake、Ninja 与 Visual Studio Build Tools 2026 x64 可用。
- 环境：Node.js `24.13.0`、npm `11.6.2`；低于仓库锁定的 Node.js `24.19.0`、npm `12.0.2`。完整生产构建与锁定工具链验证交给 GitHub Actions。
- 提交阻塞：沙箱拒绝创建 `.git/index.lock`；按授权申请非受限 `git add -A` 时审批服务返回 502，命令未启动。当前没有暂存、提交或推送；下一步先恢复 Git 写入授权，再提交 `feat: 实现第八世代孵化乱数`。

## 2026-08-15 第三世代范围恢复与模块盘点

- 决定：活动开发范围恢复为 Generation III。仓库中既有 Gen IV、Gen V、Gen VII、Gen VIII 与 Researcher 代码继续保留，但不继续新增后续世代模块。
- 核对：对照 PokeFinder 4.3.2 `Form/MainWindow.cpp`、`Form/MainWindow.ui` 与 `Form/Gen3/`，确认 IDs、Eggs、GameCube、Static、Wild、Profile Manager、GameCube Seed Finder、IVs to PID、PID to IVs、Jirachi Advancer、PokeSpot、Seed to Time 与 Spinda Painter 均有对应实现和模块文档。
- 结果：第三世代当前没有缺失的 PokeFinder 功能模块；后续工作转为工程检查、生产算法回归、交互验收与加固，不进入 Gen8 Egg。
- 已运行：只读核对 `git status --short --branch`、`git log -5 --oneline --decorate`、上游 Gen3 Form 清单、仓库功能目录与模块文档。
- 已通过：`npm run format:files -- README.md docs/requirements.md docs/progress.md`、全仓 `npm run format:check` 与 `git diff --check`。
- 未运行：未获本轮测试、构建、Wasm、性能、浏览器或部署 URL 授权，因此没有运行相关检查。
- 下一步：项目所有者明确授权具体工程检查命令，或在 Actions 部署完成后提供准确生产 URL 并授权第三世代回归。

## 2026-08-14 第八世代 ID 乱数

- 新增：实现 PokeFinder `Gen 8 TID/SID` Generator，支持两段 64 位 Seed、Initial Advances、状态数量，以及 TID、SID、TID/SID、PID、TSV、Display TID 六种多行 OR 筛选；空筛选不过滤，两个 Seed 同为 `0` 时拒绝。
- 算法：增加独立 `gen8id` Wasm API v2，复用上游 `IDGenerator8`、`Xorshift`、`RNGList`、`IDFilter` 与 `IDState8` 语义，保留零 `sidtid` 重读、`uint32_t` Advances 回绕和 `rng.next(0x80000000, 0x7fffffff)` 的特殊范围行为。
- 接入：增加最多八个独立 Worker、100,000 状态分片、250,000,000 次状态评估上限、确定性乱序归并、进度、取消、预中止、100,000 行结果上限、协议握手、运行时请求/分片/结果校验、崩溃后重建、默认 Wasm 构建清单和三语导航。
- 界面：按 HakuStyle operational workspace 与 compact workspace 密度实现双栏到单栏响应式控制区、44px 控件、纵向筛选工作流、固定五列表、虚拟滚动、键盘行导航、CSV、清空、错误、空结果与结果上限状态；模块不读取 Gen 8 Profile，也不增加 operation tabs。
- 修复：PID 文本按 Qt 的数值溢出规则处理前导零；未知筛选枚举不再退化为无筛选；无筛选批次必须完整连续返回每个状态；Worker 逐行验证 Advances、非零 TID/SID、TSV、Display TID、筛选命中、结果指针与顺序；运行时锁定输入，结果上限会停止剩余 Worker，非法分片参数不再把 Pool 卡在运行状态。
- 已通过：定向 `gen8id_native_parity` 1/1；覆盖四组 `id8.json` 九行结果、每组全部非零分片起点、六种筛选、空筛选、零 Seed 边界、零状态、Advances 回绕、单批上限和 250,000,000 次任务边界；模块内四个上游副本与 PokeFinder 4.3.2 对应文件 SHA-256 一致。
- 已通过：项目所有者在本地终端运行完整 `npm run verify`；全仓 Prettier、ESLint（0 error、3 条既有 TanStack Virtual warning）、TypeScript、88 个测试文件共 360 项测试、2073 个 Vite 模块的 Web/PWA 生产构建和 62 项 PWA 预缓存全部通过，仅保留大型 chunk 提示。
- 环境记录：受限终端此前在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；后续非受限审批请求因审批服务 502 未启动。项目所有者手动执行同一命令通过，确认不是源码失败。
- 状态：本模块已由 `613e7d8 feat: 实现第八世代 ID 乱数` 进入 `main` 与 `origin/main`；后续世代开发现已冻结，不进入 `gen8egg`。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互和实际页面算法回归，仍需在提交部署后与项目所有者共同完成。

## 2026-08-14 第八世代存档信息管理

- 新增：实现 PokeFinder `Profile Manager Gen 8` 与 `Profile Editor Gen 8`，支持 Sword、Shield、Brilliant Diamond、Shining Pearl，以及 Profile Name、TID、SID、National Dex、Shiny Charm、Oval Charm。
- 管理：支持新建、编辑、完全复制、删除、选择、拖动重排、显式上下移动和键盘行导航；桌面表格按上游保留 6 个数据列，National Dex 只在编辑器和领域模型中保存。
- 持久化：增加独立 IndexedDB `pokerngkit-gen8/profile-data/gen8-profiles`、localStorage 镜像 `pokerngkit-gen8-profiles-v1` 和 `pokerngkit.gen8-profiles` schema v1 备份；镜像写入成功但 IndexedDB 写入失败时记录待同步状态，后续优先恢复较新镜像；导入按稳定 id 合并，清空不影响其他世代且任一副本清除失败会显示错误。
- 界面：按 HakuStyle 工作台密度实现 Lucide 工具图标、居中可访问 modal、焦点约束、`Escape`、滚动锁定、焦点恢复、桌面宽表和移动端记录列表。
- 上游一致性：TID/SID 为空按 `0`、限制为十进制 `0..65535`；Profile Name 只用 trim 后内容校验是否为空，保存时保留原始文本；日文未完成 Gen 8 Profile 词条保留 English source。
- 依赖：使用 npm 增加 `lucide-react`，仅作为本地打包的标准工具图标，不使用运行时 CDN。
- 已通过：`npm test -- src/features/gen8profiles` 共 2 个测试文件、13 项测试；领域、存储和面板的定向 ESLint、TypeScript、Prettier 与 `git diff --check` 通过。
- 已通过：完整 `npm run verify`，包含全仓 Prettier、ESLint、TypeScript、85 个测试文件共 341 项测试，以及 Web/PWA 构建。
- 已知警告：Gen 3 Egg、Gen 3 Wild 与 Gen 5 Hidden Grotto 保留 3 条 TanStack Virtual React Compiler 兼容警告；Vite 保留主包与大型 Wasm chunk 的默认体积提示。
- 不适用：本模块不执行 RNG，不含 Wasm、Worker 或原生 C++ 夹具。
- 待验收：部署后的桌面/移动端界面、拖动、键盘、导入导出和浏览器持久化仍需使用外部 Chrome/Edge 与项目所有者共同确认。

## 2026-08-14 第五世代隐藏洞穴乱数

- 新增：实现 PokeFinder `Hidden Grotto` 的 Grotto Slot Generator/Searcher 与 Pokemon Generator/Searcher，目标游戏固定为 Black 2 / White 2。
- 数据：内置 20 个隐藏洞穴地点、每地点 4 个 Group，以及每组 3 个宝可梦 Slot、4 个道具 Slot 和 4 个隐藏道具 Slot；运行时不联网读取遭遇数据。
- 算法：保留洞穴刷新、Grotto Power、Group、Slot、性别、Synchronize、Shiny Charm、隐藏特性、等级、PID、IV、觉醒力量、能力值和 `uint32_t` 推进环绕语义。
- 接入：增加独立 `gen5hiddengrotto` Wasm API v1、114-word 请求、16-word 结果、四能力握手、最多四个 Worker、确定性分片、进度、取消、250,000,000 次状态评估上限和 100,000 行结果上限。
- 检索：Slot Searcher 使用 raw Seed；Pokemon Searcher 支持 raw、IV Cache 与 IV+SHA Cache 三条路径，并复用 PokeFinder `.ivcache` / `.sha1cache` 的 Profile、日期和推进范围兼容规则。
- 界面：按 HakuStyle 紧凑工作台实现 Slot/Pokemon 主标签、Generator/Searcher 次标签、Profile Manager、Adjacent Seeds、可拖动 Advance Finder、IV/能力值切换、排序、虚拟结果表、键盘行导航和移动端单列重排。
- 已通过：`npm test -- src/features/gen5hiddengrotto` 共 5 个测试文件、29 项测试；定向 `gen5hiddengrotto_native_parity` 1/1。
- 已通过：完整 `npm run wasm:test:native` 共 35/35 原生夹具。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；格式、ESLint、TypeScript、83 个 Vitest 文件共 328 项测试、Vite 生产构建和 61 项 PWA 预缓存通过，仅保留 3 条 TanStack Virtual / React Compiler 非阻断警告与主包体积警告。
- 环境记录：受限终端首次构建在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过，确认不是源码失败。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 第五世代野生乱数

- 新增：实现 PokeFinder `Gen 5 Wild` 的 Generator/Searcher，覆盖 Black、White、Black 2、White 2，以及草丛、深色草丛、摇动草丛、冲浪、水纹冲浪、钓鱼与水纹钓鱼七类遭遇。
- 算法：保留 Synchronize、Cute Charm、Magnet Pull、Static、Pressure、Hustle、Vital Spirit、Suction Cups、Sticky Hold、Compound Eyes、Dark Grass 双打额外 RNG 消耗、BW/BW2 差异、Lucky Power、Shiny Charm、Memory Link 与 N's Pokémon released 分支。
- 接入：增加独立 `gen5wild` Wasm API v1、84-word 请求、16-word 结果、最多四个 Worker、确定性分片、进度、取消、250,000,000 次状态评估上限、100,000 行结果上限和默认 Wasm 构建入口。
- 检索：支持 raw、IV Cache 与 IV+SHA Cache 三条 Searcher 路径；缓存沿用 PokeFinder `.ivcache` / `.sha1cache` 格式，并按 Profile、日期与 IV 推进范围检查兼容性。
- 界面：提供季节、地点、物种、队首、Lucky Power、遭遇槽位、等级和完整状态筛选；结果包含道具、物种、等级、能力值、Characteristic，并接入 Advance Finder、Adjacent Seeds 与 Profile Manager。
- 已通过：`npm test -- src/features/gen5wild` 共 6 个测试文件、18 项测试，定向 ESLint、全仓 TypeScript，以及 `gen5wild_native_parity` 1/1。
- 已通过：完整 `npm run wasm:test:native` 共 34/34 原生夹具，包含 `gen3pidtoiv_native_parity`、Advance Finder API v2、Gen5 Event 与本轮 `gen5wild_native_parity`。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；格式、ESLint、TypeScript、78 个 Vitest 文件共 299 项测试、Vite 生产构建和 60 项 PWA 预缓存通过，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 环境记录：锁定运行时在受限终端完成格式、Lint、TypeScript 与全部测试后，复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一 `verify` 在非受限环境通过，确认不是源码失败。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 第五世代配信乱数

- 新增：实现 PokeFinder `Gen 5 Event` 的 Generator/Searcher，覆盖 Black、White、Black 2、White 2，以及 204 字节 `.pgf` 配信卡导入。
- 参数：支持配信 TID/SID、物种、固定或随机性格、性别、特性、异色、等级、蛋标记、六项固定或随机个体值，以及个体值、性格、觉醒属性、特性、性别和异色筛选。
- 接入：增加独立 `gen5event` Wasm API v1、最多四个 Worker、确定性分片、进度、取消、250,000,000 次状态评估上限、100,000 行结果上限和默认 Wasm 构建入口。
- 界面：按 HakuStyle 紧凑工作台实现三列到单列响应式表单、Profile 摘要、PGF 导入、虚拟结果表、鼠标/键盘行选择、能力值切换和可拖动 Advance Finder；Searcher 日期使用本地持久化降级。
- 完善：物种必须从自动完成候选确认；能力值固定使用当次任务的物种与结果等级；结果表使用合法可选择网格语义；Worker 把有效结果上限传入任务并限制解码；Generator 允许 Profile 九项 Keypresses 全关闭。
- 已通过：`npm test -- src/features/gen5event` 共 5 个测试文件、22 项测试，定向 ESLint、全仓 TypeScript，以及 `gen4advance_native_parity` / `gen5event_native_parity` 2/2。
- 已通过：完整 `npm run wasm:test:native` 共 33/33 原生夹具，包含 `gen3pidtoiv_native_parity`、Advance Finder API v2 与 `gen5event_native_parity`。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 运行完整 `npm run verify`；格式、ESLint、TypeScript、72 个 Vitest 文件共 281 项测试通过，非受限 Web/PWA 构建成功并生成 `gen5event.worker`，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 环境记录：受限终端在复制 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一构建命令在非受限环境通过，确认不是源码失败。
- 已提交：`f58bb53 feat: 实现第五世代配信乱数` 已推送到 `origin/main`。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 第五世代孵化乱数

- 新增：实现 PokeFinder `Gen 5 Eggs` 的 Generator/Searcher，覆盖 Black、White、Black 2、White 2、双亲 IV/特性/性别/道具/性格、异国孵化、隐藏特性遗传和特殊蛋种派生。
- 接入：增加独立 `gen5egg` Wasm API v1、最多四个 Worker、确定性分片、进度、取消、250,000,000 次状态评估上限、100,000 行结果上限和默认 Wasm 构建入口。
- 界面：按 HakuStyle 紧凑工作台密度实现三列到单列的响应式表单、完整筛选、遗传来源、能力值切换、排序、CSV、虚拟结果表和鼠标/键盘行选择。
- 工具：Generator 使用居中、可拖动的共享弹层打开 Advance Finder，复用 API v2 的 Chatot 联合区间与 Needles 精确/Any 连续匹配；跳转后选中对应结果并滚动到该行。
- 完善：Searcher 选中结果后可打开 Adjacent Seeds；空十进制输入按上游读取为 `0`，物种必须从候选列表确认，双亲交换后的遗传来源按当次请求保持 A/B 映射，虚拟结果表补齐网格 ARIA 与方向键、Home、End 导航。
- 已通过：`npm test -- src/features/gen4advance src/features/gen5egg` 共 5 个测试文件、23 项测试，定向 ESLint、全仓 TypeScript，以及 `gen4advance_native_parity` / `gen5egg_native_parity` 2/2。
- 已通过：完整 `npm run wasm:test:native` 共 32/32 原生夹具，包含 `gen3pidtoiv_native_parity`、Advance Finder API v2 与 `gen5egg_native_parity`。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；格式、ESLint、TypeScript、72 个 Vitest 文件共 278 项测试和 Web/PWA 构建通过，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 环境记录：受限终端在复制 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过，确认不是源码失败。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 第五世代定点乱数

- 新增：实现 PokeFinder `Gen 5 Static` 的 Generator/Searcher，覆盖 Black、White、Black 2、White 2 与九类上游模板，并保留普通定点、野生定点、赠送蛋和游走分支。
- 修复：Worker 缓存键加入日期范围与筛选后内容指纹；连续使用同一 SHA Cache 搜索不同日期范围时会重新加载，避免复用旧子集造成漏结果或 `InvalidChunk`。
- 修复：Hardy、Docile、Serious、Bashful 与 Quirky 五种中性性格按 `1.0` 计算能力值；UI Preview 的“取消筛选”不再继续套用 IV、性格、特性、性别和异色条件。
- 优化：Generator/Searcher 结果表支持全列表头排序、鼠标与键盘选中；`Lucky Power` 的 Level 3 文案改为上游原文 `3/S`。
- 接入：增加独立 `gen5static` Wasm API v1、最多四个 Worker、确定性分片、进度、取消和虚拟结果表；Generator 通过可拖动居中弹层打开 Advance Finder，Searcher 把已选结果带入 Adjacent Seeds。
- 更新：共享 `gen4advance` Wasm API 升级为 v2，增加第五世代 Needles 精确/Any 匹配，并保留 Calls/Chatot 请求格式。
- 已通过：`npm test -- src/features/gen4advance src/features/gen5static` 共 6 个文件、21 项测试，定向 ESLint，以及 `gen4advance_native_parity` / `gen5static_native_parity` 2/2。
- 已通过：完整 `npm run wasm:test:native` 共 31/31 原生夹具，包含附件曾失败的 `gen3pidtoiv_native_parity` 以及本轮 `gen4advance_native_parity` / `gen5static_native_parity`。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；格式、ESLint、TypeScript、67 个 Vitest 文件共 255 项测试和 Web/PWA 构建通过，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 环境记录：受限终端首次构建在复制 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过，确认不是源码失败。
- 待验收：生产 Wasm、Actions 部署与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 HakuStyle Skill 更新

- 更新：从项目所有者指定的 `C:\Users\Hakuhiro\Documents\Codex\2026-08-12\b\outputs\hakustyle` 同步仓库内 `.agents/skills/web-frontend-style`，后续模块继续使用更新后的 HakuStyle 规则。
- 规范：增加 PokeRNGKit 实底玻璃导航外壳规则，明确透明层仅用于导航与浮动工具外壳，表单、表格、弹层正文和长文本继续使用不透明内容面。
- 来源：设计来源索引由 31 个更新为 32 个，交互、字体密度与来源映射同步更新；未复制来源仓库的 `.git`、README 或其他非 Skill 文件。
- 已通过：仓库 Skill 自带 `scripts/validate.ps1` 与 `skill-creator` 的 `quick_validate.py` 均通过；任务文件已按仓库 Prettier 规则格式化，`git diff --check` 通过。

## 2026-08-14 剩余功能模块盘点

- PokeFinder：第三、第四世代主模块和工具已齐；第五世代 Static、Egg 与 Event 已进入主分支，Wild 当前工作区待工程验证，之后仍缺 Hidden Grotto；第八世代仍缺 Profiles、IDs、Egg、Event、Raid、Static、Underground、Wild 与 Den Map。
- 3DSRNGTool：已实现第七世代 ID；第六世代仍缺 Stationary、Event、Wild、Egg、ID、Main Seed Finder 与 TinyMT Timeline；第七世代仍缺 Stationary、Event、Wild/SOS、Egg、Main RNG Tool 与 Egg Seed Finder；公共工具仍缺 Profile Manager、KeyBV 与 Misc. RNG Tool。
- 架构限制：`NTR Helper` 依赖桌面程序对 3DS 调试端建立原始 TCP/NTR 连接，普通静态浏览器不能直接复刻该通信；在不增加本地桥接程序、浏览器扩展或后端的现有边界下暂不实现，后续须由项目所有者单独确认方案。
- 实施顺序：完成 Gen5 Wild 工程验证、提交与推送后处理 Hidden Grotto，再进入第八世代与 3DSRNGTool 模块。每个完整模块独立提交并推送，共享接线在对应模块提交内收口。
- 验收边界：工程检查、原生夹具与 Actions 只作为工程证据；全部模块部署后仍须使用已连接的外部 Chrome/Edge 检查实际生产 URL，并与项目所有者共同完成最终验收。

## 2026-08-14 Gen5 SHA1 Cache Finder

- 新增：PokeFinder `SHA1 Cache Finder`，复用第五世代 Profile 与用户上传的 `.ivcache`，按 Timer0、日期、2144 个有效按键组合和每天 86400 秒扫描 SHA-1 初始 Seed，并导出 PokeFinder 兼容 `.sha1cache`。
- 算法：移植 PokeFinder 4.3.2 SHA1、Nazo、Keypresses 与 SHA1CacheSearcher 语义；Entralink/Normal/Roamer 分别二分检索，Normal 桶按 BW/BW2 规则选择，三类结果按完整 64 位 Seed 升序写入。
- 接入：新增 `gen5sha1cache` Wasm API v1、14-word 请求、4-word 结果、最多四个独立 Worker、GEN V 导航、共享契约和默认 Wasm 构建清单；每个 Worker 只接收一次三类 IV Seed，任务按 `Timer0 + 日期 + 按键` 分发。
- 界面：按 HakuStyle 工作台密度复用第五世代 Profile 选择器，提供日期范围、IV Cache 上传、Output File、Search/Cancel、文件系统写入回退、响应式布局和 UI Preview；简中控件逐字使用 PokeFinder 上游译文。
- 加固：校验 `.ivcache` magic、计数、精确长度、排序去重、1,000,000 个 Seed 输入上限、100,000 条单元结果上限与 1,000,000 条文件结果上限；协议、指针、缓冲区、进度或 Worker 错误均终止任务且不写部分文件。
- 已通过：定向 3 个 Vitest 文件共 9 项测试、TypeScript、定向 ESLint、全仓 Prettier、`git diff --check`，以及 `POKERNGKIT_WASM_MODULES=gen5sha1cache npm run wasm:test:native` 原生 CTest 1/1；完整 `npm run wasm:test:native` 通过全部 30 项原生夹具。
- 完整验证：受限环境首次在 `build:web` 复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；非受限 `npm run verify` 通过 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、60 个测试文件共 226 项测试、Vite 生产构建与 56 项 PWA 预缓存。
- 环境限制：本机没有 Emscripten 6.0.6，`emcc/emcmake` 均不可用，因此未生成本地生产 Wasm；该产物继续由 Actions 工具链构建。Actions 部署页面算法回归、外部 Chrome/Edge 视觉与交互和项目所有者最终验收待提交部署后完成。

## 2026-08-14 赞助入口

- 新增：页脚增加“赞助”入口，与贡献榜保持同一信息层级；点击后使用共享浮动工具弹层居中显示支付宝和微信支付两张收款码。
- 资源：将项目所有者提供的 `Alipay.jpg` 与 `WeChatPay.jpg` 收纳到独立功能目录并通过 Vite 静态导入，保留原始分辨率、完整方形画面和离线 PWA 资源哈希。
- 交互：弹层支持遮罩点击、`Escape`、关闭按钮、焦点约束与恢复、滚动锁、桌面指针拖动和键盘方向键移动；二维码使用同源原图链接，移动端可长按保存，也可轻点或键盘激活直接下载原始 JPG。
- 优化：移除二维码图片上的拖动禁用和触摸拦截，触摸设备保留 iOS/Android 原生长按菜单，桌面端继续提供点击下载原图。
- 样式：按 HakuStyle 标准产品密度使用 15px 标签、12px 图片圆角和安静边框；桌面双列、窄屏单列，不裁切二维码，不增加装饰渐变、嵌套卡片或说明性填充文案。
- 已通过：任务文件定向 Prettier、全仓 `npm run format:check`、`git diff --check`；完整 `npm run verify` 通过 ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、57 个测试文件共 217 项测试、Vite 生产构建与 55 项 PWA 预缓存。受限环境复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`，非受限环境重跑通过。
- 未验收：外部 Chrome/Edge 与部署页面视觉、长按保存行为等待提交部署后和项目所有者共同核对。

## 2026-08-14 Gen5 Dream Radar

- 新增：PokeFinder `Dream Radar` Generator/Searcher，覆盖 Black 2 / White 2 Profile、最多六个连续 Slot、徽章等级、Memory Link、个体值、性格、觉醒力量、Needle、按键和日期时间结果。
- 接入：新增 `gen5dreamradar` Wasm API v1、最多四个独立 Worker、58-word 请求 ABI、11-word 结果 ABI、250,000,000 次状态评估上限、100,000 行结果上限、GEN V 导航、共享契约和默认 Wasm 构建清单。
- 算法：移植 BWRNG、MT、SHA-1、按键、初始推进、PID、个体值和派生值规则；固定模板使用模板性别生成 PID 并按 personal data 显示无性别，保留 Lugia 等模板所需 RNG 消耗。
- 界面：按 HakuStyle 紧凑工作台密度统一 40px 控件、13px 最小元数据与移动端 44px 触控目标；模式页签支持方向键、Home/End、roving tabIndex 和关联区域，结果改为只读 table 语义并复用上游简中表头。
- 已通过：定向 ESLint；3 个 Vitest 文件共 8 项测试；MSVC C++23 原生夹具 1/1，完整比较 Tornadus、Lugia、Staryu、`Staryu -> Slowpoke` 四组各 10 帧，共 40 帧 PID、IV、Nature、Needle、Hidden Power、Ability、Gender、Advance、Level 与 Ability Index。
- 已通过：本次共享接线后的任务文件 Prettier、全仓 `npm run format:check`、`git diff --check`、TypeScript、定向 ESLint、3 个测试文件共 8 项测试与 Dream Radar 原生夹具。
- 完整验证：受限环境首次在 `build:web` 复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`，一次非受限重跑又被并行 Gen7 ID 文件的未格式化状态拦截；隔离 Dream Radar 暂存区后，非受限 `npm run verify` 通过全仓 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、57 个测试文件共 211 项测试、Vite 生产构建与 55 项 PWA 预缓存。
- 未验收：生产 Wasm、Actions 部署页面算法回归、外部 Chrome/Edge 视觉与交互，以及项目所有者最终验收。

## 2026-08-14 Gen7 ID

- 新增：补全第七世代 ID Generator 的多行 TID、SID、Full ID、Gen7TID、TSV 与 Random Number 筛选输入。
- 筛选：支持普通包含匹配、逐行正则、Full ID 空格与 `//` 注释解析，以及 `Disable Filters`；筛选在独立 Worker 中对 Wasm 分片结果执行。
- 样式：按 HakuStyle 工作台密度重排三组 textarea 和响应式筛选区，窄屏改为单列并保留触控目标。
- 文档：记录 SFMT、起始帧、时钟修正、筛选范围与上游 `3DSRNGTool` 来源。
- 已通过：Gen7 ID 定向 ESLint、`npm run typecheck`、13 项 Vitest、`gen7id_native_parity` 原生夹具、`npm run format:check` 与 `git diff --check`。
- 完整验证：恢复文件后首次任务格式化发现并修复筛选模式集合的括号损坏；首次 `npm run verify` 在一项有符号/无符号夹具断言失败，规范为 `uint32` 后受限重跑通过 57 个测试文件共 217 项测试，但在 `build:web` 复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；非受限完整重跑通过 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、全部 217 项测试、Vite 生产构建与 55 项 PWA 预缓存。
- 未验收：生产页面算法回归、外部 Chrome/Edge 视觉与移动端长文本交互，以及项目所有者最终验收。

## 2026-08-14 Gen5 IV Cache Finder

- 新增：PokeFinder `IV Cache Finder`，覆盖完整 `2^32` MT Seed 空间、Entralink/Normal/Roamer 三种读取顺序、高个体 Seed 筛选和 `.ivcache` 导出。
- 接入：新增 `gen5ivcache` Wasm API v1、最多四个独立 Worker、65,536 个半开区间分片、结果确定性归并、File System Access API 写入和下载回退；UI Preview 不加载 Wasm。
- 加固：保留上游 `Advance32Bit` 的 `uint32_t` 解析和文件字段，但执行入口要求 `Initial Advances = 0`、`Max Advances <= 20`。原因是上游搜索器写入相对桶，而 PokeFinder 读取端按绝对 Initial Advances 访问；非零初始帧会生成错帧 `.ivcache`，Roamer 还无法表示非零起点。
- 加固：单批结果不超过 `65,536` 条，累计结果不超过 `1,000,000` 条；结果数量、缓冲区、指针对齐、堆边界、协议版本和 Worker 崩溃均有防御校验。`appendGen5IvCacheHits`、进度回调或批次异常后会销毁整个池，下一次搜索重新建 Worker。
- 文档：新增 [Gen 5 IV Cache Finder](modules/gen5ivcache.md)，更新需求、README、默认 Wasm 模块清单和上游 MT/RNGList 归属记录；`docs/tech-stack.md` 保留项目所有者改动，Dream Radar 不纳入本次接线。
- 已通过：定向 Prettier、全仓 `npm run format:check`、`git diff --check`、定向 ESLint、`npm run typecheck`、`npm test -- src/features/gen5ivcache`（3 个文件、12 项测试）与 `$env:POKERNGKIT_WASM_MODULES='gen5ivcache'; npm run wasm:test:native`（固定结果与 C++ 写入前限流 2/2）。
- 完整验证：锁定 Node `24.19.0` 与本机 npm `11.6.2` 下的非受限 `npm run verify` 通过全仓 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、57 个测试文件共 211 项测试、Vite 生产构建与 54 项 PWA 预缓存；受限环境首次在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`。CI 使用锁定 npm `12.0.2` 复核；Actions、生产 Wasm 与部署页面回归待提交推送后执行。
- 已提交：`e214060 feat: 实现第五世代IV缓存` 已推送到 `origin/main`；Actions 部署与生产页面回归待执行。

## 2026-08-14 Gen5 IDs

- 新增：PokeFinder `Gen 5 TID/SID` 的 Search By 与 Seed Finder，覆盖 BW/BW2 SHA-1、初始 ID 推进、PID/TID/SID 筛选、第五世代 Profile、九列虚拟结果表、取消和结果上限。
- 安全边界：TypeScript 使用 BigInt 将有筛选任务的 `Seed x Advances` 总评估限制为 250,000,000；完全无筛选的 Search By 按 100,000 行结果上限计算提前终止边界，使默认 Profile 与默认推进数可以启动。Worker Pool 逐行校验日期时间、Timer0、按键、推进数、TID/SID/TSV 与筛选关系，C++ 同步拒绝任务规模和绝对推进溢出；Worker 崩溃或协议错误会终止并清空槽位，下次搜索重新创建。
- 上游标签：`ProfileDisplay5` 的简中 `Profile` 与 `Manager` 均为 unfinished，因此界面保留英文，并补回上游 Profile Display 的 `Manager` 命令以跳转第五世代存档管理。
- 已通过：定向 Prettier、ESLint、TypeScript、3 个测试文件共 9 项测试和 MSVC C++23 原生夹具 1/1；非受限环境完整 `npm run verify` 通过全仓 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、52 个测试文件共 195 项测试、Vite 生产构建与 52 项 PWA 预缓存。受限环境同一命令仅在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；Actions、生产 Wasm 与部署页面回归待执行。

## 2026-08-14 Gen5 Adjacent Seeds

- 新增：PokeFinder `Adjacent Seeds`，覆盖 BW/BW2 目标日期时间、秒数偏移、Timer0、按键、Encounter、IV advances、十列虚拟结果表，以及所选结果的 `Chatot Pitches` / `Save Needles` 预览。
- 接入：复用第五世代 Profile 的 MAC、Nazo、VCount、Timer0、GxStat、VFrame、DS 类型、语言和 Memory Link；新增 `gen5adjacentseeds` Wasm API v1、最多四个独立 Worker、GEN V 导航、共享契约和默认 Wasm 构建列表。
- 加固：浏览器任务限制为 100,000 行，TypeScript、Worker 与 C++ 保留日期时间、推进溢出、指针对齐和堆边界校验；修复 `UINT32_MAX` IV Advance 循环回绕，并在 Worker 崩溃或协议错误后销毁实例、下次任务重新创建。
- 上游标签：`AdjacentSeeds` 与 `ProfileDisplay5` 的简中条目均为 unfinished，因此控件和模块名保留精确英文源字符串，管理按钮使用上游 `Manager`。
- 样式：按 HakuStyle Royal Blueprint compact workspace 组织 Profile、设置与结果区，使用 44px 控件、稳定表格轨道、键盘行导航、移动端单列重排和 reduced motion；不新增卡片嵌套、装饰渐变或无语义徽章。
- 已通过：定向 Prettier、全仓 `npm run format:check`、定向 ESLint、`npm run typecheck`、`npm test -- src/features/gen5adjacentseeds`（3 个文件、6 项测试）与 `$env:POKERNGKIT_WASM_MODULES='gen5adjacentseeds'; npm run wasm:test:native`（`gen5adjacentseeds_native_parity` 1/1）。非受限环境完整 `npm run verify` 通过全仓 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、54 个测试文件共 202 项测试、Vite 生产构建与 53 项 PWA 预缓存；受限环境同一命令仅在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`。Actions、生产 Wasm 与部署页面回归待执行。

## 2026-08-14 Researcher

- 新增：PokeFinder 全局 Researcher，覆盖 14 种 RNG、四组 Seed 输入、10 个有序 Custom 表达式、当前/上一行引用、十六进制 Custom 显示与结果内 Search/Next。
- 接入：新增 `researcher` Wasm API v1、单 Dedicated Worker、10,000 行分批、250,000 行浏览器任务上限、确定性 UI Preview、RNG TOOLS 导航、三语模块名称、全局共享契约和默认 Wasm 构建列表。
- 加固：Worker 校验 API、operation、任务顺序、批次数量、结果宽度、指针对齐和堆范围；取消会终止当前 Worker并在下次生成时重建。桥接层明确将除零和模零定义为 `0`，移位量限制为 `rhs & 63`。
- 样式：按 HakuStyle Royal Blueprint compact workspace 统一页签、Custom 控件与虚拟结果表，保留桌面四页签单行与移动端两列重排；页签和结果网格支持 roving tabIndex、方向键、Home、End，状态、计数、错误和空结果提供对应 ARIA 语义。
- 已通过：定向 Prettier、`git diff --check`、定向 ESLint、`npm run typecheck` 与 `npm test -- src/features/researcher`（3 个文件、11 项测试）；`$env:POKERNGKIT_WASM_MODULES='researcher'; npm run wasm:test:native` 的 `researcher_native_parity` 1/1 通过 14 种 RNG 首值、跨行 Custom、批次上限与 `u32` 帧边界。
- 完整验证：非受限环境 `npm run verify` 通过全仓 Prettier、ESLint（0 error，2 条既有 TanStack Virtual warning）、TypeScript、45 个测试文件共 176 项测试、Vite 生产构建与 51 项 PWA 预缓存；Vite 仅保留大包 warning。受限环境两次在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`，相同源码在非受限环境完整通过。
- 工具链：最终 `npm run verify` 使用锁定 Node `24.19.0` 与本机 npm `11.6.2`；npm `12.0.2`、全量原生夹具和 Researcher 生产 Wasm 由推送后的 Actions 补齐。本机未激活 Emscripten `6.0.6`，定向 `npm run wasm:build` 因缺少 Emscripten 与 `emcmake` 停止。
- 已部署：提交 `45a84d9` 对应 Actions run `31766341675` 的 `build` 与 `deploy` 成功，`deploy-cloudflare` 按配置跳过；GitHub Pages 刷新后加载 `index-BomXgEd3.js`、`index-aKq41HjQ.css` 与 `researcher.worker-DHLB9crx.js`。
- 生产回归：经项目所有者授权，使用已连接的外部 Google Chrome 检查 `https://haku76.github.io/PokeRNGKit/`。LCRNG 全零 Seed 首行返回 `00006073`；Xoroshiro 全零 Seed 首行返回 `82A2B175229D6A5B`；Search 定位 `E97E7B6A` 第 1 帧，Next 无后续匹配时返回“找不到结果”；四组页签方向键、roving `tabIndex`、结果网格 ARIA 选中状态和 `390px` 两列重排均可用。
- 控制台：站点自身没有 error 或 warning；仅记录用户浏览器 Immersive Translate 扩展的版本不匹配错误。自动化结果仅作为工程证据，Researcher 仍需与项目所有者共同完成最终验收。

## 2026-08-14 移动端模块抽屉

- 修复：移动端模块抽屉打开时关闭其他浮动工具并锁定页面滚动；浮动工具打开时也会关闭模块抽屉，避免两套模态层同时争用焦点、`Escape` 和滚动锁。
- 可访问性：窄屏模块侧栏补充对话框名称、模态语义和内部返回按钮，将焦点移入当前模块，使用 `Tab` / `Shift+Tab` 约束焦点循环，并在 `Escape`、遮罩、返回按钮或模块切换关闭后恢复顶部菜单按钮焦点。
- 响应式：进入桌面断点时清除移动抽屉状态且不抢占当前焦点，回到窄屏后保持关闭；关闭状态继续使用 `inert` 与 `aria-hidden`，桌面收起行为不变。
- 已通过：定向 Prettier、`npx eslint src/App.tsx`、`git diff --check`、全仓 `npm run format:check`，以及非受限环境完整 `npm run verify`；后者覆盖 ESLint（0 error，2 条既有 TanStack Virtual warning）、TypeScript、51 个测试文件共 194 项测试、Vite 生产构建与 51 项 PWA 预缓存。
- 验证重试：受限环境在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；一次 1 秒执行器超时只进入 Prettier，另一次非受限重跑捕获并行 IV Cache 文件尚未完成格式化。并行写入停止并重新格式化后，同一完整命令通过。
- 已部署：提交 `7c267eb` 对应 Actions run `31769597386` 的 `build` 与 `deploy` 成功，`deploy-cloudflare` 按配置跳过；GitHub Pages 刷新后加载 `index-BTDNg88F.js`。
- 生产回归：经项目所有者授权，使用已连接的外部 Google Chrome 检查 `https://haku76.github.io/PokeRNGKit/`；`390px` 下抽屉打开会锁定页面滚动并把焦点移入当前模块，`Shift+Tab` / `Tab` 在内部关闭按钮与末项间循环，内部关闭会恢复顶部菜单焦点，浮动工具与抽屉不会同时保持展开。`390px -> 1280px -> 390px` 切换会解除滚动锁、移除桌面对话框语义并在返回窄屏时保持抽屉关闭；自动化结果仅作为工程证据，项目所有者最终验收仍待共同确认。

## 2026-08-14 Gen5 Profiles

- 新增：第五世代 Black/White/Black 2/White 2 Profile Manager 与 Profile Calibrator，覆盖档案 CRUD、选择、复制、排序、JSON 导入导出、IV Search、Needle Search、Seed Search 和 BW2 Memory Link。
- 存储：使用独立 IndexedDB 数据库与 `pokerngkit-gen5-profiles-v1` localStorage 镜像，保持 Gen III、Gen IV、Gen V 档案数据隔离，并在 IndexedDB 不可用或损坏时回退到镜像。
- 接入：新增 `gen5profiles` Wasm API v1、最多四个独立 Worker 排队消费最多八个确定性 VFrame 分片、固定宽度 C ABI、确定性 UI Preview、GEN V 导航、三语模块名称、共享契约和默认 Wasm 构建列表。
- 加固：领域层校验版本、语言、机型、日期时间、十六进制字段、校准范围、IV、Needle、结果上限和浏览器任务上限；Worker 校验 API、operation、分片、结果计数、指针对齐和堆边界。档案写入通过全局队列串行持久化，避免旧渲染快照覆盖后续选择、复制、排序或导入。
- 对齐：MAC、Seed 与十六进制数字输入接受空值和不足最大位宽的文本并按 `0` 读取；新建档案默认启用全部 9 个 Keypress 数量选项，校准创建档案不再带入测试 TID/SID；Needle 方向编码、BW2 依赖选项清理、Profile Editor 的 `MAC` 标签与 Timer0 保存边界均按上游修正。
- 可访问性：档案表支持键盘选择和上下移动，主页面与校准模式页签支持方向键、Home、End、roving tabIndex 和关联 tabpanel；加载、错误、搜索状态与进度提供 live region 或对应 ARIA 语义。
- 已通过：定向 Prettier、`git diff --check`、`npx eslint src/features/gen5profiles`、`npm run typecheck`、`npm test -- src/features/gen5profiles`（3 个文件、14 项测试）与 `$env:POKERNGKIT_WASM_MODULES='gen5profiles'; npm run wasm:test:native`（`gen5profiles_native_parity` 1/1）。
- 完整验证：非受限环境 `npm run verify` 通过全仓 Prettier、ESLint（0 error，2 条既有 TanStack Virtual warning）、TypeScript、45 个测试文件共 176 项测试、Vite 生产构建与 50 项 PWA 预缓存；Vite 仅保留大包非阻断 warning。
- 未验收：Emscripten 生产 Wasm、外部 Chrome/Edge 与 GitHub Pages 算法结果待部署完成后和项目所有者共同核对。

## 2026-08-14 Gen4 Egg

- 新增：第四世代 DPPt/HGSS Egg Generator/Searcher，覆盖 MT19937 PID、异国孵化 ARNG 重抽、三项遗传 IV、双亲组合、221 个合法蛋种、筛选、Poketch 与电话结果。
- 接入：新增 `gen4egg` Wasm API v1、Generator/Searcher Worker Pool、固定宽度 C ABI、GEN IV 导航、三语词条、共享契约和默认 Wasm 构建列表；简中模块名逐字使用上游“第四世代孵化乱数”。
- 加固：Worker 验证 operation、请求与分片类型、`chunkIndex`、领域边界、单批上限、结果计数及 Wasm 指针对齐、非空和堆范围；Pool 按分片索引有序归并并在取消时重建 Worker。
- 已通过：`npm run format:check`、`git diff --check`、`npm test -- src/features/gen4egg`（2 个文件、11 项测试）、`npm run lint`（0 error，2 条既有 warning）、`npm run typecheck` 与 `$env:POKERNGKIT_WASM_MODULES='gen4egg'; npm run wasm:test:native`（`gen4egg_native_parity` 1/1）。
- 完整验证：受限文件环境的 `npm run verify` 通过格式、lint、类型和 39 个测试文件共 151 项测试，随后在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；相同源码状态在受限环境外完整通过 Vite 生产构建与 48 项 PWA 预缓存。
- 未验收：Emscripten 生产 Wasm、外部 Chrome/Edge 与 GitHub Pages 算法结果待部署完成后和项目所有者共同核对。

## 2026-08-14 Gen4 Advance Finder

- 新增：第四世代 Calls/Chatot 连续观测匹配，覆盖上游半开区间、空序列、五条过滤阈值、完整源表恢复、Jump to Advance、清空和取消。
- 接入：初版使用 `gen4advance` Wasm API v1、单 Dedicated Worker、GEN IV 导航、三语模块信息、共享契约和默认 Wasm 构建列表；独立入口支持本地 `Advances,Value` 数据，嵌入接口支持父 Generator 结构化结果。
- 加固：Worker 验证 operation、请求与 chunk、领域边界、结果计数及 Wasm 请求/结果指针对齐、非空和堆范围；原生夹具补齐非法 mode、空指针、非法 Call、行数和令牌数上限。
- 当时限制：初版仅覆盖第四世代 Calls/Chatot；该限制已在 Gen5 Static 接入时由 API v2 的 Needles 模式解除。
- 已通过：任务文件格式化、完整 `npm run format:check`、`git diff --check`、`npx eslint src/features/gen4advance`、`npm test -- src/features/gen4advance`（2 个文件、5 项测试）、`npm run typecheck` 与 `$env:POKERNGKIT_WASM_MODULES='gen4advance'; npm run wasm:test:native`（`gen4advance_native_parity` 1/1）。
- 完整验证：受限文件环境外的 `npm run verify` 通过全仓格式、lint（0 error，2 条既有 warning）、TypeScript、39 个测试文件共 151 项测试、Vite 生产构建与 49 项 PWA 预缓存。
- 未验收：Emscripten 生产 Wasm、外部 Chrome/Edge 与 GitHub Pages 页面行为待部署完成后和项目所有者共同核对。

## 2026-08-14 Gen4 Wondercard IVs

- 新增：第四世代 `Wondercard IVs` Generator/Searcher，覆盖 DPPt/HGSS、Seed/Advance/Offset、IV/Hidden Power、Delay/Advance Searcher、能力值显示、排序、虚拟表、进度与取消。
- 接入：新增 `gen4event` Wasm API v1、Generator/Searcher Worker Pool、模块 manifest、共享契约、GEN IV 导航、三语名称和默认 Wasm 构建列表；简中模块名逐字复用上游“第四世代配信乱数”。
- 已通过：`npm run typecheck`、`npm run lint`（0 error，仅保留 Egg/Wild 两条既有 TanStack Virtual warning）、`npm test -- src/features/gen4event`（2 文件、11 测试）、`$env:POKERNGKIT_WASM_MODULES='gen4event'; npm run wasm:test:native`（`gen4event_native_parity` 1/1）与 `git diff --check`。
- 加固：Worker 现在校验 operation、请求/分片类型、`chunkIndex`、单批状态上限、领域请求、Searcher 组合范围、结果计数以及 Wasm 指针的对齐、非空与堆边界，再复制结果缓冲区。
- 已通过：完整 `npm run verify`，覆盖全仓 Prettier、ESLint、TypeScript、38 个 Vitest 文件共 149 项测试、Vite 生产构建与 47 项 PWA 预缓存；受限文件环境连续两次在复制既有 `gen3egg.mjs` 时返回 `EPERM`，在不受该文件限制的相同源码快照上完整通过。
- 未验收：生产 Wasm、外部 Chrome/Edge 页面与 GitHub Pages 算法结果待部署后和项目所有者共同核对。

## 2026-08-14 IVs to PID Cute Charm

- 补齐：全局 `IVs to PID` 工具现在按 PokeFinder 4.3.2 返回 `Cute Charm (DPPt)` 与 `Cute Charm (HGSS)`，每种方法保留五个性别阈值 PID 与对应 SID 基准值。
- 更新：TypeScript 固定宽度结果解码、UI 预览、模块说明、需求与工程门槛同步接受方法代码 `7/8`；工具仍保持九列结果和单 Dedicated Worker。
- 已通过：定向 `npm run format:files -- ...`、完整 `npm run format:check`、`git diff --check`、`npm test -- src/features/ivtopid`、`npm run typecheck` 与 `$env:POKERNGKIT_WASM_MODULES='gen3ivtopid'; npm run wasm:test:native`，原生 parity 1/1 通过。
- 完整验证：`npm run verify` 已通过格式与 lint，随后因并行开发中的 `src/features/gen4event/Gen4EventPanel.tsx` 六项 TypeScript 错误停止；本模块未出现新增错误，待 Gen4 Event 完成类型修正后重跑。
- 未验收：生产 Wasm 与 GitHub Pages 页面仍需部署完成后在外部 Chrome/Edge 核对 Cute Charm 实际结果。

## 2026-08-14 Gen3 Tanoby Chamber

- 新增：第三世代 Wild 的 FireRed / LeafGreen 七个 Tanoby Chamber，补齐未知图腾 `A..Z`、`!`、`?` form 映射、Generator/Searcher PID 顺序和形态回溯。
- 修复：原生 Searcher 夹具按六项 IV 闭区间计算完整笛卡尔积；Liptoo 攻击 IV `0..31` 不再错误地只提交一个组合。
- 验证：`$env:POKERNGKIT_WASM_MODULES='gen3wild'; npm run wasm:test:native` 通过 `gen3wild_native_parity` 1/1，包含普通地点、Tanoby、非法输入和 Liptoo `97` 条结果。
- 未验收：Emscripten Wasm 构建、GitHub Pages Worker/Wasm 回归、移动端性能和项目所有者最终验收待完成。

## 2026-08-14 Gen4 Chained Shiny to SID 接入

- 新增：将现有 `gen4chainedsid` 接入 GEN IV 导航、页面标题、版本信息和共享模块契约；模块使用单 Dedicated Worker，逐条收窄 DPPt 连锁异色 SID 候选。
- 更新：`wasm/CMakeLists.txt` 与 `scripts/wasm.mjs` 默认模块列表加入 `gen4chainedsid`，默认产物为 `gen4chainedsid.mjs` 与 `gen4chainedsid.wasm`。
- 更新：README、需求、技术栈、第四世代交接和模块文档记录输入边界、API v1、`54320` 固定夹具、清空/取消行为及验收限制；三语导航词条复用上游 `PokeFinder_zh.ts`。
- 已运行：任务文件定向 `npm run format:files -- ...`、完整 `npm run format:check`、`git diff --check`、`npm test -- src/features/gen4chainedsid`（2 个文件、5 项测试）、`npm run typecheck`；授权的 `$env:POKERNGKIT_WASM_MODULES='gen4chainedsid'; npm run wasm:test:native` 通过 1/1。
- 已运行：完整 `npm run verify` 的 Prettier、ESLint（0 errors，仅 Egg/Wild 两条既有 warning）、TypeScript 和 33 个测试文件/123 项测试均通过；Web 构建受限于复制既有 `public/wasm/gen3egg.mjs` 的 Windows `EPERM`。
- 未验收：默认全模块 Wasm 构建、外部 Chrome/Edge 页面调试和生产部署回归待完成。

## 2026-08-14 Gen4 Seed to Time

- 新增：第四世代 DPPt/HGSS Seed to Time，覆盖年份与可选秒数检索、校准、硬币序列、Elm Calls、游走路线、序列反查和 Roamer Map。
- 新增：`gen4seedtotime` Wasm API v1、独立 Worker、固定宽度结果、原生 parity 夹具、TypeScript 边界测试和 UI 预览引擎。
- 边界：Seed `0..0xFFFFFFFF`、年份 `2000..2099`、秒数 `0..59`、Delay 校准 `uint32`、秒数校准 `0..500`、R/E 路线 `0..46`、L 路线 `0..28`；Web 校准结果限制为 2,000,000 条。
- 验证：`$env:POKERNGKIT_WASM_MODULES='gen4seedtotime'; npm run wasm:test:native` 通过 1/1。完整 `npm run verify` 首次在受限环境复制既有 `public/wasm/gen3egg.mjs` 时因 Windows `EPERM` 停止；非受限重跑通过 Prettier、ESLint（0 error，保留 Egg/Wild 两条既有 TanStack Virtual warning）、TypeScript、33 个 Vitest 文件共 123 项测试、Vite 生产构建和 PWA 45 项预缓存，Vite 仅保留大包非阻断 warning。
- 未验收：完整 Wasm 与生产页面算法回归需等待 GitHub Pages 部署，并使用外部 Chrome/Edge 与项目所有者共同完成。

## 2026-08-14 Gen4 ID 乱数

- 新增：第四世代 ID Generator/Searcher，覆盖日期时间、Delay、TID/SID/TSV/PID 筛选、结果排序、CSV、进度和取消。
- 新增：`gen4id` Wasm C ABI、独立 Worker Pool、固定宽度结果协议和原生 parity 夹具。
- 验证：`$env:POKERNGKIT_WASM_MODULES='gen4id'; npm run wasm:test:native` 通过 1/1。
- 验证：非受限环境完整 `npm run verify` 通过。Prettier、ESLint（0 error，保留 Egg/Wild 两条既有 TanStack Virtual warning）、TypeScript、30 个 Vitest 文件共 110 项测试、Vite 生产构建和 PWA 43 项预缓存均成功；Vite 仅保留主包超过 500 kB 的非阻断 warning。
- 当前限制：完整 Wasm build 与 Pages 浏览器回归尚未执行。
- 下一步：继续盘点并实现 PokeFinder 与 3DSRNGTool 的剩余独立模块，每个模块单独提交。

## 2026-08-14 HakuStyle 工作台重做

- 重做：界面合同确定为响应式 operational workspace、Royal Blueprint 冷蓝主题、紧凑工作台密度、实体表面与安静动效；统一 13px 以上元数据、14px 控件文字、40px 控件、44px 数据行、10px 控件圆角和 16px 面板圆角，移除背景网格和面板装饰色条。
- 优化：侧栏删除无信息增量的“模块”标题和重复 `×`；桌面仍由顶部菜单按钮收起，移动端仍由遮罩、`Escape` 或选择模块关闭。导航行统一为 46px，并保留固定底部“仅本地”状态。
- 优化：贡献榜从主工作区移到底部页脚入口，点击后打开共享居中对话面板；简体中文显示“贡献榜”，英语和日语因没有上游翻译继续保留英文。
- 新增：档案、个体值计算器、遇敌查询和贡献榜共用的浮动面板在桌面支持标题栏 Pointer Events 拖动、方向键移动和视口边界约束；900px 以下回到居中布局。面板补齐遮罩、滚动锁、焦点圈定、`Escape`、点外关闭和触发器焦点恢复。
- 优化：PID查询个体值结果表统一为固定列宽、粘性表头、等宽数字、交替行和悬停状态；Seed/生成方式左对齐，六项 IV 居中，窄屏在表格内部横向滚动。
- 优化：NGC Seed查询的 XD、竞技场和频道固定为单行三段页签；窄屏只在页签自身横向滚动，不再折成两行。
- 已通过：对本轮文件运行定向 `npm run format:files -- ...`，随后完整 `npm run format:check` 与 `git diff --check` 通过。
- 未运行：未获项目所有者对具体检查命令或 URL 的授权，因此未运行 ESLint、TypeScript、Vitest、Web/Wasm 构建、外部浏览器 UI、性能或生产算法回归；当前样式与交互仍待外部 Chrome/Edge 验收。

## 2026-08-13 第三世代模块 CI 与 HakuStyle 更新

- 修复：根据项目所有者提供的 Actions 日志，移除 GameCube Worker 的无效初始赋值，同时保留 `try/finally` 内存释放；两个 UI 预览引擎移除未使用请求参数；PokeSpot 将地点变化后的物种和槽位重置移回来源事件，消除 5 个 ESLint error。
- 修复：完整类型检查继续发现 GameCube UI 预览把性别固定为字面量 `0`，现改为从预览值生成 `0/1`，男女筛选均可产生示例结果；生产 Wasm、Worker 协议和 RNG 算法未改变。
- 优化：PokeSpot 为 Food/Encounter 成对输入使用稳定三轨布局，在窄屏将唯一上游标签移到两个输入上方；PID to IVs 输入占主轨、操作区按内容宽度收敛；Jirachi 操作列表减少空隙并使用等宽数字排版。未新增或改写上游可见标签。
- 更新：从本地 HakuStyle `C:\Users\Hakuhiro\Documents\Codex\2026-08-12\b\outputs\hakustyle` 的 `b69b444` 同步最新版 `SKILL.md`、8 份渐进参考、交互预览资产、界面元数据和校验脚本；补充成对输入、精确可见标签和 React 依赖状态重置规则。`PyYAML 6.0.3` 与 Skill Creator 校验均通过。
- 修复：HakuStyle 浏览器 Demo 显式声明 `document`、`navigator` 和 `window`，保持资源继续纳入 ESLint；同一修正已回写本地 HakuStyle 源目录。
- 修复：新增根目录 `.gitattributes`，统一文本为 LF，消除 Windows 全局 `core.autocrlf=true` 导致本地 Prettier 对 81 个已提交文件的误报；归一化没有为这些文件产生实际内容 diff。
- 修复：Actions 的 GNU 13.3 原生构建在 PID to IVs 的 `RecoverySeeds::operator[]` 处拒绝 const 对象；三个局部恢复结果改为非 const，匹配上游仅提供非 const 下标重载的类型接口，不修改 vendored PokeFinder 文件。
- 修复：Jirachi 原生夹具原先把 `startingSeed=0 / targetSeed=0 / maxAdvances=0` 错判为 `unobtainable`；实际转换目标为第 16 帧，按上游 UI 判断顺序应先返回 `outsideRange`。夹具现分别覆盖 16 帧超范围和 0 帧不可获得两个分支。
- 验证：首次有效 `npm run verify` 在 81 个 CRLF 工作树文件的 Prettier 检查停止；第二次在新 Demo 的 25 个浏览器全局 lint error 停止；第三次在 GameCube UI 预览的 TypeScript 字面量比较停止；第四次通过格式、lint、类型和 103 项测试后，在受限终端复制 `public/wasm/gen3egg.mjs` 到 `dist` 时因 Windows `EPERM` 停止。
- 已通过：非受限环境完整运行 `npm run verify`。Prettier、ESLint（0 error，保留 Egg/Wild 两条既有 TanStack Virtual warning）、TypeScript、28 个 Vitest 文件共 103 项测试、Vite 生产构建和 PWA 42 项预缓存均成功；Vite 仅保留主包超过 500 kB 的非阻断 warning。
- 已通过：经项目所有者授权，在 Visual Studio 2026 Build Tools x64 开发环境完整运行 `npm run wasm:test:native`，16/16 原生测试通过，包含 `gen3pidtoiv_native_parity` 与 `gen3jirachi_native_parity`。第一次 1 秒调用仅启动开发环境并被调用端超时，不是测试失败；随后完整命令成功。
- 未运行：未在 GNU 13.3 环境重新执行 Actions；`npm run wasm:build`、性能、外部浏览器、部署页面和生产算法回归未运行。原生夹具是工程证据，不作为算法验收。

## 2026-08-13 第三世代模块补全

- 新增：`gen3gamecube` GameCube Generator/Searcher，覆盖 XD、Colosseum、Channel 的 Non Shadow、Shadow Locks 和 Channel 模板；正式数据静态核对为 `69/1/77` 条。
- 新增：`gen3pidtoiv` PID to IVs、`gen3pokespot` XD PokeSpot、`gen3jirachi` Channel Jirachi Advancer；四个模块均接入 React 导航、独立 C ABI、Dedicated Worker、API v1、原生夹具和模块文档。
- 优化：PokeSpot Food/Encounter 二维组合按约一百万组合拆分，最多使用 8 个独立 Worker，并按 `chunkIndex` 恢复确定结果顺序；进度按实际组合数汇报，默认范围为 `100020001` 组。
- 修复：Jirachi 上游 `255` 直接接受哨兵现在解码为 `Accept Jirachi`；GameCube、PokeSpot 结果解码新增 IV、能力、性别、等级、性格、闪光和物种边界校验。
- 更新：`scripts/generate-gen3-gamecube-data.mjs` 从 EncounterTableGenerator `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 生成正式 GameCube 模板数据；临时生成目录仅用于本地审计，完成后清理。
- 已执行：对本轮任务文件运行定向 `npm run format:files -- ...`；`git diff --check` 未报告空白错误。
- 当前限制：`npm run format:check` 已执行，但全仓仍有 85 个历史未格式化文件；未扩大格式化范围。未获授权执行 `npm run verify`、`npm run wasm:test:native`、`npm run wasm:build`、TypeScript、浏览器或生产回归。

## 2026-08-13 CI 格式失败复盘

- 可追溯的 Actions 全仓 Prettier 失败至少 3 次：`31581467290`（4 个文件）、`31614337208`（13 个文件）和本次 `31691660050`（`src/features/contributions/ContributionsPanel.tsx`）。历史中另有 6 个格式相关修复提交，但不全部等同于 CI 失败。
- 根因是定向格式化或旧的本地检查结果不能证明 CI 执行的 `prettier --check .`；后续合并、手工调整或新增文件可能再次引入排版差异。
- 已将 SOP 固化为：最后一次编辑后重新格式化全部任务文件；提交前必须运行完整 `npm run format:check`；按 CI 输出文件列表定向修复并重复全仓检查；最后再运行 `git diff --check`。本次只修复格式，未运行 lint、typecheck、测试或构建。

## 2026-08-13 Actions lint 修复

- Actions `31692370495` 的 Prettier 已通过；唯一阻断错误是 `src/features/gen4wild/domain.ts` 中未使用的 `isFishing`，已删除死代码。
- `src/features/shared/FloatingToolPanel.tsx` 的 `restoreTriggerFocus` 已改为 `useCallback` 并加入 effect 依赖，消除本次新增的 Hook warning。
- 已通过：定向 Prettier、`npm run lint`（仅保留 Gen3 Egg/Wild 的两条既有 TanStack Virtual warning）和 `git diff --check`。未运行 typecheck、测试、构建或浏览器验收。

## 2026-08-13 Actions typecheck 修复

- Actions `npm run verify` 的 Prettier 和 ESLint 已通过；TypeScript 阻断位置为 `src/features/gen4wild/worker/gen4wild.worker.ts`，Generator/Searcher 共用的 chunk 联合类型无法直接读取 Generator 专属的 `initialAdvances` 与 `maxAdvances`。
- 已在 Generator 分支对 `message.chunk` 显式收窄为 `Gen4WildChunk`，保留 Searcher 原请求路径和既有 75-word Wasm 请求 ABI，不改变算法或边界校验。
- 本轮已运行：`npm run format:files -- src/features/gen4wild/worker/gen4wild.worker.ts docs/progress.md`、`npm run format:check`、`npm run typecheck` 和 `git diff --check`。`typecheck` 与 `git diff --check` 已通过；全仓 `format:check` 仍被基线中 89 个未格式化文件阻断，未扩大格式化范围。ESLint 仅保留 Egg/Wild 的两条既有 TanStack Virtual warning；未运行测试、构建、Wasm、浏览器验收或部署。

## 2026-08-13 本地 Verify 与 PWA 预缓存

- 附件对应的 Actions run 中格式、ESLint、TypeScript 和 28 个 Vitest 文件共 103 项测试均通过；其 `vite build` 已生成资源，但 PWA 在 Workbox 预缓存阶段因默认 2 MiB 上限拒绝 `index` 约 5.28 MiB 和 `gen4wild.worker` 约 3.65 MiB，命令最终失败。本机复跑时 Node `24.13.0` / npm `11.6.2` 未满足 Node `24.19.0` / npm `12.0.2` 锁定版本，且本地基线有 88 个全仓格式差异，因此完整 `npm run verify` 在格式阶段停止；后续 Lint、TypeScript、103 项测试和非受限 `npm run build:web` 已分项通过。
- 已将 `vite.config.ts` 的 `workbox.maximumFileSizeToCacheInBytes` 显式设置为 8 MiB，覆盖当前构建资源并保留 PWA 预缓存错误的可见性；未忽略 Workbox 错误或只保留前半段构建结果。
- 已将 SOP 更新为：提交或请求审查前必须在当前工作区运行完整 `npm run verify`；遇到 Workbox 资源上限时检查 `dist` 实际大小、调整上限或拆分资源后从头复跑，并记录命令结果。

## 2026-08-13 Contributions

- 新增全局只读 Contributions 面板，从右下角工具栏打开，并复用现有悬浮面板的互斥、点外关闭、`Escape` 和焦点恢复逻辑；不占用按世代划分的 RNG 模块侧栏。
- 首条记录为 Jeff 贡献 `¥50 RMB`，用途为 `AI Token`；记录使用独立结构化数据，后续可以继续追加，不包含支付、账号、后端或在线编辑能力。
- 桌面端面板从工具栏左侧打开，窄屏从工具栏上方打开；金额汇总由当前记录计算，不新增运行时依赖。

## 2026-08-13 宝可病毒侧栏归位

- 宝可病毒查询的第三世代和第四世代入口已分别归入 `GEN III` 与 `GEN IV` 主分组，移除临时的 `GEN III TOOLS` / `GEN IV TOOLS` 分组；模块编号统一为 Gen III `01-10`、Gen IV `11-13`、Gen VII `14`。
- 两个入口使用独立的初始模式和 active 状态：第三世代默认打开 Gen III，第四世代默认打开 Pt/HGSS；面板和简体中文规则统一显示“宝可病毒”。上游代码目录、Wasm API 和法律记录仍保留 `pokerusfinder` 原名。
- 本轮涉及文件的定向 Prettier 检查与 `git diff --check` 已通过；全仓 `npm run format:check` 仍被前端 Skill、Gen4 Wild 和其他既有文件共 95 个未格式化文件阻断，未擅自扩大格式化范围。
- 冲突标记已从源码和文档工作树清除，但当前环境无法写入 `.git/index`，因此未能由 Codex 将 resolved 状态写入索引；未提交、未 push、未部署。

## 2026-08-13 UI 视觉与侧栏优化

- 已将最新 HakuStyle 同步到 `.agents/skills/web-frontend-style/`，包含最新执行规则、Ant Neutral / Royal Blueprint 配色参考、31 组来源蒸馏记录和 Skill 校验脚本。
- UI 方向确定为冷色中性工作台：以 Ant Neutral 为基础，使用 Royal Blueprint 冷蓝作为品牌强调；红色、金色和青色仅保留给错误、警告、选择和状态语义。
- 重做 `src/styles.css` 的全局 Token、顶部栏、工作面板、侧栏、按钮和浮动工具材质；卡片保持高可读实色表面，玻璃效果只用于顶部栏和侧栏的辅助层。
- 左侧模块导航改为“固定标题区 + 独立滚动模块区 + 固定底部状态区”。桌面端侧栏固定在顶部栏下方并为主内容预留宽度，移动端改为带遮罩的抽屉，避免模块数量增加后点击目标被裁切或底部状态消失。
- 主题切换支持 View Transition 点击位置扩散动画；模块切换增加渐进式内容进入，按钮、侧栏和面板使用短时状态动效，并保留 `prefers-reduced-motion` 回退。
- `src/App.tsx` 与 `src/theme.ts` 只调整 UI 状态和主题表现；RNG 算法、Wasm、Worker、输入边界、存档和翻译未改变。
- 已通过：定向 Prettier 格式化、`npm run format:check`、`git diff --check`、项目内 HakuStyle Skill 校验。
- 未运行：ESLint、TypeScript、Vitest、Web/Wasm 构建、浏览器 UI 或生产回归；按仓库规则，这些检查需要项目所有者对具体命令或 URL 明确授权。
- 提交前静态复核移除了页面背景的径向装饰渐变，并将工作面板圆角收敛到 `8px`，保持工具界面的信息密度与仓库前端约束。

## 当前状态

- 新增 `pokerusfinder`：基于 DevonStudios Pokerus Finder revision `262262fdb259c44a6a366b5c0dbf1bb319e39ff4`，提供 Gen III、Gen IV DP、Gen IV PtHGSS 三种模式；新增 Wasm bridge、Dedicated Worker、Worker Pool、预览引擎、面板、模块文档和许可证记录。
- 上游核对确认：Gen III/DP 使用 16 位十六进制 Initial Seed、7 位 Frame、3 位 Delay；Gen III 最大扫描 9,999,999 帧，DP 最大 99,999 帧；Pt/HGSS 使用 2000-01-01..2099-12-31 日期、00..23 小时、00..59 分钟，并保留 -1400..-1000 的内部 Delay 搜索。
- 本轮未运行 lint、typecheck、Vitest、原生夹具、Wasm/Web 构建、浏览器或生产算法回归；仅需执行定向格式化、`npm run format:check` 与 `git diff --check`。下一步先取得项目所有者对具体检查命令和部署 URL 的授权。
- 上游交互复核补充：Gen III Initial Seed 为 4 位十六进制，DP 为 8 位十六进制；DP Frame 在上游界面固定为 1 且不可编辑；Pt/HGSS 默认日期来自当前日期。结果 Seed 保留上游不补前导零的显示语义（Pt/HGSS 的 8 位 Initial Seed 除外）。`uint i - short delay` 按 C# 二元数值提升为有符号 `long`，Wasm bridge 已使用 `int64_t` 对齐，Delay 前的帧不会误报。

- 第七世代落地：优先实现 `gen7id`，对应 3DSRNGTool `Search7_ID()` 的 SFMT ID Generator；Stationary/Wild/Egg/Timeline 暂列后续开发。
- 本轮新增 `gen7id` 源码、Worker、C ABI、CMake target、模块文档和 `GEN VII` 侧栏入口；当前尚未执行测试、构建或浏览器验收。
- 第七世代来源决策：以本地优化项目 `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN` 的 `359bdd7` 为主源，公开 `wwwwwwzx/3DSRNGTool` 的 `ae5d176` 仅作祖先归属；两者差异不止 README，已记录于 `third_party/3dsrngtool/UPSTREAM.md`。
- `gen7id` 接线补全：加入 Sun/Moon/Ultra Sun/Ultra Moon 版本与起始帧校验、TID/SID/Gen7TID 前导零筛选、Gen7TID bridge 修正、虚拟化结果表、Worker 批次校验和第七世代页面隐藏存档工具；仍未执行测试、构建或浏览器验收。
- 本地控件核验：Designer 的 `Frame_max` 初值上限是 `100000000`，但 `MainForm.cs` 初始化会用 `FuncUtil.MAXFRAME` 覆盖 `Frame_min`/`Frame_max`，实际有效上限为 `1000000000`；已同步 domain、HTML 输入和模块文档。
- 本轮已执行并通过定向 `npm run format:files -- ...`、全仓 `npm run format:check` 与 `git diff --check`。未运行 lint、typecheck、Vitest、原生夹具、Wasm/Web 构建、UI 预览、浏览器或生产算法回归；这些检查需要项目所有者对具体命令或 URL 明确授权。

- 新增 `gen3ngcseed`：PokeFinder `GameCube Seed Finder` 的 Gales/XD、Colo/竞技场与 Channel/频道三种查询，接入 GEN III 左侧导航。
- Gales/Colo 支持多轮候选筛选；第一次搜索按上游通过 Yes/No 询问是否选择对应 `.precalc`，决定保留到模块关闭。文件按上游 25/24 个小端分区读取，并流式校验 Qt ISO 3309 CRC `0xD75B / 0x097B`；文件不上传、不持久化。
- 新增独立 C++/Emscripten C ABI、Dedicated Worker、Worker Pool、API v1、消息协议、UI 预览引擎、TypeScript 边界测试与原生非法输入夹具。NGC 阶段默认 Wasm 构建列表由 8 个增加为 9 个；Gen7 ID 阶段再增加为 10 个。
- Gales/Colo 首轮按低 16 位分片，Channel 精确覆盖 `0x40000001..0xFFFFFFFE`，候选数组按 50,000 个 Seed 分片；Worker 校验 domain、任务、分片和结果数量，Pool 按 `chunkIndex` 恢复确定顺序并支持取消。
- 记录 PokeFinder 4.3.2 Gales 首轮的上游越界：`enemyHPStat[enemyIndex + 5]` 超出 5 行数组。本项目使用有效的 `enemyHPStat[enemyIndex]`，待生产页面与 PokeFinder 实际结果共同回归，当前不标记为算法已验收。
- HP 控件保持上游空值语义：非空输入为 `1..714`，空白搜索时按 `0` 读取；Channel 少于 10 条时由 Search 动作显示上游 `You must have at least 10 entries`。
- 简中逐字使用 `NGC Seed查询`、`XD`、`竞技场`、`频道` 等已完成上游词条；`Round #%1`、四个 HP、Precalc、Channel 数量提示与复制词条 unfinished，因此保留英文。结果 Seed 与上游一致使用大写十六进制且不补前导零。
- 本轮使用 HakuStyle 保持现有紧凑工作台、三页签、稳定三列设置网格、移动端单列与结果表样式；三个页签分别保留轮次、结果和状态，切换时不互相清空；未新增运行时依赖。
- 本轮已通过 `npm run format:changed`、`npm run format:check` 与 `git diff --check`。未运行 ESLint、TypeScript、Vitest、原生夹具、Wasm/Web 构建、UI 预览、浏览器或生产算法回归；仓库规则要求项目所有者对具体检查或 URL 明确授权。

- 合并保留 `gen4wild` 的 DPPt/HGSS Wild Generator/Searcher、遭遇数据、独立 Wasm/Worker Pool、固定夹具和模块文档；其固定来源、输入边界和未验收状态继续以本节后续记录为准。

- 本轮修复 Initial Seed Finder 虚拟结果表首行偏移：行定位补齐 `top: 0`，并将“结果表第一条不得出现虚假空行”写入 `docs/ai-development.md` 的 UI 回归规则；Static、Wild、Egg 和 Gen4 Static 仍使用已核对的 `translateY(start + 38px)` 表头偏移。
- 本轮移除 Seed to Time 的两列进制辅助文本、IVs to PID 的 TID 辅助文本、Egg 设置标题右侧的存档版本标签和 Spinda Painter 的 `HEX / 32-bit` 文本。它们不是对应 PokeFinder UI 的独立控件或信息，今后不得擅自添加；规则已写入 UI 回归规则。
- 本轮将个体值计算器合并为唯一全局浮层 `IvCalculator`，由工具自身选择 Gen III、Platinum、HGSS、BW2、SwSh、BDSP 六个上游数据集；移除未再使用的 `src/features/ivcalculator/Gen3IvCalculator.tsx`，保留 G4 Static 的兼容 Personal 导出。
- 本轮将侧栏模块分为 `GEN III` 与 `GEN IV` 两组，Encounter Lookup 与 IV Calculator 仍保持右下角全局入口，不随当前工作区限代。Egg 的 Emerald/RS/FRLG 切换仍是上游模块本身的真实功能，不再在标题区域重复显示版本。
- 本轮已运行定向 `npm run format:files -- ...`、全仓 `npm run format:check` 与 `git diff --check`，均通过；未获项目所有者对 lint、typecheck、测试、构建或浏览器 URL 的新授权，因此这些检查和部署回归未运行。

- 2026-08-13 经项目所有者授权，使用外部 Chrome 检查 `https://haku76.github.io/PokeRNGKit/` 当前生产资源 `index-mLBsBTQF.js`。桌面视口为 `1536×703` 时，旧版三个收起工具宽度分别为 `128/176/128px`；在 `390×844` 窄屏打开 Encounter Lookup 后，旧面板实际宽 `760px`、左边界为负值，依靠页面裁切显示，不是稳定的窄屏面板布局。
- 当前生产包的 Encounter Lookup 宝可梦组合框已确认支持鼠标按钮展开、点击选择、输入筛选与方向键/Enter；固定抽样继续符合记录：Emerald 皮卡丘为狩猎地带地区 1/2 草丛 `25-27`，Diamond 与 Brilliant Diamond 为自豪的后院草丛 `18-18`，Black 为空集。页面未记录站点自身的 console error；唯一错误来自用户浏览器中的第三方翻译扩展。
- 本轮只补验进度文档此前未覆盖的生产功能：Seed to Time 的 `0 / 2000` 返回 7 条、首末时间匹配上游，`40000000` 回推为 `1AA5 / 66861`；Spinda PID `FEDCBA98` 的四斑点坐标匹配固定夹具，第一斑点右移后 PID 为 `FEDCBA99`；G4 Static Method 1 / Manaphy / Seed `0` / `0..9` 返回 10 条，首条 PID `E97E0000`、IV `17/19/20/13/12/16`。已记录通过的 G3 ID、Static/Wild、IVs to PID 和 Egg 未重复执行。
- 生产页语言已验证中文切换到英文并恢复，主题已验证浅色切到深色再恢复；G4 存档、IV Calculator 和 Encounter Lookup 依次展开时保持三方互斥。当前旧悬浮样式的面板级 `Escape` 仍失败，该项由本轮源码修复并等待部署复验。
- 生产旧悬浮工具只支持点外关闭，不支持面板级 `Escape`，并且触发器与面板共用边框形成相连结构。本轮使用 HakuStyle 重构为统一工具轨：三个等尺寸按钮固定在右下角，桌面独立面板从工具轨左侧打开，窄屏从上方打开；补齐互斥、点外关闭、`Escape`、显式关闭按钮、`aria-expanded` / `aria-controls`、安全区边距与焦点恢复。
- 新增共享 `src/features/shared/FloatingToolPanel.tsx`，G3/G4 存档、G3/G4 IV Calculator 和 Encounter Lookup 只复用浮层行为；模块内部状态、IndexedDB/localStorage 数据键、G3/G4 展开偏好和算法均未改变，也没有新增运行时依赖。
- 按 PokeFinder 原交互补验时发现生产 G4 IV Calculator 的宝可梦仍是原生 `<select>`；上游 `Form/Util/IVCalculator.cpp` 同样调用 `ComboBox::enableAutoComplete()`。本轮将 G4 物种选择改为共享 `AutoCompleteComboBox`，保留物种 ID、形态归零和结果清除逻辑，待部署后复验鼠标与键盘候选选择。
- 本轮已运行定向 `npm run format:files -- ...`、全仓 `npm run format:check` 与 `git diff --check`。未运行 ESLint、TypeScript、Vitest、本地 UI、Web/Wasm 构建或本地浏览器预览；当前授权用于指定生产 URL 的验收与 UI 改造，不把未部署源码宣称为已验收。

- 新增仓库级 `.agents/skills/web-frontend-style/`，包含 HakuStyle 的 `SKILL.md`、`agents/openai.yaml` 与 24 组前端蒸馏来源；`AGENTS.md` 和 `docs/ai-development.md` 已把它列为前端视觉与交互工作的规则入口。
- 首轮样式方向确定为“宝可梦图鉴 / JRPG 数据终端”：保留现有高密度工具结构，使用红色品牌状态、青色信息状态、金色选择状态、深色顶部栏和模块抽屉，不复制第三方角色、卡牌纹理、字体或光标素材。
- 重构 `src/styles.css` 的浅色/深色 token，并统一顶部栏、模块抽屉、页面标题、工作面板、表单控件、操作按钮、结果表、自动完成菜单、悬浮工具和页脚材质。
- 响应式继续沿用现有组件和断点；窄屏补充品牌文本裁切、主内容安全边距和纵向操作按钮，reduced-motion 覆盖新增的侧栏与按钮位移动效。
- 本轮不改变 React 结构、RNG 算法、Wasm/Worker、输入范围、持久化、翻译或模块状态，也没有新增运行时依赖。
- 已通过：`npm run format:check`、`git diff --check`，以及 Skill Creator 对 `.agents/skills/web-frontend-style/` 的结构校验。
- 未运行：浏览器 UI、ESLint、TypeScript、Vitest、Web/Wasm 构建和算法回归。仓库规则要求先取得项目所有者对具体检查或 URL 的明确授权；UI 验证还必须使用已连接的外部 Chrome 或 Edge。

- Actions run `31621404322` 的 Prettier 已通过，ESLint 报告 9 个 error：`scripts/format-changed.mjs` 缺少 `URL`、`process`、`console` 的 Node 运行时声明，`Gen3SeedToTimeUiPreviewEngine.ts` 的 `_options` 未使用。Egg/Wild 的两条 TanStack Virtual 报告仍是既有非阻断 warning。
- 修复 `format-changed.mjs`：从 Node 内置模块显式导入 `process` 与 `URL`，并使用 `process.stdout.write` 输出空文件集提示；不放宽全仓 `no-undef`。
- 修复 Seed to Time UI 预览：读取 `options.signal?.aborted`，预先取消时返回空结果和 `cancelled: true`；生产 Wasm、Worker 和算法不变。
- 已通过：非受限环境运行 `npm run verify`。Prettier、ESLint、TypeScript、23 个 Vitest 文件共 81 项测试、Vite 生产构建与 PWA 预缓存均成功；ESLint 只保留 Egg/Wild 的两条既有 TanStack Virtual warning，Vite 只保留主包超过 500 kB 的非阻断 warning。
- 受限终端首次运行同一命令时，Vite 复制 `public/wasm/gen3egg.mjs` 到 `dist/wasm` 返回 Windows `EPERM`；非受限环境随后完整通过，确认该失败不是源码或 GitHub Actions 问题。
- Actions run `31581467290`（#25）与 `31614337208`（#30）均在 `Verify TypeScript application -> prettier --check .` 失败，分别报告 4 个和 13 个未格式化文件；两次都不是算法、Wasm 或 TypeScript 编译错误。
- 原 SOP 只在未获测试/构建授权时执行 `git diff --check`，无法发现 Prettier 排版差异；同时 Actions 在格式检查前先安装 Emscripten，#30 为必然失败的提交额外消耗约 34 秒。
- 新增 `npm run format:files -- <file...>` 与 `npm run format:changed`。格式化改为每批编辑后的强制机械收尾，不需要测试/构建授权；工作区存在无关改动时必须限定到本任务文件。
- Actions 改为 npm 安装后先运行完整 `npm run verify`，通过后才安装和缓存 Emscripten、检查 Wasm 工具链并运行原生/Wasm 构建。
- 已执行并通过：对 #30 日志中的 13 个文件运行定向 `npm run format:files -- ...`，随后运行新版 `npm run format:changed`、全仓 `npm run format:check` 与 `git diff --check`。新版脚本会对 Git 改动文件先写入再只读复查。
- 未运行：ESLint、TypeScript 类型检查、Vitest、Web/Wasm 构建、原生夹具、浏览器 UI 或生产回归；本轮授权范围仅为 Actions 日志诊断和格式/SOP 修复。

- 主分支已包含自动完成控件、三代悬浮工具互斥、`gen3seedtotime`、`gen3spindapainter` 与格式化/Actions SOP；本次合并保留这些修改。
- 当前模块集合：`gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3ngcseed`、`gen3spindapainter`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`、`gen4wild`、G3/G4 独立 `profiles`、全局 `ivcalculator` 与 `encounterlookup`。
- 主分支此前新增 `encounterlookup`：右下角默认收起的全世代 Encounter Lookup，覆盖 PokeFinder 4.3.2 的 Gen III、Gen IV、Gen V 和 BDSP 共 16 个版本；静态数据由 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 生成。
- 遇敌查询不进入左侧 RNG 导航，不使用 Wasm/Worker；宝可梦候选、游戏版本、地点、遇敌种类和等级范围均来自本地静态数据。
- 已清理生成用 `.tmp-encounter-tables/` 与 `.tmp-encounter-tables.zip`；生成脚本和正式 `data.ts` 保留在工作区。
- 主分支此前新增 `AutoCompleteComboBox`，覆盖 Encounter Lookup 宝可梦、IV Calculator 宝可梦、Egg 蛋种类和 Wild 地点。行为对应 PokeFinder `enableAutoComplete()`：点击展开、包含匹配、弹出候选、方向键/Enter/Escape 和 `NoInsert`。
- 主分支此前将 G3 存档信息、个体值计算器和遇敌查询纳入同一展开状态；本次合并把相同互斥规则扩展到 G4 工具，并保留两代各自的 localStorage 展开偏好。
- 本次合并新增 `gen4static` 和独立 G4 存档；个体值计算器已合并为全局单一入口。Encounter Lookup 在两代页面共用，当前页面的存档、个体值计算器和遇敌查询保持三方互斥。
- RNG Wasm 默认构建列表为 `gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3ngcseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`、`gen4wild`，共 10 个。
- 正式 Wasm、站点产物和 Pages 部署由 GitHub Actions 生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 本次合并已运行 `npm run format:changed`、定向 `npm run format:files -- ...`、`npm run format:check` 与 `git diff --check`；最终全仓格式和空白检查通过，未发现残留冲突标记。

## 第四世代定点乱数

- 增加 Diamond、Pearl、Platinum、HeartGold、SoulSilver 的 Static Generator/Searcher。
- 支持 Method 1、Method J、Method K、Synchronize 和 Cute Charm。
- 内置 99 条 Starters、Fossils、Gifts、Game Corner、Stationary、Legends、Events、Roamers 模板。
- Generator 与 Searcher 沿用 G3 Static 的三栏布局、IV 表格快捷操作、筛选交互、排序、CSV 和虚拟结果表风格，但使用独立请求、Worker 和 Wasm 模块。
- Generator 的 `Max Advances=N` 按 PokeFinder 上游语义包含起点，处理 `N+1` 个状态。
- Searcher 按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 的闭区间笛卡尔积枚举 IV。
- 六项 IV 默认最小 `0`、最大 `31`；术语固定为“觉醒力量”“觉醒属性”“觉醒威力”。
- 结果表使用固定列宽；Generator 首列为 Advances，Searcher 首列为 Seed。
- 宝可梦下拉与 G3 Static 一致，只显示本地化宝可梦名称，不附加地点或“定点”后缀。

## 独立 G4 工具

- 增加独立第四世代存档 schema、IndexedDB/localStorage 键、导入导出和 HGSS 未知图腾字段。
- 增加全局个体值计算器，使用 PokeFinder Gen III、Platinum、HGSS、BW2、SwSh 和 BDSP 六个数据集。
- G4 控件不读取、覆盖或删除 G3 存档；个体值计算器不再保存或读取按世代拆分的展开状态。
- Encounter Lookup 在两代页面均保留；G4 存档、全局个体值计算器和 Encounter Lookup 使用与 G3 相同的三方互斥规则。

## Wasm 与 Worker

- `gen3id`：第三世代 ID Generator/Searcher。
- `gen3initialseed`：第三世代 Initial Seed 反推。
- `gen3seedtotime`：第三世代 Seed 到日期时间查询。
- `gen3ngcseed`：第三世代 GameCube Seed Finder，覆盖 Gales、Colo 与 Channel。
- `gen3spindapainter`：第三世代晃晃斑的斑点 PID/坐标双向工具。
- `gen3static`：第三世代定点 Generator/Searcher。
- `gen3wild`：第三世代野生 Generator/Searcher、地点选择、完整筛选、Worker Pool、CSV、UI 预览与真实 Wasm 运行。
- `gen3ivtopid`：第三世代 IVs to PID 查询。
- `gen3egg`：第三世代 Egg Generator。
- `gen4static`：第四世代 Static Generator/Searcher。
- `gen4wild`：第四世代 Wild Generator/Searcher、特殊遭遇数据、Worker Pool、CSV、UI 预览与 Wasm 运行时。
- `profiles`、`ivcalculator`：G3/G4 独立存档与全局个体值计算器。
- `encounterlookup`：右下角遇敌查询悬浮工具，覆盖 PokeFinder 4.3.2 实际支持的 16 个游戏版本。
- 增加 `gen4static` Wasm API v1、C ABI、原生夹具、Dedicated Worker、Generator/Searcher Worker Pool 和消息协议。
- 增加 `gen4wild` Wasm API v1、固定宽度 C ABI、原生夹具、Dedicated Worker、Generator/Searcher Worker Pool 和消息协议。
- 修复 MSVC 参数求值顺序造成的 IV word 对调：先顺序读取 `iv1`、`iv2`，再解码六项 IV。
- Worker 校验模块、契约和 API 版本，按 `chunkIndex` 恢复确定顺序；取消会终止并重建独立 Worker。
- 默认 Wasm 构建列表同时包含 `gen3seedtotime`、`gen4static` 与 `gen4wild`。

## 来源与参考

- PokeFinder 4.3.2 revision：`dd00fe7`，作为控件、算法语义、模板规则和固定结果的权威基线。
- EncounterTableGenerator Gen4 revision：`9a2ed62`，用于生成第四世代定点模板与 Wild 遭遇数据。
- PokemonRNGGuides revision：`c0b2bb664f04a4ef052e6dd4d831351703fa4047`；用于交叉核对 Static 的 Rust 分层和 React 工作台流程。该 revision 没有第四世代 Wild 实现，不作为 G4 Wild 算法或数据来源。
- PokeRNGKit 不复制或编译 PokemonRNGGuides 源码；两个参考发生差异时以 PokeFinder 4.3.2 为准。
- 完整来源范围和许可证记录见 [`third_party/pokefinder/UPSTREAM.md`](../third_party/pokefinder/UPSTREAM.md)。

## PR 分支历史验证

- 以下结果来自合并头 `fc31966` 所在 PR 分支，不能替代本次合并结果的重新检查。
- PR 分支已通过可格式化变更文件的 Prettier 检查。
- 已通过 TypeScript project build。
- 已通过 Vitest：21 个测试文件、74 项测试。
- 已通过 ESLint：0 错误；保留上游 Egg/Wild 的 2 条 TanStack Virtual / React Compiler 非阻断 warning。
- 已通过 UI 构建和生产 Web 构建；构建产物包含 7 个 Worker 入口。
- 已通过 7/7 原生夹具：6 个 Gen III 模块与 `gen4static_native_parity`。
- 已使用 Emscripten 6.0.6 构建 7 个真实 Wasm 模块：`gen3id`、`gen3initialseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`。
- 已通过 `git diff --check`。
- PR 分支本地开发站点曾运行于 `http://127.0.0.1:5182/`；当时核对的源码中 G4 宝可梦下拉只渲染 `getGen4SpeciesName(...)`，不再拼接模板 `label`。
- 浏览器自动化运行时在当前中文工作区路径初始化失败，因此本轮未重新记录完整桌面/移动端截图；rebase 前的真实 Chrome/Worker/Wasm、列对齐与移动端证据保留为历史参考，部署页面仍需最终验收。

## 下一步

1. 项目所有者明确授权后，在当前 `main` 基线运行 `npm run verify`、`npm run wasm:test:native` 与 `npm run wasm:build`。
2. GitHub Actions 完成部署后，项目所有者提供准确生产 URL 并授权第三世代算法回归。
3. 使用外部 Chrome/Edge 完成第三世代桌面/移动端交互、取消、导出、持久化、PWA 与最终验收记录。

## 已知限制

- 当前分支：`main`，HEAD `613e7d8 feat: 实现第八世代 ID 乱数`，任务开始时与 `origin/main` 对齐。
- 第三世代模块虽然已经实现，但当前 HEAD 的完整 Wasm 构建、生产页面算法回归和项目所有者最终验收仍不能由历史模块完成状态替代。
- GitHub Pages 是当前测试目标；Cloudflare Pages 与 `hakuhiro.top` 留到 Pages 验收后配置。

## 4. 已进入 Git 基线

- 工程基础：React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语；npm 是唯一包管理器。
- 构建基线：Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2`。
- 法律边界：GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 已有模块：`gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3ngcseed`、`gen3spindapainter`、`gen3static` Generator/Searcher、`gen3wild` Generator/Searcher、`gen3ivtopid`、`gen3egg`、`gen4static`、工作区 `gen4wild`、G3/G4 独立存档信息、全局个体值计算器，以及 `encounterlookup`。
- UI 基础：默认收起的模块抽屉、全局存档悬浮窗、浅色/深色主题和系统默认字体。

## 5. 验证状态

### 5.1 已部署算法回归

- 经项目所有者授权，使用外部 Chrome 在 `https://haku76.github.io/PokeRNGKit/` 回归当前生产资源 `index-DC2qWhx2.js`；页面控制台未记录站点错误。
- 已通过 Static Generator：`12345678 / 0` 的 Method 1 为 PID `84EA0B71`、IV `10/12/22/7/29/0`，Method 4 为 PID `84EA0B71`、IV `10/12/22/20/9/4`。
- 已通过 Wild Generator：Emerald Route 111 Grass、Seed `1C71C71C`、`0..9` 返回 10 条；首条为 Slot `3`、Trapinch、Lv.21、PID `3C5ACFFA`、IV `12/31/4/27/8/20`、Nature `17`。Wild Searcher 全 31 IV 夹具计数为 Method 1/None `20`、Method 2/Synchronize `54`、Method 4/Cute Charm F `4`。
- 已通过 IVs to PID：零 IV 为 Channel / PID `56654838` / Seed `DC2DA271` / SID `48333`；满 IV 为 Method 2 / PID `36E6808A` / Seed `02B0100B` / SID `8832`。
- 已通过 Egg：Emerald `EBred`（亲代 B 为 Everstone）返回 50 条，首条 Advances `4294967278`、PID `F0425272`、IV `31/31/0/31/26/30`；Ruby Split 的两个 Seed `0000` 返回 60 条，首条 PID `0000E97F`、IV `30/11/31/31/31/16`。
- 延用既有生产证据：ID Searcher 的 `48163 / 64377` 对应 `05A0 / 0`、`C19B / 36724`；XD/Colo、Initial Seed Finder 与 Static Searcher 的已记录固定夹具均通过。

### 5.2 基线工程验证

- 已通过：2026-08-12 运行 `npm run verify`。Prettier、ESLint、`tsc -b`、16 个 Vitest 文件共 57 项测试、Vite 生产构建与 PWA 预缓存均已完成；ESLint 仅保留 `Gen3EggPanel.tsx`、`Gen3WildPanel.tsx` 的两条既有 TanStack Virtual / React Compiler warning。此证据早于本轮 `gen3spindapainter`，不能代替其工程检查。
- 已通过：在 Visual Studio 2026 Build Tools x64 开发环境中运行 `npm run wasm:test:native`，6/6 原生 Core 夹具通过。
- 历史已通过：在用户级 emsdk `6.0.6` 环境中运行 `npm run wasm:doctor` 与 `npm run build`，当时六个 Gen III Wasm 模块、Vite 生产站点和 PWA 预缓存均成功生成。新增 `gen3seedtotime` 后需重新运行构建，不能沿用该历史证据宣称七个模块已通过。
- 受限终端首次复制 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一授权的 `npm run verify` 随后成功，确认该失败是受限文件访问环境，不是构建或源码错误。

### 5.3 遇敌查询本轮检查

- 已完成：源码、生成数据结构、上游 16 个版本、世代图鉴上限、翻译词条与悬浮工具状态的静态审查。
- 已确认：生成数据包含 16 个游戏键，等级范围未发现反向值或超过 100 的记录；该结论来自生成阶段的静态数据检查，不是测试或浏览器验收。
- 已通过：`npm run verify`，其中 Encounter Lookup 域测试覆盖 16 游戏键、四种图鉴上限和非法物种边界。
- 已通过：本地 UI 模式的 Encounter Lookup 输入 `皮卡丘` 后可选中候选并返回 Emerald Safari Zone Area 1/2 草丛 `25-27`；IV Calculator 输入同一物种可由候选列表和方向键/Enter 选择；Wild 地点输入 `111` 可选择 Route 111 并联动更新物种列表；Egg 蛋种类自动完成已按同一上游调用路径复核。
- 已通过：本地三语切换为中文、英文、日文；浅深主题切换为 `light -> dark -> light`；档案、IV Calculator 和 Encounter Lookup 依次展开时另外两项均收起。
- 已通过：生产 Encounter Lookup 的皮卡丘抽样。Emerald 返回 Safari Zone Area 1/2 草丛 `25-27`；Diamond 和 Brilliant Diamond 返回 Trophy Garden 草丛 `18-18`；Black 返回空集。生产包仍使用原生 `datalist`，通过方向键/Enter 可提交当前候选，但点击候选 popup 无法可靠验收。
- 已通过：生产 IV Calculator 新增/删除行可逆；妙蛙种子、Lv.100、勤奋、`231/134/134/166/166/126` 精确返回六项 `31`，下一级均为 `100`。
- 待部署复验：当前生产页的语言和主题按钮在本轮 Chrome 自动化中没有改变状态，而本地当前源码可正常切换；三浮窗也仍可同时展开。当前 Pages 包未包含本轮修复，不能作为本轮交互验收。
- 未运行：移动视口、离线/PWA、性能与取消延迟；这些需要新部署后由项目所有者共同完成。

## 6. 已知风险与边界

- `gen4id` 已实现并通过原生夹具与工程检查；`gen4wild` 的完整 Wasm 和部署验证仍待完成。
- `gen3egg` 当前只实现 Egg Generator；Egg Searcher、Masuda 和第四世代孵化规则不在范围内。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要在 Pages 实测后降低 Worker 数。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；Worker API 握手会拒绝版本不一致，但更新体验仍需在部署后验证。
- Wild 遭遇数据的 Tanoby Chamber form 数据仍待后续处理；本轮 `encounterlookup` 已锁定 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 并生成 16 个版本的静态查询数据。
- 公开部署 Wasm 时必须向用户提供对应完整源码、构建脚本和 GPL 许可材料。

## 7. 新环境恢复

以下命令仅在项目所有者对具体范围授权后执行：

```bash
git status --short --branch
git log -5 --oneline
npm ci --engine-strict
npm run verify
npm run wasm:test:native
npm run wasm:build
```

## 8. UI 高度与滚动收敛（2026-08-22）

- 已完成：共享表单面板取消固定最小高度，结果表格与静态/个体值结果区改为按视口高度的 `clamp()` 自适应。
- 已完成：Gen IV/V/VI/VII/VIII 高频结果面板、研究工具与地图面板收敛固定高度；窄屏不再使用 480/520/560/620/700px 的结果区硬编码。
- 已完成：浮动工具面板统一由最后一个内容根节点承担滚动，避免切换面板时多个直接子节点分别出现或消失滚动条；保留稳定滚动槽。
- 已完成：杂项乱数工具改为受限自适应两列，最大宽度 480px，避免输入控件和浮窗空白过宽。
- 待人工验收：当前未连接外部 Chrome/Edge，桌面与移动端实际视觉、下拉层完整显示和最终 UI 接受仍需项目所有者在部署页面确认。

## 维护规则

- 每个功能、依赖、工具链、构建、部署或阻塞状态变化后更新本文。
- 验证结果必须区分历史证据、本轮工程检查、部署页面回归和项目所有者最终验收。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core、测试和翻译文件。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。

# Progress Update

- Gen III workflow refinement: added target PID plus star/square shiny filtering to the ID Generator, visible/right-click PID actions in Static Searcher results, the emulator-only Emerald Target Painting Timer with decimal calibration default `30`, and a global Emerald 6V shiny workflow Tips panel. No real-console Painting Reseeding or Battle Video flow is included.
