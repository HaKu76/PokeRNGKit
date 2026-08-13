# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-13
> - 当前分支：`main`
> - Git 基线：`b2c6ade feat: 统一悬浮工具面板交互`
> - 当前阶段：回归修正模块布局、全局工具入口与侧栏世代分组
> - 工作区状态：本轮 UI、全局个体值计算器和文档修改尚未提交；Codex 不提交、不 push、不部署
> - 验收状态：当前生产页 UI 与遇敌查询抽样已记录；新悬浮交互待部署后共同验收

## 当前状态

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
- 当前模块集合：`gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3spindapainter`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`、G3/G4 独立 `profiles`、全局 `ivcalculator` 与 `encounterlookup`。
- 主分支此前新增 `encounterlookup`：右下角默认收起的全世代 Encounter Lookup，覆盖 PokeFinder 4.3.2 的 Gen III、Gen IV、Gen V 和 BDSP 共 16 个版本；静态数据由 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 生成。
- 遇敌查询不进入左侧 RNG 导航，不使用 Wasm/Worker；宝可梦候选、游戏版本、地点、遇敌种类和等级范围均来自本地静态数据。
- 已清理生成用 `.tmp-encounter-tables/` 与 `.tmp-encounter-tables.zip`；生成脚本和正式 `data.ts` 保留在工作区。
- 主分支此前新增 `AutoCompleteComboBox`，覆盖 Encounter Lookup 宝可梦、IV Calculator 宝可梦、Egg 蛋种类和 Wild 地点。行为对应 PokeFinder `enableAutoComplete()`：点击展开、包含匹配、弹出候选、方向键/Enter/Escape 和 `NoInsert`。
- 主分支此前将 G3 存档信息、个体值计算器和遇敌查询纳入同一展开状态；本次合并把相同互斥规则扩展到 G4 工具，并保留两代各自的 localStorage 展开偏好。
- 本次合并新增 `gen4static` 和独立 G4 存档；个体值计算器已合并为全局单一入口。Encounter Lookup 在两代页面共用，当前页面的存档、个体值计算器和遇敌查询保持三方互斥。
- RNG Wasm 默认构建列表为 `gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`，共 8 个。
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
- `gen3spindapainter`：第三世代晃晃斑的斑点 PID/坐标双向工具。
- `gen3static`：第三世代定点 Generator/Searcher。
- `gen3wild`：第三世代野生 Generator/Searcher、地点选择、完整筛选、Worker Pool、CSV、UI 预览与真实 Wasm 运行。
- `gen3ivtopid`：第三世代 IVs to PID 查询。
- `gen3egg`：第三世代 Egg Generator。
- `gen4static`：第四世代 Static Generator/Searcher。
- `profiles`、`ivcalculator`：G3/G4 独立存档与全局个体值计算器。
- `encounterlookup`：右下角遇敌查询悬浮工具，覆盖 PokeFinder 4.3.2 实际支持的 16 个游戏版本。
- 增加 `gen4static` Wasm API v1、C ABI、原生夹具、Dedicated Worker、Generator/Searcher Worker Pool 和消息协议。
- 修复 MSVC 参数求值顺序造成的 IV word 对调：先顺序读取 `iv1`、`iv2`，再解码六项 IV。
- Worker 校验模块、契约和 API 版本，按 `chunkIndex` 恢复确定顺序；取消会终止并重建独立 Worker。
- 默认 Wasm 构建列表同时包含 `gen3seedtotime` 与 `gen4static`。

## 来源与参考

- PokeFinder 4.3.2 revision：`dd00fe7`，作为控件、算法语义、模板规则和固定结果的权威基线。
- EncounterTableGenerator Gen4 revision：`9a2ed62`，用于生成第四世代定点模板。
- PokemonRNGGuides revision：`c0b2bb664f04a4ef052e6dd4d831351703fa4047`，用于交叉核对 Rust `stationary` Generator/Searcher 分层、IV 顺序、Method 1/J/K 逆推和 React 工作台流程。
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

1. 在 GitHub Desktop 审查本轮 Initial Seed 首行、控件对齐、Egg/Spinda 标签、全局工具与侧栏世代分组修改。
2. 项目所有者明确授权后，运行 `npm run verify`；如需覆盖 Wasm 再单独授权 `npm run wasm:test:native` 与 `npm run wasm:build`。
3. 项目所有者提交并推送后，等待 GitHub Actions 完成部署，再以实际生产 URL 在外部 Chrome 回归 Initial Seed 首行、Seed to Time 与 IVs to PID 对齐、Egg/Spinda 标签、全局工具六数据集和侧栏分组。

## 已知限制

- 当前分支：`main`，HEAD `b2c6ade feat: 统一悬浮工具面板交互`。
- 本轮 UI、全局个体值计算器数据和文档修改尚未提交。正式 Pages 仍保持上一成功生产包，不能作为本轮源码的验收证据。
- GitHub Pages 是当前测试目标；Cloudflare Pages 与 `hakuhiro.top` 留到 Pages 验收后配置。

## 4. 已进入 Git 基线

- 工程基础：React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语；npm 是唯一包管理器。
- 构建基线：Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2`。
- 法律边界：GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 已有模块：`gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3spindapainter`、`gen3static` Generator/Searcher、`gen3wild` Generator/Searcher、`gen3ivtopid`、`gen3egg`、`gen4static`、G3/G4 独立存档信息、全局个体值计算器，以及 `encounterlookup`。
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

- `gen4id` 与 `gen4wild` 仍只保留共享接口，不应写成已支持功能。
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

## 维护规则

- 每个功能、依赖、工具链、构建、部署或阻塞状态变化后更新本文。
- 验证结果必须区分历史证据、本轮工程检查、部署页面回归和项目所有者最终验收。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core、测试和翻译文件。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
