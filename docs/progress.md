# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-11
> - Git 基线：`upstream/main` 的 `9092968 feat: 合并第三世代野生生成器`
> - 当前工作：在最新主线补齐第三世代 Wild 的地点中文显示和 IV Searcher；未暂存、未提交、未推送。

## 当前可用模块

- `gen3id`：第三世代 ID Generator/Searcher。
- `gen3static`：第三世代定点 Generator/Searcher。
- `gen3wild`：第三世代野生 Generator、六项 IV 范围 Searcher、地点选择、性格筛选、Worker Pool、CSV 与 UI 预览。
- `profiles`、`ivcalculator`：全局存档与个体值计算器。

## 本轮变更

- 先 fetch 上游并 rebase；由于 PR #1 已被合入上游，跳过重复提交，避免再次制造同一改动的冲突。
- 在遭遇生成数据中写入 PokeFinder 简体中文地点名，并为反编译地点标签补充同源名称映射。
- 为 Wild 增加 Searcher 操作页：Method、队首、遭遇地点、性格和六维 IV 最小/最大范围；任务依旧在独立 Worker/Wasm 实例中分片。
- UI 模式提供明确标识的确定性样例引擎，方便先验收界面，且不把样例结果伪装成 Wasm 计算。

## 验证记录

- 通过：`tsc -b`、`vitest run src/features/wild`、`vite build --mode ui`。
- 本机 UI 预览：`http://127.0.0.1:5173/`，可检查地点中文、生成/检索器切换、输入校验、结果表和 CSV 按钮。
- 阻塞：本机没有 C++ 编译器，`wasm:test:native` 在 CMake 配置阶段失败；Emscripten 6.0.6 未激活，`wasm:build` 不能运行。因此真实 Wasm 结果、Searcher 分支一致性和性能必须由 CI 或具备 emsdk 的机器复验。

## 后续验收

1. 在本机 UI 预览确认交互与翻译后，再由项目所有者决定是否提交。
2. 在具备 C++ 编译器与 emsdk 6.0.6 的环境运行 `npm run wasm:test:native`、`npm run wasm:build` 和完整 `npm run verify`。
3. 用 PokeFinder 4.3.2 固定输入逐项核对 Wild Generator/Searcher，重点覆盖 Synchronize、Cute Charm、Magnet Pull、Static、Pressure、Feebas、Safari 与碎岩。
4. 验收通过后再提交、推送并开 PR；禁止从旧的重复分支直接推送。

建议 GitHub Desktop 提交标题（待验收后）：`feat: 补齐第三世代野生检索器与地点中文显示`
