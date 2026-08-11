# 第三世代 Wild

> - 模块标识：`gen3wild`
> - 上游基线：PokeFinder 4.3.2
> - API：3
> - 当前状态：已实现 Generator、Searcher、完整筛选与地点中文显示；本机 C++ 固定夹具、Wasm 构建和浏览器冒烟已通过，待项目所有者功能验收。

## 能力与边界

- 支持 Ruby、Sapphire、Emerald、FireRed、LeafGreen 的草丛、碎岩、冲浪及三种钓竿遭遇。
- Generator 支持 Method 1/2/4、Emerald 队首规则、RSE 碎岩修正、丑丑鱼格与狩猎地带推进。
- Searcher 以六项 IV 的最小/最大范围逆向恢复 PID/种子，复用同一地点、遭遇类型、性格与队首设置；最多枚举 50,000,000 个 IV 组合。
- 地点中文名由 PokeFinder 4.3.2 的 `Core/Resources/i18n/zh/*_zh.txt` 在数据生成时写入；无法直接匹配的反编译地点标签由 UI 映射到同一中文地点名。
- Tanoby Chamber 因数据缺少未知图腾 form，仍从地点选择中排除；Tanoby Ruins 的水面/钓鱼地点不受影响。

筛选区与第三世代定点模块保持一致：性格与觉醒力量多选、异色、性别、特性、六项 IV 最小/最大范围和 IV 快捷设定。宝可梦在设置区按 PokeFinder 的唯一物种列表显示，选择后自动筛中该物种关联的所有遭遇槽位；等级始终由遭遇槽位决定，不提供虚假的等级范围筛选。

六项 IV 的默认范围为 `0..31`。结果表复用第三世代定点模块的 PID、异色、性格、特性、六项 IV、觉醒属性、觉醒威力与性别顺序，再追加遭遇槽位、宝可梦和等级；Generator 首列显示帧数，Searcher 首列显示 8 位十六进制 Seed。遭遇槽位与 PokeFinder 一致按 `0..11` 显示和导出，不在 UI 或 CSV 中额外加 1。

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

- 已通过：`npm run lint`、`npm run typecheck`、`npm test`、`npm run build:web`、`npm run wasm:test:native`、`npm run wasm:build`。
- 原生固定夹具：`gen3id_native_parity`、`gen3static_native_parity`、`gen3wild_native_parity` 共 3 项通过。
- 浏览器冒烟：完整模式 `http://127.0.0.1:5199/` 的 Wild Generator 与 Searcher 完成真实计算；确认六项最大 IV 默认值均为 31、结果表为 17 列、Generator 首行槽位为 0、Searcher 首列为 8 位 Seed。`gen3wild.mjs` 与 `gen3wild.wasm` 返回 200，控制台无警告或错误。
- `npm run verify:full` 尚未整体通过：`format:check` 被仓库现有 68 个文件的格式基线阻断，其他检查已拆分执行并记录结果。
- 项目所有者仍需用 PokeFinder 4.3.2 固定输入核对 Generator 与 Searcher，重点覆盖各队首、丑丑鱼、狩猎地带与碎岩分支。
