# PokeRNGKit 项目进度与交接

> - 最近更新：2026-08-12
> - 当前分支：`feat/gen4-static`
> - 上游基线：`65e3aba feat: 增加全世代遇敌查询`
> - 当前阶段：第四世代 Static Generator/Searcher 已叠加到最新上游并完成本地工程验证，待推送和 PR
> - PR 目标：`HaKu76/PokeRNGKit:main`
> - PR 来源：`axechaso/PokeRNGKit:feat/gen4-static`

## 当前状态

- 最新上游已包含第三世代 Egg、Wild 修复和全世代 Encounter Lookup；本分支保留这些能力，并新增 `gen4static`、独立 G4 存档和独立 G4 个体值计算器。
- RNG Wasm 模块为 `gen3id`、`gen3initialseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`，共 7 个。
- Encounter Lookup 是公共静态悬浮工具；G3 页面显示 G3 存档与 G3 个体值计算器，G4 页面显示独立的 G4 存档与 G4 个体值计算器。
- 正式 Wasm、站点产物和 Pages 部署由 GitHub Actions 生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。

## 第四世代定点乱数

- 增加 Diamond、Pearl、Platinum、HeartGold、SoulSilver 的 Static Generator/Searcher。
- 支持 Method 1、Method J、Method K、Synchronize 和 Cute Charm。
- 内置 99 条 Starters、Fossils、Gifts、Game Corner、Stationary、Legends、Events、Roamers 模板。
- Generator 与 Searcher 沿用 G3 Static 的三栏布局、IV 表格快捷操作、筛选交互、排序、CSV 和虚拟结果表风格，但使用独立请求、Worker 和 Wasm 模块。
- Generator 的 `Max Advances=N` 按 PokeFinder 上游语义包含起点，处理 `N+1` 个状态。
- Searcher 按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 的闭区间笛卡尔积枚举 IV。
- 六项 IV 默认最小 `0`、最大 `31`；术语固定为“觉醒力量”“觉醒属性”“觉醒威力”。
- 结果表使用固定列宽；Generator 首列为 Advances，Searcher 首列为 Seed。
- 宝可梦下拉与 G3 Static 一致，只显示本地化宝可梦名称，不附加地点或“定点”后缀。

## 独立 G4 工具

- 增加独立第四世代存档 schema、IndexedDB/localStorage 键、导入导出和 HGSS 未知图腾字段。
- 增加独立第四世代个体值计算器，使用 Gen IV 物种、形态、个性和个人数据。
- G4 控件不读取、覆盖或删除 G3 存档和 G3 个体值计算器状态。
- Encounter Lookup 在两代页面均保留，并与当前页面的个体值计算器互斥展开。

## Wasm 与 Worker

- 增加 `gen4static` Wasm API v1、C ABI、原生夹具、Dedicated Worker、Generator/Searcher Worker Pool 和消息协议。
- 修复 MSVC 参数求值顺序造成的 IV word 对调：先顺序读取 `iv1`、`iv2`，再解码六项 IV。
- Worker 校验模块、契约和 API 版本，按 `chunkIndex` 恢复确定顺序；取消会终止并重建独立 Worker。
- 默认 Wasm 构建列表同时包含上游 `gen3egg` 和本分支 `gen4static`。

## 来源与参考

- PokeFinder 4.3.2 revision：`dd00fe7`，作为控件、算法语义、模板规则和固定结果的权威基线。
- EncounterTableGenerator Gen4 revision：`9a2ed62`，用于生成第四世代定点模板。
- PokemonRNGGuides revision：`c0b2bb664f04a4ef052e6dd4d831351703fa4047`，用于交叉核对 Rust `stationary` Generator/Searcher 分层、IV 顺序、Method 1/J/K 逆推和 React 工作台流程。
- PokeRNGKit 不复制或编译 PokemonRNGGuides 源码；两个参考发生差异时以 PokeFinder 4.3.2 为准。
- 完整来源范围和许可证记录见 [`third_party/pokefinder/UPSTREAM.md`](../third_party/pokefinder/UPSTREAM.md)。

## 本轮验证

- 已通过本次可格式化变更文件的 Prettier 检查。
- 已通过 TypeScript project build。
- 已通过 Vitest：21 个测试文件、74 项测试。
- 已通过 ESLint：0 错误；保留上游 Egg/Wild 的 2 条 TanStack Virtual / React Compiler 非阻断 warning。
- 已通过 UI 构建和生产 Web 构建；构建产物包含 7 个 Worker 入口。
- 已通过 7/7 原生夹具：6 个 Gen III 模块与 `gen4static_native_parity`。
- 已使用 Emscripten 6.0.6 构建 7 个真实 Wasm 模块：`gen3id`、`gen3initialseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`。
- 已通过 `git diff --check`。
- 本地开发站点运行于 `http://127.0.0.1:5182/`；已核对服务端加载的最新源码中 G4 宝可梦下拉只渲染 `getGen4SpeciesName(...)`，不再拼接模板 `label`。
- 浏览器自动化运行时在当前中文工作区路径初始化失败，因此本轮未重新记录完整桌面/移动端截图；rebase 前的真实 Chrome/Worker/Wasm、列对齐与移动端证据保留为历史参考，部署页面仍需最终验收。

## 下一步

1. 推送 `origin/feat/gen4-static`。
2. 创建 PR：base 为 `HaKu76/PokeRNGKit:main`，head 为 `axechaso:feat/gen4-static`。
3. 等待 GitHub Actions 完成，再验证部署页面中的 Egg、Encounter Lookup、G4 Static、两代独立悬浮工具、结果列和移动端布局。

## 已知限制

- `gen4id` 与 `gen4wild` 仍只保留共享接口，不应写成已支持功能。
- `gen3egg` 当前只提供 Generator；Egg Searcher、Masuda 和第四世代孵化规则不在本次范围。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备后续可能需要降低 Worker 数。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；部署后的更新体验仍需验收。
- 公开部署 Wasm 时必须继续提供对应完整源码、构建脚本、上游署名和 GPL-3.0-or-later 许可材料。

## 新环境恢复

```bash
git status --short --branch
git log -5 --oneline
npm ci --engine-strict
npm run verify
npm run wasm:test:native
npm run wasm:build
```

## 维护规则

- 每个功能、依赖、工具链、构建、部署或阻塞状态变化后更新本文。
- 验证结果必须区分历史证据、本轮工程检查、部署页面回归和项目所有者最终验收。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core、测试和翻译文件。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。
