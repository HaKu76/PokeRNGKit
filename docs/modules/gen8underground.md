# 第八世代地下大洞窟乱数

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

## 功能范围

本模块对应 PokeFinder 4.3.2 `Gen 8 Underground`，仅接受 Brilliant Diamond / Shining Pearl Profile。上游只有 Generator，没有 Searcher；PokeRNGKit 不增加 Sword / Shield 或反向检索工作流。

- 支持 BD/SP 各 18 个地下房间、6 个剧情进度、9 个徽章/图鉴等级区间、地鼠光石加成和房间可用物种筛选。
- 支持 None、Cute Charm、Compound Eyes、Super Luck、Hustle、Pressure、Vital Spirit 与 25 种 Synchronize Nature 队首。
- 支持异色、性别、特性、性格、觉醒力量、身高、体重、六项 IV 和物种筛选；Disable Filters 同时跳过物种筛选。
- 保留 PokeFinder `UndergroundModel` 的 Advances、Egg Move、Item、Species、Level、EC、PID、Shiny、Nature、Ability、六项能力、Gender、Characteristic、Height、Weight 共 20 列，并支持 IV/能力值切换、虚拟滚动、排序、CSV、进度、取消和清空。

PokeFinder 的 `Controls::Wild` 只隐藏 Encounter Slots 与 Level 筛选。Hidden Power 控件仍显示，但 `UndergroundStateFilter::compareState()` 没有读取该筛选；Web 端保留控件和请求字段，不在 TypeScript 中自行改变算法。

## 输入限制

空数字文本按照上游 `TextBox::getUInt()` / `getULong()` 解释为 `0`。HTML 控件和领域校验同时应用以下边界。

| 输入                     | 范围                                                                                             | 行为                                                                                           | 上游依据                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Profile                  | Brilliant Diamond / Shining Pearl；TID/SID `0..65535`                                            | Sword / Shield Profile 拒绝                                                                    | `Underground.cpp`、`ProfileDisplay8::setup(..., Game::BDSP)`         |
| Seed 0 / Seed 1          | 十六进制，各最多 16 位                                                                           | 空值为 `0`；两项同时为 `0` 时拒绝                                                              | `Underground.cpp`、`TextBox.cpp` 的 `Seed64Bit`                      |
| Initial Advances         | 十进制 `uint32_t`，`0..4294967295`                                                               | 默认 `0`，空值为 `0`                                                                           | `Underground.ui`、`TextBox.cpp` 的 `Advance32Bit`                    |
| Max Advances             | 十进制 `uint32_t`，`0..4294967295`                                                               | 默认 `100000`；包含起点，实际处理 `N + 1` 帧                                                   | `Underground.ui`、`UndergroundGenerator.cpp` 的 `cnt <= maxAdvances` |
| Offset                   | 十进制 `uint32_t`，`0..4294967295`                                                               | 默认空，读取为 `0`                                                                             | `Underground.ui`、`Underground.cpp`                                  |
| 推进组合                 | `Initial + Offset + Max <= 4294967295`                                                           | 超出 Xorshift `uint32_t` advance 范围时拒绝                                                    | `UndergroundGenerator` 构造参数与 `RNGList`                          |
| Lead                     | Synchronize `0..24`、Cute Charm F/M `25/26`、Level Modifier `32`、Item Modifier `34`、None `255` | Hustle/Pressure/Vital Spirit 共用 `32`；Compound Eyes/Super Luck 共用 `34`                     | `Lead.hpp`、`Underground.cpp`、`UndergroundGenerator.cpp`            |
| Story Flag               | `1..6`                                                                                           | UI 对应 Underground Unlocked、Strength、Defog、7 Badges、Waterfall、National Dex               | `Underground.ui`、`storyFlagIndexChanged()`                          |
| Level Flag               | `0..8`                                                                                           | 等级区间固定为 `16-20`、`25-29`、`29-33`、`33-37`、`36-40`、`39-43`、`42-46`、`50-55`、`58-63` | `Underground.ui`、`UndergroundGenerator.cpp`                         |
| Location                 | room id `2..19`                                                                                  | 显示位置资源 id 为 `183..200`；切换地点后重建物种列表                                          | `Underground.cpp`、`UndergroundArea`                                 |
| Diglett Bonus            | 布尔值                                                                                           | 增加对应物种 rateup，并将 PID 抽取次数由 1 改为 2                                              | `Encounters8.cpp`、`UndergroundGenerator.cpp`                        |
| Species                  | 当前版本、地点与 Story Flag 可用物种                                                             | 支持多选；Disable Filters 时忽略                                                               | `CheckList.cpp`、`UndergroundFilter.cpp`                             |
| Shiny / Gender / Ability | Any / Star / Square / Star/Square；Any / Male / Female；Any / `0` / `1`                          | 不提供 Genderless 或 Hidden Ability 筛选                                                       | `Filter.ui`、`UndergroundFilter.cpp`                                 |
| Nature / Hidden Power    | 25 项 / 16 项位掩码                                                                              | Nature 参与筛选；Hidden Power 仅保留上游可见控件，不参与 `compareState()`                      | `Filter.ui`、`UndergroundFilter.cpp`                                 |
| Height / Weight          | 两组闭区间，端点 `0..255`                                                                        | 每组最小值不得大于最大值                                                                       | `UndergroundFilter.cpp`                                              |
| IV                       | 六组闭区间，端点 `0..31`                                                                         | 每组最小值不得大于最大值                                                                       | `Filter::isValid()`、`UndergroundFilter.cpp`                         |
| Result Limit             | `1..100000`                                                                                      | Worker 与 Wasm 同时限制                                                                        | PokeRNGKit Worker/Wasm 边界                                          |

浏览器单次任务最多评估 `250,000,000` 个状态；该保护限制不改变上游控件的 `uint32_t` 输入边界。

## 算法

每个起始帧使用原始 Xorshift 状态填充 256 项 `RNGList`。生成器先判定特殊宝可梦和房间生成数量，再按类型、体型和累计 rate 选择普通物种；每只宝可梦依次生成 Level、EC、fake SID/TID、PID、异色修正、六项 IV、Ability、Gender、Nature、Height、Weight、Item 与 Egg Move，最后计算 Characteristic、Ability ID 和六项能力值。

Level Modifier 固定使用当前等级区间上限；Cute Charm 以 `67%` 分支修正性别；Item Modifier 将常见道具阈值由 `50` 调整为 `60`。Diglett Bonus 增加 rateup 并提供第二次 PID 异色抽取。

## Worker 与 Wasm

- Module id：`gen8underground`；contract / API version：`2`；operation：`generator`
- 请求为 56 个 `uint32_t`，结果为 12 个 `uint32_t`
- 请求包含双 64 位 Seed、分片、Profile、版本、Story/Level/Location、Diglett、Lead、完整筛选、16 个物种位掩码字、Offset 与结果上限
- 生产算法仅在 Dedicated Worker 内的 C++/Emscripten Wasm 执行；最多 8 个独立 Worker，不使用 SharedArrayBuffer 或 pthread
- Worker 按 `chunkIndex` 恢复确定顺序；取消终止并重建实例，并拒绝迟到批次、异常结果长度和越界 Wasm 指针

## 数据来源

`scripts/generate_gen8_underground_data.mjs` 从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 BDSP Underground 表、PokeFinder 4.3.2 `personal_bdsp.bin`、`UndergroundGenerator.cpp` Egg Move 表和本地化资源生成 TypeScript/C++ 静态数据。

- BD 压缩遭遇数据：9,306 bytes，SHA-256 `DA1A4AAA6BD2980979685387E2422FEF9A026B45B1E5F5FFA6BD5AC7C90BAEAC`
- SP 压缩遭遇数据：9,410 bytes，SHA-256 `5780AD48C718ACB61D2C7F34567CF26F5D9500378375C7E25544CFA2DCD8D2DB`
- `personal_bdsp.bin`：38,080 bytes，SHA-256 `4E5CBCB1FBE7FFE559EAD6555DC02878E0D9B8700CE185998B381CFBB4DB7EC3`
- `src/features/gen8underground/data.ts`：130,431 bytes，SHA-256 `C955AF5997E7F7B892A59F2AF930C88093B22BA59D022D0A69D1702953299656`
- `wasm/modules/gen8underground/bridge/underground_data.inc`：55,423 bytes，SHA-256 `DC27D1723D7ADB9B83C89F1120EDF15F66622337CFF5324E1A2E866D60EBD40C`

生成结果包含 BD/SP 各 18 个区域、141 条 Egg Move、494 条 Personal 记录，以及英/日/简中地点、招式和道具显示名。PokeFinder 4.3.2 的 `ja/moves_ja.txt` 实际重复了意大利语招式表，因此日文招式名明确回退到英文源标签；日文道具资源保持原值。

## 固定夹具

固定输入为 Seed 0 `1234567887654321`、Seed 1 `8765432112345678`、TID `12345`、SID `54321`、Location `2`、Level Flag `0`。每组 10 帧均返回 60 条结果。

- None：首条 EC `818C829E`、PID `C67596B5`、Species `198`、Egg Move `413`、Level `17`、IV `28/1/23/10/31/20`
- Diglett Bonus + National Dex：首条 Species `434`、PID `2E8A7ABC`、Egg Move `583`、Level `17`、IV `1/23/10/31/20/26`
- Compound Eyes：首条 Species `434`、Egg Move `492`、Level `17`
- Cute Charm F：首条 Species `434`、Egg Move `583`、Level `17`
- Pressure：首条 EC `1A8E5334`、PID `35A238A0`、Species `434`、Egg Move `184`、Level `20`、IV `21/28/1/23/10/31`
- Synchronize Hardy：首条 Species `434`、Egg Move `184`、Level `17`

夹具另覆盖结果上限、零 Seed、非法 Story Flag、浏览器范围保护、异色筛选和 Disable Filters 跳过物种筛选。

## 验证

- `src/features/gen8underground/domain.test.ts`：Seed、54-word 编码、物种位掩码、包含起点的分片、空物种列表、推进溢出和 12-word 解码。
- `src/features/gen8underground/preview/Gen8UndergroundUiPreviewEngine.test.ts`：预览结果、空物种结果与取消。
- `src/features/gen8underground/worker/Gen8UndergroundWorkerPool.test.ts`：乱序批次恢复、数值选项、初始化取消竞态和异常批次长度。
- `wasm/modules/gen8underground/tests/gen8underground_native_test.cpp`：6 组上游固定场景和错误边界。
- `npm run verify`：Prettier、ESLint、TypeScript、127 个 Vitest 文件共 473 项测试、2169 个模块的 Web/PWA 构建与 171 项、18,708.67 KiB 预缓存通过；ESLint 为 0 error，仅保留 6 条既有 TanStack Virtual warning。
- `npm run wasm:test:native`：50/50 原生夹具通过，包含 `gen8underground_native_parity`。
- `npm run wasm:build`：Emscripten 6.0.6 构建默认 49 个独立模块；`gen8underground.mjs` 为 7,615 bytes，SHA-256 `EFCBEF9414C29E0529DB5F7D5626828C6D242046515BAB89C7F1D1A422100727`；`gen8underground.wasm` 为 68,926 bytes，SHA-256 `B3A753D24DB0466A534045206115693E426F5813CEE959806DF64C581AD4DBE2`。
- 外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Worker/Wasm 返回固定 10 帧的 60 条结果，首条与 None 夹具逐字段一致；物种全部取消时返回 0 条，启用 Disable Filters 后恢复 60 条。
- 390、768、1280 与 1920px 下无整页横向溢出；768px 控制区切为单列并避开悬浮工具，窄屏物种项触控高度为 44px，结果表保持独立横纵滚动且首行与表头间距为 0；中英日三语和控制台检查通过。

本地测试、原生/Wasm 构建与本地浏览器检查属于工程证据，不能替代 GitHub Actions 部署后的生产页面算法回归和项目所有者最终验收。
