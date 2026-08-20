# 第六世代 TinyFinder MT 初始 Seed / Time Finder

本模块实现 TinyFinder `Subforms/MT` 第二页的初始 Seed / 时间搜索。目标时间模式
按 TinyFinder 的 `Seed + 1000` 秒规则扫描；目标日期模式扫描 200,000 个 MT 帧，
匹配 `FindSavePar` 计算出的 Save Parameter。XY 使用 `Save Frame - 23`，ORAS 使用
`Save Frame - 25`。

## 已核对输入

| 输入                   | 范围或行为                                           | 上游依据                    |
| ---------------------- | ---------------------------------------------------- | --------------------------- |
| Target Date / Time     | 日期 `yyyy-MM-dd`，时间 `HH:mm:ss`；按整秒处理       | `MTForm.cs`、`Calculate.cs` |
| Frame 300 Seed         | 32 位十六进制，空值按 0                              | `MTForm.Designer.cs`        |
| Current Save Parameter | 32 位十六进制，空值按 0                              | `MTForm.Designer.cs`        |
| Target Seed            | 32 位十六进制，空值按 0                              | `MTForm.Designer.cs`        |
| Search seconds         | `0..5,000,000`；用于替代上游无限时间循环的浏览器保护 | PokeRNGKit Worker/Wasm 契约 |
| Result limit           | `1..100000`                                          | PokeRNGKit Worker/Wasm 契约 |

日期模式的 `Specific Date` 保留上游同日筛选语义；精确时间模式以每秒为一个任务，
结果带回 Citra RTC 偏移、Frame 300 Seed、Save Frame 和 Save Parameter。

## 算法与 ABI

- `FindSavePar` 使用 `ExpectedSeed = CurrentSavePar + CurrentMS`、`Correction =
ExpectedSeed - Frame300Seed` 和 `TargetSeed - CurrentMS + Correction` 的 32 位运算。
- MT 使用 TinyFinder `MersenneTwister_Fast` 的 624-word 初始化和 twist。
- API v1 使用 10 个请求 `uint32_t`、8 个结果 `uint32_t`，通过 `begin/step` 分批返回；
  日期模式预先生成 200,000 个 Save Parameter，精确时间模式每步扫描 8,000 个 MT 帧。

## 验证状态

已通过 `npm run format:check`、`npm run typecheck`、T14 Domain 定向 Vitest 和
`POKERNGKIT_WASM_MODULES=gen6mtseedtime npm run wasm:test:native`。完整 `npm run verify`、
Emscripten 生产构建、外部 Chrome/Edge UI 和生产页面算法回归待本模块提交前运行；
算法验收仍需部署完成后由项目所有者提供准确 URL 并授权。

## 上游与许可

主要来源为 TinyFinder `Subforms/MT/MTForm.cs`、`Subforms/MT/Core.cs`、`RNG/MT.cs`
与 `Utils/Calculate.cs`。保留上游版权、许可证和免责声明；PokeRNGKit 按 GPL-3.0-or-later
发布。
