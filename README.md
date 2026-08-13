# PokeRNGKit

PokeRNGKit 是面向宝可梦 RNG 研究与检索的本地优先 Web 工具集。项目英文工程名已确定，当前不设置中文名。项目以
[Admiral-Fish/PokeFinder](https://github.com/Admiral-Fish/PokeFinder) 4.3.2 的算法与测试资料为上游参考，目标是在不牺牲结果正确性的前提下，提供 Web 原生、可离线、无需后端的使用体验。

## 项目状态

**当前里程碑：第四世代定点乱数模块合并。** 当前工作区在第三世代完整模块基线上加入 `gen4static`、独立 G4 存档、全局六数据集个体值计算器、Wasm/Worker、算法文档和三语入口。合并后的工程检查、GitHub Pages 部署回归与项目所有者最终验收仍待完成。

- 目标范围：第三世代现有模块、第四世代 Static，以及 PokeFinder Encounter Lookup 支持的跨世代静态查询
- 已有模块：Gen III ID、Initial Seed、Seed to Time、Static、Wild、IVs to PID、Egg、Spinda Painter，Gen IV Static，G3/G4 独立存档、全局个体值计算器，以及 Encounter Lookup
- 当前模块：Gen IV Static Generator/Searcher；PR 分支保留历史工程证据，合并结果尚未重新验证
- 上游核验基线：PokeFinder 4.3.2
- 模块说明：[Gen 3 ID](docs/modules/gen3id.md) / [Gen 3 Initial Seed Finder](docs/modules/gen3initialseed.md) / [Gen 3 Seed to Time](docs/modules/gen3seedtotime.md) / [Gen 3 Static](docs/modules/gen3static.md) / [Gen 3 Wild](docs/modules/gen3wild.md) / [Gen 3 IVs to PID](docs/modules/gen3ivtopid.md) / [Gen 3 Egg](docs/modules/gen3egg.md) / [Gen 3 Spinda Painter](docs/modules/gen3spindapainter.md) / [Gen 3 Profiles](docs/modules/gen3profiles.md) / [IV Calculator](docs/modules/gen3ivcalculator.md) / [Gen 4 Static](docs/modules/gen4static.md) / [Gen 4 Profiles](docs/modules/gen4profiles.md) / [Encounter Lookup](docs/modules/encounterlookup.md)
- 进度与跨环境交接：[docs/progress.md](docs/progress.md)
- 需求基线：[docs/requirements.md](docs/requirements.md)
- 技术方案：[docs/tech-stack.md](docs/tech-stack.md)
- AI 开发入口：[docs/ai-development.md](docs/ai-development.md)
- 第四世代接口与 AI 交接：[docs/gen4-development.md](docs/gen4-development.md)

## 产品定位

PokeRNGKit 不是桌面程序的逐像素复刻，而是保留已实现 PokeFinder Core 模块的算法，通过 WebAssembly 在浏览器中运行，并用 React 构建适合桌面和移动浏览器的原生交互。所有计算、档案和设置都留在用户设备上。

当前已落地的 ID 模块包含：

- XD/Colosseum、FireRed/LeafGreen/Emerald、Ruby/Sapphire 三种第三世代 ID 生成模式
- TID、SID、TSV 精确筛选
- Initial Advances / Max Advances 分片计算
- Web Worker Pool 并行调度、进度、取消和错误状态
- 虚拟化结果表、数值排序和 CSV 导出

当前 Initial Seed Finder 工作区包含：

- `RS IDs`：由 TID/SID 枚举全部 Ruby/Sapphire 初始 16 位 Seed 候选及帧数
- `FRLG / RSE`：从目标 32 位 Seed 反向 PokeRNG，按 `Max Results` 返回初始 Seed 与帧数
- `gen3initialseed` Wasm C ABI、独立 Worker/Wasm 实例、分片进度、取消、稳定排序和 CSV
- `Target Seed` 空值按项目统一 Seed 规则视为 `0`；`Max Results` 为 `1..65536`
- 算法、输入边界和来源见 [Gen 3 Initial Seed Finder](docs/modules/gen3initialseed.md)；本轮未构建或验收

当前 Seed to Time 工作区包含：

- PokeFinder `SeedToTime3` 的 16/32 位 Seed、年份、只读 Advances 和时间表
- 32 位 Seed 使用 PokeRNGR 回推原始 16 位 Seed，保留上游 2000 年后的日历缺陷
- 独立 `gen3seedtotime` Wasm、Dedicated Worker、固定夹具和三语界面；本轮未构建或验收
- 算法、输入边界和来源见 [Gen 3 Seed to Time](docs/modules/gen3seedtotime.md)

当前 IVs to PID 工作区包含：

- 六项 IV、性格、TID 输入；空 TID 按上游行为作为 `0`
- Method 1、Reverse Method 1、Method 2、Method 4、XD/Colo、Channel
- Seed、PID、SID、Ability、四种性别比例和 Method 结果列
- 独立 `gen3ivtopid` Wasm、Dedicated Worker、排序和 CSV
- 算法、输入边界和上游文件见 [Gen 3 IVs to PID](docs/modules/gen3ivtopid.md)；本轮未构建或验收

当前 Egg 工作区包含：

- Emerald `EBred`、`EBredSplit`、`EBredAlternate` 与 Ruby/Sapphire/FireRed/LeafGreen `RSFRLGBred`、`RSFRLGBredSplit`、`RSFRLGBredAlternate`、`RSFRLGBredMixed` 生成方式
- Held/Pickup Seed、校准值、查看图鉴次数、好感度、蛋种类、亲代 IV/性别/性格/道具和当前存档 TID/SID
- 性格、觉醒力量、IV、能力、性别、特性和异色筛选；遗传来源显示、排序、CSV、进度与取消
- 独立 `gen3egg` Wasm、Worker Pool、Emerald 与 RS/FRLG 不同结果列布局；当前只提供 Generator，不包含 Egg Searcher
- 算法、输入边界和固定夹具见 [Gen 3 Egg](docs/modules/gen3egg.md)；本轮未构建或验收

当前 Spinda Painter 工作区包含：

- PID 的四字节半字节位置映射，空 PID 按 `0` 显示；拖动斑点后回写无前导零十六进制 PID
- PokeFinder 原始 `512x512` 晃晃斑底图与四张各自尺寸的斑点 PNG，鼠标拖动和方向键均按 8 像素网格移动
- 由 PID 显示性格、性别和特性；不使用 Wasm/Worker，也不含 RNG 搜索
- 算法、输入边界和资源来源见 [Gen 3 Spinda Painter](docs/modules/gen3spindapainter.md)；本轮未构建或验收

当前 Gen IV Static 工作区包含：

- Diamond、Pearl、Platinum、HeartGold、SoulSilver 的 99 条定点模板
- Method 1、Method J、Method K、Synchronize 和 Cute Charm Generator/Searcher
- 六项 IV 默认 `0..31`，筛选格式、快捷键和三栏控制布局与 Gen III Static 对齐
- 固定列宽结果表、排序、CSV、觉醒属性、觉醒威力、个性、电话和音高
- 独立 `gen4static` Wasm/Worker 与 G4 存档 schema；个体值计算器是跨工作区的单一全局工具，由工具自身选择六个 PokeFinder 数据集
- 算法、输入边界和参考来源见 [Gen 4 Static](docs/modules/gen4static.md)

当前 Static 工作区包含：

- PokeFinder 第三世代掌机 Static 的 67 条模板，按 8 类组织并随当前存档版本过滤
- Method 1、Method 4 与 Latios/Latias 游走 IV 缺陷
- Seed、Initial Advances、Max Advances、Offset、TID、SID
- IV、性格多选、觉醒力量多选、特性、性别和异色筛选
- Static Searcher 的 IV 组合枚举与反向 Seed 恢复
- 觉醒属性、觉醒威力、能力值显示、取消筛选和 IV 组合键快捷设置
- 独立 Generator/Searcher Worker Pool、进度、取消、虚拟化结果表、排序和 CSV

当前 Wild 模块包含：

- Ruby、Sapphire、Emerald、FireRed 与 LeafGreen 的陆地、冲浪、碎岩和三种鱼竿遭遇表
- 地点按 PokeFinder 上游中英资源显示；上游无精确细分地点时保留 EncounterTableGenerator 英文原名，日文资源当前同样保留上游英文
- Method 1、Method 2、Method 4，以及 Emerald 的同步、迷人身躯、等级修正和槽位修正队首规则
- RSE 碎岩遭遇率修正、Route 119 丑丑鱼钓点和 Safari Zone 额外 RNG 推进
- 当前全局掌机存档的版本、TID、SID 联动，以及性格多选筛选
- Shiny、Gender、Ability、Nature、Hidden Power、Encounter Slot、Level 和六项 IV 范围筛选；支持“取消筛选”
- Pokémon 联动的槽位/等级范围、IV 快捷键、能力值显示和 16 列结果表
- 独立 `gen3wild` Wasm、Worker Pool、进度、取消、虚拟化结果表、排序和 CSV
- Searcher 按六项 IV 笛卡尔积反向恢复候选 Seed，复用 Wild 特殊规则与完整筛选，并以独立 Worker Pool 分片执行
- PokeFinder Route 111 固定夹具；当前本机尚未编译运行，等待 Actions 验证

当前三代存档信息基础包含：

- 新建、编辑、复制、删除和选择
- IndexedDB 主存储与 localStorage 镜像兜底
- JSON 导入、导出与同时清除两处缓存
- 全局右下角小型悬浮窗、默认收起、折叠状态记忆和当前存档摘要
- 悬浮窗展开后点击页面其他区域不会自动收起，避免误触中断存档信息管理。

全局个体值计算器对齐 PokeFinder `IVCalculator`、`IVChecker` 与 `Nature`，支持 Gen III、Platinum、HGSS、BW2、SwSh 和 BDSP 六个数据集，以及物种、形态、性格、个性、觉醒力量、多行能力值交集和下一级提示。该轻量确定性工具使用 TypeScript；大范围 RNG 计算仍只在 C++/Wasm Worker 中执行。

应用左侧模块导航使用默认收起的覆盖式抽屉，避免在桌面和移动视口持续占用计算工作区宽度。

后续 MVP 计划包含：

- PWA 安装与首次加载后的离线使用加固
- 浏览器矩阵、性能基线和可访问性补充

当前不包含 Tanoby Chamber 未知图腾 form 规则、GameCube、PokeSpot、Jirachi 及其他未列出的世代算法。Egg 当前只提供第三世代 Generator，不包含 Egg Searcher、Masuda 或第四世代孵化规则。第四世代当前只实现 `gen4static`；`gen4id` 与 `gen4wild` 仍只保留扩展契约。每个功能继续使用独立 Wasm 模块和验收记录，不把后续算法并入现有模块。

## 纯静态与隐私

PokeRNGKit 必须能够部署到 GitHub Pages、Cloudflare Pages 或任意等价静态文件托管服务：

- 不设置应用后端、账号系统或云端数据库。
- RNG 计算由浏览器内 Web Worker 中的 WebAssembly 完成。
- 档案保存在 IndexedDB，语言和轻量界面偏好保存在 `localStorage`。
- 不引入遥测、行为分析、广告、第三方字体或运行时 CDN 依赖。
- 初次访问和版本更新需要下载静态资源；成功缓存后，核心功能可离线使用。
- 清除站点数据会删除本地档案和设置，项目无法从服务器恢复这些数据。

在普通静态托管上运行是硬约束。基线实现不依赖 `SharedArrayBuffer`、Wasm threads、COOP/COEP 响应头或跨源隔离。

## 架构概览

```text
React UI
  |-- local UI state (React)
  |-- profiles (IndexedDB + localStorage mirror)
  |-- settings (localStorage)
  `-- typed messages
        `-- Web Worker
              `-- Worker Pool
                    |-- Emscripten gen3id module
                    |-- Emscripten gen3initialseed module
                    |-- Emscripten gen3static module
                    |-- Emscripten gen3wild module
                    |-- Emscripten gen3ivtopid module
                    |-- Emscripten gen3egg module
                    `-- Emscripten gen4static module
                          `-- PokeFinder C++ Core rules + thin adapters
```

Wasm 模块只在 Worker 内实例化。搜索被拆成可让出事件循环的工作分片，Worker 以批次传输结果并在分片之间处理取消消息，因此不需要共享内存。界面层不直接依赖 C++ 类、Qt 类型或上游文件型 `ProfileLoader`。

更完整的目录规划、Wasm 边界和 Worker 协议见 [docs/tech-stack.md](docs/tech-stack.md)。

## 开发入口

工程入口统一由 npm 提供。先安装 `.node-version` 指定的 Node.js，并让 npm 与 `packageManager` 字段一致。

### 本地 UI 验收

不安装 Emscripten 也可以启动界面预览：

```bash
npm ci
npm run dev:ui
```

打开 <http://127.0.0.1:5173/>。

需要先构建静态文件再预览时使用：

```bash
npm run preview:ui
```

打开 <http://127.0.0.1:4173/>。

UI 预览模式使用确定性样例数据，可以验收 ID Generator/Searcher、Initial Seed Finder、Static Generator/Searcher、Wild Generator/Searcher、存档信息、输入、筛选、进度、取消、结果表、排序、CSV、三语和响应式布局。页面会持续显示“UI 预览”提示；该模式不加载 Wasm、不注册 PWA Service Worker，不能用于验证 RNG 结果、Worker 性能、大范围计算速度或离线能力。

本地验收服务器固定绑定 `127.0.0.1`，只允许当前电脑访问。如果 Windows 首次运行 Node.js 时弹出防火墙网络放行或管理员密码提示，可以直接取消/不允许；不需要为本地验收创建公网或局域网放行规则。

### 本地完整功能

完整 Wasm 构建需要通过[官方 emsdk](https://emscripten.org/docs/getting_started/downloads.html)激活 Emscripten。CMake 与 Ninja 已由 npm 精确锁定并跨平台安装。`wasm:test:native` 另需本机 C++ 编译器，Windows 可使用 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，GitHub Actions 的 Ubuntu runner 已提供系统编译器。

```bash
npm install --global npm@12.0.2
npm ci
npm run wasm:doctor
npm run dev
npm run dev:ui
npm run dev:web
npm run build
npm run build:ui
npm run build:web
npm run preview:ui
npm test
npm run lint
npm run format:files -- <file...>
npm run format:changed
npm run format:check
npm run wasm:build
npm run wasm:test:native
npm run verify
```

已确认的工具链基线：

- Node.js 24.19.0 LTS
- npm 12.0.2
- Emscripten 6.0.6（通过 emsdk 精确锁定）
- CMake runtime 4.3.1（npm 精确锁定）
- Ninja runtime 1.13.2（npm 精确锁定）

前端依赖的兼容范围与精确锁定规则记录在 [docs/tech-stack.md](docs/tech-stack.md#4-当前版本与锁定策略)。

## 构建与测试

`npm run build` 先生成 release 模式的 `gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg` 与 `gen4static` MJS/Wasm 产物，再由 Vite 将带内容哈希的 JS、CSS、Worker、PWA 和 Wasm 资源输出到 `dist/`。这些目录都是生成物，不提交到 Git。

测试规划分为五层：

1. C++/Wasm 与 PokeFinder 上游夹具的算法一致性测试。
2. TypeScript 领域逻辑、消息协议、数据迁移和 CSV 的单元测试。
3. React 组件与用户交互测试（后续补充）。
4. Worker + 真实 Wasm + IndexedDB 的浏览器集成测试（后续补充）。
5. Playwright 覆盖核心流程、静态子路径部署和离线重载（Pages 预览稳定后引入）。

当前验证门槛要求八个 RNG Wasm 模块的固定输入结果对齐已记录夹具、长范围计算可汇报进度并响应取消、GitHub Pages 能加载对应 Worker/Wasm 模块，且离线重载可用。项目所有者负责提交并提供部署 URL；算法回归仅能在 Actions 部署完成、所有者给出生产 URL 并授权后执行，项目所有者保留界面、设备和正式发布的最终验收。

## 部署

CI/CD 使用 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)：

1. 在固定 Node、npm 与 Emscripten 版本下安装依赖；CMake/Ninja 由 `npm ci` 安装。
2. 执行格式检查、lint、类型检查、TypeScript 单元测试、原生 Core 一致性测试和生产构建。
3. 上传同一份 `dist/`，由独立 job 部署到 GitHub Pages。
4. 配置 Cloudflare Secrets 与项目变量后，可将同一份 `dist/` 部署到 Cloudflare Pages；后续绑定 `hakuhiro.top` 下的正式域名。

当前首要目标是 GitHub Pages 测试部署。GitHub 仓库重命名为 `PokeRNGKit` 后，项目所有者提交并推送 `main`，Actions 会尝试启用 Pages、构建 Wasm 和站点，并部署到预计地址 <https://haku76.github.io/PokeRNGKit/>。如果仓库策略阻止自动启用，在 GitHub `Settings -> Pages -> Build and deployment` 中将 Source 设为 `GitHub Actions`，再重新运行工作流。

生产构建使用相对资源路径，以同时支持 `/PokeRNGKit/` 测试路径和 Cloudflare 自定义域名根路径。Cloudflare 正式部署将使用 `hakuhiro.top` 下的地址；具体主机名确定前不硬编码 URL。`dist/legal/` 会包含 GPL 文本和上游记录，页面页脚同时提供源码入口。

### 构建职责

正式发布采用全自动构建：Git 仓库只保存源码、lockfile 和构建脚本，GitHub Actions 在固定工具链中生成 Wasm 与 `dist/`。不提交本地生成的 `public/wasm/`、`wasm/build/` 或 `dist/`，避免二进制与源码不同步、不同机器优化参数不一致，以及无法确认部署产物来源。

本地编译保留为开发和应急能力。如果 Actions 暂时不可用，可在符合锁定版本的 Windows PowerShell 环境中运行：

```powershell
npm run verify:full
$env:BASE_PATH = "./"
npm run build:web
```

随后把完整 `dist/` 作为一个整体交给静态托管；不要只上传本地 `.wasm` 并与另一轮 Web 构建混用。GitHub Pages 当前仍以 Actions artifact 为唯一正式入口，CI 问题优先修复工作流，不切换到提交 `gh-pages` 分支或跟踪生成物。

## 路线图

- **阶段 0：仓库基线** - README、需求、技术栈、忽略规则与许可证策略（已完成）。
- **阶段 1：第三世代 ID Generator/Searcher** - `gen3id` API v2、独立 Worker、三语界面、红蓝宝石 ID 反查和一致性夹具（已实现，待 Actions、部署回归与最终验收）。
- **阶段 2A：第三世代 Static Generator** - `gen3static`、Method 1/4、游走缺陷、筛选和结果工作区（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 2B：Static Searcher** - 反向 IV 恢复、搜索边界、独立 Worker Pool 和结果工作区（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 2C：`gen3seedtotime`** - 第三世代 Seed 到日期时间、32 位回推、独立 Wasm/Worker、固定夹具和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 2D：`gen3spindapainter`** - PID 与晃晃斑斑点双向映射、原始图像资源、拖动与键盘交互、输入边界和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 3：三代存档信息** - IndexedDB、localStorage 兜底、导入导出、清除和悬浮窗（已进入 Git 基线，待项目所有者验收）。
- **阶段 4A：Wild Generator** - 遭遇数据、独立 `gen3wild` Wasm/Worker、特殊地点规则、完整筛选和固定夹具（已实现，待 Actions、部署回归与最终验收）。
- **阶段 4B：Wild Searcher** - IV 反向检索、完整筛选和独立 Worker Pool（已实现，待 Actions、部署回归与最终验收）。
- **阶段 5：`gen3ivtopid` IVs to PID** - 六项 IV 反推第三世代 PID、独立 Wasm/Worker、上游方法和算法文档（已实现，待 Actions、部署回归与最终验收）。
- **阶段 6：`gen3egg` Egg Generator** - 第三世代 Emerald 与 RS/FRLG 孵化生成、亲代遗传、筛选、结果表、独立 Wasm/Worker 和算法文档（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 7：`gen4static` Static Generator/Searcher** - 第四世代 Method 1/J/K、独立 G4 存档、全局个体值计算器、Wasm/Worker 和算法文档（当前合并工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 8：发布加固** - PWA 离线、可访问性、浏览器矩阵、性能预算、许可证与发布流程。
- **后续** - Egg Searcher、Tanoby Chamber、GameCube、PokeSpot、Jirachi、`gen4id` 与 `gen4wild` 等未实现能力。

## 许可证、署名与源码分发

PokeFinder 源码头声明可按 **GNU GPL v3 或更高版本**使用。PokeRNGKit 作为包含其衍生和链接代码的整体，以 `GPL-3.0-or-later` 发布。公开部署与发布必须持续满足以下事项：

- 在仓库中保留完整 GPL 许可证文本、原作者版权声明和上游署名。
- 记录采用的上游版本、提交或归档校验和，以及 PokeRNGKit 的修改清单。
- 发布 `.wasm` 和部署站点时，同步提供构建该二进制所对应的完整源代码、构建脚本与安装说明。
- 不以仅提供上游链接替代 PokeRNGKit 自身修改源码的分发义务。
- 审核所有第三方数据、图标、字体和素材的独立许可证，未经许可不复制游戏素材。

本节是工程约束，不构成法律意见。首次公开发布前应完成一次 GPL 与素材来源审查。

## 免责声明

PokeRNGKit 是非官方、由社区开发的研究工具，与 Nintendo、Creatures Inc.、GAME FREAK inc.、The Pokemon Company 或其关联方没有隶属、授权或背书关系。

Pokemon、宝可梦及相关名称、角色和素材是其各自权利人的商标或版权作品。项目名称中的相关指代仅用于说明工具用途。除非取得明确许可，本项目不分发官方美术、精灵图、音频、Logo 或其他受保护素材。
