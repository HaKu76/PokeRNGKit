# PokeHero（工作名）产品需求

> - 状态：阶段 0 基线
> - 更新日期：2026-08-11
>   品牌状态：英文名与中文名均待定；`PokeHero` 仅为当前工作标识

## 1. 背景

PokeHero（工作名）将 Admiral-Fish/PokeFinder 的第三世代 RNG 能力带到浏览器。当前只读分析基于 PokeFinder 4.3.2：Core 与 Qt 基本解耦，但线程/SIMD、Qt Form 中的业务规则，以及依赖本地文件的 `ProfileLoader` 不能直接照搬到静态 Web 环境。

本文后续使用 `PokeHero` 仅作为技术与目录标识，不表示名称已经确认。正式英文名计划另行选择，中文名也不在本阶段预设。

产品采用 Web 原生界面，复用并移植经过验证的三代 C++ Core，通过 Emscripten 编译为 WebAssembly，在 Web Worker 内执行。应用无后端、无账号，能够部署到普通静态托管并在首次加载后离线运行。

## 2. 术语

- **档案（Profile）**：保存游戏版本、TID、SID、电池状态等会影响 RNG 计算的用户配置。
- **Generator**：从已知种子和推进范围正向生成状态。
- **Searcher**：从目标 IV 等约束反向搜索可能的种子或状态。
- **Static**：固定或静态遭遇，包括由上游模板定义的礼物、定点、传说、游走等类别。
- **Wild**：草丛、碎岩、冲浪和钓鱼等野生遭遇。
- **上游一致性**：在相同版本、档案、方法、种子、推进和筛选条件下，PokeHero 的领域结果与 PokeFinder 4.3.2 测试基线一致。

## 3. 产品目标

1. 为第三世代 RNG 用户提供无需下载安装桌面程序的可靠工具。
2. 保留 PokeFinder 三代算法的可验证正确性，不在 TypeScript 中重新实现核心 RNG。
3. 让计算、档案和偏好全部留在浏览器本地，不要求用户上传游戏或个人数据。
4. 在 GitHub Pages、Cloudflare Pages 等普通静态托管上工作，不依赖特定响应头或服务器功能。
5. 为后续三代功能保留清晰边界，但先把 Static/Wild 做完整。

## 4. 非目标

MVP 明确不处理：

- 第一、二、四至九世代功能。
- Egg、ID、GameCube、PokeSpot、Jirachi、PID to IV、Seed to Time 等非 Static/Wild 工作流。
- 与模拟器、主机、存档文件或内存读取器的实时连接。
- 用户账号、跨设备云同步、服务端计算、排行榜或社交功能。
- 对 PokeFinder Qt 界面的逐像素复刻。
- 依赖 Wasm threads、`SharedArrayBuffer`、COOP/COEP 或 cross-origin isolation 的并行加速。
- 分发未经许可的官方精灵图、音频、Logo 或其他游戏素材。

## 5. 目标用户与场景

### 5.1 第三世代 RNG 用户

用户选择已有档案，输入种子、方法和推进范围，生成 Static 或 Wild 结果；使用 IV、性格等条件缩小结果，在表格中排序并导出 CSV。

### 5.2 目标反查用户

用户知道目标 IV 范围及其他约束，启动耗时搜索；界面持续显示进度和新增结果，用户可以随时取消，已产生的结果仍可查看或导出。

### 5.3 多设备或离线用户

用户在受支持浏览器中首次打开并安装 PWA，之后在无网络环境下继续使用。用户清楚档案只保存在当前浏览器，清除站点数据会删除档案。

### 5.4 中英文用户

用户可随时切换简体中文和英文；输入值、任务状态、错误信息、表头和 CSV 表头遵循当前语言，但数值语义和排序不受语言影响。

## 6. 功能需求

需求编号用于测试、Issue 和发布清单追踪。未标为“后续”的条目均属于 MVP。

### 6.1 应用基础

- **FR-APP-01** 应用应提供档案、Static、Wild 和设置入口，并支持浏览器前进、后退及可分享的非敏感页面 URL。
- **FR-APP-02** 首次进入计算页且没有档案时，应引导用户创建档案，不应使用隐式默认 TID/SID 产生看似有效的结果。
- **FR-APP-03** 应在全局可见位置切换简体中文和英文，并持久化选择。
- **FR-APP-04** Wasm 初始化失败、Worker 崩溃、存储不可用或数据版本不兼容时，应显示可执行的恢复操作，不得静默失败。
- **FR-APP-05** 页面刷新不应破坏已保存档案和设置；运行中的计算可以终止，但不得留下“仍在运行”的错误状态。

### 6.2 三代档案

- **FR-PROFILE-01** 用户可以创建、查看、编辑、复制、选择和删除档案；删除必须二次确认。
- **FR-PROFILE-02** MVP 档案支持 Ruby、Sapphire、Emerald、FireRed 和 LeafGreen。XD/Colosseum 档案随 GameCube 功能后续加入。
- **FR-PROFILE-03** 档案字段至少包括：稳定 ID、名称、游戏版本、TID、SID、Dead Battery、创建时间、更新时间和数据 schema 版本。
- **FR-PROFILE-04** 名称去除首尾空白后必须非空；TID/SID 必须为 `0..65535` 的整数；Dead Battery 只在上游规则适用时参与计算。
- **FR-PROFILE-05** 编辑档案后，所有新任务必须使用新快照；已运行任务不接受档案的隐式热更新。
- **FR-PROFILE-06** 首次 schema 创建和后续迁移必须是事务性的。失败时保留可恢复的旧数据，不得部分覆盖。
- **FR-PROFILE-07** 用户可以删除 PokeHero 在当前站点保存的全部档案与设置。
- **FR-PROFILE-08（后续）** 档案 JSON 备份、导入和冲突合并在 MVP 后评估，不与结果 CSV 混用。

### 6.3 Static Generator

- **FR-STATIC-G-01** 用户选择档案、Method 1 或 Method 4、上游模板允许的 Static 类别和目标。
- **FR-STATIC-G-02** 用户输入 32 位十六进制种子、Initial Advances、Max Advances 和 Offset；界面应同时提供明确格式提示与范围校验。
- **FR-STATIC-G-03** 类别、目标、等级和方法必须按档案版本及上游模板联动；不适用选项不得提交给 Core。
- **FR-STATIC-G-04** Generator 应按确定性顺序返回范围内结果，并可应用第 6.7 节中适用的筛选条件。
- **FR-STATIC-G-05** 对上游标记的 bugged roamer 等特殊模板，应复现上游允许的方法和规则，不通过 UI 猜测修正算法。

### 6.4 Static Searcher

- **FR-STATIC-S-01** 用户选择档案、Method、Static 类别和目标，并至少提供六项 IV 的最小值/最大值。
- **FR-STATIC-S-02** 每项 IV 范围必须为 `0..31` 且最小值不大于最大值；无有效范围时不得启动。
- **FR-STATIC-S-03** 搜索在 Worker 内执行，启动后立即返回任务 ID；界面不得被长循环阻塞。
- **FR-STATIC-S-04** 搜索应分批返回新增结果、单调递增的进度和最终汇总。
- **FR-STATIC-S-05** 用户可以取消搜索；取消后不再接收新结果，保留已经确认的批次，并明确显示“已取消”而非“完成”。

### 6.5 Wild Generator

- **FR-WILD-G-01** 用户选择档案、Wild 1/Wild 2/Wild 4、Lead、遭遇类型和地点。
- **FR-WILD-G-02** 遭遇类型至少覆盖 Grass、Rock Smash、Surfing、Old Rod、Good Rod 和 Super Rod；具体可用性由版本和遭遇数据决定。
- **FR-WILD-G-03** 用户输入种子、Initial Advances、Max Advances 和 Offset，并可配置 Black Flute、Cleanse Tag、White Flute、Feebas Tile、Bike 等上游适用条件。
- **FR-WILD-G-04** 地点、Pokemon、遭遇槽和等级范围必须随版本、遭遇类型和前置条件联动。
- **FR-WILD-G-05** Generator 应返回对应遭遇状态，并应用适用的 Wild 筛选条件。

### 6.6 Wild Searcher

- **FR-WILD-S-01** 用户选择与 Wild Generator 等价的档案、方法、Lead、遭遇和地点上下文，并提供有效 IV 范围。
- **FR-WILD-S-02** Pokemon、遭遇槽和等级筛选必须反映所选地点的真实遭遇表；“任意”不能被编码成一个具体槽位。
- **FR-WILD-S-03** 搜索任务遵循与 Static Searcher 相同的 Worker、分批、进度、取消和错误语义。
- **FR-WILD-S-04** Feebas Tile、Bike、道具与 Rock Smash 等条件只在上游规则适用时展示和提交。

### 6.7 筛选

- **FR-FILTER-01** 通用筛选至少包括六项 IV 范围、性格、特性、性别、闪光类型和觉醒力量类型。
- **FR-FILTER-02** Wild 额外支持遭遇槽、等级和 Pokemon 筛选；Static 不显示无意义的遭遇槽与等级筛选。
- **FR-FILTER-03** 支持“任意”或多选的筛选项必须在协议中表达为显式集合/空约束，不使用易混淆的魔法数字。
- **FR-FILTER-04** 筛选校验失败时，应定位字段并保留用户输入；不得启动部分有效的任务。
- **FR-FILTER-05** Generator 与同类 Searcher 之间可以显式复制适用设置和筛选，但不得自动覆盖用户另一侧未保存的输入。
- **FR-FILTER-06** “Show Stats” 只影响派生列展示，不影响 RNG 结果集合。

### 6.8 结果、排序与导出

- **FR-RESULT-01** 公共结果列至少覆盖 Advances、PID、IVs、Nature、Ability、Gender、Shiny、Hidden Power；按工作流增加 Seed、Level、Encounter Slot、Pokemon 等字段。
- **FR-RESULT-02** 表格应支持多列排序、显示/隐藏列和大量结果的虚拟化或等价性能方案。
- **FR-RESULT-03** 排序使用原始数值或枚举码，不使用本地化后的显示字符串进行数值排序。
- **FR-RESULT-04** 分批到达时不得改变已确认行的身份；相同请求的批次序号必须连续并可检测遗漏。
- **FR-RESULT-05** CSV 导出默认包含当前结果全集和当前可见列顺序，并明确是否导出筛选后的子集。
- **FR-RESULT-06** CSV 使用 UTF-8（带 BOM 以兼容常见表格软件）、RFC 4180 风格引号转义和稳定列顺序；十六进制与超过安全整数范围的值按文本导出，避免精度或前导零丢失。
- **FR-RESULT-07** 空结果、已取消结果和失败任务的导出状态必须可区分。

### 6.9 任务生命周期

- **FR-TASK-01** MVP 每个计算 Worker 同一时间只执行一个任务；启动新任务前必须完成、取消或显式替换旧任务。
- **FR-TASK-02** 状态机至少包含 `idle`、`initializing`、`running`、`cancelling`、`completed`、`cancelled` 和 `failed`。
- **FR-TASK-03** 进度未知时显示不确定进度，已知时显示 `completed/total`；不得伪造百分比。
- **FR-TASK-04** 取消操作必须幂等。完成与取消竞争时，以 Worker 发出的单一终态为准。
- **FR-TASK-05** Worker 意外退出后允许重新初始化；旧请求 ID 的迟到消息必须被忽略。

### 6.10 国际化与离线

- **FR-I18N-01** 所有用户可见应用文本进入翻译资源，不在业务组件中硬编码双语条件。
- **FR-I18N-02** Pokemon、地点、性格等领域词汇使用稳定 ID 与本地化字典映射；Wasm 不返回最终显示文案。
- **FR-I18N-03** 缺失翻译在开发和 CI 中可检测；生产环境回退到英文并保留可诊断信息。
- **FR-PWA-01** 应用可安装为 PWA，并缓存应用壳、Worker、Wasm、领域数据和双语资源。
- **FR-PWA-02** 首次成功在线访问后，离线重载必须进入可用应用，已保存档案可读取，Static/Wild 核心流程可运行。
- **FR-PWA-03** 更新使用内容哈希和原子缓存切换；运行中不强制刷新，新版本可用时由用户确认更新。
- **FR-PWA-04** 不缓存第三方运行时资源，因为生产应用不得依赖运行时 CDN。

## 7. 非功能需求

### 7.1 正确性

- **NFR-CORRECT-01** Static Generator/Searcher 与 Wild Generator/Searcher 的固定夹具必须逐字段匹配 PokeFinder 4.3.2 基线。
- **NFR-CORRECT-02** 32/64 位整数跨 Wasm 边界时不得隐式转换为可能丢精度的 JavaScript `number`。
- **NFR-CORRECT-03** 结果顺序、筛选和 CSV 在同一输入与版本下必须可复现。

### 7.2 性能与响应性

- **NFR-PERF-01** Wasm 初始化和搜索不得阻塞主线程超过一帧预算；重计算、序列化和批次拼装放在 Worker。
- **NFR-PERF-02** 长任务运行时，输入、滚动和取消按钮保持可响应。
- **NFR-PERF-03** 取消确认的 p95 目标不超过 500 ms；Worker 分片目标不超过 100 ms，最终数值由验证设备测量后调整。
- **NFR-PERF-04** 约定夹具工作负载的 Wasm 单线程耗时不得超过同机 `-O3 -DSIMD=OFF` 原生基线的 3 倍，峰值内存不得超过 512 MiB。
- **NFR-PERF-05** 结果按有界批次传输，主线程不得为一次任务无限保留重复副本。

### 7.3 可靠性与兼容性

- **NFR-REL-01** 刷新、Worker 崩溃、配额不足和数据库迁移失败均有确定恢复路径。
- **NFR-REL-02** 生产资源使用内容哈希；Wasm JS 胶水、`.wasm`、Worker 和协议版本必须相互兼容。
- **NFR-REL-03** 应用在静态站点子路径部署时，不得使用硬编码根路径。
- **NFR-REL-04** 基线功能不依赖 `SharedArrayBuffer` 或跨源隔离。

### 7.4 可访问性与易用性

- **NFR-A11Y-01** 目标符合 WCAG 2.2 AA：键盘可达、可见焦点、语义标签、错误关联、颜色对比和减少动画偏好。
- **NFR-A11Y-02** 表格、进度和任务终态可被辅助技术理解；进度高频更新不得造成持续朗读干扰。
- **NFR-A11Y-03** 桌面是高密度计算工作流的首要体验；移动端必须无内容遮挡并能完成核心流程，但不要求复制桌面列密度。

### 7.5 安全与供应链

- **NFR-SEC-01** 不渲染未净化 HTML；导出 CSV 时防止以 `=`, `+`, `-`, `@` 开头的用户可控单元格被表格软件解释为公式。
- **NFR-SEC-02** CI 使用 lockfile 的冻结安装，依赖升级通过独立变更和测试进入。
- **NFR-SEC-03** 静态托管配置应支持严格 CSP；不引入 `eval` 型生产依赖或远程脚本。
- **NFR-SEC-04** 发布保留 Software Bill of Materials 或等价依赖清单，并执行已知漏洞审查。

### 7.6 许可证与可追溯性

- **NFR-LIC-01** 所有采用的 PokeFinder 文件保留原始版权与 GPL 头部。
- **NFR-LIC-02** 仓库记录上游版本、精确提交或归档校验和、导入范围和本地补丁。
- **NFR-LIC-03** 每次发布 Wasm 时提供对应完整源码、构建脚本、许可证和上游署名入口。
- **NFR-LIC-04** 所有领域数据与视觉素材必须有来源和许可记录。

## 8. 数据与隐私

### 8.1 数据分类

| 数据                 | 存储位置           | 生命周期                            | 是否离开设备   |
| -------------------- | ------------------ | ----------------------------------- | -------------- |
| 三代档案             | IndexedDB          | 用户删除、站点数据被清除或迁移      | 否             |
| 语言、表格等轻量偏好 | `localStorage`     | 用户重置或站点数据被清除            | 否             |
| 当前表单和任务结果   | 内存               | 页面刷新、任务替换或显式清除        | 否             |
| PWA 静态资源         | Cache Storage      | Service Worker 更新或站点数据被清除 | 仅从部署源下载 |
| CSV                  | 用户选择的本地文件 | 由用户和操作系统管理                | 否             |

### 8.2 档案 schema 初稿

```ts
interface Gen3ProfileRecord {
  schemaVersion: 1;
  id: string;
  name: string;
  game: "ruby" | "sapphire" | "emerald" | "fire-red" | "leaf-green";
  tid: number;
  sid: number;
  deadBattery: boolean;
  createdAt: string;
  updatedAt: string;
}
```

`id` 由浏览器生成且不承载业务含义。时间使用 ISO 8601 UTC 字符串。数据库升级必须通过 Dexie version/migration 完成，并以真实旧版本夹具测试。

### 8.3 隐私约束

- 不提供登录、遥测、崩溃上传、广告或第三方跟踪。
- 不请求游戏 ROM、存档、设备标识、联系人或位置权限。
- 网络面板在生产离线缓存完成后，不应因普通计算向第三方发出请求。
- 隐私说明必须告诉用户：本地存储不等于备份，隐私模式和浏览器清理策略可能删除数据。

## 9. 浏览器与平台支持

浏览器采用滚动支持策略，避免文档中的固定主版本迅速失真：

- **一级支持**：桌面 Chrome、Edge、Firefox 的当前和前一个稳定版本；Safari 当前和前一个主版本。
- **二级支持**：当前 iOS Safari 和 Android Chrome，可完成核心流程，但长搜索性能和 PWA 安装入口受平台限制。
- **不支持**：Internet Explorer、已停止安全更新的浏览器、禁用 WebAssembly/Worker/IndexedDB 的环境。

CI 在每次发布时记录实际 Playwright Chromium/Firefox/WebKit 版本。Safari 特性以对应 WebKit 测试加真机冒烟确认。Service Worker 在生产要求 HTTPS，在本地开发允许 `localhost`。

不以 `SharedArrayBuffer` 是否可用作为支持条件。必要能力包括 WebAssembly、module Worker、IndexedDB、Service Worker、Cache Storage、文件下载和现代 ES modules。

## 10. 验收标准

### 10.1 技术验证门槛

阶段 1 只有全部满足以下条件才通过：

1. 在 Emscripten 6.0.6、单线程、SIMD 关闭的配置下编译三代 Static/Wild 所需最小 Core 和适配层。
2. Static Generator、Static Searcher、Wild Generator、Wild Searcher 的选定上游 JSON 夹具逐字段 100% 一致，且原生适配层与 Wasm 适配层共用同一输入/输出契约。
3. Worker 完成 `init -> start -> progress/batch -> complete` 和 `start -> cancel -> cancelled` 流程；协议错误能返回稳定错误码。
4. 长任务取消确认 p95 不超过 500 ms，页面交互在任务运行时无明显卡死。
5. 在没有 COOP/COEP、`SharedArrayBuffer` 和 Wasm threads 的普通静态服务器上运行。
6. GitHub Pages 风格 `/PokeHero/` 子路径能正确加载 JS、Worker 与 Wasm；首次在线访问后离线重载成功。
7. 约定工作负载满足第 7.2 节性能门槛，并输出可复跑的测量报告。

### 10.2 MVP 产品验收

1. 用户可完成五个掌机版本档案的 CRUD、选择和全部本地数据删除。
2. 四个 Static/Wild Generator/Searcher 工作流覆盖有效输入、无结果、部分结果、取消和错误状态。
3. 所有适用筛选均由测试证明传入 Core 的值与界面选择一致。
4. 结果表格可稳定处理分批追加、数值排序、列选择与 CSV 导出，CSV 精度和转义正确。
5. 中英文覆盖率 100%，无原始翻译 key 泄漏到生产 UI。
6. 一级浏览器通过核心 Playwright 套件；至少一台 Safari 真机和一台 Android Chrome 设备完成冒烟。
7. PWA 离线验收通过，更新不会在运行中任务期间强制刷新。
8. WCAG 2.2 AA 自动检查无高严重度问题，核心流程通过键盘人工验收。
9. 发布页面包含 GPL 文本、上游署名、对应源码与构建说明，以及 Pokemon 商标/素材免责声明。

## 11. 阶段划分

### 阶段 0：文档与仓库基线

- 完成 README、需求、技术栈、`.gitignore` 和许可证策略。
- 核验上游版本、范围、测试资产与主要移植风险。
- 确定工具链版本和依赖锁定规则。

### 阶段 1：工程初始化与技术验证

- 初始化 React/TypeScript/Vite、质量脚本和 CI。
- 导入可追溯的最小 PokeFinder 三代 Core 源码及上游测试夹具。
- 建立 CMake/Emscripten 构建、Wasm 边界和 Worker 协议。
- 通过第 10.1 节全部门槛后再进入产品功能。

### 阶段 2：应用基础与档案

- 实现应用壳、路由、中英文、错误边界和本地设置。
- 实现 IndexedDB schema、档案 CRUD、迁移与清除数据。
- 建立组件测试、浏览器集成测试和可访问性基线。

### 阶段 3：Static MVP

- 实现 Generator/Searcher、联动规则、筛选、任务生命周期和结果表。
- 完成 CSV、性能测量和上游一致性回归。

### 阶段 4：Wild MVP

- 导入并验证三代遭遇数据。
- 实现遭遇类型、地点、Lead、道具、Feebas/Bike 等联动与 Generator/Searcher。
- 扩充结果、浏览器和长任务回归。

### 阶段 5：发布加固

- 完成 PWA、离线、更新策略、静态子路径部署和移动端适配。
- 完成许可证、署名、源码分发、素材来源和免责声明审查。
- 通过第 10.2 节后发布首个 MVP。

### 后续阶段

按用户价值与上游依赖顺序评估 Egg、ID、GameCube、PokeSpot、Jirachi 等第三世代功能。支持其他世代不是既定承诺，需要新的需求与技术评审。

## 12. 待验证事项

- 在导入源码时补录 PokeFinder 4.3.2 的精确 commit/tag 或归档 SHA-256；仅写版本号不足以满足发布追溯。
- 从 Qt Form 提取并形成可测试规则表，重点覆盖版本/方法/模板、Feebas、Rock Smash、Lead 和 dead battery 联动。
- 使用真实夹具确定 Worker 分片大小、结果批次大小和表格虚拟化阈值。
- 首次公开发布前确认英文名、中文名和视觉资产策略，并在一次受控变更中统一更新仓库、包名、PWA manifest、文案与法律页面。
