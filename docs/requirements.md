# PokeRNGKit 产品需求

> - 状态：阶段 2B / 3，第三世代 Static Searcher 与存档信息基础
> - 更新日期：2026-08-11
> - 当前部署目标：GitHub Pages 测试环境
> - 产品名称：PokeRNGKit；当前不设置中文名

## 1. 产品定义

PokeRNGKit 是面向宝可梦 RNG 研究与检索的本地优先 Web 工具集。项目参考 [Admiral-Fish/PokeFinder](https://github.com/Admiral-Fish/PokeFinder) 4.3.2，将经过验证的 C++ Core 编译为 WebAssembly，并在 Web Worker 中完成计算。

应用必须保持纯静态、无后端。用户输入、计算结果、档案和设置留在浏览器本地；站点可部署到 GitHub Pages、Cloudflare Pages 或等价静态托管，并在资源缓存完成后离线使用。

当前按 PokeFinder 功能模块逐个落地。`gen3id` 与 Static Generator 已进入 Git 基线；当前工作区实现 Static Searcher、三代存档信息和相关界面基础。Wild 仍在后续阶段。

## 2. 已确认边界

- 英文工程名为 PokeRNGKit，不设置中文名。
- 第一阶段只覆盖第三世代，不扩展到其他世代。
- 只使用 npm 管理 JavaScript 依赖和工程命令。
- RNG Core 采用 C++ -> Emscripten -> Wasm，不在 TypeScript 中重写上游算法。
- TypeScript 负责界面、校验、任务编排、Worker 协议、持久化和导出。
- 基线不依赖 Wasm threads、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- 多核计算通过多个独立 Web Worker 和独立 Wasm 实例实现。
- 界面只支持简体中文、英文和日文。
- 功能测试与最终验收由项目所有者执行；自动检查只提供工程证据。
- 本地必须提供不依赖 Emscripten 的 UI 预览模式，用于项目所有者验收界面与交互。
- GitHub Pages 先作为测试环境，Cloudflare Pages 后续作为正式部署目标。
- 正式域名将使用 `hakuhiro.top` 下的地址，具体主机名尚未决定，不得硬编码。

## 3. 目标用户与场景

### 3.1 第三世代 ID 用户

用户选择游戏模式，输入 Seed、TID 或日期时间及推进范围，生成每一帧对应的 TID、SID 和 TSV。

### 3.2 大范围计算用户

用户扩大推进范围后，计算在 Worker Pool 中运行。页面持续显示已处理状态数、结果数和进度；用户可以取消，界面主线程不能被长循环阻塞。

### 3.3 筛选与导出用户

用户使用 TID、SID、TSV 精确筛选缩小结果，在表格中排序，并将当前结果导出为 CSV。

### 3.4 多语言与离线用户

用户可以在简体中文、英文和日文之间切换。首次在线加载并缓存成功后，可以离线重新打开应用；用户理解清除站点数据会删除本地设置和存档信息。

### 3.5 第三世代定点用户

用户选择定点预设、Method、Seed、推进范围、存档信息和筛选条件，生成对应帧的 PID、IV、性格、特性、性别与闪光状态；也可以从目标 IV 范围反向检索候选 Seed。Latios/Latias 必须按第三世代游走 IV 缺陷显示结果。

### 3.6 存档信息用户

用户在浏览器本地创建和选择第三世代存档信息，刷新后继续使用，并可通过 JSON 文件跨浏览器导入导出。用户可以同时清除 IndexedDB 与 localStorage 中的全部存档记录。

## 4. 当前功能需求：`gen3id`

需求编号用于测试、Issue 和版本清单追踪。

### 4.1 应用基础

- **FR-APP-01** 应用打开后直接进入第三世代 ID 乱数工作区，不显示营销落地页。
- **FR-APP-02** 应用应显示 Wasm 初始化、就绪、计算中、完成、取消和失败状态。
- **FR-APP-03** Wasm 文件缺失、API 版本不匹配或 Worker 崩溃时，应显示可执行的错误提示，不得静默返回空结果。
- **FR-APP-04** 刷新页面可以终止当前任务，但不能留下“仍在计算”的持久错误状态。
- **FR-APP-05** 计算区域和结果区域应在桌面及移动视口下保持可读，结果表允许横向或纵向滚动。
- **FR-APP-06** `ui` 构建模式应使用明确隔离的确定性样例引擎，使 ID 与 Static 的输入、筛选、进度、取消、结果、排序、CSV 和三语界面可以在本地验收。
- **FR-APP-07** UI 预览必须持续显示非生产提示，不得宣称样例结果是 RNG 结果，也不得用于性能验收。
- **FR-APP-08** 生产构建和 Pages 构建不得通过 URL、用户设置或运行时开关启用 UI 预览引擎。
- **FR-APP-09** 左侧模块导航使用覆盖式抽屉；页面加载时默认收起，支持顶部按钮、关闭按钮、遮罩、Escape 和选择模块后收起。

### 4.2 XD / 竞技场

- **FR-ID-XD-01** 接受 `0x00000000..0xFFFFFFFF` 的 32 位十六进制 Seed。
- **FR-ID-XD-02** 使用 PokeFinder `IDGenerator3::generateXDColo` 的结果语义。
- **FR-ID-XD-03** 返回 Advances、TID、SID 和 TSV，顺序与推进顺序一致。

### 4.3 火叶 / 绿宝石

- **FR-ID-FRLGE-01** 接受 `0..65535` 的十进制 TID 输入。
- **FR-ID-FRLGE-02** 使用 PokeFinder `IDGenerator3::generateFRLGE` 的结果语义。
- **FR-ID-FRLGE-03** 输入 TID 在生成结果中保持对应的上游行为，不由界面推导另一套算法。

### 4.4 红蓝宝石

- **FR-ID-RS-01** 支持日期时间推导初始 Seed，也支持手动输入 `0x0000..0xFFFF` 的 16 位 Seed。
- **FR-ID-RS-02** 启用“无电池”时使用第三世代红蓝宝石对应的固定 Seed 规则，并禁用无效的日期时间输入。
- **FR-ID-RS-03** 使用 PokeFinder `IDGenerator3::generateRS` 的结果语义。
- **FR-ID-RS-04** 日期时间推导限制在当前实现可验证的 `2000..2099` 年范围，非法时间不得启动任务。

### 4.5 推进范围

- **FR-ID-RANGE-01** Initial Advances 必须是 `0..4294967295` 的整数。
- **FR-ID-RANGE-02** Max Advances 表示从初始帧起继续计算的最大偏移，包含起点，因此状态总数为 `Max Advances + 1`。
- **FR-ID-RANGE-03** 当前单次任务最多处理 50,000,000 个状态；超出时在界面校验阶段拒绝。
- **FR-ID-RANGE-04** TypeScript 将任务拆成不超过 100,000 个状态的分片；C ABI 同样拒绝更大的单次调用。
- **FR-ID-RANGE-05** Initial Advances 与 Max Advances 相加不得溢出 32 位无符号整数。

### 4.6 筛选

- **FR-ID-FILTER-01** TID 和 SID 精确筛选接受 `0..65535`；TSV 精确筛选接受 `0..8191`。
- **FR-ID-FILTER-02** 空输入表示不应用该筛选，不使用魔法数字表示“任意”。
- **FR-ID-FILTER-03** 多个筛选条件按 AND 组合。
- **FR-ID-FILTER-04** 任一输入无效时，不启动部分有效的任务，并保留用户输入以便修正。

### 4.7 Worker 与取消

- **FR-ID-TASK-01** Wasm 只能在 Web Worker 中实例化，React 主线程不得直接运行 C++ 生成循环。
- **FR-ID-TASK-02** Worker 数量默认使用 `max(1, min(8, hardwareConcurrency - 1))`，并不得超过当前分片数。
- **FR-ID-TASK-03** 每个 Worker 持有独立的 Wasm 实例，不共享线性内存。
- **FR-ID-TASK-04** 批次通过可转移 `ArrayBuffer` 返回，避免逐行结构化克隆。
- **FR-ID-TASK-05** 进度必须单调递增，并报告 processed states、total states、result count 和百分比。
- **FR-ID-TASK-06** 用户取消时应终止当前 Worker Pool；已确认结果可以保留，迟到消息不得更新已取消任务。
- **FR-ID-TASK-07** 取消响应以当前分片边界为基线，具体耗时在 Pages 实机测试后记录，不提前承诺固定毫秒值。

### 4.8 结果与导出

- **FR-ID-RESULT-01** 结果列包括 Advances、TID、SID 和 TSV。
- **FR-ID-RESULT-02** 结果表按数值排序，不按本地化字符串排序。
- **FR-ID-RESULT-03** 大结果集使用虚拟化渲染，行内容变化不能改变表格基本列宽和滚动容器尺寸。
- **FR-ID-RESULT-04** 当前界面最多保留 250,000 条结果；达到上限时停止任务并明确提示。
- **FR-ID-RESULT-05** CSV 使用当前排序后的数值结果，并写入 UTF-8 BOM 以改善常见表格软件兼容性。
- **FR-ID-RESULT-06** 用户可以清空结果；清空操作不改变输入和筛选。

### 4.9 国际化

- **FR-I18N-01** 只提供 `zh`、`en`、`ja` 三种语言，不根据浏览器自动引入其他语言。
- **FR-I18N-02** 语言选择保存在 `localStorage`，不存在或无效时默认使用简体中文。
- **FR-I18N-03** 中文领域术语优先复用项目所有者维护的 PokeFinder 中文翻译。
- **FR-I18N-04** Wasm 返回稳定数值，不返回本地化文案。

### 4.10 PWA 与静态部署

- **FR-DEPLOY-01** 同一份 `dist/` 应能运行在 GitHub Pages 仓库子路径和 Cloudflare 自定义域名根路径。
- **FR-DEPLOY-02** JS、Worker、Wasm、manifest、图标和 Service Worker URL 不得依赖硬编码域名。
- **FR-DEPLOY-03** 推送 `main` 后，GitHub Actions 应完成冻结安装、检查、原生一致性测试、Wasm 构建、Web 构建和 Pages 部署。
- **FR-DEPLOY-04** Pull request 只执行验证和构建，不部署 Pages。
- **FR-DEPLOY-05** 首次在线加载完成后，应验证离线重载；离线验收由项目所有者执行并记录浏览器版本。
- **FR-DEPLOY-06** 部署产物应提供 GPL 文本、上游来源和 PokeRNGKit 源代码入口。

## 5. 当前功能需求：`gen3static`

### 5.1 输入与预设

- **FR-STATIC-INPUT-01** Seed 接受 `0x00000000..0xFFFFFFFF` 的 32 位十六进制值。
- **FR-STATIC-INPUT-02** Initial Advances、Max Advances 和 Offset 接受 32 位无符号整数，三者相加不得溢出。
- **FR-STATIC-INPUT-03** Max Advances 包含起点，单次任务最多处理 50,000,000 个状态。
- **FR-STATIC-INPUT-04** 当前提供 Mewtwo、Rayquaza、Regirock、Regice、Registeel、Deoxys、Latios、Latias 首批预设。
- **FR-STATIC-INPUT-05** 预设必须显式提供物种编号、等级、性别阈值和游走缺陷标记，不从远端接口加载。
- **FR-STATIC-INPUT-06** 接受 `0..65535` 的 TID 与 SID，用于闪光判断。

### 5.2 Method 与生成规则

- **FR-STATIC-METHOD-01** 普通定点支持 PokeFinder Method 1 与 Method 4 语义。
- **FR-STATIC-METHOD-02** Method 4 在第一、第二组 IV 随机数之间额外推进一次，不改变 PID 读取顺序。
- **FR-STATIC-METHOD-03** Latios/Latias 使用游走 IV 缺陷：第一组 IV 只保留低 8 位，第二组 IV 为零。
- **FR-STATIC-METHOD-04** 游走缺陷预设限制为 Method 1，界面必须禁用无效选项并显示原因。
- **FR-STATIC-METHOD-05** 输出包含 Advances、PID、六项 IV、性格、特性槽、性别、等级和闪光类型。

### 5.3 筛选

- **FR-STATIC-FILTER-01** 支持六项 IV 的最小值和最大值，范围为 `0..31`，最小值不得大于最大值。
- **FR-STATIC-FILTER-02** 支持性格、特性槽、性别和闪光筛选，多个条件按 AND 组合。
- **FR-STATIC-FILTER-03** “任意”使用显式协议值，不使用看似有效的游戏属性作为魔法值。
- **FR-STATIC-FILTER-04** 筛选只移除生成后的状态，不改变 RNG 推进与候选顺序。

### 5.4 Worker 与结果

- **FR-STATIC-TASK-01** `gen3static` 使用独立 Worker、Wasm 模块、API 版本和 C ABI 前缀，不复用 `gen3id` 的运行时实例。
- **FR-STATIC-TASK-02** 分片、Worker 数、进度、取消、结果上限和迟到消息规则与 ID 模块保持同一工程约束。
- **FR-STATIC-TASK-03** 结果使用 48 字节定长记录和 transferable `ArrayBuffer` 返回。
- **FR-STATIC-RESULT-01** 结果表使用数值排序和虚拟化渲染，并允许移动端横向滚动。
- **FR-STATIC-RESULT-02** CSV 导出包含当前排序后的全部 Static 结果列和 UTF-8 BOM。
- **FR-STATIC-RESULT-03** UI 预览引擎只生成确定性样例，不作为 Static RNG 正确性或性能证据。

### 5.5 Searcher

- **FR-STATIC-SEARCH-01** Searcher 接受六项 IV 的闭区间，按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 的确定顺序枚举笛卡尔积。
- **FR-STATIC-SEARCH-02** IV 组合总数不得超过 50,000,000；TypeScript 按最多 100,000 个组合分片。
- **FR-STATIC-SEARCH-03** Method 1 与 Method 4 使用 PokeFinder `LCRNGReverse::recoverPokeRNGIV` 对应的反向恢复规则，不扫描完整 `2^32` Seed 空间。
- **FR-STATIC-SEARCH-04** Searcher 结果第一列为候选 Seed，不显示 Generator 的 Advances。
- **FR-STATIC-SEARCH-05** 恢复 PID 后再应用性格、特性、性别和闪光筛选；筛选不得改变候选 Seed。
- **FR-STATIC-SEARCH-06** Searcher 使用独立 Worker Pool 和取消生命周期，但与 Generator 共享版本化 `gen3static` Wasm 模块及 48 字节结果记录。
- **FR-STATIC-SEARCH-07** 固定 `31/31/31/31/31/31`、Method 4 夹具必须恢复 4 个候选结果。

### 5.6 结果补充与控件行为

- **FR-STATIC-UI-01** Generator 与 Searcher 通过同一工作区标签切换，切换时保留对应输入，不并发运行两个任务。
- **FR-STATIC-UI-02** 结果包含第三世代觉醒属性和觉醒威力，计算使用六项 IV 的最低两位。
- **FR-STATIC-UI-03** Generator 提供 PokeFinder 的“取消筛选”；Searcher 始终使用有效 IV 范围。
- **FR-STATIC-UI-04** IV 名称按钮支持 PokeFinder 组合键：单击恢复 `0..31`、Ctrl 为 `31..31`、Alt 为 `30..31`、Ctrl+Alt 为 `0..0`。
- **FR-STATIC-UI-05** 空 Seed 按上游无符号数输入行为解析为 `0`。

## 6. 当前应用基础：第三世代存档信息

- **FR-PROFILE-01** 支持 Ruby、Sapphire、Fire Red、Leaf Green、Emerald、XD 和 Colosseum 存档信息。
- **FR-PROFILE-02** 存档名不能为空；TID 与 SID 接受 `0..65535`、最多 5 位十进制。
- **FR-PROFILE-03** `Dead Battery` 只对 Ruby/Sapphire 有效，其他版本保存为 `false`。
- **FR-PROFILE-04** 支持新建、编辑、复制、删除、选择和刷新恢复。
- **FR-PROFILE-05** IndexedDB 为主存储；同一完整状态写入 localStorage 镜像，在 IndexedDB 不可用时兜底。
- **FR-PROFILE-06** 支持带格式标识和 schema 版本的 JSON 导入导出；导入先完整校验，再按稳定 `id` 合并。
- **FR-PROFILE-07** `Clear Profiles` 同时删除 IndexedDB 记录和 localStorage 镜像，清除前必须二次确认。
- **FR-PROFILE-08** 应用全局以右下角小型悬浮窗显示当前存档摘要；首次默认收起，用户展开或收起后记住本机状态。
- **FR-PROFILE-09** 没有选择时使用 `- / Emerald / 12345 / 54321` 临时默认值，不自动创建持久记录。
- **FR-PROFILE-10** 应用不上传、记录或写入 URL 中的存档内容。

## 7. 后续 MVP

当前工作区通过工程检查与项目所有者验收后，按以下顺序推进：

1. 补齐并按存档版本过滤 Static encounter presets。
2. Wild Generator / Searcher。
3. 遭遇槽、等级和 Pokemon 等 Wild 适用筛选。
4. PWA 离线加固、浏览器矩阵、可访问性和性能基线。

Egg、GameCube、PokeSpot、Jirachi 等第三世代功能在上述 MVP 后评估。Gen IV 及其他世代不属于当前承诺；如进入开发，按 `gen4id` 等独立模块命名和验证。

## 8. 非目标

- 后端、账号、云同步、服务端计算、遥测、广告或运行时 CDN。
- 模拟器、主机、存档文件或进程内存的实时连接。
- 对 PokeFinder Qt 界面的逐像素复刻。
- 为当前模块引入 React Router、全局状态框架、通用表单框架或大型 UI 组件库。
- 依赖 `SharedArrayBuffer`、Wasm pthread 或静态托管无法保证的响应头。
- 未经授权的官方精灵图、音乐、Logo 或其他游戏素材。

## 9. 非功能需求

### 9.1 正确性

- `gen3id` 与 `gen3static` C++ bridge 的固定输入结果必须与已记录的 PokeFinder 4.3.2 夹具逐字段一致。
- TypeScript 只负责输入规范化、分片和解码，不改变 Core 的 RNG 规则。
- C ABI 和 Worker 协议必须带显式 API 版本；版本不匹配时拒绝运行。
- 上游源码文件、版本、SHA-256、修改边界和许可证必须可追溯。

### 9.2 性能与稳定性

- 计算不得在 React 主线程执行。
- 批次大小、Worker 数量、结果上限和任务上限必须有显式边界。
- Worker 崩溃、Wasm 初始化失败和结果缓冲区异常不得产生看似有效的部分完成状态。
- 性能结论必须记录设备、浏览器、Worker 数、范围和耗时，不以单一开发机推断所有用户环境。

### 9.3 隐私与数据

- IndexedDB 保存存档信息，localStorage 保存存档镜像、语言、主题和悬浮窗折叠状态。
- 存档信息不放入 URL、日志或远端请求。
- 应用不发送 TID、SID、Seed、筛选条件或结果。
- 清除站点数据会删除设置、PWA 缓存和存档信息；项目没有服务器备份。

### 9.4 可维护性

- 每个 Wasm 功能使用独立目录、manifest、CMake target、C ABI 前缀和测试。
- 一键入口保持为 `npm run build`，不同原生语言的工具链由模块构建驱动封装。
- JavaScript 依赖通过 `package-lock.json` 复现；发布工具链使用精确版本。
- 新依赖只有在对应功能开始实现且能减少实际复杂度时加入。

## 10. 浏览器支持

目标是支持具备 ES modules、WebAssembly、Dedicated Worker、可转移 `ArrayBuffer`、Service Worker、Cache Storage、IndexedDB 和 `localStorage` 的当前稳定版桌面及移动浏览器。

优先验证：

- Chromium 系：Chrome、Edge、Android Chrome。
- Firefox 桌面版。
- Safari / iOS Safari。

本阶段不声明已经通过具体浏览器版本。每次预览或发布应记录实际测试的浏览器完整版本、设备和结果；Service Worker 正式环境要求 HTTPS，本地允许 `localhost`。

## 11. 验收标准

### 11.1 工程门槛

以下项目全部通过后，当前模块才能进入项目所有者验收：

1. `npm ci --engine-strict` 使用已提交 lockfile 成功安装。
2. `npm run verify` 通过格式、lint、类型、TypeScript 单元测试和 Web 构建。
3. `npm run wasm:test:native` 通过 ID 三种模式、Static Method 1/4、Searcher 反向恢复、游走缺陷及错误边界。
4. `npm run wasm:build` 生成 `gen3id` 与 `gen3static` 的 MJS/Wasm 产物。
5. `npm run build` 生成包含 Worker、Wasm、PWA 与法律文件的 `dist/`。
6. GitHub Pages 地址能加载首页、Worker 和 Wasm，控制台无资源 404。
7. `npm run build:ui` 和 `npm run preview:ui` 不依赖 Wasm 产物，可以完成本地 UI 验收。

### 11.2 项目所有者验收

项目所有者至少检查：

1. ID 三种模式各使用一组已知输入比对 PokeFinder 结果。
2. Static Generator/Searcher 的 Method 1、Method 4 与 Latios/Latias 游走缺陷各使用已知输入比对。
3. ID 的 TID、SID、TSV 筛选，以及 Static 的 IV、性格、特性、性别、闪光筛选。
4. 大范围任务的进度、取消、页面响应和结果上限提示。
5. ID 与 Static 结果排序、CSV 内容、清空结果和移动端横向滚动。
6. 简体中文、英文、日文切换及刷新保留。
7. 存档信息的新建、编辑、选择、刷新恢复、导入、导出、清除和悬浮窗折叠。
8. GitHub Pages 在线加载两个 Worker/Wasm 模块、刷新、安装 PWA 和离线重载。
9. 桌面与移动浏览器的布局和操作。

界面布局、文案和交互可以先在 UI 预览模式验收；RNG 结果、Worker 性能和离线完整功能仍必须在真实 Wasm 构建中验收。

当前状态不得写成“已验收”，直到项目所有者明确记录结果。

## 12. 阶段划分

- **阶段 0：仓库基线** - README、需求、技术方案、进度文档、许可证、npm 基线（已完成）。
- **阶段 1：`gen3id` Generator** - React UI、Worker Pool、C++ bridge、上游最小 Core、三语和 Actions（已实现，待项目所有者完整验收）。
- **阶段 2A：`gen3static` Generator** - 独立 Wasm/Worker、Method 1/4、游走缺陷、筛选和结果（已进入 Git 基线，待项目所有者完整验收）。
- **阶段 2B：Static Searcher** - 反向恢复、搜索协议、结果边界和上游一致性测试（当前工作区已实现，待真实 Wasm 验证与提交）。
- **阶段 3：三代存档信息** - IndexedDB、localStorage 镜像、CRUD、导入导出、清除和悬浮窗（当前工作区已实现，待项目所有者验收）。
- **阶段 4：`gen3wild`** - 遭遇数据、Generator、Searcher 和一致性测试。
- **阶段 5：发布加固** - 浏览器矩阵、PWA、性能、可访问性、GPL inventory 和 Cloudflare 正式部署。

## 13. 未决事项

- Cloudflare Pages 正式项目名和 `hakuhiro.top` 下的主机名。
- GitHub Pages 实机测试后的 ID/Static 分片大小、默认 Worker 数和取消耗时基线。
- Static encounter presets 的完整导入范围和分批验收顺序。
- Pages 预览稳定后何时加入 Playwright 和 Testing Library。
