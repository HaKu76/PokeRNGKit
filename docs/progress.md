# PokeHero（工作名）项目进度与交接

> - 最近更新：2026-08-11
> - 当前阶段：阶段 0 - 仓库与文档基线
> - 品牌状态：英文正式名和中文名均待定；`PokeHero` 只是当前目录和私有 package 的工作标识
> - Git 状态：仓库尚无首个提交，当前变更应由项目所有者检查后完成首次提交

## 1. 文档用途

本文是跨会话、跨机器和跨工作环境的最短恢复入口。新环境接手时先读本文，再按需阅读：

1. [README](../README.md)：产品定位、MVP、隐私、架构、开发入口和法律说明。
2. [产品需求](requirements.md)：功能需求、非功能需求、验收标准和阶段划分。
3. [技术栈](tech-stack.md)：版本选择、目录规划、Wasm 边界、Worker 协议、测试与 CI/CD。
4. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)：文档、提交信息、构建版本和发布说明的跨环境写作规范。

本文只记录“现在在哪里、已确认什么、下一步做什么”。详细设计只保留在上述单一事实来源中，避免多份文档逐渐冲突。

## 2. 当前结论

- 产品目标是把 Admiral-Fish/PokeFinder 转为纯静态、本地优先的 Web 工具。
- 第一阶段产品范围只做第三世代 Static Generator/Searcher 和 Wild Generator/Searcher。
- 档案保存在 IndexedDB，轻量设置保存在 `localStorage`；没有后端、账号、遥测或运行时 CDN。
- 三代 C++ Core 计划由 Emscripten 编译成 Wasm，并且只在 Web Worker 中运行。
- 基线不使用 Wasm threads、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- 搜索必须采用可让出事件循环的分片式任务，支持批次、真实进度和取消。
- PokeFinder 源码为 GPLv3 or later；发布 Wasm 时必须提供对应完整源码、构建方式、修改记录和上游署名。
- 只使用 npm，不使用 pnpm、yarn 或 Bun，也不提交它们的锁文件。
- 项目正式英文名和中文名都没有确定。不要重命名仓库、目录、package 或 PWA 标识，直到所有者明确选择名称。

## 3. 已完成

### 3.1 仓库与上游核验

- 确认仓库原始状态为空 Git 仓库，`main` 尚无提交，仓库内没有 `AGENTS.md`。
- 只读分析本机上游源码 `C:\Users\Hakuhiro\Desktop\PokeFinder-master`。
- 从上游 `CMakeLists.txt` 验证版本为 PokeFinder 4.3.2、C++23、CMake 最低 3.31。
- 验证三代 Core、Qt Form、ProfileLoader、资源生成和 12 组三代测试的主要边界。
- 验证源码头为 GNU GPL v3 or later，并将完整 GPLv3 文本加入根 `LICENSE`。

注意：桌面路径只是本机研究来源，不是构建依赖。导入任何上游代码前仍要记录精确 commit/tag 或归档 SHA-256。

### 3.2 文档基线

- `README.md`：定位、状态、MVP、隐私、架构、命令入口、部署、路线图、GPL 与商标免责声明。
- `docs/requirements.md`：目标/非目标、用户场景、详细需求、数据、浏览器、验收和阶段。
- `docs/tech-stack.md`：依赖版本、状态边界、目录、C ABI、Worker 协议、测试金字塔、技术验证门槛和 CI/CD。
- `.gitignore`：Node/Vite、测试、CMake/Emscripten、环境、编辑器和临时文件。
- `LICENSE`：完整 GNU GPL version 3 文本；仓库元数据声明 `GPL-3.0-or-later`。

### 3.3 npm 依赖基线

- Node.js：`24.19.0` LTS，记录于 `.node-version` 和 `engines`。
- npm：`12.0.2`，记录于 `packageManager`。
- 已创建私有 `package.json`，品牌状态为 working name，未发布到 npm registry。
- 已生成 `package-lock.json`，并使用目标 Node/npm 成功执行 `npm ci --engine-strict`。
- 安装/审计结果：535 个包，`npm audit` 为 0 个已知漏洞。
- 当前只提供 `format`/`format:check` 脚本；应用、Wasm 和测试脚本要在相应配置实际存在时再加入。

已知提示：依赖树中有传递依赖 `glob@11.1.0` 的弃用警告。`npm explain glob` 已确认来源为 `vite-plugin-pwa -> workbox-build -> glob`。它不是直接依赖，当前审计无漏洞；随上游依赖升级处理，不使用 override 强行替换未经测试的传递版本。

### 3.4 项目写作 Skill

- 已建立项目级 `.agents/skills/hakuhiro-project-style/`，用于跨会话复用 README、技术文档、仓库描述、提交信息、构建版本和发布说明风格。
- 风格依据来自 `Haku76.github.io` 的近期提交/时间线，以及 `FF4TAY_Rare_Drop_Patch`、`FF4TAY_Battle_FPS_Patch`、`RS-TID-SID-Frame-Finder_H5` 等项目的公开文档。
- 已观察习惯与推荐扩展被明确区分：简洁仓库描述、结果优先 README、中文动作短语提交有历史依据；GitHub Release、构建元数据和 SemVer 模板是供本项目建立规范的推荐方案。
- Skill 明确禁止编造版本、测试、兼容性、产物和校验值，也不会自行暂定名称、提交、打 tag、push 或发布。

## 4. 当前仓库应有内容

首次提交前预期跟踪以下文件：

```text
.gitignore
.node-version
.agents/skills/hakuhiro-project-style/SKILL.md
.agents/skills/hakuhiro-project-style/agents/openai.yaml
.agents/skills/hakuhiro-project-style/references/style-guide.md
.agents/skills/hakuhiro-project-style/references/templates.md
LICENSE
README.md
package.json
package-lock.json
docs/progress.md
docs/requirements.md
docs/tech-stack.md
```

以下内容是本地生成物，必须保持未跟踪/忽略：

```text
node_modules/
.npm-cache-verify/
```

当前没有 `src/`、Vite 配置、TypeScript 配置、C++/Wasm 源码、测试或 CI workflow。这是有意的阶段边界，不要把文档中的未来命令误判为已经可用。

## 5. 当前验证状态

已通过：

- npm 官方注册表版本与 peer/engine 范围核验。
- Node 24.19.0 + npm 12.0.2 的严格安装。
- `package-lock.json` 的 `npm ci` 重装。
- `npm run format:check`，全部匹配文件符合 Prettier 格式。
- `npm ls --all`，完整依赖树退出码为 0；输出中的未安装项均为平台/功能可选依赖。
- Markdown H1、标题层级、代码围栏和相对链接检查。
- 品牌状态与 npm-only 检查；没有 pnpm/yarn/Bun 锁文件或中文暂定名残留。
- Git 状态检查；应跟踪文件均为未提交的新文件，本地依赖/cache 均被忽略。
- npm 安全审计（0 个漏洞）。
- 项目级 Skill 的 frontmatter、UI 元数据、UTF-8、H1、代码围栏、引用路径和占位符等价检查。

Skill 官方 `quick_validate.py` 因当前 Python 环境未提供其所需的 `PyYAML` 模块而无法启动；没有为一次性校验向项目加入 Python 依赖。等价检查已覆盖该脚本的名称、frontmatter 字段、描述格式与长度规则，并额外检查 UI 元数据和 Markdown 结构。

应用构建、单元测试、Playwright 和 Wasm 测试目前不可运行，因为工程骨架和业务代码尚未创建。

## 6. 下一步

### 6.1 立即动作：完成首次提交

1. 项目所有者检查本阶段文档、依赖选择和 `git status`。
2. 确认没有把 `node_modules/` 或 `.npm-cache-verify/` 纳入提交。
3. 由项目所有者完成首次提交。当前会话不代为提交，也不执行远端 push。

### 6.2 下一实施阶段：工程骨架与 Wasm 技术验证

首次提交后，按以下顺序推进：

1. 初始化可运行但最小的 React/TypeScript/Vite 骨架，补齐 `dev`、`build`、`test`、`lint`、`typecheck` 和 CI；不先开发完整 UI。
2. 锁定 PokeFinder 4.3.2 的精确上游来源，建立 `third_party/pokefinder/UPSTREAM.md`、许可证与补丁记录。
3. 导入 Static/Wild 所需的最小三代 Core、共享依赖、资源输入和四组上游夹具。
4. 建立无 Qt、无 ProfileLoader 的原生 C++ adapter 和 CTest fixture harness，先证明原生契约正确。
5. 用 Emscripten 6.0.6 建立单线程、SIMD 关闭的 Wasm C ABI；实现 `create/step/batch/progress/cancel/destroy` 生命周期。
6. 实现最小 typed Worker client，验证 Static/Wild 四条路径的结果一致性、批次、进度、取消与崩溃恢复。
7. 验证 `/PokeHero/` 工作路径（正式名称确定后再改）、普通静态托管和首次加载后的离线重载。
8. 将数据写入 `docs/validation/wasm-spike.md`；只有通过需求文档第 10.1 节门槛后，才开始档案和正式 Static UI。

下一阶段的第一个可交付物不是完整页面，而是“可复跑、结果与上游一致、可取消、可在普通静态站运行”的 Wasm spike。

## 7. 不要提前做

- 不要扩展到 Egg、ID、GameCube、PokeSpot、Jirachi 或其他世代。
- 不要把 RNG Core 重写成 TypeScript。
- 不要引入后端、SSR、账号、云同步、遥测或运行时 CDN。
- 不要因性能预期提前启用 `SharedArrayBuffer`、pthread 或跨源隔离。
- 不要直接把 Qt Form 或文件型 ProfileLoader 编译进 Wasm。
- 不要在名称未确认前改仓库、目录、npm package、PWA manifest 或法律文本中的品牌。
- 不要删除 GPL 头、上游版权、来源记录或对应源码分发要求。

## 8. 新环境恢复清单

在新机器或新会话中依次执行：

```bash
git status --short --branch
node --version
npm --version
npm ci
npm run format:check
```

然后确认：

- Node/npm 与 `.node-version`、`packageManager` 一致。
- 阅读本文件顶部列出的文档，查看最近提交后的新增验证记录。
- 编写文档、提交信息、版本或发布说明时调用 `$hakuhiro-project-style`，并让当前仓库约定覆盖通用模板。
- 上游源码位置可以变化，但构建不得引用某个用户桌面绝对路径。
- 正式名称是否已经由项目所有者明确决定；没有明确决定就继续使用 working-name 状态。
- 从“下一步”中第一个未完成项继续，不重复已完成工作。

可向新会话提供以下最小上下文：

```text
先阅读 README.md、docs/progress.md、docs/requirements.md 和
docs/tech-stack.md，再检查 git status。项目正式英中名称均未确定，
当前 PokeHero 只是工作标识；只用 npm；范围仅 Gen III Static/Wild；
纯静态、无后端、Core -> Emscripten Wasm -> Web Worker；基线不依赖
SharedArrayBuffer。按 docs/progress.md 的第一个未完成项继续，并在结束
前更新该进度文档、验证命令和 git 状态。编写项目文档、提交信息、
构建版本或发布说明时使用 $hakuhiro-project-style。
```

## 9. 维护规则

每个里程碑或会影响接手者的变更都要更新本文：

- 更新日期、当前阶段和 Git/发布状态。
- 把完成项从“下一步”移到“已完成”，附文件或验证命令。
- 记录新决策、阻塞、已知警告和未决问题；不把聊天记录当唯一事实来源。
- 依赖/工具链变化同时更新 `package.json`、lockfile 和技术栈版本表。
- 需求或范围变化先更新需求文档，再在本文记录对当前阶段的影响。
- 正式名称确认后，一次性列出并完成仓库、目录、package、PWA、文案、缓存 key 和法律页面的重命名检查。
