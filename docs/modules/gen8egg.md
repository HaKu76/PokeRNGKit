# 第八世代孵化乱数

## 功能范围

本模块对应 PokeFinder 4.3.2 的 `Gen 8 Eggs`，仅使用 Brilliant Diamond / Shining Pearl Profile：

- 按两段 64 位 Xorshift Seed、初始帧、最大帧数与 Offset 生成 BDSP 蛋状态。
- 支持好感度、异国孵化、闪耀护符、圆形护符、双亲 IV / 特性 / 性别 / 道具 / 性格和红线。
- 支持异色、性别、特性、性格、觉醒属性与六项 IV 筛选，并可关闭筛选。
- 结果保留 PokeFinder `EggModel8` 的 15 列，六项能力列可切换 IV、能力值或遗传来源。
- 使用独立 C++/WebAssembly、Dedicated Worker Pool、进度、取消、结果上限、虚拟滚动、排序与 CSV。

生产 RNG 只在 Worker 内的 `gen8egg` Wasm 执行。React/TypeScript 负责档案选择、输入校验、确定性分片、Worker 编排、结果解码和展示；UI 预览引擎只提供布局数据，不能作为算法结果证据。

## 输入限制

空数字文本沿用 PokeFinder `TextBox::getUInt()` / `getULong()`，解释为 `0`。HTML 与领域校验同时执行下表边界。

| 输入                  | 进制与范围                                    | 默认值与跨字段行为                                       | 上游依据                                                           |
| --------------------- | --------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Seed 0 / Seed 1       | 十六进制，最多 16 位，`0..0xFFFFFFFFFFFFFFFF` | 空值为 `0`；两项同时为 `0` 时拒绝生成                    | `Eggs8.cpp` 的 `InputType::Seed64Bit`、`TextBox.cpp`               |
| Initial Advances      | 十进制，最多 10 位，`0..4294967295`           | 默认 `0`                                                 | `Eggs8.cpp` 的 `InputType::Advance32Bit`、`EggGenerator8` 构造参数 |
| Max Advances          | 十进制，最多 10 位，`0..4294967295`           | 默认 `100000`；处理 `Max Advances + 1` 个状态            | `Eggs8.ui`、`EggGenerator8.cpp` 的 `cnt <= maxAdvances`            |
| Offset                | 十进制，最多 10 位，`0..4294967295`           | 空值为 `0`；`Initial + Offset + Max` 不得超过 `uint32_t` | `Eggs8.cpp`、`EggGenerator8` 构造参数                              |
| Compatibility         | `20`、`50`、`70`                              | 圆形护符关闭时原值使用；开启后分别变为 `40`、`80`、`88`  | `Eggs8.cpp::generate()`                                            |
| Profile               | Brilliant Diamond / Shining Pearl             | TID/SID 各为 `0..65535`；读取闪耀护符、圆形护符          | `ProfileDisplay8::setup(..., Game::BDSP)`、`Profile8.hpp`          |
| Parent IV             | 六项各为 `0..31`                              | 双亲默认全 `31`                                          | `EggSettings.ui` 的十二个 `QSpinBox::maximum = 31`                 |
| Parent Ability        | `0`、`1`、`H`                                 | `H` 内部值为 `2`                                         | `EggSettings.cpp::setup(Game::BDSP)`                               |
| Parent Gender         | Male、Female、Genderless、Ditto               | 仅接受八种上游组合；提交前按游戏顺序规范化双亲           | `EggSettings::isValid()`、`reorderParents()`                       |
| Parent Item           | None、Everstone、Destiny Knot                 | 内部值为 `0`、`1`、`8`；红线使遗传项由 3 项变为 5 项     | `EggSettings.cpp`、`EggGenerator8.cpp`                             |
| Parent Nature         | 25 种性格，内部值 `0..24`                     | 单方不变之石固定该方性格；双方不变之石随机选择一方       | `EggSettings.cpp`、`EggGenerator8.cpp`                             |
| Egg Specie            | `EggSettings::allowed[]` 中不超过 493 的物种  | 仅允许 BDSP 可孵化列表，不接受列表外输入                 | `EggSettings.cpp::setup(Game::BDSP)`                               |
| Masuda                | 布尔值                                        | 默认关闭；开启后增加 6 次 PID 抽取                       | `EggGenerator8.cpp`                                                |
| Disable Filters       | 布尔值                                        | 开启后跳过全部状态筛选                                   | `Filter`、`StateFilter`                                            |
| Shiny                 | Any、Not Shiny、Star、Square、Star/Square     | 对应上游异色筛选                                         | `Filter`、`StateFilter`                                            |
| Gender                | Any、Male、Female、Genderless                 | 特殊蛋种按实际生成物种判断                               | `Filter`、`Utilities::getGender()`                                 |
| Ability               | Any、`0`、`1`、`H`                            | 筛选 `H` 时，提供遗传特性的非百变怪亲代必须为隐藏特性    | `EggSettings::isValid(true)`、`EggGenerator8.cpp`                  |
| Nature / Hidden Power | 25 / 16 项位掩码                              | Wasm 边界要求至少选择一项                                | `Filter`、`StateFilter`                                            |
| Filter IV             | 六组闭区间，各端 `0..31`                      | 每组最小值不得大于最大值                                 | `Filter.ui`、`StateFilter`                                         |
| Result Limit          | `1..100000`                                   | 浏览器与 Wasm 同时限制                                   | PokeRNGKit Worker/Wasm 边界                                        |

Web 单次任务最多执行 `250,000,000` 次状态评估，评估量为 `Max Advances + 1`。该浏览器保护上限不缩小上游控件的 `uint32_t` 输入范围，但会在创建 Worker 前拒绝超出预算的任务。

## 双亲与特殊蛋种

合法性别组合为 Male + Female、Female + Male、Ditto + Female、Female + Ditto、Male + Ditto、Ditto + Male、Genderless + Ditto、Ditto + Genderless。

提交前按 `EggSettings::reorderParents()` 规范化内部顺序：Female/Male、Female/Ditto、Ditto/Male、Ditto/Genderless 会交换双亲的 IV、特性、性别、道具和性格。结果中的遗传来源会映射回用户提交前的 A / B 顺序。

特殊蛋种保留 PokeFinder 分支：

- Nidoran：物种 `29 / 32` 由 `XoroshiroBDSP` 选择雌性或雄性个人数据。
- Volbeat / Illumise：物种 `313 / 314` 由同一分支选择雄性或雌性个人数据。

实际物种用于性别比例、特性名称、能力值和结果校验；上游结果表不增加物种列。

## 算法

外层使用 `RNGList<u32, Xorshift, 2, gen>`，从 `Initial Advances + Offset` 开始逐帧判断产蛋。只有 `next(100) < Compatibility` 的帧进入蛋生成，并将有符号扩展后的 32 位 Egg Seed 交给 `XoroshiroBDSP`。

每个蛋依次生成实际性别/特殊物种、性格、特性、遗传槽、六项 IV、EC 与 PID。普通情况遗传 3 项 IV，任一亲代携带红线时遗传 5 项。上游明确忽略力量道具；本模块不提供不存在于 BDSP 设置中的力量道具。

异国孵化增加 6 次 PID 抽取，闪耀护符增加 2 次；每次抽取发现异色后提前停止。两者都未开启时，上游 `pidRolls` 为 `0`，PID 保持 `0`，本模块保留该行为。

## Worker 与 Wasm 契约

- Module id：`gen8egg`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：53 个 `uint32_t`
- 结果：13 个 `uint32_t`
- 默认 Worker：最多 4 个；调用方最多请求 8 个

```text
Gen8EggPanel
  `-- Gen8EggWorkerPool
        `-- Dedicated Worker x N
              `-- gen8egg.mjs + gen8egg.wasm
                    `-- gen8egg_generate
```

Worker 初始化核对模块 id、共享契约版本、API 版本与 operation。任务核对请求宽度、分片范围、Wasm 指针、堆范围、错误码、结果数量、处理计数和缓冲区长度。Pool 按 `chunkIndex` 恢复乱序批次；取消、崩溃、协议错误或未知批次会终止并清空 Worker，后续任务按需重建。

## 翻译与界面

简体中文逐字采用 `Form/i18n/PokeFinder_zh.ts`，包括“第八世代孵化乱数”“乱数信息”“初始帧”“最大帧数”“好感度”“筛选项”“红线”“闪耀护符”“圆形护符”和“帧数”。上游未翻译的双亲重排提示保留英文源字符串 `Parent were swapped to match the game`。

界面使用紧凑 operational workspace：档案摘要位于顶部，RNG 信息与设置/筛选在桌面并排，设置和筛选使用标签切换，结果表占据剩余高度并独立滚动。`1280px` 以下重排为单栏；触屏断点把 40px 紧凑控件提升到 44px。应用侧边栏外壳保持直角，内部导航行保留现有交互圆角。

## 固定夹具与验证

- `Test/Gen8/egg8.json`：PokeFinder 上游第八世代蛋生成固定数据。
- `wasm/modules/gen8egg/tests/gen8egg_native_test.cpp`：固定 Seed `1234567887654321 / 8765432112345678`、TID `12345`、SID `54321`、双护符、异国孵化、好感度 `88`、帧 `0..9`；覆盖 Bulbasaur、Nidoran 和 Volbeat / Illumise 分支，以及零 Seed、推进溢出和结果上限。
- `src/features/gen8egg/domain.test.ts`：覆盖输入边界、空十进制、圆形护符好感度、双亲规则、任务预算、确定性分片、53-word 编码、派生值和解码上限。
- `src/features/gen8egg/preview/Gen8EggUiPreviewEngine.test.ts`：覆盖筛选、不可满足的觉醒属性和取消。
- `src/features/gen8egg/worker/Gen8EggWorkerPool.test.ts`：覆盖乱序批次、数值选项、结果上限传递、取消和缓冲区长度。

2026-08-15 工程检查：

- 已通过：`npm run wasm:test:native` 的 37/37 原生夹具，包含 `gen8egg_native_parity`；固定 Seed 的 Bulbasaur、Nidoran、Volbeat / Illumise 分支、零 Seed、推进溢出与结果上限均通过。
- 已通过：`npm run verify` 的全仓 Prettier、ESLint（0 error、3 条既有 TanStack Virtual warning）、TypeScript，以及 91 个测试文件共 373 项测试。
- 构建限制：同一轮 `verify` 在 Vite 复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；非受限重试未启动，审批服务返回 502。该错误发生在 2079 个模块转换完成后的输出目录准备阶段。
- 未运行：`npm run wasm:build` 检查到当前会话缺少 Emscripten 与 `emcmake`，本机常见路径未发现可激活 emsdk；CMake 与 Ninja 正常。生产 Wasm 由固定 Emscripten 6.0.6 的 GitHub Actions 继续验证。
- 环境：Node.js `24.13.0`、npm `11.6.2`、Visual Studio Build Tools 2026 x64。当前终端版本低于仓库锁定的 Node.js `24.19.0` / npm `12.0.2`，不能替代锁定工具链的 Actions 证据。
- 待完成：GitHub Actions、生产页面算法回归、外部 Chrome/Edge UI 检查和项目所有者最终验收。

## 上游与许可

行为改编自 PokeFinder 4.3.2：

- `Form/Gen8/Eggs8.cpp`、`Eggs8.hpp`、`Eggs8.ui`
- `Form/Controls/EggSettings.cpp`、`EggSettings.hpp`、`EggSettings.ui`
- `Form/Controls/Filter.cpp`、`Filter.hpp`、`Filter.ui`
- `Form/Controls/TextBox.cpp`、`TextBox.hpp`
- `Core/Gen8/Generators/EggGenerator8.cpp`、`EggGenerator8.hpp`
- `Core/Gen8/States/EggState8.hpp`
- `Core/Gen8/Profile8.hpp`
- `Core/Parents/Daycare.cpp`、`Daycare.hpp`
- `Core/Parents/Filters/StateFilter.cpp`、`StateFilter.hpp`
- `Core/RNG/RNGList.hpp`、`Xorshift.hpp`、`Xoroshiro.hpp`
- `Core/Util/Utilities.cpp`、`Utilities.hpp`
- `Model/Gen8/EggModel8.cpp`、`EggModel8.hpp`
- `Form/i18n/PokeFinder_zh.ts`、`PokeFinder_ja.ts`
- `Test/Gen8/EggGenerator8Test.cpp`、`EggGenerator8Test.hpp`、`egg8.json`

保留 PokeFinder 的 GPL-3.0-or-later 许可、版权归属、对应源码提供义务和商标免责声明。PokeRNGKit 不是 Nintendo、Creatures 或 GAME FREAK 的官方产品，也未获其认可。
