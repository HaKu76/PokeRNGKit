# PokeHero（工作名）

> 项目名称尚未确定。`PokeHero` 只是当前目录和私有 npm package 使用的工作标识，不代表最终英文名或商标决定；中文名同样未定。正式名称选定前不执行仓库、目录或包重命名。

PokeHero 是面向宝可梦第三世代 RNG 研究与检索的浏览器工具。项目以
[Admiral-Fish/PokeFinder](https://github.com/Admiral-Fish/PokeFinder) 4.3.2 的算法与测试资料为上游参考，目标是在不牺牲结果正确性的前提下，提供 Web 原生、可离线、无需后端的使用体验。

## 项目状态

**规划与技术验证准备中，尚无可用应用。** 当前仓库先建立需求、技术栈、许可证与工程约束；依赖元数据随后初始化，但本阶段不实现产品界面或业务代码。

- 目标范围：仅第三世代（Gen III）
- 上游核验基线：PokeFinder 4.3.2
- 当前里程碑：文档基线与 WebAssembly 技术验证准备
- 进度与跨环境交接：[docs/progress.md](docs/progress.md)
- 需求基线：[docs/requirements.md](docs/requirements.md)
- 技术方案：[docs/tech-stack.md](docs/tech-stack.md)

## 产品定位

PokeHero 不是桌面程序的逐像素复刻，而是保留 PokeFinder 三代 Core 的已验证算法，通过 WebAssembly 在浏览器中运行，并用 React 构建适合桌面和移动浏览器的原生交互。所有计算、档案和设置都留在用户设备上。

MVP 包含：

- 三代档案的创建、编辑、选择与删除
- Static Generator / Searcher
- Wild Generator / Searcher
- IV、性格、特性、性别、闪光、觉醒力量、遭遇槽等适用筛选项
- 可排序结果表格、分批展示和 CSV 导出
- 长任务的进度、取消和错误恢复
- 简体中文与英文
- PWA 安装与首次加载后的离线使用

MVP 不包含 Egg、ID、GameCube、PokeSpot、Jirachi 及其他世代。这些能力只有在三代 Static/Wild 的正确性、性能与离线体验达标后才进入后续路线图。

## 纯静态与隐私

PokeHero 必须能够部署到 GitHub Pages、Cloudflare Pages 或任意等价静态文件托管服务：

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
  |-- local UI state (React + Zustand)
  |-- profiles (Dexie / IndexedDB)
  |-- settings (localStorage)
  `-- typed messages
        `-- Web Worker
              `-- Emscripten module
                    `-- PokeFinder Gen III C++ Core + thin adapter
```

Wasm 模块只在 Worker 内实例化。搜索被拆成可让出事件循环的工作分片，Worker 以批次传输结果并在分片之间处理取消消息，因此不需要共享内存。界面层不直接依赖 C++ 类、Qt 类型或上游文件型 `ProfileLoader`。

更完整的目录规划、Wasm 边界和 Worker 协议见 [docs/tech-stack.md](docs/tech-stack.md)。

## 开发入口

当前仓库还没有应用骨架，以下命令是下一阶段初始化必须提供的稳定入口；在相应脚本加入 `package.json` 前，它们不可用：

```bash
npm ci
npm run dev
npm run build
npm test
npm run test:e2e
npm run lint
npm run format:check
npm run wasm:build
npm run wasm:test
```

已确认的工具链基线：

- Node.js 24.19.0 LTS
- npm 12.0.2
- Emscripten 6.0.6（通过 emsdk 精确锁定）
- CMake 3.31 或更高版本（上游 4.3.2 的最低声明）

前端依赖的兼容范围与精确锁定规则记录在 [docs/tech-stack.md](docs/tech-stack.md#版本基线与锁定策略)。

## 构建与测试

初始化后的生产构建由 Vite 输出到 `dist/`。`npm run build` 必须先生成 release 模式 Wasm，再构建带内容哈希的 JS、CSS、Worker 和 `.wasm` 静态资源。

测试分为五层：

1. C++/Wasm 与 PokeFinder 上游夹具的算法一致性测试。
2. TypeScript 领域逻辑、消息协议、数据迁移和 CSV 的单元测试。
3. React 组件与用户交互测试。
4. Worker + 真实 Wasm + IndexedDB 的浏览器集成测试。
5. Playwright 覆盖核心流程、静态子路径部署和离线重载。

首个技术验证必须先证明 Static/Wild 的固定输入结果与上游一致、长搜索可进度汇报并在 500 ms 内响应取消、GitHub Pages 子路径能够加载 Wasm，且离线重载可用。未通过该门槛前不扩展产品功能。

## 部署

CI/CD 计划使用 GitHub Actions：

1. 在固定 Node、npm 与 Emscripten 版本下安装依赖。
2. 执行 lint、格式检查、单元测试、Wasm 一致性测试和生产构建。
3. 对构建产物执行 Playwright 冒烟与离线测试。
4. 将同一份 `dist/` 部署到 GitHub Pages；Cloudflare Pages 使用相同构建命令和产物目录。

Vite 的 `base` 必须可配置，以同时支持自定义域名根路径和 `/PokeHero/` 形式的 GitHub Pages 项目路径。发布产物必须带许可证、上游署名和对应源码入口。

## 路线图

- **阶段 0：仓库基线** - README、需求、技术栈、忽略规则与许可证策略。
- **阶段 1：工程骨架与技术验证** - React/Vite、CI、Emscripten、Worker 协议、上游夹具一致性和静态托管验证。
- **阶段 2：应用基础** - 中英文应用壳、三代档案、IndexedDB 迁移和本地设置。
- **阶段 3：Static MVP** - Generator、Searcher、筛选、批量结果、排序、CSV、进度和取消。
- **阶段 4：Wild MVP** - 遭遇数据、条件联动、Generator/Searcher 与全链路回归。
- **阶段 5：发布加固** - PWA 离线、可访问性、浏览器矩阵、性能预算、许可证与发布流程。
- **后续** - Egg、ID、GameCube、PokeSpot、Jirachi 等三代能力；是否支持其他世代另行决策。

## 许可证、署名与源码分发

PokeFinder 源码头声明可按 **GNU GPL v3 或更高版本**使用。PokeHero 计划作为包含其衍生和链接代码的整体，以 `GPL-3.0-or-later` 发布。正式导入上游代码前必须完成以下事项：

- 在仓库中保留完整 GPL 许可证文本、原作者版权声明和上游署名。
- 记录采用的上游版本、提交或归档校验和，以及 PokeHero 的修改清单。
- 发布 `.wasm` 和部署站点时，同步提供构建该二进制所对应的完整源代码、构建脚本与安装说明。
- 不以仅提供上游链接替代 PokeHero 自身修改源码的分发义务。
- 审核所有第三方数据、图标、字体和素材的独立许可证，未经许可不复制游戏素材。

本节是工程约束，不构成法律意见。首次公开发布前应完成一次 GPL 与素材来源审查。

## 免责声明

PokeHero 是非官方、由社区开发的研究工具，与 Nintendo、Creatures Inc.、GAME FREAK inc.、The Pokemon Company 或其关联方没有隶属、授权或背书关系。

Pokemon、宝可梦及相关名称、角色和素材是其各自权利人的商标或版权作品。项目名称中的相关指代仅用于说明工具用途。除非取得明确许可，本项目不分发官方美术、精灵图、音频、Logo 或其他受保护素材。
