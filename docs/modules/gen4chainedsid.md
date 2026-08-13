# 第四世代 Chained Shiny to SID

## 状态

- 模块：`gen4chainedsid`
- 上游：PokeFinder 4.3.2 `ChainedSID` / `ChainedSIDCalc`
- 产品层：React + TypeScript
- 算法层：独立 C++/Emscripten WebAssembly，仅在 Dedicated Worker 中执行
- Worker：单 Worker；每次提交完整观测列表并从 8192 个 SID 候选重新筛选
- 验证：已加入 TypeScript 域测试、UI Preview 测试和原生固定夹具；共享导航、模块契约和默认 Wasm 构建列表已接入；`$env:POKERNGKIT_WASM_MODULES='gen4chainedsid'; npm run wasm:test:native` 通过 1/1

## 上游文件

- `Form/Gen4/Tools/ChainedSID.cpp`
- `Form/Gen4/Tools/ChainedSID.hpp`
- `Form/Gen4/Tools/ChainedSID.ui`
- `Form/Controls/TextBox.cpp`
- `Core/Gen4/Tools/ChainedSIDCalc.cpp`
- `Core/Gen4/Tools/ChainedSIDCalc.hpp`
- `Core/Parents/PersonalLoader.cpp`
- `Core/Resources/Embed/embed_personal.py`
- `Test/Gen4/ChainedSIDCalcTest.cpp`
- `Test/Gen4/chainedsid.json`
- `Form/i18n/PokeFinder_zh.ts`

## 输入限制

| 输入    | 上游控件与类型                                                                                        | Web 行为                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Pokemon | `for (u16 i = 1; i < 493; i++)`，范围 `1..492`；`PersonalLoader::getPersonal(Game::DPPt, specie)`     | `1..492`；物种名复用 `gen4IvData.ts`，性别比使用 Diamond personal 快照，因为 `Game::DPPt` 在 `PersonalLoader` 中先命中 Diamond |
| Ability | 当前物种 `PersonalInfo::getAbility(0/1)`；两项相同则只显示一项                                        | 只接受当前物种第一或第二特性；名称复用 `gen4IvData.ts`                                                                         |
| Gender  | `255 -> 2`、`254 -> 1`、`0 -> 0`，其余提供 `0/1`                                                      | 同上；显示沿用上游 `Translator` 的 `♂`、`♀`、`-`                                                                               |
| Nature  | `currentIndex()` 传入 `u8`                                                                            | `0..24`，顺序与 PokeFinder 性格资源一致                                                                                        |
| TID     | `TextBox::setValues(InputType::TIDSID)`：十进制、最多 5 位、`0..65535`；空值由 `getUShort()` 转为 `0` | `inputMode=numeric`、`maxLength=5`、`0..65535`；空值按 `0` 处理；首条成功观测后锁定                                            |
| HP      | `QSpinBox` 默认最小值 `0`，显式最大值 `651`                                                           | `0..651`                                                                                                                       |
| Atk     | `QSpinBox` 默认最小值 `0`，显式最大值 `435`                                                           | `0..435`                                                                                                                       |
| Def     | `QSpinBox` 默认最小值 `0`，显式最大值 `545`                                                           | `0..545`                                                                                                                       |
| SpA     | `QSpinBox` 默认最小值 `0`，显式最大值 `435`                                                           | `0..435`                                                                                                                       |
| SpD     | `QSpinBox` 默认最小值 `0`，显式最大值 `545`                                                           | `0..545`                                                                                                                       |
| Spe     | `QSpinBox` 默认最小值 `0`，显式最大值 `435`                                                           | `0..435`                                                                                                                       |
| 观测数  | 上游 `std::vector` 未设置显式 UI 上限                                                                 | 浏览器单次请求上限 1024 条，避免无界消息与计算                                                                                 |

Qt 能力值上限与 Core 参数存在上游不一致：Form 允许部分值超过 `255`，但 `ChainedSIDCalc::addEntry` 的六项参数是 `u8`。本模块在 HTML 和 domain 中保留 Qt 可输入范围，Wasm 调用上游恢复算法前按 `u8` 转换，以复现 PokeFinder 的实际行为，不静默改写用户输入或宣称这些值是个体值范围。

## 算法与状态

1. TID 建立后，候选 SID 初始化为 `0, 8, 16, ... 65528`，共 8192 项。
2. 每条观测使用 `LCRNGReverse::recoverPokeRNGIV(..., Method::Method1)` 恢复候选种子。
3. 逆向 13 个连锁异色调整位，再组合 PID 低位，按物种特性与性别比过滤。
4. 对每个当前 SID 候选恢复 PID 高位，并按 `PID % 25` 匹配性格。
5. 多条观测按录入顺序连续收窄候选；唯一候选显示上游原文 `SID Found: %1`，否则显示 `Possible Results: %1`。
6. `Clear` 取消正在运行的 Worker、清空观测、恢复 8192 个候选并解锁 TID。

生产算法只存在于 C++/Wasm。UI Preview 使用确定性假数据，仅用于表单和状态预览，不作为 RNG 结果证据。

## C ABI

API 版本：`1`。

```text
gen4chainedsid_api_version() -> uint32
gen4chainedsid_calculate(tid, entries*, entryCount) -> resultCount
gen4chainedsid_result_ptr() -> uintptr
gen4chainedsid_result_count() -> uint32
gen4chainedsid_last_error() -> uint32
```

每条观测固定为 12 个 `uint32_t`：

```text
HP, Atk, Def, SpA, SpD, Spe,
Ability, Gender, Nature, Ability 0, Ability 1, Gender Ratio
```

结果缓冲区每项为一个 `uint32_t SID`，保持升序。错误码：`0` 成功、`1` 非法输入、`2` 观测数超过 1024。

`module.json`、C++、TypeScript 和 Worker 握手均使用 API v1；manifest 只声明 `searcher`。构建产物为 `gen4chainedsid.mjs` 和 `gen4chainedsid.wasm`。

## 固定夹具

原生夹具移植 `Test/Gen4/chainedsid.json` 的 `Lake of Rage Gyrados` 数据：

- TID：`12345`
- 三条观测：`7.29.18.14.23.22`、`22.14.23.11.4.24`、`24.11.4.29.9.6`
- 期望唯一 SID：`54320`

夹具同时覆盖 API 版本和非法 TID；Visual Studio 2026 Build Tools x64 原生夹具通过 1/1。该原生证据不替代 Emscripten Wasm 构建或部署页面算法回归。

## 产品接入

- `src/App.tsx` 在 GEN IV 分组注册独立导航和页面渲染；三语导航标题与版本词条位于 `src/i18n.ts`。
- `src/features/shared/rngModuleContract.ts` 登记 `gen4chainedsid` 的 `searcher` 能力。
- `wasm/CMakeLists.txt` 与 `scripts/wasm.mjs` 将模块加入默认构建和原生夹具清单。
- 页面使用现有 HakuStyle operational workspace、紧凑表单和独立结果表，不创建新的全局主题或布局系统。
