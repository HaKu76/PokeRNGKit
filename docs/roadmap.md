# PokeRNGKit 需求池与开发排期

## 状态定义

| 状态   | 含义                                         |
| ------ | -------------------------------------------- |
| 已完成 | 功能代码、对应文档、工程验证和提交推送已收口 |
| 进行中 | 当前正在实现，尚未完成该模块的验证与提交     |
| 计划   | 已确认范围，等待前置模块或排期               |
| 复核   | 已有代码，需要按上游教程、字段或 UI 重新核对 |
| 排除   | 明确不进入产品范围                           |

## 当前需求池

| 优先级 | 需求                                              | 状态   | 依据 / 说明                                                                       | 下一步                                      |
| ------ | ------------------------------------------------- | ------ | --------------------------------------------------------------------------------- | ------------------------------------------- |
| P0     | Gen VII TF3 Stationary Initial Seed / Time Finder | 已完成 | `PokemonRNGGuides` 的 Gen VII 初始 Seed 教程；`3DSTimeFinder` StationarySearcher7 | 已提交推送；生产算法仍待部署 URL 与人工验收 |
| P0     | Gen VII TF4 Event Initial Seed / Time Finder      | 已完成 | 与 TF3 同一时间枚举流程，复用 `gen7event`                                         | 已完成工程验证，待提交推送                  |
| P0     | Gen VII TF5 Wild / TF6 ID                         | 进行中 | TF5 已完成工程验证；TF6 复用 `gen7timefinder` / `gen7id` Wasm 实现时间反查        | TF6 外部页面回归后进入 Gen VI TF1/TF2       |
| P1     | Gen VI TF1/TF2 Stationary/Event                   | 计划   | `3DSTimeFinder` Gen VI 时间入口                                                   | Gen VII TF3-TF6 完成后                      |
| P2     | 公共 TSV List                                     | 已完成 | Gen VII Egg 教程要求编辑 TSV List                                                 | 已接入 Gen VI/Gen VII Egg 与全局悬浮工具    |
| P2     | IV Range / IV Template                            | 已完成 | 3DSRNGTool `IVRange.cs`、`IVTemplate.cs`                                          | 已接入 Gen VI/Gen VII Egg 与全局悬浮工具    |
| P3     | Gen IV Gen4SeedFinder、Voltorb Flip、Swarm 辅助   | 计划   | 教程复核确认的真实辅助缺口                                                        | P0-P2 完成后评估                            |
| P4     | Gen V DS 参数、Initial Seed、Entralink 缺口       | 计划   | 教程中的 DS 参数和时间流程                                                        | 仅补确认存在的缺口                          |
| P5     | TinyFinder 独有扩展                               | 计划   | Rock Smash、Honey Wild、Ambush、Victory Road、MT Seed/Time                        | 主线闭环完成后                              |
| 持续   | 按教程共有主线审查入口、侧栏和真实功能缺口        | 进行中 | 全世代 165 篇正文指南人工复核结论                                                 | 每个模块落地时同步调整，避免重复开发        |
| 最后   | EXE 适配                                          | 计划   | 用户明确要求，优先级最后                                                          | 核心模块与部署稳定后                        |
| 排除   | NTR Helper                                        | 排除   | 原始 NTR/TCP 访问超出静态浏览器架构                                               | 不开发                                      |
| 排除   | Gen II、Legends Arceus                            | 排除   | 不属于 PokeFinder 4.3.2 / 3DSRNGTool 产品范围                                     | 不开发                                      |

## 共用教程主线

```text
存档信息 / ID -> Seed 相关 -> 定点 -> 野生（DexNav / Poke Radar / Underground 等）
-> 蛋 -> 事件 -> 其他辅助扩展
```

Gen III-VIII 的侧栏和入口按这条主线组织。Profile Manager、Researcher、TSV List、IV Template 等轻量全局工具继续放在右下角悬浮工具菜单。当前实现顺序先补教程闭环所需的真实缺口，不再把教程规划和最终侧栏重排统一延后到所有模块完成之后。

## 维护规则

- 每完成一个独立模块，必须同步更新本文件、对应 `docs/modules/<module>.md` 与 `docs/progress.md`。
- 状态变化必须附带实际命令、验证结果、未运行项和下一步，不把计划写成已完成。
- 每个功能完成后按项目所有者授权执行本地验证、提交和推送；生产算法回归仍需部署 URL 与人工确认。
