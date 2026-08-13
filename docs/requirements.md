# PokeRNGKit 产品需求

> - 状态：PR #3 合并冲突已处理；合并结果待工程检查与部署验收
> - 更新日期：2026-08-14
> - 当前部署目标：GitHub Pages 测试环境
> - 产品名称：PokeRNGKit；当前不设置中文名

## 1. 产品定义

PokeRNGKit 是面向宝可梦 RNG 研究与检索的本地优先 Web 工具集。项目参考 [Admiral-Fish/PokeFinder](https://github.com/Admiral-Fish/PokeFinder) 4.3.2，将经过验证的 C++ Core 编译为 WebAssembly，并在 Web Worker 中完成计算。

应用必须保持纯静态、无后端。用户输入、计算结果、档案和设置留在浏览器本地；站点可部署到 GitHub Pages、Cloudflare Pages 或等价静态托管，并在资源缓存完成后离线使用。

当前按 PokeFinder 功能模块逐个落地。第三世代 ID、Initial Seed、Seed to Time、Static/Wild Generator/Searcher、IVs to PID、Egg、Spinda Painter、GameCube Seed Finder、GameCube RNG、PID to IVs、PokeSpot、Jirachi、存档信息和个体值计算器已进入工作区；第四世代 ID、Static/Wild、独立 G4 存档、宝可病毒与 Encounter Lookup 也已进入工作区。个体值计算器是跨工作区的全局工具，Encounter Lookup 是跨世代静态查询工具。

当前工作区额外加入基于 DevonStudios Pokerus Finder 的宝可病毒查询，覆盖第三世代、第四世代 DP 与第四世代 Pt/HGSS 三种交互模式。

## 2. 已确认边界

- 英文工程名为 PokeRNGKit，不设置中文名。
- RNG Generator/Searcher 当前覆盖第三世代既有模块与用户明确指定的第四世代 Static；Encounter Lookup 是跨世代静态工具。
- 只使用 npm 管理 JavaScript 依赖和工程命令。
- RNG Core 采用 C++ -> Emscripten -> Wasm，不在 TypeScript 中重写上游算法。
- TypeScript 负责界面、校验、任务编排、Worker 协议、持久化和导出。
- 基线不依赖 Wasm threads、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- 多核计算通过多个独立 Web Worker 和独立 Wasm 实例实现。
- 界面只支持简体中文、英文和日文。
- 项目所有者负责提交和部署并提供实际 URL；Codex 在部署页面执行算法与功能回归，项目所有者保留界面、设备和正式发布的最终验收。
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

### 3.7 第三世代野生乱数用户

用户从当前掌机存档对应版本的遭遇表中选择遭遇类型和地点，输入 Seed、推进范围、Method、队首和特殊地点条件，生成野生宝可梦的槽位、等级、PID、IV、性格与闪光状态；也可以输入目标 IV 范围，反向检索满足同一遭遇规则和筛选的候选 Seed。两种大范围计算都必须在独立 `gen3wild` Worker Pool 中运行。

### 3.8 第三世代孵化乱数用户

用户选择 Emerald 或 Ruby/Sapphire/FireRed/LeafGreen 的孵化生成方式，填写 Held/Pickup Seed、推进范围、校准值、查看图鉴次数、好感度、蛋种类、亲代和存档信息，生成孵化结果；用户可以按性格、觉醒力量、IV、能力、性别、特性和异色筛选，并查看遗传来源。当前只提供 Generator，不承诺 Egg Searcher 或 Masuda 规则。

### 3.9 第三世代 Seed 到时间用户

用户输入 16 位初始 Seed 或 32 位 PokeRNG 状态与年份，查看可产生该 Seed 的日期和分钟。32 位 Seed 会按 PokeFinder 的 PokeRNGR 规则回推到原始 Seed，并显示回推帧数。

### 3.10 第四世代定点乱数用户

用户选择 Diamond、Pearl、Platinum、HeartGold 或 SoulSilver 存档与定点模板，使用 Method 1/J/K、Synchronize 或 Cute Charm 生成结果，也可以输入六项 IV 闭区间反向检索候选 Seed。G4 使用独立存档；全局个体值计算器由工具自身选择六个 PokeFinder 数据集，控件布局、IV 快捷操作、排序、CSV 和结果表行为与 G3 Static 保持一致。

### 3.11 第七世代 ID 乱数用户

用户选择 Sun、Moon、Ultra Sun 或 Ultra Moon，输入 SFMT Seed、起始帧、最大帧和指针修正，查看 TID、SID、TSV、TRV、Gen7TID、Random Number 与 Clock。ID 起始帧按本地优化版 3DSRNGTool 为 Sun/Moon `1012`、Ultra Sun/Ultra Moon `1132`；模块当前不包含第七世代定点、野生、SOS、孵化或 Timeline 流程。

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

#### 4.4.1 红蓝宝石 ID Searcher

- **FR-ID-SEARCH-01** ID 工作区提供 Generator/Searcher 标签；计算期间禁止切换操作。
- **FR-ID-SEARCH-02** SID 模式接受十进制 TID 与 SID，范围均为 `0..65535`。
- **FR-ID-SEARCH-03** PID 模式接受十进制 TID 与八位十六进制 PID，并枚举八个可使目标 PID 闪光的 SID。
- **FR-ID-SEARCH-04** 结果显示 Seed、帧数、TID、SID、TSV、异色和日期；帧数不得添加千位分隔符。
- **FR-ID-SEARCH-05** 日期范围与参考程序一致，当前只返回 2000 年内每个 Seed 的第一组日期时间。
- **FR-ID-SEARCH-06** 无可用 Seed 或日期的组合返回空结果，不得访问空集合或显示伪造结果。
- **FR-ID-SEARCH-07** Searcher 在独立 Worker 中调用 `gen3id_search`；取消通过终止 Worker 生效，React 主线程不执行反向 RNG。
- **FR-ID-SEARCH-08** 简体中文控件复用参考程序的 `TID：`、`SID：`、`PID：`、`计算`、`帧数`、`异色`和`日期`文本。

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
- **FR-STATIC-INPUT-04** 提供 PokeFinder 第三世代掌机 Static 的 67 条模板，并按 8 个上游分类组织。
- **FR-STATIC-INPUT-05** 模板必须显式提供适用版本、物种编号、形态、等级、性别阈值和游走缺陷标记，不从远端接口加载。
- **FR-STATIC-INPUT-06** 接受 `0..65535` 的 TID 与 SID，用于闪光判断。
- **FR-STATIC-INPUT-07** 分类和宝可梦独立选择，候选随当前 Ruby、Sapphire、Fire Red、Leaf Green 或 Emerald 存档版本变化。

### 5.2 Method 与生成规则

- **FR-STATIC-METHOD-01** 普通定点支持 PokeFinder Method 1 与 Method 4 语义。
- **FR-STATIC-METHOD-02** Method 4 在第一、第二组 IV 随机数之间额外推进一次，不改变 PID 读取顺序。
- **FR-STATIC-METHOD-03** Latios/Latias 使用游走 IV 缺陷：第一组 IV 只保留低 8 位，第二组 IV 为零。
- **FR-STATIC-METHOD-04** 游走缺陷预设限制为 Method 1，界面必须禁用无效选项并显示原因。
- **FR-STATIC-METHOD-05** 输出包含 Advances、PID、六项 IV、性格、特性槽及其当前语言名称、性别、等级和闪光类型；特性名称必须由所选物种的 PokeFinder Personal 数据解析。

### 5.3 筛选

- **FR-STATIC-FILTER-01** 支持六项 IV 的最小值和最大值，范围为 `0..31`，最小值不得大于最大值。
- **FR-STATIC-FILTER-02** 性格与觉醒力量支持多选；特性槽、性别和异色使用上游选项，多个条件按 AND 组合。
- **FR-STATIC-FILTER-03** “任意”使用显式协议值，不使用看似有效的游戏属性作为魔法值。
- **FR-STATIC-FILTER-04** 筛选只移除生成后的状态，不改变 RNG 推进与候选顺序。
- **FR-STATIC-FILTER-05** 异色仅提供 `Any / Star / Square / Star-Square`；性别筛选不提供无性别项；特性仅提供 `Any / 0 / 1`。

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
- **FR-STATIC-UI-06** Method 使用下拉框；Bugged Roamer 隐藏 Method 4 并强制 Method 1。
- **FR-STATIC-UI-07** “显示能力值”使用当前物种、等级、性格与 IV 计算六项能力值，不改变排序使用的原始结果。
- **FR-STATIC-UI-08** Advances、处理数和结果数使用原始十进制数字显示，不添加本地化千位分隔符。

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
- **FR-PROFILE-11** 存档悬浮窗展开后点击外部页面区域自动收起；打开管理器时不得关闭或中断管理弹窗。

## 7. 当前应用基础：全局个体值计算器

- **FR-IVCALC-01** 提供 PokeFinder `IVCalculator` 的六个数据集：Gen III、Platinum、HGSS、BW2、SwSh 和 BDSP；按所选数据集提供 `1..386`、`1..493`、`1..493`、`1..649`、`1..898` 或 `1..493` 物种及对应形态。
- **FR-IVCALC-02** 支持性格、个性、可选觉醒力量及一行或多行等级与六项能力值观测；Gen III 不显示上游不存在的 Characteristic 控件。
- **FR-IVCALC-03** 每项枚举 `0..31` 并对多行结果取交集；无候选时显示上游“无效值”。
- **FR-IVCALC-04** 输入范围与 PokeFinder `IVCalculator.cpp::addEntry` 的 SpinBox 保持一致。
- **FR-IVCALC-05** 返回每项候选 IV 和上游 `IVChecker::nextLevel` 对应的下一级提示。
- **FR-IVCALC-06** 计算器作为全局默认收起的悬浮工具，在所有左侧 RNG 工作区均可打开；模块内入口与右下角工具轨指向同一面板。
- **FR-IVCALC-07** 该工具不得发起远端请求；其轻量确定性计算可以在 TypeScript 主线程同步完成。

## 8. 当前功能需求：`gen3wild` Generator/Searcher

### 8.1 输入与数据

- **FR-WILD-INPUT-01** Seed 接受 `0x00000000..0xFFFFFFFF` 的 32 位十六进制值；空输入按上游无符号输入行为解析为 `0`。
- **FR-WILD-INPUT-02** Initial Advances、Max Advances 和 Offset 接受 32 位无符号整数，三者相加不得溢出；Web 单任务最多处理 50,000,000 个状态。
- **FR-WILD-INPUT-03** 遭遇数据按当前全局掌机存档的 Ruby、Sapphire、Emerald、FireRed 或 LeafGreen 版本切换，TID/SID 同样来自当前存档。
- **FR-WILD-INPUT-04** 提供 Grass、Rock Smash、Surfing、Old Rod、Good Rod 与 Super Rod；地点列表只显示当前版本和遭遇类型中存在的地点。
- **FR-WILD-INPUT-05** 当前生成数据未保留 Tanoby Chamber 的未知图腾 form，七个 Chamber 必须从地点列表排除，不能按 form 0 生成错误结果。
- **FR-WILD-INPUT-06** `gen3Data.ts` 的原始输入来源、生成命令和精确 revision 必须在全地点验收前补记；固定地点核对不能替代完整数据来源记录。

### 8.2 Method 与特殊规则

- **FR-WILD-METHOD-01** 支持 PokeFinder Method 1、Method 2 与 Method 4 的 PID/IV 调用顺序。
- **FR-WILD-METHOD-02** 队首规则只在 Emerald 显示；支持 Synchronize、Cute Charm、Pressure、Hustle、Vital Spirit、Magnet Pull 与 Static。
- **FR-WILD-METHOD-03** Magnet Pull 只用于 Grass，Static 只用于 Grass 与 Surfing；Pressure、Hustle 与 Vital Spirit 共享上游等级修正规则。
- **FR-WILD-METHOD-04** Route 119 的三种鱼竿支持 Feebas Tile；RSE Safari Zone 执行上游额外 RNG 推进。
- **FR-WILD-METHOD-05** RSE Rock Smash 支持 Bike、Black Flute、Cleanse Tag 与 White Flute 的遭遇率修正；其他遭遇隐藏并清除这些设置。
- **FR-WILD-METHOD-06** 遭遇槽权重、等级、性格、PID、IV、Ability、Gender 与 Shiny 的计算顺序必须与 `WildGenerator3::generate` 一致。

### 8.3 筛选、Worker 与结果

- **FR-WILD-FILTER-01** 提供 25 种性格、16 种觉醒力量和当前遭遇表槽位的多选；未选择或全选按 `Any` 处理。
- **FR-WILD-FILTER-02** 提供 Shiny、Gender、Ability、Level 和六项 IV 闭区间筛选；“取消筛选”恢复完整掩码与范围。
- **FR-WILD-FILTER-03** 选择 Pokémon 时同步 Encounter Slot 与等级范围；手动修改筛选仍可覆盖联动值。
- **FR-WILD-TASK-01** `gen3wild` 使用独立 CMake target、C ABI 前缀、API 版本、Worker 文件和 Worker Pool，不在 React 主线程运行 RNG 循环。
- **FR-WILD-TASK-02** Generator 每个分片最多处理 100,000 个状态，Searcher 每个分片最多处理 10,000 个 IV 组合；Worker 数、结果上限、批次顺序、进度和取消遵循 ID/Static 的同一工程边界。
- **FR-WILD-TASK-03** 结果使用 60 字节定长记录和 transferable `ArrayBuffer` 返回。
- **FR-WILD-RESULT-01** 结果包含 Advances、Encounter Slot、Pokemon、Level、PID、Shiny、Nature、Ability、六项 IV、Hidden Power、Power 与 Gender，共 16 列。
- **FR-WILD-RESULT-02** Advances、处理数和结果数使用原始十进制数字，不添加本地化千位分隔符。
- **FR-WILD-RESULT-03** 结果支持数值排序、虚拟化显示、清空和带 UTF-8 BOM 的 CSV；结果达到 250,000 条时停止并提示。

### 8.4 Searcher

- **FR-WILD-SEARCH-01** Searcher 不接受 Seed、Initial Advances、Max Advances 或 Offset；它按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 的确定顺序枚举六项 IV 闭区间笛卡尔积。
- **FR-WILD-SEARCH-02** IV 组合总数不得超过 50,000,000；TypeScript 按最多 10,000 个组合分片，C ABI 同时校验 `startIndex + stateCount` 边界。
- **FR-WILD-SEARCH-03** Method 1/2 使用 PokeFinder 连续两次 IV 调用的逆推规则，Method 4 使用两次 IV 调用之间存在一次额外推进的逆推规则，不扫描完整 `2^32` Seed 空间。
- **FR-WILD-SEARCH-04** Searcher 的 Synchronize 是上游通用选项，不选择指定性格；None、Cute Charm、Pressure/Hustle/Vital Spirit、Magnet Pull 与 Static 沿用 `WildSearcher3` 分支。
- **FR-WILD-SEARCH-05** Searcher 应用 Feebas、Safari、RSE Rock Smash、槽位、等级、Nature、Hidden Power、Shiny、Gender 与 Ability 规则；Searcher 不提供 Generator 的“取消筛选”。
- **FR-WILD-SEARCH-06** Searcher 与 Generator 共享 API v3 `gen3wild` Wasm 模块和 60 字节结果记录；第一字段在 Generator 中解释为 Advances，在 Searcher 中解释为 Seed。
- **FR-WILD-SEARCH-07** Generator 与 Searcher 使用独立 Worker Pool 和取消生命周期；计算中不得切换操作标签或并发启动另一种操作。
- **FR-WILD-SEARCH-08** Route 111 全 31 IV 固定夹具必须覆盖 Method 1 + None、Method 2 + Synchronize、Method 4 + Cute Charm，并验证一个候选 Seed 能重新生成匹配状态。

## 8.1 当前功能需求：`gen3initialseed` Initial Seed Finder

### 范围

- `RS IDs` 根据 TID/SID 返回 Ruby/Sapphire 的全部初始 16 位 Seed 候选与帧数。
- `FRLG / RSE` 根据目标 32 位 Seed 反向 PokeRNG，返回初始 16 位 Seed 与帧数。
- 结果表支持排序、CSV、进度、取消和最多 `65536` 条结果。
- `RS IDs` 的 65536 个低位状态在一个 Wasm Worker 中完成；`FRLG / RSE` 以最多 500000 状态的分片使用独立 Worker/Wasm 实例并行处理。

### 约束

- TID/SID：十进制 `0..65535`；`Target Seed`：8 位十六进制 `0..0xFFFFFFFF`，空值为 `0`；`Max Results`：十进制 `1..65536`。
- 所有生产 RNG 计算必须在 `gen3initialseed` C++/Emscripten Wasm Worker 中执行。React/TypeScript 不得在主线程复写算法。
- 分片结果必须按反推帧顺序重组；取消后不得接收迟到 Worker 批次。
- 结果达到 `Max Results` 时停止剩余任务。取 `65536` 可能需要扫描一个完整周期，界面必须保留取消入口。
- `Initial Seed Finder`、`Target Seed`、`Max Results` 在 PokeFinder 简体中文翻译中无对应词条，保留英文；已有 `TID`、`SID`、`Seed`、`初始种子`、`帧数` 和 `检索` 复用上游词条。

详细算法、来源、输入限制和验收夹具见 [Gen 3 Initial Seed Finder](modules/gen3initialseed.md)。

## 8.2 当前功能需求：`gen3seedtotime` Seed to Time

- **FR-SEEDTOTIME-01** 提供 PokeFinder `Gen 3 Seed to Time` 的 `16/32-Bit Seed`、`Year`、只读 `Advances` 与 `Find`；结果表仅显示 `Time`。
- **FR-SEEDTOTIME-02** Seed 为最多 8 位十六进制 `0..0xFFFFFFFF`，空值按 `0`；Year 为十进制 `2000..2037`。浏览器输入允许临时清空，但无效年份不得启动 Worker。
- **FR-SEEDTOTIME-03** 输入 32 位 Seed 时，必须用 PokeRNGR 逆推到最接近的 16 位初始 Seed，回写 Seed 输入并显示完整推进次数；随后枚举该年份的日期和分钟。年份大于 `2000` 时必须保留 PokeFinder 的游戏日历缺陷。
- **FR-SEEDTOTIME-04** 使用独立 `gen3seedtotime` Wasm API v1、C ABI 与 Dedicated Worker；全年分钟枚举只在 Wasm 内执行，取消时终止当前 Worker，React/TypeScript 不得复制生产算法。
- **FR-SEEDTOTIME-05** 简体中文逐字复用 `PokeFinder_zh.ts` 的 `第三世代Seed查询时间`、`16/32位Seed`、`年份`、`帧数`、`查找` 和 `时间`；`PokeFinder_ja.ts` 对应词条均为 unfinished，因此日文保留英文源标签。

详细算法、来源、输入限制和验收夹具见 [Gen 3 Seed to Time](modules/gen3seedtotime.md)。

## 8.3 当前功能需求：`gen3ngcseed` GameCube Seed Finder

- **FR-NGCSEED-01** 提供 PokeFinder `GameCube Seed Finder` 的 `Gales`、`Colo` 和 `Channel` 三个页签；简中名称分别使用 `NGC Seed查询`、`XD`、`竞技场` 和 `频道`。
- **FR-NGCSEED-02** Gales 接受双方固定队首与四个十进制 HP；非空输入范围 `1..714`、最多 3 位，空值搜索时按上游 `getUShort()` 读取为 `0`；设置排列和 `Top/Bottom Left/Right HP` 语义必须与上游 `.ui` 一致。
- **FR-NGCSEED-03** Colo 接受 `Wes / Seth / Thomas` 与 8 个固定队首；Gales/Colo 支持多轮候选筛选、重置、进度、取消和单一 Seed 复制，三个页签分别保留自己的轮次、结果和状态。
- **FR-NGCSEED-04** Channel 提供 12 种固定方向模式；少于 10 条点击搜索时显示上游 `You must have at least 10 entries`，合法搜索范围精确覆盖 `0x40000001..0xFFFFFFFE`。
- **FR-NGCSEED-05** Gales/Colo 第一次搜索按上游通过 Yes/No 询问是否选择对应 `.precalc` 文件，决定保留到模块关闭。导入必须校验 25/24 个小端分区计数、完整文件长度与 Qt ISO 3309 校验值 `0xD75B / 0x097B`；文件只在本地内存中使用，不上传或持久化。
- **FR-NGCSEED-06** 使用独立 `gen3ngcseed` Wasm API v1、C ABI 和 Worker Pool；XDRNG、宝可梦生成和搜索调用顺序只在 C++/Wasm 内执行，TypeScript 只负责文件结构、分片、协议和显示。
- **FR-NGCSEED-07** Worker 必须校验 API、任务、分片、处理数量、结果数量、堆边界和取消；Pool 按 `chunkIndex` 恢复顺序，结果按 Seed 数值排序并去重。
- **FR-NGCSEED-08** PokeFinder `GalesSeedSearcher::searchSeedSkip()` 的 `enemyHPStat[enemyIndex + 5]` 越界必须记录为上游缺陷；Web bridge 使用有效的 `enemyHPStat[enemyIndex]`，不得将该差异写成已验收。

详细算法、输入、Precalc 格式和验收边界见 [GameCube Seed Finder](modules/gen3ngcseed.md)。

## 8.4 当前功能需求：`gen3ivtopid` IVs to PID

- **FR-IVTOPID-01** 提供 PokeFinder `IVs to PID` 的六项 IV、Nature 和 TID 输入；六项 IV 为 `0..31`，Nature 为 `0..24`，TID 为 `0..65535`，空 TID 作为 `0`。
- **FR-IVTOPID-02** 计算第三世代 Method 1、Reverse Method 1、Method 2、Method 4、XD/Colo 和 Channel；不输出第四世代 Cute Charm。
- **FR-IVTOPID-03** 输出 Seed、PID、SID、Method、Ability、12.5%、25%、50% 和 75% 性别比例九列，排序和 CSV 使用同一结果模型。
- **FR-IVTOPID-04** SID、PID 半字、性格和 Channel 固定 TID 修正规则必须与 `Core/Util/IVToPIDCalculator.cpp` 一致，React 不得复写 RNG 恢复算法。
- **FR-IVTOPID-05** 使用独立 `gen3ivtopid` Wasm API v1、C ABI 和 Dedicated Worker；计算期间主界面保持可交互，取消后必须销毁旧 Worker。
- **FR-IVTOPID-06** 简体中文逐字复用 `PokeFinder_zh.ts`；日文词条全部 unfinished 的控件保留英文源标签。

详细算法、来源、输入限制和验收夹具见 [Gen 3 IVs to PID](modules/gen3ivtopid.md)。

## 8.5 当前功能需求：`gen3egg` Egg Generator

- **FR-EGG-01** 支持 Emerald 的 `EBred`、`EBredSplit`、`EBredAlternate`，以及 Ruby/Sapphire/FireRed/LeafGreen 的 `RSFRLGBred`、`RSFRLGBredSplit`、`RSFRLGBredAlternate`、`RSFRLGBredMixed`；Emerald 固定使用上游初始 RNG 状态 `0`。
- **FR-EGG-02** RS/FRLG 接受 Held Seed 与 Pickup Seed 的 16 位十六进制输入，范围 `0..0xFFFF`，空值按 `0` 处理；Emerald 不显示这两项 Seed。
- **FR-EGG-03** 支持 Initial Advances、Max Advances、Offset、Calibration、Redraws、Compatibility、Egg Specie、当前存档 TID/SID，以及双方亲代的六项 IV、性别、性格和道具；所有范围与组合约束必须记录在模块文档并与上游 Form/Core 一致。
- **FR-EGG-04** 亲代组合必须遵守第三世代 Daycare 兼容性，非法组合不得启动 Wasm 任务；Emerald 的 Everstone 与性格匹配尝试次数遵循 `EggGenerator3`。
- **FR-EGG-05** 结果包含 Advances、Pickup Advances（适用时）、Redraws（Emerald）、PID、Ability、Gender、Nature、Shiny、六项 IV、六项遗传来源、Hidden Power 和 Hidden Power Strength；帧数保持原始十进制，不加入千位分隔符。
- **FR-EGG-06** 提供性格、觉醒力量、IV、能力、性别、特性和异色筛选；性格与觉醒力量均为多选，未选择或全选表示 `Any`；提供取消筛选、排序、虚拟化结果表和带 UTF-8 BOM 的 CSV。
- **FR-EGG-07** 使用独立 `gen3egg` Wasm API、C ABI、Dedicated Worker 和 Worker Pool；长范围任务分片运行，显示进度、结果上限和取消状态，不阻塞 React 主线程，不依赖 `SharedArrayBuffer`。
- **FR-EGG-08** Emerald 与 RS/FRLG 使用各自与 PokeFinder `EggModel3` 对齐的结果表列布局；翻译优先逐字复用 `PokeFinder_zh.ts`，无简中词条时保留英文源标签。

详细算法、来源、输入限制和验收夹具见 [Gen 3 Egg](modules/gen3egg.md)。

## 8.6 当前功能需求：`encounterlookup` 遇敌查询

- **FR-ENCOUNTER-01** 在右下角悬浮工具区提供默认收起的 `Encounter Lookup`，不进入左侧主模块导航；展开时与个体值计算器互斥，点击外部可收起。
- **FR-ENCOUNTER-02** 支持 PokeFinder 4.3.2 实际提供的 16 个版本：Ruby、Sapphire、FireRed、LeafGreen、Emerald、Diamond、Pearl、Platinum、HeartGold、SoulSilver、Black、White、Black 2、White 2、Brilliant Diamond、Shining Pearl。
- **FR-ENCOUNTER-03** 按版本提供宝可梦自动补全候选，图鉴上限分别为 Gen III `386`、Gen IV `493`、Gen V `649`、BDSP `493`；输入不存在的自由文本时不得返回结果。
- **FR-ENCOUNTER-04** 结果至少包含 `Location`、`Encounter Type` 和 `Level Range`，并覆盖上游对应世代的草丛、冲浪、钓竿、碎岩、撞树、捕虫大赛及 BDSP/DPPt/HGSS/Gen V 的特殊遭遇组合。
- **FR-ENCOUNTER-05** 使用本地静态生成数据，不增加后端、账号、遥测、运行时 CDN、Wasm 或 Worker；数据生成命令、EncounterTableGenerator revision、许可证和上游文件记录在模块文档与上游记录中。
- **FR-ENCOUNTER-06** 简体中文控件与结果列逐字复用 `PokeFinder_zh.ts`；日文未完成词条保留英文源标签，不自行扩展第六、七世代或 Sword/Shield。

详细数据规则、输入行为、来源和未运行验证项见 [遇敌查询](modules/encounterlookup.md)。

## 8.7 当前功能需求：`gen3spindapainter` 晃晃斑的斑点

- **FR-SPINDA-01** 在第三世代左侧模块导航提供 PokeFinder `Spinda Painter`；简体中文逐字使用 `晃晃斑的斑点`，不放入右下角悬浮工具。
- **FR-SPINDA-02** `PID` 为最多 8 位的十六进制 `0..0xFFFFFFFF`，空值按上游 `TextBox::getUInt()` 行为作为 `0`；输入不会补齐前导零。
- **FR-SPINDA-03** PID 驱动的四个斑点位置必须按各字节低/高半字节、PokeFinder 固定偏移和 8 像素网格映射。鼠标拖动被钳制在每个斑点的上游边界，反向 PID 取位置除以 8 的截断值；键盘方向键按 8 像素移动。
- **FR-SPINDA-04** 画布使用 PokeFinder 4.3.2 原始晃晃斑底图与四张斑点 PNG；显示 PID 派生的性格、性别和特性。性别比较 `PID & 0xFF` 与 Gen III 晃晃斑性别比例，特性槽取 `PID & 1`。
- **FR-SPINDA-05** 模块是确定性 UI 映射，不新增 Wasm、Worker、后端、账号、遥测或运行时 CDN；上游资源和 SHA-256 必须记录在模块文档与上游记录中。

详细映射、输入边界、资源与固定夹具见 [Gen 3 Spinda Painter](modules/gen3spindapainter.md)。

## 8.8 当前功能需求：`gen4static`

- **FR-G4STATIC-01** 支持 Diamond、Pearl、Platinum、HeartGold、SoulSilver 的 Static Generator/Searcher，以及 Method 1、Method J、Method K。
- **FR-G4STATIC-02** 支持 None、Synchronize、Cute Charm 队首规则；具体可用组合、PID 循环和 Seed 恢复以 PokeFinder 4.3.2 为准。
- **FR-G4STATIC-03** Generator 与 Searcher 六项 IV 默认均为 `0..31`，输入控件、IV 快捷操作、筛选、排序、CSV 和结果虚拟表风格与 G3 Static 对齐。
- **FR-G4STATIC-04** Generator 的 `Max Advances=N` 包含起点并处理 `N+1` 个状态；Searcher 按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 枚举 IV 闭区间笛卡尔积。
- **FR-G4STATIC-05** 结果显示 Advances 或 Seed、PID、异色、性格、特性、性别、六项 IV、觉醒属性、觉醒威力、个性、电话和音高；中文术语固定为“觉醒力量”“觉醒属性”“觉醒威力”。
- **FR-G4STATIC-06** 使用独立 `gen4static` Wasm API v1、C ABI、Worker 和 Worker Pool，不在 React 主线程或 TypeScript 中重写生产 RNG。
- **FR-G4STATIC-07** G4 存档使用独立 schema、IndexedDB/localStorage 键和 React 状态，不读取、覆盖或删除 G3 存档；全局个体值计算器不按当前世代拆分入口或状态。
- **FR-G4STATIC-08** G3/G4 页面均保留 Encounter Lookup；当前页面的存档、个体值计算器与 Encounter Lookup 三个悬浮工具必须互斥展开。

详细算法、输入、数据来源和结果布局见 [Gen 4 Static](modules/gen4static.md)、[Gen 4 Profiles](modules/gen4profiles.md)和[Gen 4 IV Calculator](modules/gen4ivcalculator.md)。

## 8.8 当前功能需求：`gen4wild`

- **FR-G4WILD-01** 支持 Diamond、Pearl、Platinum、HeartGold、SoulSilver 的 Wild Generator/Searcher；DPPt 使用 Method J，HGSS 使用 Method K，甜甜蜜树和宝可追踪使用对应独立方法。
- **FR-G4WILD-02** 支持草丛、冲浪、碎岩、三种钓鱼、甜甜蜜树、捕虫大赛和 HGSS 撞树，以及时间、大量出现、双插槽、宝可追踪、广播、大湿地/后院替换、丑丑鱼和 HGSS 狩猎地带模块。
- **FR-G4WILD-03** Generator 与 Searcher 六项 IV 默认均为 `0..31`；布局、筛选顺序、IV 快捷键、排序、CSV、虚拟表、进度和取消与 G3 Wild 对齐。
- **FR-G4WILD-04** Seed 为空时按 `0`；Advances/Offset 使用 `u32`；Delay 使用 `u16`；Happiness 只接受 `0/20/30/40/50`；Safari blocks 每项为 `0..99`。
- **FR-G4WILD-05** 甜甜蜜树和宝可追踪必须选择单个遭遇槽位；捕虫大赛和 HGSS 狩猎地带 Searcher 至少一项最小 IV 为 `31`。
- **FR-G4WILD-06** 结果对齐 PokeFinder `WildModel4`：Searcher 可见列不显示内部 Delay/Hour；Generator 显示 `Battle Advances`，HGSS 额外显示电话；中文术语固定为“觉醒力量”“觉醒属性”“觉醒威力”。
- **FR-G4WILD-07** 使用独立 `gen4wild` Wasm API v1、75-word 请求、19-word 槽位、22-word 结果、Worker Pool 和 C ABI，不在 React 主线程或 TypeScript 中重写生产 RNG。
- **FR-G4WILD-08** G4 Wild 使用独立 G4 存档和全局单一个体值计算器入口，不读取、覆盖或删除 G3 存档及其工具。

详细算法、输入、数据来源和验证状态见 [Gen 4 Wild](modules/gen4wild.md)。

## 8.9 当前功能需求：第三世代补全模块

- **FR-G3GC-01** `gen3gamecube` 提供 XD、Colosseum、Channel 的 GameCube Generator/Searcher，覆盖 Non Shadow Locks、Channel、Shadow Locks、First Shadow Unset 和上游 69/1/77 条模板。
- **FR-G3GC-02** Generator 使用 Seed、Initial/Max Advances、Offset 和完整 StateFilter；Searcher 按六项 IV 闭区间枚举，两个入口均使用独立 Worker Pool 和 API v1 C ABI。
- **FR-PIDTOIV-01** `gen3pidtoiv` 输入一个 32 位 PID，返回 Method 1/2/4、XD/Colo 与 Channel 的 Seed 和六项 IV，计算仅在 Dedicated Worker/Wasm 中执行。
- **FR-POKESPOT-01** `gen3pokespot` 提供 XD 三个 PokeSpot 区域、Food/Encounter 双 Seed 与双 Advances/Offset、宝可梦/槽位和完整 WildStateFilter。
- **FR-POKESPOT-02** PokeSpot 默认闭区间组合数为 `100020001`；请求按 Food 轴拆分、最多使用 8 个独立 Worker、按 `chunkIndex` 恢复顺序，超过固定组合或结果上限时拒绝或停止。
- **FR-JIRACHI-01** `gen3jirachi` 输入 Starting Seed、Target Seed、Max Advances 与 Brute Force Range，输出上游 Reload/Reject/Cutscene/Accept 操作序列，并保留超范围与不可获得错误。
- **FR-G3TOOLS-01** 四模块的简体中文控件严格复用 `PokeFinder_zh.ts`；unfinished 词条保留英文；输入进制、位宽、空值和跨字段约束同时在 HTML/domain/Wasm 边界实现。

详细算法、输入限制、ABI 和验证状态见 [GameCube RNG](modules/gen3gamecube.md)、[PID to IVs](modules/gen3pidtoiv.md)、[PokeSpot](modules/gen3pokespot.md) 和 [Jirachi Advancer](modules/gen3jirachiadvancer.md)。

## 8.10 当前功能需求：`pokerusfinder`

- **FR-POKERUS-01** 提供 DevonStudios Pokerus Finder 的 Gen III、Gen IV DP 和 Gen IV PtHGSS 三个模式；中文产品名称为“宝可病毒”，第三世代和第四世代入口分别归入对应世代主分组，不建立独立工具分组。
- **FR-POKERUS-02** Gen III/DP 复用上游 `Initial Seed`、`Frame`、`Delay` 控件语义和十六进制/十进制边界；Gen III 最大 9,999,999 帧，DP 最大 99,999 帧。
- **FR-POKERUS-03** PtHGSS 提供上游 Date、Hour、Minute 交互，并在结果中显示 Frame、Seed、Delay、Second 四列。
- **FR-POKERUS-04** 32 位 LCG 搜索和日期反推只运行在独立 Wasm Worker，React 不重写生产算法。
- **FR-POKERUS-05** 保留 GPL-3.0 许可证、上游署名、来源 revision 和对应源码记录。

详细算法、输入限制、结果布局和许可证边界见 [Pokerus Finder](modules/pokerusfinder.md)。

## 9. 后续 MVP

第四世代 ID/Static/Wild 与 Encounter Lookup 通过工程检查、部署页面回归和项目所有者最终验收后，按以下顺序推进：

1. 第四世代 Wild 的 Actions、Pages 部署回归和项目所有者最终验收。
2. Tanoby Chamber form 数据、来源记录与固定夹具。
3. PWA 离线加固、浏览器矩阵、可访问性和性能基线。

Egg Searcher、Masuda、第四世代孵化等第三世代/第四世代功能在上述 MVP 后评估。第四世代当前实现 `gen4id`、`gen4static` 与 `gen4wild`；其他第四世代功能仍为候选边界。

## 10. 非目标

- 后端、账号、云同步、服务端计算、遥测、广告或运行时 CDN。
- 模拟器、主机、存档文件或进程内存的实时连接。
- 对 PokeFinder Qt 界面的逐像素复刻。
- 为当前模块引入 React Router、全局状态框架、通用表单框架或大型 UI 组件库。
- 依赖 `SharedArrayBuffer`、Wasm pthread 或静态托管无法保证的响应头。
- 未经授权的官方精灵图、音乐、Logo 或其他游戏素材。

## 11. 非功能需求

### 11.1 正确性

- `gen3id`、`gen3seedtotime`、`gen3ngcseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3pidtoiv`、`gen3egg`、`gen3gamecube`、`gen3pokespot` 与 `gen3jirachi` C++ bridge 的固定输入结果必须与已记录的 PokeFinder 4.3.2 夹具或生产回归逐字段一致；`gen3initialseed` 的 RS ID 输入与公开算法参考的固定候选必须一致；`gen3spindapainter` 的 PID/位置双向映射与斑点边界必须与 `SpindaPainter` 一致。
- TypeScript 只负责输入规范化、分片和解码，不改变 Core 的 RNG 规则。
- C ABI 和 Worker 协议必须带显式 API 版本；版本不匹配时拒绝运行。
- 上游源码文件、版本、SHA-256、修改边界和许可证必须可追溯。

### 11.2 性能与稳定性

- 计算不得在 React 主线程执行。
- 批次大小、Worker 数量、结果上限和任务上限必须有显式边界。
- Worker 崩溃、Wasm 初始化失败和结果缓冲区异常不得产生看似有效的部分完成状态。
- 性能结论必须记录设备、浏览器、Worker 数、范围和耗时，不以单一开发机推断所有用户环境。

### 11.3 隐私与数据

- IndexedDB 保存存档信息，localStorage 保存存档镜像、语言、主题和悬浮窗折叠状态。
- 存档信息不放入 URL、日志或远端请求。
- 应用不发送 TID、SID、Seed、筛选条件或结果。
- 清除站点数据会删除设置、PWA 缓存和存档信息；项目没有服务器备份。

### 11.4 可维护性

- 每个 Wasm 功能使用独立目录、manifest、CMake target、C ABI 前缀和测试。
- 一键入口保持为 `npm run build`，不同原生语言的工具链由模块构建驱动封装。
- JavaScript 依赖通过 `package-lock.json` 复现；发布工具链使用精确版本。
- 新依赖只有在对应功能开始实现且能减少实际复杂度时加入。
- 第四世代扩展必须使用共享模块契约和独立 API 版本；接口预留不得自动进入导航、默认构建或产品范围。

## 12. 浏览器支持

目标是支持具备 ES modules、WebAssembly、Dedicated Worker、可转移 `ArrayBuffer`、Service Worker、Cache Storage、IndexedDB 和 `localStorage` 的当前稳定版桌面及移动浏览器。

优先验证：

- Chromium 系：Chrome、Edge、Android Chrome。
- Firefox 桌面版。
- Safari / iOS Safari。

本阶段不声明已经通过具体浏览器版本。每次预览或发布应记录实际测试的浏览器完整版本、设备和结果；Service Worker 正式环境要求 HTTPS，本地允许 `localhost`。

## 13. 验收标准

### 13.1 工程门槛

以下项目全部通过后，当前模块才能进入部署页面回归：

1. `npm ci --engine-strict` 使用已提交 lockfile 成功安装。
2. `npm run verify` 通过格式、lint、类型、TypeScript 单元测试和 Web 构建。
3. `npm run wasm:test:native` 通过 ID Generator 三种模式、RS ID Searcher SID/PID/无解、Initial Seed RS ID 固定候选、Seed to Time 的 2000 年时间表与 32 位回推、NGC Seed C ABI 输入边界、G3 Static Method 1/4、Searcher 反向恢复、游走缺陷、Wild Route 111 Generator/Searcher、IVs to PID Channel/Method 2、PID to IVs、GameCube Channel、PokeSpot、Jirachi、Egg Emerald/RSFRLG、G4 Static Method 1/J/K、Synchronize、Cute Charm、Searcher、G4 Wild Route 222 Generator/Searcher、Gen7 ID、宝可病毒与错误边界夹具。
4. `npm run wasm:build` 生成默认十六个模块的 MJS/Wasm 产物，包括 `gen3gamecube`、`gen3pidtoiv`、`gen3pokespot` 与 `gen3jirachi`。
5. `npm run build` 生成包含 Worker、Wasm、PWA 与法律文件的 `dist/`。
6. GitHub Pages 地址能加载首页、Worker 和 Wasm，控制台无资源 404。
7. `npm run build:ui` 和 `npm run preview:ui` 不依赖 Wasm 产物，可以完成本地 UI 验收。

### 13.2 部署页面算法回归

项目所有者使用 GitHub Desktop 提交并完成 GitHub Pages 部署，再把实际 URL 交给 Codex。Codex 至少检查：

1. ID Generator 三种模式各使用一组已知输入比对 PokeFinder 结果。
2. RS ID Searcher 使用 TID `48163`、SID `64377` 和 PID `0000475A` 核对 Seed、帧数、日期、TSV 与异色。
3. Initial Seed Finder 使用 TID `48163`、SID `64377` 核对 `05A0 / 0` 与 `C19B / 36724`，并用 Target Seed `00006073` 核对 `0000 / 1`；Target Seed 工作流按模块文档的固定输入核对帧顺序与结果上限。
4. Static Generator/Searcher 的 Method 1、Method 4 与 Latios/Latias 游走缺陷各使用已知输入比对。
5. Wild Generator/Searcher 使用 Route 111、Feebas 或 RSE 特殊规则固定输入核对槽位、等级、PID、IV 与筛选。
6. ID 的 TID、SID、TSV 筛选，以及 Static/Wild 的 IV、性格、特性、性别、闪光、觉醒力量和遭遇槽位筛选。
7. 大范围任务的进度、取消、页面响应和结果上限提示。
8. ID、Initial Seed、NGC Seed、G3/G4 Static、Wild、IVs to PID 与 Egg 的结果排序、复制/CSV 内容、清空结果和移动端横向滚动。
9. Wild Generator/Searcher 的 Route 111、Feebas、Safari、Rock Smash、Synchronize、Cute Charm、Pressure、Magnet Pull 与 Static 固定输入比对。
10. Seed to Time 使用 `00000000 / 2000` 核对 7 条时间、首条 `2000-03-30 18:22:00` 和末条 `2000-12-29 02:10:00`；再以 `40000000 / 2000` 核对回写原始 Seed `1AA5` 与 Advances `66861`。
11. NGC Seed 逐页签与 PokeFinder 4.3.2 比对多轮结果、Channel 方向输入、Precalc Yes/No 决策、单结果复制、取消和 Gales 首轮已记录差异；空 HP 与直接输入 `0` 的行为分别核对。
12. IVs to PID 使用 `0/0/0/0/0/0`、Nature `0`、TID `12345` 核对 Channel 的 `56654838 / DC2DA271 / 48333`，并使用 `31/31/31/0/31/31`、Nature `0`、TID `12345` 核对 Method 2 的 `36E6808A / 02B0100B / 8832`；确认空 TID 等价于 `0` 且不显示第四世代 Cute Charm。
13. G4 Static 使用已记录固定输入核对 Method 1/J/K、Synchronize、Cute Charm、`Max Advances + 1`、Searcher Seed、PID 和六项 IV；同时确认 G3/G4 存档独立，个体值计算器保持全局单一入口。
14. G4 Wild 使用已记录 Route 222 固定输入核对 Method J Generator/Searcher，并抽样 HGSS Method K、甜甜蜜树、宝可追踪、捕虫大赛、狩猎地带、单槽与 31 IV 约束；确认 Searcher 不显示 Delay/Hour。
15. 宝可病毒查询使用 Gen III、Gen IV DP、Pt/HGSS 固定输入核对三种模式、日期反推和结果列。
16. GameCube RNG 使用 Channel Jirachi 和至少一个 XD/Colosseum Shadow 模板核对 Generator/Searcher；PID to IVs 使用 PID `0`；PokeSpot 使用两个 Seed `0` 与 `0..9`；Jirachi 使用上游固定 `compute_seed` 和操作序列。
17. GitHub Pages 在线加载十六个 Worker/Wasm 模块，控制台无资源、API 握手或 Worker 错误。
18. 记录部署 URL、对应 commit/Actions run、浏览器版本、输入、预期、实际结果和未覆盖项。

算法回归必须使用真实生产 Wasm，不能使用 `ui` 预览模式。无法从部署页面确认的原生夹具、移动设备性能或离线安装行为必须明确列为未覆盖。

### 13.3 项目所有者最终验收

项目所有者至少检查简体中文/英文/日文切换、存档信息 CRUD 与导入导出、主题和悬浮窗、真实桌面/移动设备布局、PWA 安装与离线重载。界面布局和交互可以先在 UI 预览模式检查，RNG 结果仍以 13.2 的生产 Wasm 回归记录为准。

界面布局、文案和交互可以先在 UI 预览模式验收；RNG 结果、Worker 性能和离线完整功能仍必须在真实 Wasm 构建中验收。

当前状态不得写成“已验收”，直到部署页面算法回归和项目所有者最终验收都已记录结果。

## 14. 阶段划分

- **阶段 0：仓库基线** - README、需求、技术方案、进度文档、许可证、npm 基线（已完成）。
- **阶段 1：`gen3id` Generator/Searcher** - React UI、Generator Worker Pool、独立 Searcher Worker、C++ bridge API v2、三语和固定夹具（已实现，待 Actions、部署回归与最终验收）。
- **阶段 2A：`gen3static` Generator** - 独立 Wasm/Worker、Method 1/4、游走缺陷、筛选和结果（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 2B：Static Searcher** - 反向恢复、搜索协议、结果边界和上游一致性测试（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 2C：`gen3initialseed`** - RS TID/SID 与目标 Seed 初始种子反推、独立 Wasm/Worker、分片、进度、取消、排序和 CSV（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 2D：`gen3seedtotime`** - 第三世代 Seed 到日期时间、32 位回推、独立 Wasm/Worker、固定夹具和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 2E：`gen3ngcseed` GameCube Seed Finder** - XD、竞技场、频道、Precalc、独立 Wasm/Worker Pool 和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 3：三代存档信息** - IndexedDB、localStorage 镜像、CRUD、导入导出、清除和悬浮窗（已进入 Git 基线，待项目所有者验收）。
- **阶段 4A：`gen3wild` Generator** - 遭遇数据、独立 Wasm/Worker、特殊规则、完整筛选和一致性夹具（已实现，待 Actions、部署回归与最终验收）。
- **阶段 4B：Wild Searcher** - IV 反向检索、完整 Wild 筛选和独立 Worker Pool（已实现，待 Actions、部署回归与最终验收）。
- **阶段 5：`gen3ivtopid` IVs to PID** - 六项 IV 反推第三世代 PID、独立 Wasm/Worker、九列结果、输入校验和算法文档（已实现，待 Actions、部署回归与最终验收）。
- **阶段 6：`gen3egg` Egg Generator** - 第三世代 Emerald 与 RS/FRLG 孵化生成、亲代遗传、筛选、结果表、独立 Wasm/Worker 和算法文档（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 6A：`gen3gamecube` GameCube RNG** - XD/Colosseum/Channel Generator/Searcher、模板数据、独立 Wasm/Worker Pool 和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 6B：`gen3pidtoiv`、`gen3pokespot`、`gen3jirachi`** - 第三世代 PID to IVs、XD PokeSpot、Channel Jirachi Advancer、独立 Wasm/Worker 和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **静态工具：`encounterlookup`** - PokeFinder 4.3.2 支持的 Gen III、Gen IV、Gen V 与 BDSP 遇敌查询（已进入上游基线，待部署回归与最终验收）。
- **阶段 6B：`gen3spindapainter`** - PID 与晃晃斑斑点双向映射、原始 PNG、拖动和键盘交互、输入边界及模块文档（已进入主分支，待工程检查、Actions、部署回归与最终验收）。
- **阶段 7：`gen4static` Static Generator/Searcher** - 第四世代 Method 1/J/K、独立 G4 存档、全局个体值计算器、Wasm/Worker 和算法文档（当前合并工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 7B：`gen4wild` Wild Generator/Searcher** - 第四世代 Method J/K、甜甜蜜树、宝可追踪、特殊遭遇表、独立 Wasm/Worker 和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 8：发布加固** - 浏览器矩阵、PWA、性能、可访问性、GPL inventory 和 Cloudflare 正式部署。

## 15. 未决事项

- Cloudflare Pages 正式项目名和 `hakuhiro.top` 下的主机名。
- GitHub Pages 实机测试后的 ID/Static 分片大小、默认 Worker 数和取消耗时基线。
- Static encounter presets 的完整导入范围和分批验收顺序。
- Pages 预览稳定后何时加入 Playwright 和 Testing Library。
- Wild 遭遇数据所用 `EncounterTableGenerator` 精确 revision、完整生成命令和 Tanoby Chamber form 数据导入方式。
