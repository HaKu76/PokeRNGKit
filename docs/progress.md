# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-11
> - 当前阶段：阶段 4A，第三世代 Wild Generator 合并与验证
> - 当前模块：`gen3id`、`gen3static`、`gen3wild`、`profiles`、`ivcalculator`
> - Git 基线：`d399aee fix: 修复第三世代定点功能与筛选行为`
> - 合并来源：PR #1，`e615938 feat: 补齐第三世代野生遭遇模块`
> - 工作区状态：`main` 正在执行未提交 merge；Codex 不暂存、不提交、不 push
> - 部署状态：本轮尚未推送，GitHub Pages 与 Cloudflare Pages 均未执行本轮构建
> - 人工验收：待项目所有者执行

## 1. 恢复入口

本文是跨会话和跨机器恢复入口。新环境按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)
2. [AI 开发一致性指南](ai-development.md)
3. 本文
4. [README](../README.md)、[产品需求](requirements.md)与[技术方案](tech-stack.md)
5. 当前模块文档：[Gen 3 Wild](modules/gen3wild.md)
6. [上游记录](../third_party/pokefinder/UPSTREAM.md)
7. [Hakuhiro 项目风格 Skill](../.agents/skills/hakuhiro-project-style/SKILL.md)

聊天记录不是项目状态的事实来源。功能、依赖、工具链、构建、部署或阻塞变化后更新本文。

## 2. 已确认决策

- 正式英文工程名为 PokeRNGKit，不设置中文名。
- 当前只做第三世代；模块名沿用 PokeFinder，内部使用 `gen3id`、`gen3static`、`gen3wild`。
- 只使用 npm，不增加 pnpm、Yarn 或 Bun 元数据。
- React + TypeScript 负责 UI、校验、Worker 编排、结果与持久化。
- PokeFinder RNG 规则使用 C++ -> Emscripten -> Wasm，生产算法不在 TypeScript 主线程运行。
- 多核使用多个独立单线程 Worker/Wasm 实例，不依赖 Wasm pthread、`SharedArrayBuffer`、COOP/COEP 或跨源隔离。
- IndexedDB 保存存档，localStorage 提供完整镜像兜底并保存语言、主题和悬浮窗状态。
- 界面只支持简体中文、英文和日文；有上游简中翻译时逐字复用，没有时保留英文。
- 正式 Wasm 与站点产物由 GitHub Actions 自动生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 功能测试与最终验收由项目所有者执行；自动检查只提供工程证据。
- Codex 不自动暂存、提交、push、部署或发布，只提供 GitHub Desktop 操作说明和一条提交标题。

## 3. Git 与部署状态

- 当前分支：`main`，HEAD `d399aeef43cdb9906be6a37998c3ede0f8fac35d`。
- `MERGE_HEAD`：`e6159385bebe7c91f9183f216cbc314e671200ad`。
- 当前四个冲突文件已清除文本冲突标记，但仍由 Git 标记为未解决；需要项目所有者在 GitHub Desktop 中逐个标记 resolved 并创建 merge commit。
- 当前远端：`https://github.com/HaKu76/PokeHero.git`；GitHub 目标仓库为 PokeRNGKit，旧 URL 当前依赖 GitHub 重定向，后续可由 GitHub Desktop 更新。
- 首要测试地址：<https://haku76.github.io/PokeRNGKit/>。
- `.github/workflows/ci.yml` 在 `main` push 后安装锁定工具链、运行 Web 与原生检查、构建全部 Wasm/Web 产物并部署 Pages；配置 Cloudflare 后复用同一 `dist` artifact。

## 4. 已进入 Git 基线

### 4.1 工程与应用基础

- React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语基础。
- Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2` 的构建基线。
- GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 默认收起的模块抽屉、全局存档悬浮窗、浅色/深色主题和系统默认字体。

### 4.2 已有功能

- `gen3id`：XD/Colosseum、FRLG/E、RS ID Generator，筛选、Worker Pool、进度、取消、排序和 CSV。
- `gen3static`：67 条掌机模板、Generator/Searcher、Method 1/4、游走 IV 缺陷、完整定点筛选、觉醒力量、能力值、Worker Pool、排序和 CSV。
- `profiles`：IndexedDB 主存储、localStorage 镜像、新建、编辑、复制、删除、选择、JSON 导入导出和全部清除。
- `ivcalculator`：第三世代物种、性格、觉醒力量、多行能力值交集和下一级提示。

上述功能已经提交，但项目所有者的完整功能、移动端和离线验收仍未记录为通过。

## 5. 当前未提交工作区：`gen3wild` Generator

### 5.1 PR 取舍

PR #1 提供了 Wild 入口、遭遇数据和首轮界面，但原始算法在 React/TypeScript 主线程中运行，只用 `setTimeout(0)` 分批让出，缺少独立 Wasm、Worker、Worker Pool 和 API 握手。当前合并工作区保留功能和数据意图，替换为项目既定的 C++/Emscripten/Worker 架构。

### 5.2 已实现

- 新增 `wasm/modules/gen3wild/`：独立 CMake target、API 1 C ABI、60 字节结果记录和原生固定夹具。
- 新增 `src/features/wild/domain.ts`、Worker 消息、Worker Pool 与分片解码；每个 Worker 独立持有 Wasm 实例。
- 单分片最多 100,000 个状态，单任务最多 50,000,000 个状态，结果上限 250,000 条；取消通过终止 Worker。
- 支持五个第三世代掌机版本、六种遭遇类型、Method 1/2/4、Emerald 队首规则、RSE Rock Smash、Feebas Tile 与 Safari Zone。
- 使用当前全局掌机存档的版本、TID 与 SID；Seed 空输入按 `0` 处理。
- 性格使用多选，Method 使用下拉框；结果使用虚拟化表格、数值排序和 CSV，推进数与结果数不加千位分隔符。
- 补齐 PokeFinder 的 Pressure、Hustle、Vital Spirit 三个等级修正标签；三者共享同一上游枚举值。
- 修复 Tanoby Chamber 过滤：数据中的完整地点名为 `Seven Island Tanoby Ruins ... Chamber`。
- 生成数据加入 `.prettierignore`，避免格式化产生两万多行机械 diff。
- `scripts/wasm.mjs` 与根 CMake 默认构建 `gen3id`、`gen3static`、`gen3wild`。

### 5.3 明确未完成

- Wild Searcher。
- IV、觉醒力量、特性、性别、闪光、Pokemon、等级与 Encounter Slot 等完整 Wild 筛选。
- Tanoby Chamber 未知图腾 form；当前七个 Chamber 从列表排除。
- 地点本地化。
- `EncounterTableGenerator` 精确 revision、完整生成命令与全地点数据抽样记录。
- Wild 专用 UI 预览引擎。

这些项目必须保留为后续任务，不能在本轮提交或发布说明中写成已完成。

## 6. 验证状态

### 6.1 本轮已通过

- `npm run typecheck`。
- `npm test`：10 个测试文件、34 项测试通过。
- `npm run lint`：通过。
- `npm run build:ui`：Vite UI 模式构建成功并生成 Wild Worker bundle；该结果不验证 Wild RNG。

### 6.2 当前工具链阻塞

- 本机 Node.js：`24.13.0`，低于项目要求的 `24.19.0`。
- 本机 npm：`11.6.2`，低于项目锁定的 `12.0.2`。
- npm CMake/Ninja：`npm run wasm:doctor` 检测为可用。
- Emscripten / `emcmake`：当前 PowerShell 未激活，`npm run wasm:doctor` 失败。
- 本机 C++ 编译器：`npm run wasm:test:native` 配置失败，CMake 未找到 `CMAKE_CXX_COMPILER`。

### 6.3 待 Actions 和项目所有者验证

- Route 111 固定夹具的原生 C++ 实际结果。
- Emscripten 6.0.6 的 `gen3wild.mjs/.wasm` 产物和 API 1 握手。
- Wild Worker Pool 的真实多核结果顺序、进度、取消、内存和结果上限。
- Pages 上三个 Worker/Wasm 模块、PWA 安装与离线重载。
- PokeFinder 固定输入比对、三语控件、桌面/移动布局和 CSV。

## 7. 下一步

严格按以下顺序执行：

1. 完成本轮格式、lint、类型、单元测试、Web/UI 构建、Markdown 链接和 diff 检查。
2. 项目所有者在 GitHub Desktop 中审查文件，标记四个冲突文件 resolved，并创建 merge commit。
3. 推送 `main`，确认 Actions 的原生夹具、Emscripten Wasm、生产构建和 GitHub Pages 全部通过。
4. 项目所有者在 Pages 使用 PokeFinder 固定输入验收 Wild Generator，并记录浏览器版本和结果。
5. 修复 Actions 或人工验收问题；通过后单独开始 Wild Searcher 和完整 Wild 筛选。

## 8. 已知风险

- 当前遭遇数据是 PR 生成产物，精确 `EncounterTableGenerator` revision 尚未记录；全地点一致性和数据许可证来源仍需补齐。
- Tanoby Chamber 因缺少 form 被排除；在数据补齐前不能开放。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要降低 Worker 数。
- 取消通过终止 Worker 生效，实际延迟需要 Pages 实测。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；API 握手会拒绝运行，但更新体验仍需实测。
- 如果源码仓库不是公开可访问，公开 Pages 不能只链接私有仓库来履行 GPL 对应源码义务。

## 9. 新环境恢复

```bash
git status --short --branch
git log -5 --oneline
node --version
npm --version
npm ci --engine-strict
npm run wasm:doctor
```

当前仍是未提交 merge 时，不要执行 reset、checkout、clean、abort merge 或删除操作。先阅读本文并确认 PR #1 的合并状态。

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

### 最小交接上下文

```text
PokeRNGKit 不设置中文名，只用 npm，当前只做 Gen III。
main HEAD d399aee 已包含 gen3id、gen3static Generator/Searcher、profiles 和 ivcalculator。
当前正在未提交 merge PR #1；MERGE_HEAD e615938。
当前工作区把 Wild Generator 替换为独立 gen3wild C++/Wasm/Worker Pool，
支持五版本、六种遭遇、Method 1/2/4、Emerald Lead、Feebas、Safari 和 RSE Rock Smash。
Wild Searcher、完整 Wild 筛选和 Tanoby Chamber form 尚未实现。
本机缺少已激活 Emscripten 和 C++ 编译器，真实夹具/Wasm 等待 Actions。
先读 AGENTS.md、docs/ai-development.md、docs/progress.md 和 docs/modules/gen3wild.md。
不要自动暂存、提交或 push；由项目所有者使用 GitHub Desktop 完成 merge commit。
```

## 10. 维护规则

- 每个功能、部署、阻塞、依赖或工具链变化后更新本文。
- 验证结果区分“已通过”“未运行”“待项目所有者验收”。
- 依赖变化同步更新 `package.json`、lockfile 和技术栈版本表。
- 每个 RNG 功能更新 `docs/modules/<module>.md`。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core 与翻译文件。
- 发布记录实际 Git commit、工具版本、产物和验证环境。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
