# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-12
> - 当前阶段：新增 `gen3spindapainter` 待工程检查、Actions 部署和项目所有者共同验收
> - 当前模块：`gen3spindapainter`
> - Git 基线：`65e3aba feat: 增加全世代遇敌查询`
> - 工作区状态：存在未提交的自动完成控件、悬浮工具互斥、`gen3seedtotime` 和 `gen3spindapainter` 模块及文档更新；Codex 不暂存、不提交、不 push
> - 部署状态：GitHub Pages 当前为 `index-DC2qWhx2.js` 的旧生产包；自动完成修复、`gen3seedtotime` 与 `gen3spindapainter` 尚未推送或部署
> - 验收状态：既有模块的历史工程/部署证据保持有效；`gen3seedtotime` 与 `gen3spindapainter` 未运行本轮工程检查、浏览器检查或生产回归

## 0. 当前工作区优先状态

- HEAD `65e3aba` 已包含全世代遇敌查询；本轮工作区在此基础上补齐 PokeFinder 自动完成控件和三个悬浮工具的互斥状态，不存在待完成 merge。
- 当前模块集合：`gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3spindapainter`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`profiles`、`ivcalculator`、`encounterlookup`。
- 本轮新增 `encounterlookup`：右下角默认收起的全世代 Encounter Lookup，覆盖 PokeFinder 4.3.2 的 Gen III、Gen IV、Gen V 和 BDSP 共 16 个版本；静态数据由 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 生成。
- 遇敌查询不进入左侧 RNG 导航，不使用 Wasm/Worker；宝可梦候选、游戏版本、地点、遇敌种类和等级范围均来自本地静态数据。
- 已清理生成用 `.tmp-encounter-tables/` 与 `.tmp-encounter-tables.zip`；生成脚本和正式 `data.ts` 保留在工作区。
- 本轮新增 `AutoCompleteComboBox`，覆盖 Encounter Lookup 宝可梦、IV Calculator 宝可梦、Egg 蛋种类和 Wild 地点。行为对应 PokeFinder `enableAutoComplete()`：点击展开、包含匹配、弹出候选、方向键/Enter/Escape 和 `NoInsert`。
- 本轮将存档信息、个体值计算器和遇敌查询纳入同一展开状态；任意时刻只展开一个，存档工具仍保留原有 localStorage 展开偏好。

### 当前工作区实现：`encounterlookup`

- 新增 `src/features/encounterlookup`，包含查询 domain、边界测试、三语静态数据和右下角悬浮面板。
- 支持 PokeFinder 4.3.2 实际支持的 16 个游戏版本；物种上限为 Gen III `386`、Gen IV `493`、Gen V `649`、BDSP `493`。
- 查询覆盖时间、群聚、雷达、双槽、广播、季节、Feebas、HGSS Safari/撞树/捕虫大赛等上游 Encounter Lookup 组合。
- 个体值计算器、遇敌查询和存档信息从所有入口保持三方互斥展开；左侧 `ActiveModule` 与模块抽屉不包含 Encounter Lookup。
- 生成脚本、精确 revision、输入行为和 GPL 来源记录见 [遇敌查询](modules/encounterlookup.md)与[上游记录](../third_party/pokefinder/UPSTREAM.md)。

### 当前工作区实现：`gen3seedtotime`

- 新增左侧第三世代 `Gen 3 Seed to Time` 模块，对应 PokeFinder 4.3.2 `SeedToTime3`；不放入右下角静态工具菜单。
- `16/32-Bit Seed` 使用最多 8 位十六进制，空值按 `0`；`Year` 限制为 `2000..2037`；`Advances` 保持只读。32 位输入会按上游行为回推并回写原始 16 位 Seed，不填充前导零。
- 新增 `wasm/modules/gen3seedtotime` API v1、独立 Dedicated Worker、5 个 `uint32_t` 的日期/分钟结果布局与取消生命周期；PokeRNGR 回推和全年分钟枚举只在 C++/Wasm 执行。
- 已静态复核 PokeFinder Form/Core/Model/Test/翻译与 `DateTime` 上游 SHA-256：简体中文逐字使用 `第三世代Seed查询时间`、`16/32位Seed`、`年份`、`帧数`、`查找`、`时间`；原生夹具逐条覆盖 `seedtotime3.json` 的四组时间表和四组 32 位回推结果。输入边界、测试位置和来源见 [Gen 3 Seed to Time](modules/gen3seedtotime.md) 与 [上游记录](../third_party/pokefinder/UPSTREAM.md)。
- 本轮未执行任何 npm、原生、Wasm、浏览器或生产算法检查，等待项目所有者对具体命令或部署 URL 授权。

### 当前工作区实现：`gen3spindapainter`

- 新增左侧第三世代 `Spinda Painter` 模块，对应 PokeFinder 4.3.2 `SpindaPainter`；简体中文逐字使用 `晃晃斑的斑点`，不放入右下角静态工具菜单。
- PID 使用最多 8 位十六进制 `0..FFFFFFFF`，空值按 `0`；由四个 PID 字节的低/高半字节和 PokeFinder 固定偏移计算四个斑点坐标。拖动只按上游边界钳制，回写 PID 时截断位置除以 8；方向键作为无障碍扩展按 8 像素移动并回写无前导零 PID。
- 复制 PokeFinder 原始 `512x512` 底图和四张斑点 PNG 到 feature assets；显示 PID 派生的性格、性别和特性。模块是确定性映射，不增加 Wasm/Worker。
- 静态核验 PokeFinder Form、控件、翻译、Personal 数据和图像 SHA-256；输入边界、资源清单和固定夹具记录见 [Gen 3 Spinda Painter](modules/gen3spindapainter.md) 与 [上游记录](../third_party/pokefinder/UPSTREAM.md)。
- 本轮未执行 npm、测试、构建、浏览器或生产页面检查，等待项目所有者对具体命令或部署 URL 授权。

### 下一位开发者第一步

1. 在 GitHub Desktop 审查本轮自动完成、三浮窗互斥、`gen3seedtotime` 和文档更新；不要覆盖、重置或选择性丢弃工作区内容。
2. 获得项目所有者对具体命令的授权后，运行 `npm run verify`、`npm run wasm:test:native` 与 `npm run wasm:build`，确认 TypeScript、Spinda Painter domain 测试、七个原生夹具和 Wasm 产物。
3. 项目所有者提交并推送后，等待 GitHub Actions 完成部署，再以新的 Pages URL 在外部 Chrome 复验自动完成、Seed to Time 固定夹具与 Spinda Painter 的 PID 输入/拖动/键盘网格移动；随后由项目所有者完成设备和发布验收。

## 当前可用模块

- `gen3id`：第三世代 ID Generator/Searcher。
- `gen3initialseed`：第三世代 Initial Seed 反推。
- `gen3seedtotime`：第三世代 Seed 到日期时间查询。
- `gen3spindapainter`：第三世代晃晃斑的斑点 PID/坐标双向工具。
- `gen3static`：第三世代定点 Generator/Searcher。
- `gen3wild`：第三世代野生 Generator/Searcher、地点选择、完整筛选、Worker Pool、CSV、UI 预览与真实 Wasm 运行。
- `gen3ivtopid`：第三世代 IVs to PID 查询。
- `gen3egg`：第三世代 Egg Generator。
- `profiles`、`ivcalculator`：全局存档与个体值计算器。
- `encounterlookup`：右下角遇敌查询悬浮工具，覆盖 PokeFinder 4.3.2 实际支持的 16 个游戏版本。

新环境按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)
2. [AI 开发一致性指南](ai-development.md)
3. 本文
4. [README](../README.md)、[产品需求](requirements.md)与[技术方案](tech-stack.md)
5. 当前模块文档：[遇敌查询](modules/encounterlookup.md)
6. 第四世代后续交接：[Gen 4 Development](gen4-development.md)
7. [上游记录](../third_party/pokefinder/UPSTREAM.md)
8. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)

### 本次合并带入的 Wild 变更

- 在遭遇生成数据中写入 PokeFinder 简体中文地点名，并为反编译地点标签补充同源名称映射。
- 为 Wild 增加 Searcher 操作页：Method、队首、遭遇地点、性格和六维 IV 最小/最大范围；任务依旧在独立 Worker/Wasm 实例中分片。
- 补齐觉醒力量、异色、性别、特性、宝可梦和遭遇槽位筛选，并移除 Wild 生成区旁的个体值计算器入口。
- 将六项 IV 最大值默认设为 31；Wild 结果表按 Static 的通用列顺序显示并追加槽位、宝可梦和等级，CSV 复用同一列定义，槽位按 PokeFinder 的 0 基值显示和导出。
- UI 模式提供明确标识的确定性样例引擎，方便先验收界面，且不把样例结果伪装成 Wasm 计算。
- 安装并激活项目锁定的 Emscripten 6.0.6，修复 Windows 下 `emcc.exe`/`emcmake.exe` 探测，并排除本地 SDK 与生成 Wasm 的格式和 lint 扫描。

## 验证记录

- 正式英文工程名为 PokeRNGKit，不设置中文名。
- 当前 RNG 产品只做第三世代；第四世代只保留 `gen4id`、`gen4static`、`gen4wild` 的共享接口和 AI 交接，不实现 RNG 算法或主模块 UI。`encounterlookup` 是用户明确批准的跨世代静态查询例外。
- 只使用 npm，不增加 pnpm、Yarn 或 Bun 元数据。
- React + TypeScript 负责 UI、输入校验、Worker 编排、结果与持久化；PokeFinder RNG 规则使用 C++ -> Emscripten -> Wasm，生产算法不在 TypeScript 主线程运行。
- 多核使用多个独立单线程 Worker/Wasm 实例，不依赖 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- IndexedDB 保存存档，localStorage 提供镜像兜底并保存语言、主题和悬浮窗状态。
- 界面只支持简体中文、英文和日文；有上游简中翻译时逐字复用，没有时保留英文。
- 正式 Wasm 与站点产物由 GitHub Actions 自动生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 未获项目所有者对具体命令或 URL 的明确授权时，Codex 不运行测试、构建、算法回归、性能检查或浏览器检查。
- 已获授权的浏览器、Worker、控制台、部署页面和 UI 调试只使用外部 Google Chrome 或 Microsoft Edge；不使用应用内浏览器作为调试替代。外部浏览器未连接时应报告并等待连接。
- Codex 不自动暂存、提交、push、部署或发布；完成模块后只提供一条 GitHub Desktop 提交标题。

## 后续验收

- 当前分支：`main`，HEAD `65e3aba feat: 增加全世代遇敌查询`。
- 当前无待完成 merge；自动完成、悬浮工具互斥、`gen3seedtotime`、`gen3spindapainter` 和验收文档保持未提交。
- GitHub Pages 是当前测试目标；Cloudflare Pages 与 `hakuhiro.top` 留到 Pages 验收后配置。

## 4. 已进入 Git 基线

- 工程基础：React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语；npm 是唯一包管理器。
- 构建基线：Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2`。
- 法律边界：GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 已有模块：`gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3spindapainter`、`gen3static` Generator/Searcher、`gen3wild` Generator/Searcher、`gen3ivtopid`、`gen3egg`、三代存档信息和个体值计算器；`encounterlookup`、`gen3seedtotime` 与 `gen3spindapainter` 当前仍在未提交工作区。
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
node --version
npm --version
npm ci --engine-strict
npm run wasm:doctor
```

本地 UI：

```bash
npm run dev:ui
```

完整工程验证：

```bash
npm run verify
npm run wasm:test:native
npm run wasm:build
```

后两项需要 C++ 编译器与已激活的 Emscripten。当前 Windows 本机可先执行：

```bat
call C:\Users\Hakuhiro\AppData\Local\pokerngkit-emsdk\emsdk_env.bat
npm run wasm:doctor
npm run build
```

emsdk 环境只对当前终端会话生效。新电脑缺少工具链时保留失败信息，由 Actions 补齐，不把未运行项写成已通过。

## 8. 维护规则

- 每个功能、部署、阻塞、依赖或工具链变化后更新本文。
- 验证结果必须区分“历史证据”“经授权检查”“未运行”和“待项目所有者共同验收”。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个 RNG 功能更新 `docs/modules/<module>.md`，重新核对 PokeFinder Form、Core、翻译和输入限制。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
