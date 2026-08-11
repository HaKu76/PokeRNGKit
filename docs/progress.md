# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-12
> - 当前阶段：第三世代 ID Searcher 集成验证
> - 当前模块：`gen3id`、`gen3static`、`gen3wild`、`profiles`、`ivcalculator`
> - Git 基线：`7b3383d feat: 实现第三世代野生检索器`
> - 工作区状态：红蓝宝石 ID Searcher 与配套文档仍有未提交修改；Codex 不暂存、不提交、不 push
> - 部署状态：本轮未推送，GitHub Pages 与 Cloudflare Pages 均未执行本轮部署
> - 验收状态：待项目所有者授权测试或部署 URL；任何检查只提供工程证据，UI 需与项目所有者共同验收

## 1. 恢复入口

本文是跨会话和跨机器恢复入口。新环境按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)
2. [AI 开发一致性指南](ai-development.md)
3. 本文
4. [README](../README.md)、[产品需求](requirements.md)与[技术方案](tech-stack.md)
5. 当前模块文档：[Gen 3 ID](modules/gen3id.md)
6. 第四世代后续交接：[Gen 4 Development](gen4-development.md)
7. [上游记录](../third_party/pokefinder/UPSTREAM.md)
8. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)

聊天记录不是项目状态的事实来源。功能、依赖、工具链、构建、部署或阻塞变化后更新本文。

## 2. 已确认决策

- 正式英文工程名为 PokeRNGKit，不设置中文名。
- 当前产品仍只做第三世代；第四世代仅保留 `gen4id`、`gen4static`、`gen4wild` 的共享接口和 AI 交接，不实现算法或 UI。
- 只使用 npm，不增加 pnpm、Yarn 或 Bun 元数据。
- React + TypeScript 负责 UI、校验、Worker 编排、结果与持久化。
- PokeFinder RNG 规则使用 C++ -> Emscripten -> Wasm，生产算法不在 TypeScript 主线程运行。
- 多核使用多个独立单线程 Worker/Wasm 实例，不依赖 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- IndexedDB 保存存档，localStorage 提供镜像兜底并保存语言、主题和悬浮窗状态。
- 界面只支持简体中文、英文和日文；有上游简中翻译时逐字复用，没有时保留英文。
- 正式 Wasm 与站点产物由 GitHub Actions 自动生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 未获项目所有者明确授权时，Codex 不运行测试、构建、算法回归、性能检查或浏览器检查。获得具体命令或 URL 授权后，检查结果只作为工程证据；部署后的 UI 由 Codex 报告结果并与项目所有者共同验收。
- Codex 不自动暂存、提交、push、部署或发布，只提供 GitHub Desktop 操作说明和一条提交标题。

## 3. Git 与部署状态

- 当前分支：`main`，HEAD `7b3383d`。
- 当前没有待完成的 merge 状态；本轮工作区修改均保持未提交。
- 远端和仓库目录沿用现有设置，不在本轮重命名或修改远端。
- GitHub Pages 是当前测试目标；Cloudflare Pages 与 `hakuhiro.top` 留到 Pages 验收后配置。

## 4. 已进入 Git 基线

### 4.1 工程与应用基础

- React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语基础。
- Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2` 的构建基线。
- GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 默认收起的模块抽屉、全局存档悬浮窗、浅色/深色主题和系统默认字体。

### 4.2 已有功能

- `gen3id`：XD/Colosseum、FRLG/E、RS ID Generator，筛选、Worker Pool、进度、取消、排序和 CSV。
- `gen3static`：67 条掌机模板、Generator/Searcher、Method 1/4、游走 IV 缺陷、完整定点筛选、觉醒力量、能力值、Worker Pool、排序和 CSV。
- `gen3wild`：Generator/Searcher、掌机遭遇数据、特殊地点规则、完整筛选、Worker Pool、排序和 CSV。
- `profiles`：IndexedDB 主存储、localStorage 镜像、新建、编辑、复制、删除、选择、JSON 导入导出和全部清除。
- `ivcalculator`：第三世代物种、性格、觉醒力量、多行能力值交集和下一级提示。

## 5. 当前未提交工作区：红蓝宝石 ID Searcher

### 5.1 已实现

- `gen3id` API 升级为 v2，增加 `gen3id_search` C ABI 和 24 字节 Searcher 结果记录。
- SID 模式通过 TID/SID 恢复初始 Seed、帧数、TSV 与 2000 年第一组日期时间。
- PID 模式枚举八个闪光 SID，并区分星闪与方块闪；无解组合返回空集合。
- 增加独立 `Gen3IdSearcherWorkerPool`、Worker `search` 消息、结果解码、UI 预览与 Generator/Searcher 标签。
- UI 复用参考程序的简体中文控件和列名，支持输入限制、取消、结果清除和 CSV。
- 原生夹具覆盖 SID、PID、无解和非法输入；TypeScript 测试覆盖 24 字节解码与输入位宽。

### 5.2 明确未完成

- Emscripten Wasm 产物、Pages 真实资源加载、Codex 部署回归和项目所有者最终验收。
- 第四世代算法、数据、存档、Wasm、Worker 和界面；未得到项目所有者单独指示前不得开始。

## 6. 验证状态

### 6.1 历史自动检查（规则生效前，不构成验收）

- 本轮已通过：`npm run format:check`、`npm run lint`、`npm run typecheck`。
- 本轮已通过：`npm test -- --run`，13 个测试文件、48 项测试。
- 本轮已通过：`npm run build:ui` 与 `npm run verify`；生产 PWA 构建生成 Service Worker，保留主 JS 超过 500 kB 的既有警告。
- 本轮 UI 预览已人工触发 SID 与 PID 固定样例：SID 显示 `05A0/0`、`C19B/36724` 两条；PID 显示 7 条，含方块闪和星闪。该预览不加载 Wasm，且不构成验收。
- 本轮已通过：`git diff --check`；17 个 Markdown 文件的本地链接目标均存在。
- 本轮已运行：`npm run wasm:doctor`，Node.js、CMake、Ninja 可用，Emscripten 与 `emcmake` 缺失，因此命令按预期失败。
- 本轮已通过：`npm run wasm:test:native`，`gen3id_native_parity`、`gen3static_native_parity`、`gen3wild_native_parity` 共 3 项原生夹具。

### 6.2 当前未运行或等待授权

- `npm run wasm:build`：本机没有已激活的 Emscripten `emcmake`。
- GitHub Pages 和真实 Worker/Wasm 集成：待项目所有者授权并提供部署 URL 后检查。
- 移动端性能、取消延迟、PWA 安装与离线：待项目所有者明确授权的验收范围。

当前终端实际为 Node.js `24.13.0`、npm `11.6.2`，低于仓库锁定的 Node.js `24.19.0`、npm `12.0.2`。上述前端检查已通过，但原生/Wasm 和发布结论必须以锁定工具链的 Actions 为准。

## 7. 下一步

1. 项目所有者在 GitHub Desktop 审查未提交修改并创建提交：`feat: 集成红蓝宝石 ID 帧检索`。
2. 推送后，项目所有者决定是否授权 Codex 读取 Actions 结果和测试生产 Wasm。
3. 如授权部署 UI 检查，项目所有者提供 URL；Codex 使用 TID `48163`、SID `64377` 和 PID `0000475A` 报告页面实际结果，再与项目所有者共同验收。
4. 项目所有者决定是否授权移动端、PWA、离线和性能检查的范围。
5. 两阶段验收通过后再决定 Tanoby Chamber 数据或发布加固；第四世代仍等待项目所有者指定具体模块。

## 8. 已知风险

- 遭遇数据的精确 `EncounterTableGenerator` revision 尚未记录；全地点一致性仍需抽样验收。
- Tanoby Chamber 因缺少 form 被排除，在数据补齐前不能开放。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要降低 Worker 数。
- ID Searcher 当前只枚举 2000 年并返回每个 Seed 的第一组日期；扩大年份范围前需重新确定产品语义与结果规模。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；`gen3id` v2、Static/Wild v3 握手会拒绝运行，但更新体验仍需实测。
- 第四世代 reservation 没有 API 版本和运行时实现；其他 AI 不得把接口存在误写成产品支持。
- 公开部署 Wasm 时必须能向用户提供对应的完整源码、构建脚本和 GPL 许可材料。

## 9. 新环境恢复

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

完整验证：

```bash
npm run verify
npm run wasm:test:native
npm run wasm:build
```

后两项需要 C++ 编译器与已激活的 Emscripten。缺少工具链时保留失败信息，由 Actions 补齐，不把未运行项写成已通过。

## 10. 维护规则

- 每个功能、部署、阻塞、依赖或工具链变化后更新本文。
- 验证结果区分“历史自动检查”“经授权检查”“未运行”和“待项目所有者共同验收”；自动检查不能替代项目所有者验收。
- 未获得项目所有者对具体命令或 URL 的明确授权时，不执行任何测试、构建、算法回归、性能检查或浏览器检查。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个 RNG 功能更新 `docs/modules/<module>.md`。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core 与翻译文件。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
