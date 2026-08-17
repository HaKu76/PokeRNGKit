# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-17
> - 当前分支：`main`
> - Git 功能基线：`3089f9d feat: 实现第七世代圆庆广场乱数`
> - 当前阶段：Gen VII Festival Plaza Facility RNG 已实现，下一模块为 3DSRNGTool Profile Manager
> - 工作区状态：Festival Plaza 实现、模块文档、共享接入和本条进度记录已提交并推送
> - 验收状态：Festival Plaza 3 个 TypeScript 测试文件共 6 项测试、全仓 117 个 Vitest 文件共 437 项测试、9/9 Gen VII 原生夹具、6 个受影响 Gen VII Wasm、生产 Web/PWA 构建和外部 Chrome 本地 UI 检查已通过；生产页面算法回归未运行

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

## 维护规则

- 每个功能、依赖、工具链、构建、部署或阻塞状态变化后更新本文。
- 验证结果必须区分历史证据、本轮工程检查、部署页面回归和项目所有者最终验收。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core、测试和翻译文件。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
