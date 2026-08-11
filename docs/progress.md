# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-11
> - Git 基线：`upstream/main` 的 `9092968 feat: 合并第三世代野生生成器`
> - 当前工作：在最新主线补齐第三世代 Wild 的地点中文、Searcher、筛选与结果显示，并完成本机真实 Wasm 验证；已提交 [PR #2](https://github.com/HaKu76/PokeRNGKit/pull/2)，待验收与合并。

## 当前可用模块

- `gen3id`：第三世代 ID Generator/Searcher。
- `gen3static`：第三世代定点 Generator/Searcher。
- `gen3wild`：第三世代野生 Generator/Searcher、地点选择、完整筛选、Worker Pool、CSV、UI 预览与真实 Wasm 运行。
- `profiles`、`ivcalculator`：全局存档与个体值计算器。

## 本轮变更

- 先 fetch 上游并 rebase；由于 PR #1 已被合入上游，跳过重复提交，避免再次制造同一改动的冲突。
- 在遭遇生成数据中写入 PokeFinder 简体中文地点名，并为反编译地点标签补充同源名称映射。
- 为 Wild 增加 Searcher 操作页：Method、队首、遭遇地点、性格和六维 IV 最小/最大范围；任务依旧在独立 Worker/Wasm 实例中分片。
- 补齐觉醒力量、异色、性别、特性、宝可梦和遭遇槽位筛选，并移除 Wild 生成区旁的个体值计算器入口。
- 将六项 IV 最大值默认设为 31；Wild 结果表按 Static 的通用列顺序显示并追加槽位、宝可梦和等级，CSV 复用同一列定义，槽位按 PokeFinder 的 0 基值显示和导出。
- UI 模式提供明确标识的确定性样例引擎，方便先验收界面，且不把样例结果伪装成 Wasm 计算。
- 安装并激活项目锁定的 Emscripten 6.0.6，修复 Windows 下 `emcc.exe`/`emcmake.exe` 探测，并排除本地 SDK 与生成 Wasm 的格式和 lint 扫描。

## 验证记录

- 通过：`npm run lint`、`npm run typecheck`、`npm test`（10 个测试文件、36 项测试）、`npm run build:web`。
- 通过：`npm run wasm:test:native`，`gen3id`、`gen3static`、`gen3wild` 共 3 项原生一致性测试全部通过。
- 通过：`npm run wasm:build`，生成 `gen3id`、`gen3static`、`gen3wild` 的 `.mjs/.wasm` 产物。
- 本机完整模式：`http://127.0.0.1:5199/`。浏览器冒烟确认 Wild Generator 与 Searcher 真实计算完成，最大 IV 默认值、17 列表头、0 基槽位、Searcher Seed、排序和模式切换清空均符合预期；`gen3wild.mjs/.wasm` 返回 200，控制台无警告或错误。
- PR：`axechaso:agent/gen3-wild-searcher-localized` -> `HaKu76/PokeRNGKit:main` 的 [#2](https://github.com/HaKu76/PokeRNGKit/pull/2) 已创建，当前待验收与合并。
- 未通过：`npm run verify:full` 在 `format:check` 阶段被仓库现有 68 个文件的格式基线阻断；未批量改写无关文件。CMake 4.3.1 对 Emscripten 共享库支持发出警告，但本项目三个独立 Wasm 模块构建成功。

## 后续验收

1. 由项目所有者在 `http://127.0.0.1:5199/` 验收 Wild 的交互、翻译和实际结果。
2. 用 PokeFinder 4.3.2 固定输入逐项核对 Wild Generator/Searcher，重点覆盖 Synchronize、Cute Charm、Magnet Pull、Static、Pressure、Feebas、Safari 与碎岩。
3. 单独处理仓库现有 Prettier 格式基线后，再运行完整 `npm run verify:full`。
4. 在 PR #2 中完成验收，合入后再开始后续模块；禁止从旧的重复分支直接推送。

本轮功能提交标题：`fix: 对齐第三世代野生筛选与结果显示`
