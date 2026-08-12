# AI 开发一致性指南

本文是 Codex 或其他 AI 在新会话、新电脑和无聊天上下文环境中的开发入口。聊天记录只提供补充背景，仓库文件才是当前事实来源。

## 1. 必读顺序

开始修改前按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)：不可违反的范围、命名、架构和工作流规则。
2. [`docs/progress.md`](progress.md)：当前 Git 基线、未提交内容、验证状态和唯一下一步。
3. [`README.md`](../README.md)：产品定位、构建、部署、隐私和许可证入口。
4. [`docs/requirements.md`](requirements.md)：当前功能边界与验收标准。
5. [`docs/tech-stack.md`](tech-stack.md)：Wasm、Worker、持久化、版本和目录约束。
6. 当前模块的 `docs/modules/<module>.md`：算法、输入限制、上游文件和固定夹具。
7. [`third_party/pokefinder/UPSTREAM.md`](../third_party/pokefinder/UPSTREAM.md)：vendored 源码来源、修改边界和 SHA-256。
8. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)：README、进度、提交、构建与发布说明格式。

如项目所有者明确要求启动第四世代模块，还必须读取[第四世代扩展接口与 AI 交接](gen4-development.md)和 `src/features/shared/rngModuleContract.ts`。当前仅保留接口，不得自行添加第四世代算法、导航或默认构建项。

读取完成后先运行 `git status --short --branch`。工作区中的已有修改视为项目所有者内容，不得重置、覆盖或顺手重构。

## 2. 事实来源

| 问题                 | 权威来源                                                    |
| -------------------- | ----------------------------------------------------------- |
| 产品范围和验收       | `docs/requirements.md`                                      |
| 当前进度和下一步     | `docs/progress.md`                                          |
| Web 架构、版本和协议 | `docs/tech-stack.md`、`package.json`、lockfile              |
| RNG 算法             | `C:\Users\Hakuhiro\Desktop\PokeFinder-master\Core` 只读源码 |
| Qt 业务流程          | 上游 `Form/Gen3` 实现与 `.ui` 文件                          |
| 输入进制、位宽和空值 | 上游 `Form/Controls/TextBox.cpp` 与模块 Form 代码           |
| 简体中文控件名       | 上游 `Form/i18n/PokeFinder_zh.ts`                           |
| 英文、日文控件名     | 上游对应源字符串与 `PokeFinder_ja.ts`                       |
| vendored 文件完整性  | `third_party/pokefinder/UPSTREAM.md`                        |

控件有上游简体中文翻译时必须逐字复用；没有翻译时保留英文源字符串。不要根据语义自行翻译、润色或统一术语。

## 3. 模块开发流程

每次只完成一个 PokeFinder 功能模块：

1. 在 `docs/progress.md` 确认模块和前置条件，不提前开始后续世代或功能。
2. 读取上游 Form、Core、测试、翻译和资源文件，记录用到的文件。
3. 核对每个输入的进制、最小值、最大值、字符数、空值行为和跨字段约束。
4. 在 `wasm/modules/<module>/` 建立或修改独立 CMake target、C ABI、manifest 和原生夹具。
5. API 行为变化时同时更新 C++ API 常量、TypeScript API 常量、`module.json` 和 Worker 握手版本。
6. 在 `src/features/<module>/` 保持独立 domain、Worker 协议、Worker Pool、UI 和预览引擎。
7. 将大范围计算放在独立 Worker 内；多核使用多个单线程 Wasm 实例，不引入 `SharedArrayBuffer` 或 Wasm pthread。
8. 增加与风险对应的 C++ 固定夹具、TypeScript 边界测试和 UI 预览测试。
9. 更新对应 `docs/modules/<module>.md`、需求、技术方案和进度交接。
10. 先取得项目所有者对具体命令或 URL 的明确授权，才运行相关验证；区分工程检查、部署页面算法回归与项目所有者最终验收。

## 4. Wasm 与 Worker 约束

- React/TypeScript 只负责表单、校验、分片、Worker 编排、解码、结果和持久化。
- PokeFinder RNG 规则保留在 C++/Emscripten Wasm，不在 TypeScript 中另写一套生产算法。
- C ABI 只传固定宽度整数、指针和长度，不暴露 C++ 对象、STL、Qt 类型或文件路径。
- 每个任务使用独立 `taskId`；批次携带 `chunkIndex`，缓冲区通过 transfer list 移交。
- Worker 返回顺序不可信，Pool 必须按 `chunkIndex` 恢复确定顺序。
- 取消后不得接收迟到批次；必要时终止并重建 Worker。
- 任何 API 版本不一致都必须停止初始化，不能猜测兼容。

## 5. 输入检查

修改模块表单时逐项完成以下核对，并把结果写入模块文档：

- HTML `maxLength`、`min`、`max` 与输入规范化是否一致。
- domain 校验是否覆盖相同范围，不能只依赖 HTML 控件。
- 空 Seed 是否按上游 `getUInt()` 解释为 `0`。
- `Initial Advances + Offset + Max Advances` 等组合是否溢出上游整数类型。
- 筛选最小值是否小于等于最大值。
- 组合搜索规模是否在浏览器任务上限内。
- UI 预览和真实 Wasm 是否使用同一个请求类型与校验入口。

当前通用上游限制：32 位 Seed 为 `0..0xFFFFFFFF`、8 位十六进制；16 位 Seed 为 `0..0xFFFF`、4 位十六进制；TID/SID 为 `0..65535`、5 位十进制；32 位 Advances 为 `0..4294967295`、10 位十进制。具体模块仍必须重新核对上游 Form。

## 6. 编辑收尾与完成门槛

格式化属于文件编辑的机械收尾，不属于测试、构建或验收。每批代码或文档修改完成后必须立即执行：

```bash
# 工作区包含无关改动时，只格式化本任务触及的文件
npm run format:files -- <file...>

# 任务开始时工作区干净、当前改动全部属于本任务时可使用
npm run format:changed

npm run format:check
git diff --check
```

`format:changed` 使用 Git 收集相对 `HEAD` 的已跟踪修改和未跟踪文件，通过 `--ignore-unknown` 跳过 PNG、Wasm 等非 Prettier 文件，并在写入后对同一文件批次执行只读检查。全仓 `format:check` 仍是提交前闭环，用于发现已经进入基线但尚未修正的格式问题。不得把 `git diff --check` 当成 Prettier 替代品；前者只能发现空白错误，不能发现换行、缩进和排版差异。

完成格式收尾后，再按授权范围执行工程检查。未经项目所有者明确授权，不得自行执行以下测试、构建、算法回归、性能检查或 UI 预览命令：

```bash
npm run lint
npm run typecheck
npm test
npm run build:ui
npm run verify
```

具备本地 C++ 与已激活 emsdk 时，经授权再运行 `npm run verify:full`。缺少工具链时如实记录“未运行”，由锁定工具链的 GitHub Actions 补齐，不得把前端构建成功写成真实 Wasm 已验证。

算法结果验收只有一个入口：GitHub Actions 完成部署后，项目所有者提供实际站点 URL 并明确授权回归。AI 只能在该生产页面使用已记录固定输入回归，并记录 URL、commit/Actions run、浏览器版本、预期与实际结果。原生夹具、本地 Wasm 构建、UI 预览与 Actions 状态都只是工程证据，不能单独验收算法结果。部署后的 UI 检查必须先向项目所有者报告，再共同完成验收，不得由 AI 单方面宣告通过。

所有已获授权的浏览器、Worker、控制台、部署页面或 UI 调试，必须使用外部 Google Chrome 或 Microsoft Edge 的已连接会话。不得使用应用内浏览器作为调试替代；外部浏览器未连接时报告该状态，等待项目所有者连接后再继续。

完成后只向项目所有者提供一个 GitHub Desktop 提交标题：

```text
<type>: <中文动作短语>
```

除非项目所有者明确要求，不执行暂存、提交、push、部署或发布。

## 7. 交接更新

每次功能、依赖、工具链、构建、部署或阻塞状态变化后更新 `docs/progress.md`，至少保留：

- 当前分支、HEAD 和工作区是否已提交。
- 已完成能力及主要文件。
- 实际运行的命令与结果。
- 未运行项、阻塞原因和人工验收状态。
- 下一位开发者应执行的第一个动作。
- 不得提前开始的功能。
- 浏览器调试使用的外部浏览器与实际 URL。
