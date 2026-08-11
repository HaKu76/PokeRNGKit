# 第三世代 Wild

> - 模块标识：`gen3wild`
> - 上游基线：PokeFinder 4.3.2
> - API：2
> - 当前状态：已实现 Generator、按 IV 范围的 Searcher 与地点中文显示；尚未通过本机 C++/Wasm 编译验收。

## 能力与边界

- 支持 Ruby、Sapphire、Emerald、FireRed、LeafGreen 的草丛、碎岩、冲浪及三种钓竿遭遇。
- Generator 支持 Method 1/2/4、Emerald 队首规则、RSE 碎岩修正、丑丑鱼格与狩猎地带推进。
- Searcher 以六项 IV 的最小/最大范围逆向恢复 PID/种子，复用同一地点、遭遇类型、性格与队首设置；最多枚举 50,000,000 个 IV 组合。
- 地点中文名由 PokeFinder 4.3.2 的 `Core/Resources/i18n/zh/*_zh.txt` 在数据生成时写入；无法直接匹配的反编译地点标签由 UI 映射到同一中文地点名。
- Tanoby Chamber 因数据缺少未知图腾 form，仍从地点选择中排除；Tanoby Ruins 的水面/钓鱼地点不受影响。

当前筛选只包含性格与 Searcher 的六项 IV 范围；能力、性别、闪光、等级、物种和遭遇槽位的筛选尚未开放，不能误称为完整 PokeFinder Wild Filter。

## 架构

```text
Gen3WildPanel
  -> Gen3WildWorkerPool
      -> Dedicated Worker × N
          -> gen3wild.mjs / gen3wild.wasm
              -> gen3wild_generate / gen3wild_search
```

生产计算仅在 Worker 中加载 Wasm。每个任务最多 100,000 状态一片；结果固定为 15 个 `u32`（60 字节）并通过 transferable `ArrayBuffer` 返回。取消会终止当前 Worker；结果上限为 250,000 条。

`--mode ui` 使用 `Gen3WildUiPreviewEngine` 提供确定性样例，只用于验收表单、中文地点、结果表格、导出和取消交互，绝不验证 RNG 结果或 Wasm 性能。

## 数据再生成

```powershell
python scripts/generate_gen3_wild_data.py `
  --tables <EncounterTableGenerator/Gen3> `
  --species <PokeFinder/Core/Resources/i18n/zh/species_zh.txt> `
  --personal <PokeFinder/Core/Resources/Personal/Gen3/personal_rsefrlg.bin> `
  --locations <PokeFinder/Core/Resources/i18n> `
  --output src/features/wild/gen3Data.ts
```

不要手改 `gen3Data.ts`。生成器读取各版本 `en/*_en.txt` 与 `zh/*_zh.txt` 的同序地点表并写入 `zhName`。

## 验证

- 已通过：TypeScript 类型检查、Wild domain Vitest、UI 模式 Vite 构建与本机 UI 手工预览。
- 当前机器缺少 C++ 编译器，`npm run wasm:test:native` 无法配置；同时未激活 Emscripten 6.0.6，不能构建 `gen3wild.mjs/.wasm`。
- 提交前必须由安装 C++ 工具链与 emsdk 的 CI/本机运行 `npm run wasm:test:native`、`npm run wasm:build`，并用 PokeFinder 固定用例核对 Generator 与 Searcher。
