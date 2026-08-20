# PokeRNGKit 需求池与开发排期

## 状态定义

| 状态   | 含义                                         |
| ------ | -------------------------------------------- |
| 已完成 | 功能代码、对应文档、工程验证和提交推送已收口 |
| 进行中 | 当前正在实现，尚未完成该模块的验证与提交     |
| 计划   | 已确认范围，等待前置模块或排期               |
| 复核   | 已有代码，需要按上游教程、字段或 UI 重新核对 |
| 暂缓   | 已明确不在当前开发窗口，保留需求记录但不执行 |
| 排除   | 明确不进入产品范围                           |

## 当前需求池

| 优先级 | 需求                                              | 状态   | 依据 / 说明                                                                       | 下一步                                      |
| ------ | ------------------------------------------------- | ------ | --------------------------------------------------------------------------------- | ------------------------------------------- |
| P0     | Gen VII TF3 Stationary Initial Seed / Time Finder | 已完成 | `PokemonRNGGuides` 的 Gen VII 初始 Seed 教程；`3DSTimeFinder` StationarySearcher7 | 已提交推送；生产算法仍待部署 URL 与人工验收 |
| P0     | Gen VII TF4 Event Initial Seed / Time Finder      | 已完成 | 与 TF3 同一时间枚举流程，复用 `gen7event`                                         | 已完成工程验证，待提交推送                  |
| P0     | Gen VII TF5 Wild / TF6 ID                         | 已完成 | TF5/TF6 工程验证完成，生产算法仍待部署 URL 与人工验收                             | 统一 UI 验收后进入后续辅助缺口              |
| P1     | Gen VI TF1/TF2 Stationary/Event                   | 已完成 | TF1/TF2 工程验证完成，生产算法仍待部署 URL 与人工验收                             | 统一 UI 验收后进入后续辅助缺口              |
| P2     | 公共 TSV List                                     | 已完成 | Gen VII Egg 教程要求编辑 TSV List                                                 | 已接入 Gen VI/Gen VII Egg 与全局悬浮工具    |
| P2     | IV Range / IV Template                            | 已完成 | 3DSRNGTool `IVRange.cs`、`IVTemplate.cs`                                          | 已接入 Gen VI/Gen VII Egg 与全局悬浮工具    |
| P3     | Gen IV Gen4SeedFinder、Voltorb Flip               | 暂缓   | 项目所有者明确要求暂不计划；Swarm 已单独落地                                      | 后续重新排期                                |
| P4     | Gen V DS 参数、Initial Seed、Entralink 深审       | 暂缓   | 项目所有者明确要求暂不计划                                                        | 后续重新排期                                |
| P5     | TinyFinder 独有扩展                               | 已完成 | T1-T14 已落地；Ambush 覆盖 Victory Road Swooping，MT Seed/Time 独立成模块         | 进入全范围 UI 验收准备                      |
| P6     | 统一 3DS/UI 生产验收                              | 进行中 | 八项 UI 清单已完成源码收口，等待新 Pages 产物与外部浏览器复核                     | 先完成 Pages 部署，再逐项记录验收证据       |
| P7     | GitHub Pages 生产回归                             | 进行中 | 生产算法回归必须使用 Actions 部署后的准确 URL                                     | 等待部署完成和项目所有者提供 URL            |
| 持续   | 按教程共有主线审查入口、侧栏和真实功能缺口        | 复核   | 全世代 165 篇正文指南人工复核结论                                                 | 仅补真实缺口，避免重复开发                  |
| 最后   | Windows EXE 适配                                  | 进行中 | GitHub Actions 使用同一份 `dist/` 生成 Windows 自解压可执行包                     | Actions 产物完成后再做 Windows 实机验收     |
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
