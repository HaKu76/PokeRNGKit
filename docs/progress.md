# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-13
> - 当前分支：`main`
> - Git 基线：`cdf8b67 fix: 修复 PWA 预缓存构建上限`
> - 当前阶段：补全第三世代 PokeFinder 功能模块
> - 工作区状态：源码和文档尚未提交；Codex 不提交、不 push、不部署
> - 验收状态：本轮完成静态审查和冲突清理；最终格式检查待本轮编辑收尾，ESLint、TypeScript、测试、构建和浏览器 UI 待授权验证

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
- 第七世代来源决策：以本地优化项目 `C:\Users\Hakuhiro\source\repos\3DSRNGTool` 的 `359bdd7` 为主源，公开 `wwwwwwzx/3DSRNGTool` 的 `ae5d176` 仅作祖先归属；两者差异不止 README，已记录于 `third_party/3dsrngtool/UPSTREAM.md`。
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

1. 在 GitHub Desktop 审查 `feat/gen4-wild` 的源码、7.5 MB 生成数据、vendored PokeFinder 文件、测试和文档。
2. 项目所有者明确授权后运行 `npm run verify`、`npm run wasm:test:native` 与 `npm run wasm:build`；提交并推送后等待 Actions。
3. 项目所有者提供实际生产 URL 并授权后，在外部 Chrome/Edge 回归 Route 222 Method J、HGSS Method K、甜甜蜜树、宝可追踪、捕虫大赛、狩猎地带、取消和结果列。

## 已知限制

- 当前分支：`feat/gen4-wild`，HEAD `3895d2d feat: 新增NGC Seed查询`。
- 本轮 G4 Wild 源码、静态数据、vendored Core、测试和文档尚未提交。正式 Pages 仍保持上一成功生产包，不能作为本轮源码的验收证据。
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

- `gen4id` 仍只保留共享接口；`gen4wild` 已在工作区实现但尚未通过工程、Wasm 和部署验证。
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
