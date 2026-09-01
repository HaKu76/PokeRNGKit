# 第七世代配信乱数

## 功能范围

`gen7event` 实现 3DSRNGTool Gen VII `Event RNG` 配信宝可梦连续帧工作流：

- 支持 Sun、Moon、Ultra Sun、Ultra Moon。
- 支持本地导入 `.wc7` 与 `.wc7full` 配信卡，不上传文件。
- 支持物种、形态、等级、固定个体值、保底随机 V 数、特性、性格、性别、PID 类型、TID/SID、EC、PID、自 ID、蛋、未登入图鉴和其他信息。
- 支持完整个体筛选、Blink / Safe Frame、进度、取消、100000 行结果上限、虚拟滚动、排序、CSV 和清空。

生产 RNG 只在独立 `gen7event` Worker 内的 WebAssembly 执行。React/TypeScript 负责配信卡解析、输入规范化、请求校验、结果解码和展示；UI Preview 只生成确定性布局样例，不能作为算法证据。

上游 revision：`359bdd7a9ff7c145fec12302cf43da932923fa62`。

主要上游文件：

- `3DSRNGTool/MainForm.cs`
- `3DSRNGTool/MainForm_Core.cs`
- `3DSRNGTool/MainForm_Event.cs`
- `3DSRNGTool/MainForm.Designer.cs`
- `3DSRNGTool/Core/EventRNG.cs`
- `3DSRNGTool/Gen7/Event7.cs`
- `3DSRNGTool/Core/RNGPool.cs`
- `3DSRNGTool/Gen7/ModelStatus.cs`
- `3DSRNGTool/Util/FuncUtil.cs`
- `3DSRNGTool/Controls/StringItem.cs`
- `3DSRNGTool/Controls/HexMaskedTextBox.cs`
- `3DSRNGTool/Resources/text/lang_en.txt`
- `3DSRNGTool/Resources/text/lang_ja.txt`
- `3DSRNGTool/Resources/text/lang_zh.txt`

## 已核验输入

下列限制来自上游 WinForms 控件初始化和 Core 参数类型。空 Seed、TRV、EC 与 PID 按 `HexMaskedTextBox.Value` 读取为 `0`；浏览器空十进制输入同样规范化为 `0`，随后执行领域校验。

| 输入                | 上游依据                                     | 范围与行为                                                                                                    |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Game Version        | `Gameversion`、`FuncUtil.getstartingframe()` | Sun、Moon、Ultra Sun、Ultra Moon；SM 起始帧 `418`，USUM 起始帧 `478`                                          |
| Seed                | `Seed.Mask = "AAAAAAAA"`、`SFMT(uint)`       | 8 位十六进制，`0..FFFFFFFF`；空值按 `0`                                                                       |
| Initial / Max Frame | `Frame_min / Frame_max`、`FuncUtil.MAXFRAME` | 十进制 `0..1,000,000,000`；Event 最小值不得低于版本起始帧，Initial 不得大于 Max                               |
| Target Frame        | `TargetFrame`、`Increment = 100`             | 十进制 `0..1,000,000,000`；默认 `5000`；`±100帧` 模式检索闭区间 `max(版本起始帧, Target - 100)..Target + 100` |
| Timeline Seconds    | `TimeSpan`、`FuncUtil.MAXFRAME`              | 十进制 `0..1,000,000,000`；默认 `3600`；当前仅展示上游控件，专用 Timeline 搜索尚未接入                        |
| TSV                 | `TSV.Maximum`、`ushort TSV`                  | 十进制 `0..4095`；仅 `自ID` 时使用                                                                            |
| TRV                 | `TRV.Mask = "A"`、`byte TRV`                 | 1 位十六进制，`0..F`；仅 `自ID` 时使用                                                                        |
| NPC                 | 默认 `NumericUpDown`、`NPC + 1` 模型数       | 十进制 `0..100`；内部模型数为 `NPC + 1`                                                                       |
| Delay               | `Timedelay.Maximum = 4000`、`EventDelay`     | 十进制 `0..4000`；SM 默认 `62`，USUM 默认 `42`；时间步使用整数 `Delay / 2 + 2`                                |
| Species             | `Event_Species`、版本物种列表                | SM `0..802`，USUM `0..807`；`0` 显示为 `-`                                                                    |
| Form                | `PersonalTable.getFormeEntry()`              | `0..FormeCount - 1`；物种只有一个形态时禁用选择                                                               |
| Level               | `Filter_Lv` 默认 `NumericUpDown`             | 十进制 `0..100`                                                                                               |
| Fixed IV            | `Event_IV_Fix*`、`EventIV[i]`                | 每项未锁定时为 `-1`，锁定时 `0..31`                                                                           |
| Random perfect IVs  | `IVsCount.Maximum = 5`                       | `0..5`；固定项数量加保底随机 V 数在非零时不得超过 `5`                                                         |
| TID / SID           | `Event_TID / Event_SID.Maximum`              | 十进制 `0..65535`；非 `自ID` 时决定 TSV/TRV                                                                   |
| EC / PID            | `Mask = "AAAAAAAA"`、`uint`                  | 8 位十六进制，`0..FFFFFFFF`；EC 为 `0` 时随机，PID 仅 `Specified` 使用                                        |
| Result Limit        | `MainForm.MAX_RESULTS_NUM`                   | `1..100,000`；当前 UI 固定为 `100,000`                                                                        |

上游允许帧值达到 `1,000,000,000`。当前静态浏览器会话把绝对最大帧限制为 `5,000,000`，避免初始化 SFMT、Blink 标记和长连续帧时产生无界阻塞；该保护不改写上游输入记录。

## 配信卡导入

`.wc7` 读取前 `0x108` 字节；`.wc7full` 先跳过 `0x208` 字节，再读取同一张 `0x108` 卡片。`Data[0x51]` 必须为 `0`，否则不是宝可梦配信。

导入字段与上游 `MainForm_Event.cs::Event_RawData()` 一致：

- Species `0x82`、Form `0x84`、Level `0xD0`。
- TID `0x68`、SID `0x6A`、EC `0x70`、Specified PID `0xD4`。
- Nature `0xA0`、Gender `0xA1`、Ability `0xA2`、PID Type `0xA3`。
- 六项 IV 从 `0xAF` 开始，并按上游 `Pokemon.Reorder2` 顺序重排；`FC / FD / FE` 表示 1 / 2 / 3 个保底随机 V。
- `0xB5 == 3` 表示 `自ID`，`0xD1 == 1` 表示蛋。

文件只在浏览器内存中解析，不写入服务器或网络存储。

## RNG 行为

每个显示帧按上游 `Search7_Normal()`、`Event7.Delay()` 与 `Event7.Generate()` 保持同一条连续状态链：

1. 从 Seed 初始化 SFMT64，推进到 Initial Frame，并使用 `NPC + 1` 个模型生成 Blink 与 Real Time 状态。
2. 启用 `考虑时间延迟` 时先经过 2 个时间步；`未登入图鉴` 或 `自ID && !蛋` 时丢弃生成一次配信宝可梦；再经过 `Delay / 2` 个时间步。
3. EC 为非零时固定，否则读取一个 64 位随机数的低 32 位。
4. PID Type 按 Random、Nonshiny、Shiny、Specified 执行；Shiny 且启用其他信息时用 TID/SID 修正 PID 高 16 位。
5. 先写入六项固定 IV，再随机选择保底 V 项，最后生成剩余 IV。
6. 按锁定状态生成 Ability、Nature 与 Gender；随机性别使用物种形态的个人数据阈值。

上游 Event7 把 Random / Specified 中 PSV 等于 TSV 的结果标记为 Square Shiny；本模块保持该行为，不改用其他世代的 PRV 规则。

## Wasm 契约

模块 id 为 `gen7event`，API version `1`，contract version `1`。

```text
gen7event_begin(const Gen7EventPackedRequest *request)
gen7event_step(uint32_t maximum_states)
gen7event_result_ptr()
gen7event_result_count()
gen7event_step_processed()
gen7event_total_processed()
gen7event_total_results()
gen7event_done()
gen7event_limit_reached()
gen7event_last_error()
```

请求包含 58 个 32 位字：版本、Seed、闭区间帧范围、TSV/TRV、NPC、Delay、Event 标志、PID/ID/EC、锁定项、物种形态、六项固定 IV 和完整筛选。每条结果包含 9 个 `uint32_t`：Frame、Real Time Frames、64 位 Random Number 的低/高字、EC、PID、压缩 IV、元数据和 Delay。

一个 Dedicated Worker 持有一个连续 Wasm 会话。默认每批处理 2048 帧，C ABI 单批上限为 65536；取消时终止并重建 Worker。模块不依赖 `SharedArrayBuffer`、Wasm pthreads 或跨源隔离。

## 界面

页头选择 Gen VII 的 3DSRNGTool 档案时，同步 GameVersion、TSV 与 TRV，并沿用现有版本切换流程更新起始帧、版本限定物种和默认 Delay。Shiny Charm 不属于 Event 请求，不从档案写入。

桌面端使用上下两行工作台：设置区占据上方整行，结果区在下方保持同宽，二者分别使用有界滚动区域。设置区的 `乱数信息` 与 Gen VII Stationary、Wild 复用同一组件，并按桌面四列显示 `检索范围`、`目标帧 / ±100帧`、`考虑时间延迟 / +4F / NPC`、`生成时间线/秒 / 时间线跳跃 / 计算`；只有 Gen VII Event 启用 Timeline Leap 的可见性。内容宽度低于 `840px` 时卡片改为两列，移动端再改为单列并保持至少 44px 触控目标。`检索范围` 和 `±100帧` 已接入现有连续帧搜索；Timeline 与 Timeline Leap 仍以禁用控件明确标记为待接入，不能视为算法完成。

界面逐字复用上游简体中文词条：`配信乱数`、`配信设置`、`乱数信息`、`检索范围`、`目标帧`、`±100帧`、`生成时间线/秒`、`时间线跳跃`、`计算`、`固定特性`、`固定性格`、`固定性别`、`自ID`、`蛋`、`未登入图鉴`、`其他信息`、`保底随机V数` 与 `考虑时间延迟`。

结果显示 Frame、Realtime、Random Number、EC、PID、六项 IV、Nature、Ability、Gender、Hidden Power、Shiny、Blink、Delay、PSV 与 PRV，并支持列排序、CSV、清空和取消。

## 验证状态

2026-08-16 已通过：

- Event TypeScript：3 个测试文件，8 项测试。
- `npm run verify` 中的 Prettier、ESLint、TypeScript 与 109 个 Vitest 文件共 418 项测试；ESLint 0 error，保留 6 条既有 TanStack Virtual / React Compiler 非阻断 warning。
- 非受限 `npm run build:web`：2113 个模块转换，生成 139 项、约 16.8 MiB 的 PWA 预缓存；仅保留既有大 chunk 警告。
- 外部 Chrome UI Preview：`http://127.0.0.1:5174/`；验证 43 条结果、首帧 478、错误、清空、Your ID / Other Information 联动，以及 390 / 768 / 1280 / 1536 / 1920px 布局。页面无横向溢出，虚拟表首行与表头间距为 0，控制台无 warning 或 error。
- 2026-09-01 外部 Chrome UI Preview：`http://127.0.0.1:4183/`；共用乱数信息卡片完整显示四列，Event 单独显示 Timeline Leap，`计算` 是唯一启动按钮，控制台无 warning 或 error。

`npm run verify` 的最后一个 `build:web` 在受限环境复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`，因此完整命令本身没有以 0 退出；独立非受限 Web 构建随后通过。

原生 `gen7event` C++ 夹具在受限环境无法读取 WinLibs GCC；Emscripten 激活在受限环境无法写入 `C:\Users\Hakuhiro\emsdk\emsdk_set_env.ps1`。两次非受限重跑均被自动审批服务的 `502 Bad Gateway` 阻止，命令未启动，因此原生夹具和真实 `gen7event.mjs` / `.wasm` 产物仍为未验证。生产页面算法回归必须等待 GitHub Actions 部署后，由项目所有者提供实际 URL 并明确授权。
