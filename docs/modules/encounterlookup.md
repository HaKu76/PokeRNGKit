# 遇敌查询

本文说明 PokeFinder 4.3.2 `Encounter Lookup` 的静态 Web 实现。工具放在应用右下角悬浮工具区，默认收起，不进入左侧 RNG 模块导航；查询只读取本地生成数据，不启动 Wasm 或 Web Worker。

## 1. 用途

用户选择宝可梦和游戏版本，查询该宝可梦在对应版本的地点、遇敌种类和等级范围。结果按地点编号、遇敌种类和等级范围排序；右下角工具轨提供独立触发按钮，点击后在工具轨旁打开独立面板，点击面板外部、按 `Escape` 或点击面板关闭按钮均会收起；后两种关闭方式会把焦点归还触发按钮。

“全世代”在本模块中仅指 PokeFinder 4.3.2 `Encounter Lookup` 实际支持的版本，不代表 PokeRNGKit 的 RNG Generator/Searcher 整体扩展到这些世代。当前支持：

| 世代 | 游戏版本                                        | 图鉴上限 |
| ---- | ----------------------------------------------- | -------: |
| III  | Ruby、Sapphire、FireRed、LeafGreen、Emerald     |      386 |
| IV   | Diamond、Pearl、Platinum、HeartGold、SoulSilver |      493 |
| V    | Black、White、Black 2、White 2                  |      649 |
| VIII | Brilliant Diamond、Shining Pearl                |      493 |

不额外加入第六、七世代或 Sword/Shield。

## 2. 输入与上游行为

上游 `EncounterLookup.ui` 只有 `Pokémon`、`Game` 和 `Find` 三项控件，没有数值输入，因此不存在 `min`、`max` 或 `maxLength` 范围。`Game` 按上游固定顺序提供 16 个版本；切换版本时，`Pokémon` 候选按世代上限重建。

上游 `ComboBox::enableAutoComplete()` 将宝可梦控件设为可编辑、`QComboBox::NoInsert`，补全使用包含匹配和弹出列表。本实现使用受控组合框复现点击展开、包含匹配、弹出候选、方向键移动和 Enter 选择；提交时只接受当前游戏候选中的精确物种名称，不接受不存在的自由文本。

控件标签遵循上游翻译规则：简体中文逐字使用 `PokeFinder_zh.ts` 的 `遇敌查询`、`宝可梦`、`游戏`、`查找`、`地点`、`遇敌种类`、`等级范围`、`草丛`、`冲浪`、`破旧钓竿`、`好钓竿`、`厉害钓竿`、`碎岩`、`撞树` 和 `捕虫大赛`；英文保持上游源标签；日文对应词条在上游为 unfinished 时保留英文。

## 3. 数据与查询规则

生成脚本解析 PokeFinder 4.3.2 的 EncounterTables 二进制资源，并复现上游 `EncounterLookup.cpp` 的组合规则：

- Gen III：草丛、冲浪、破旧钓竿、好钓竿、厉害钓竿、碎岩；包含 Feebas 特殊地点。
- Gen IV：DP/Pt 的时间、群聚、宝可梦雷达、双槽，以及 HG/SS 的时间、群聚、广播、撞树、捕虫大赛、Safari Zone 和碎岩。
- Gen V：四季、深色草丛、摇草、冲浪/涟漪冲浪和厉害钓竿/涟漪钓鱼。
- BDSP：时间、群聚、宝可梦雷达、冲浪和三种钓竿。

每个结果行保存 `[species, location, encounter, minLevel, maxLevel]`。同一地点和遇敌种类下的重复物种槽合并为最小和最大等级；地点名称从对应上游语言资源读取，缺少翻译时回退到英文或地点编号。

## 4. 生成数据

数据文件 `src/features/encounterlookup/data.ts` 由 `scripts/generate_encounter_lookup_data.py` 生成，当前锁定：

- PokeFinder：`v4.3.2`，commit `2d5c6afed9240f2bdb98634b5b8b1fab352aefa5`
- EncounterTableGenerator：commit `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9`
- 生成输入：PokeFinder 的语言资源与 EncounterTableGenerator 生成的 Gen3/Gen4/Gen5/Gen8 二进制表

可复跑命令：

```powershell
python scripts\generate_encounter_lookup_data.py `
  --generated .tmp-encounter-tables `
  --i18n C:\Users\Hakuhiro\Desktop\project\PokeFinder-master\Core\Resources\i18n `
  --output src\features\encounterlookup\data.ts
```

生成文件保留 PokeFinder 与 EncounterTableGenerator 的 GPL-3.0-or-later 署名。临时二进制目录不属于运行时依赖，也不提交到仓库。

## 5. 实现边界

`src/features/encounterlookup/domain.ts` 负责游戏版本、物种上限、语言资源和查询结果映射；`EncounterLookupPanel.tsx` 负责面板内容、候选输入、查询和结果表；共享 `FloatingToolPanel.tsx` 负责独立浮层、关闭和焦点恢复。`AutoCompleteComboBox.tsx` 复用 PokeFinder 的包含匹配、弹出补全和 `NoInsert` 行为；右下角的存档信息、个体值计算器和遇敌查询由 `App.tsx` 统一协调，任意展开一个会收起另外两个。

本模块是用户明确批准的跨世代静态查询例外，不改变 `AGENTS.md` 中“RNG 算法模块先实现第三世代”的长期边界；后续世代 RNG 算法仍需单独决策和上游核对。

## 6. 上游与验证入口

主要上游文件：

- `Form/Util/EncounterLookup.cpp`
- `Form/Util/EncounterLookup.ui`
- `Form/Controls/ComboBox.cpp`
- `Form/Controls/ComboBoxProxy.cpp`
- `Core/Gen3/Encounters3.cpp`
- `Core/Gen4/Encounters4.cpp`
- `Core/Gen5/Encounters5.cpp`
- `Core/Gen8/Encounters8.cpp`
- `Form/i18n/PokeFinder_zh.ts`
- `Form/i18n/PokeFinder_ja.ts`

仓库内静态边界夹具位于 `src/features/encounterlookup/domain.test.ts`。本轮已核对上游 `Form/Util/EncounterLookup.cpp:57` 和 `Form/Controls/ComboBox.cpp:30`；`ComboBox::enableAutoComplete()` 使用可编辑、`NoInsert`、`MatchContains` 与 `PopupCompletion`。

2026-08-13 经项目所有者授权，在外部 Chrome 对 `https://haku76.github.io/PokeRNGKit/` 的生产资源 `index-mLBsBTQF.js` 重新抽样：受控宝可梦组合框可由鼠标按钮展开、点击选择候选，也支持输入、方向键和 Enter；Emerald 的皮卡丘返回狩猎地带地区 1/2 草丛 `25-27`，Diamond 与 Brilliant Diamond 均返回自豪的后院草丛 `18-18`，Black 的皮卡丘返回空集。当前生产包仍使用触发器与面板相连的旧悬浮样式，不支持面板级 `Escape` 关闭；新的独立工具轨和浮层交互需部署后复验。

已通过：定向 Prettier、`npm run typecheck`、`npm run lint`（仅既有两条 TanStack Virtual warning）和 `src/features/encounterlookup/domain.test.ts` 的 3 项测试。完整 `npm run verify` 与部署后生产交互复验记录见 `docs/progress.md`；项目所有者最终验收仍待完成。
