# Advance Finder

> - 状态：功能模块与共享入口已实现，工程检查与生产页面回归待完成
> - 上游基线：PokeFinder 4.3.2
> - 模块标识：`gen4advance`
> - Wasm API：`2`

## 功能范围

本模块移植 PokeFinder 的 `Advance Finder` 与 `AdvanceSearcher`，用于按连续的 Calls、Chatot 或 Needles 观测收窄第四、第五世代生成结果表：

- `Calls`：按 `E`、`K`、`P` 连续匹配，仅用于 HGSS；
- `Chatot`：按 `High`、`Mid-High`、`Mid`、`Mid-Low`、`Low`、四种相邻音高联合区间与 `任意` 连续匹配；
- `Needles`：按八个保存指针方向或 `任意` 连续匹配，用于第五世代 Generator 结果；
- 空观测序列显示全部源行；匹配结果不超过 `5` 条时只显示匹配行，超过 `5` 条时恢复完整源表，同时保留真实的“可能的结果”数量；
- `Jump to Advance` 通过父模块回调定位原生成表；独立入口则选中本地源数据对应行。

PokeFinder 原对话框直接读取 Static、Wild、Egg 与 Event Generator 的 Qt Model。Web 独立入口以 `Advances,Value` 两列本地文本代替父 Model；嵌入现有生成器时可直接传入结构化源行，不经过文本解析。数据只在本地内存、Dedicated Worker 与 Wasm 实例之间传递。

## 上游依据

### Form 与交互

- `Form/Util/AdvanceFinder.ui`
  - 对话框尺寸为 `680 x 450`；
  - Tab 顺序为 `Calls`、`Chatot`、`Needles`，默认索引为 `1`，即 `Chatot`；
  - 观测序列为只读 `QLineEdit`，只能通过令牌按钮追加，通过 `Remove` 删除末项，通过 `Clear` 清空；
  - `Calls` 提供 Elm/Irwin 单选与 `K/E/P` 三个按钮；
  - `Chatot` 提供十个按钮；
  - `Needles` 提供八个方向按钮与 `Any`；
  - 没有 TextBox、SpinBox、正则校验器或固定字符宽度。
- `Form/Util/AdvanceFinder.cpp/.hpp`
  - 第四世代 Model 提供 `Calls` 与 `Chatot`，第五世代 Model 提供 `Chatot` 与 `Needles`；
  - 非 HGSS 存档隐藏 `Calls`；
  - 切换模式时清空令牌与只读序列；
  - 空序列的可能结果数等于源 Model 行数；
  - 匹配数小于等于 `5` 时过滤父 Model，否则显示完整父 Model；
  - `Jump to Advance` 选择父 Model 对应行并滚动到中部。
- `Form/i18n/PokeFinder_zh.ts`
  - 已有翻译逐字复用：`Any -> 任意`、`Remove -> 删除`、`Clear -> 清空`、`Possible Results -> 可能的结果`、`Chatot -> 音高`；
  - `Advance Finder`、`Calls`、`Elm`、`Irwin`、`Jump to Advance` 与所有音高区间翻译均为空，因此保留英文；
  - 结果列复用 Model 翻译：`Advances -> 帧数`、`Call -> 电话`。

### Core 与数值范围

- `Core/Util/AdvanceSearcher.hpp/.cpp`
  - `CallToken` 为 `E=0`、`K=1`、`P=2`，分别映射半开区间 `[0,1)`、`[1,2)`、`[2,3)`；
  - `ChatotToken` 与区间为：`Any [0,100)`、`High [80,100)`、`Mid-High [60,80)`、`Mid [40,60)`、`Mid-Low [20,40)`、`Low [0,20)`、`High / Mid-High [60,100)`、`Mid-High / Mid [40,80)`、`Mid / Mid-Low [20,60)`、`Mid-Low / Low [0,40)`；
  - `NeedleToken` 为方向 `0..7` 与 `Any=8`；方向令牌映射 `[n,n+1)`，`Any` 映射 `[0,8)`；
  - `findMatches()` 对源行执行连续滑动窗口匹配，返回所有匹配起始行；空序列直接返回空列表，由 Form 单独处理。
- `Model/Gen4/IRNGProvider4.hpp` 与 `Model/Gen4/{Static,Wild,Egg,Event}Model4.hpp`
  - 源 Model 通过 `u8 getCall(int row)` 与 `u8 getChatot(int row)` 暴露值；Qt `rowCount()` 使用 `int`，Core 搜索入口接收 `size_t`；上游未设置独立的源行数或令牌数上限。
- `Model/Gen5/IRNGProvider5.hpp` 与第五世代 Generator Model
  - 源 Model 通过 `u8 getChatot(int row)` 与 `u8 getNeedle(int row)` 暴露值；Needle 范围为 `0..7`。
- `Core/Gen4/States/State4.hpp`、`Core/Gen4/States/WildState4.hpp`
  - `Call` 来自 `prng % 3`，真实范围为十进制 `0..2`；
  - `Chatot` 来自 `((prng % 8192) * 100) >> 13`，真实范围为十进制 `0..99`；
  - Generator 的 `Advances` 为 `u32`，范围为十进制 `0..4294967295`。

PokeFinder 4.3.2 没有 `AdvanceSearcher` 的 QtTest/JSON 固定夹具。本模块的原生夹具据上述枚举、半开区间和滑动窗口规则建立，分别覆盖 Call 重复匹配、Chatot 联合区间、Needle 精确/任意匹配与非法令牌。

## Web 输入边界

| 输入        | 进制             | Web/domain 范围       | 上游依据                       |
| ----------- | ---------------- | --------------------- | ------------------------------ |
| `Advances`  | 十进制           | `0..4294967295`       | Generator state `u32`          |
| `Call`      | 十进制或 `E/K/P` | `0..2`                | `prng % 3`、`CallToken`        |
| `Chatot`    | 十进制           | `0..99`               | State4 Chatot 公式             |
| `Needle`    | 十进制           | `0..7`                | `IRNGProvider5::getNeedle()`   |
| Call 令牌   | 按钮             | `E/K/P`               | `AdvanceSearcher::CallToken`   |
| Chatot 令牌 | 按钮             | `0..9` 的十种固定区间 | `AdvanceSearcher::ChatotToken` |
| Needle 令牌 | 按钮             | `0..8`                | `AdvanceSearcher::NeedleToken` |

Qt 依赖已有 Model，没有文本输入的空值与宽度规则。Web 文本适配器忽略空行，每个非空行必须恰好包含 `Advances,Value` 两项，分隔符可为逗号、分号、Tab 或空格；任何非法行都会拒绝整批数据。为限制单个浏览器任务的内存占用，Web 额外设置 `1,000,000` 行与 `100,000` 个令牌上限；这两个数值是 PokeRNGKit 的工程边界，不是 PokeFinder 限制。

## Wasm 与 Worker

- C ABI：`gen4advance_api_version`、`gen4advance_search`、`gen4advance_result_ptr`、`gen4advance_result_count`、`gen4advance_last_error`；
- 请求行固定为两个 `uint32_t`：`advances`、`value`；结果固定为两个 `uint32_t`：`row`、`advances`；
- API v2、`module.json` 与 Worker 握手均声明 `searcher`；v2 增加 Needles 模式，Calls/Chatot 请求格式保持不变；
- 每次任务使用一个 Dedicated Worker 和一个 Wasm 实例；取消通过终止并按需重建 Worker 完成，不使用 Wasm pthread、`SharedArrayBuffer` 或跨源隔离；
- 预览引擎只用于 UI 模式交互，不作为 RNG 或算法验收证据。

## 文件

```text
src/features/gen4advance/
|-- domain.ts
|-- domain.test.ts
|-- search.ts
|-- Gen4AdvancePanel.tsx
|-- Gen4AdvancePanel.css
|-- preview/
|   |-- Gen4AdvanceUiPreviewEngine.ts
|   `-- Gen4AdvanceUiPreviewEngine.test.ts
`-- worker/
    |-- messages.ts
    |-- gen4advance.worker.ts
    `-- Gen4AdvanceWorker.ts

wasm/modules/gen4advance/
|-- CMakeLists.txt
|-- module.json
|-- bridge/
|   |-- gen4advance_bridge.h
|   `-- gen4advance_bridge.cpp
`-- tests/
    `-- advance_native_test.cpp
```

## 接入与验证

- 已在 `src/features/shared/rngModuleContract.ts` 注册 `gen4advance` 与 `searcher`；
- 已在 `src/App.tsx` 与 `src/i18n.ts` 增加 GEN IV 入口和三语模块信息；
- 已在 `wasm/CMakeLists.txt` 与 `scripts/wasm.mjs` 增加默认 target；
- Worker 在复制 Wasm 数据前验证任务信封、领域请求、chunk、结果计数、指针对齐和堆范围；
- API v2 已通过 `npm test -- src/features/gen4advance src/features/gen5static`（6 个文件、21 项测试）、定向 ESLint、全仓 TypeScript、格式与差异检查；
- `$env:POKERNGKIT_WASM_MODULES='gen4advance,gen5static'; npm run wasm:test:native` 已通过 `gen4advance_native_parity` 与 `gen5static_native_parity` 2/2；
- 受限文件环境外的完整 `npm run verify` 已通过 67 个测试文件共 255 项测试、Vite 生产构建和 57 项 PWA 预缓存；
- Emscripten 生产 Wasm 与 GitHub Pages 页面回归仍待部署完成后与项目所有者共同验收。

建议 GitHub Desktop 提交标题：`feat: 实现第四世代推进查询`
