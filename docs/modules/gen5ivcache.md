# 第五世代 IV Cache Finder

## 范围

本模块对应 PokeFinder 4.3.2 的 `IV Cache Finder`。它扫描完整 `2^32` 个 MT Seed，按 Entralink、Normal 和 Roamer 三种读取顺序筛选高个体 Seed，并生成 PokeFinder 可读取的 `.ivcache` 文件。

前端只负责输入、分片、取消、进度、结果归并和文件写入。MT、Advance 跳转、IV 读取和命中过滤均在独立 Worker 的 C++/WebAssembly 中执行。模块不使用 pthread、`SharedArrayBuffer`、跨源隔离、后端或运行时 CDN。

## 上游文件

只读核验文件：

```text
C558B41949C2096A9DED080C17192B4A4A2885385D86D30D6DA93BEED79625A2  Form/Gen5/Tools/IVCacheFinder.cpp
535B8BBA30A01A3852E35F133B54F5A8A728A1D0E31EAC32CB41ABBA3C8D7C30  Form/Gen5/Tools/IVCacheFinder.hpp
FD064CC41CDEFBCDADA69CA7739CD3E25AF5051E83DCBC58E48E969FD8132E53  Form/Gen5/Tools/IVCacheFinder.ui
273CA2F3C335413F88DAA23048AD40948E7751A0310838DC1BF5B4386CE9F66E  Core/Gen5/IVCache.cpp
D27017F24161111A642EABB18E98974240CEB22FE25C8D8859B641D12581D3F5  Core/Gen5/IVCache.hpp
FBE622BE91E20CA8A31F014ECBDC4B8E6FCDB14AB2DC19F1F34911857DD2AAA3  Core/Gen5/Searchers/IVCacheSearcher.cpp
A78D82C8E8C6EABB30249C26C825ED02758FF038C91EDD47090192A83B9631C9  Core/Gen5/Searchers/IVCacheSearcher.hpp
51B4F88667748825CE5091600BD2C5EE7F0152912BFC25856004319E41863FCA  Form/Controls/TextBox.cpp
BB98B0FE73D2310712EE44CA04B255D6E31B427CC77957F0CCE465C2A61015C  Form/i18n/PokeFinder_zh.ts
D67358790583FEBF22227ABF10B002EBAEC02E797EA08E125093CEA8C36F665F  Form/i18n/PokeFinder_ja.ts
```

Wasm target 使用下列 PokeFinder RNG 文件；`MTJump.txt` 的工作树副本仅增加文件末尾 LF，`RNGList.hpp` 仅移除一行文档注释的行尾空格，代码与数值表未修改：

```text
8CA6C9BA3D2ADE7A4DB0B632ABCF3C58BB48594AB71FD04709478BF8D1BCBF00  Core/RNG/MT.cpp
6E9F0E162AEF711E4D6E9F5FC4AAE57E25F0D4EAEE28BF8532A7EC434CD75044  Core/RNG/MT.hpp
1C51500D1357EEC48A42E977F70E972DDAF7053F3A6319D947B9231655051237  Core/RNG/MTJump.txt（上游）
1AF071341CB48AE35811E74A0ADB3AD6F6C0CAA9AFD67FD290857281BCC76931  Core/RNG/MTJump.txt（工作树，末尾 LF）
DE999DE807EF88258B2A404CB74E7B99FBECCD4EC9F55CDD003643AAB4B4E918  Core/RNG/RNGList.hpp（上游）
491AF553F963E2F3309438BFC7873329984A9DF6B4E60FE9B87B3AB6398A2D52  Core/RNG/RNGList.hpp（工作树，移除注释行尾空格）
4852FCCDDA7E555F45F87D06A36EF12354945043A568927EFDBAA99EA6F78544  Core/RNG/SIMD.hpp
```

## 输入限制

| 控件               | 进制 | 最小值 |       最大值 | 最多字符 | 空值 | 默认值 | 上游来源                                                        |
| ------------------ | ---: | -----: | -----------: | -------: | ---: | -----: | --------------------------------------------------------------- |
| `Initial Advances` |   10 |    `0` | `4294967295` |       10 |  `0` |    `0` | `IVCacheFinder.cpp` 的 `InputType::Advance32Bit`；`TextBox.cpp` |
| `Max Advances`     |   10 |    `0` | `4294967295` |       10 |  `0` |    `5` | `IVCacheFinder.cpp` 的 `InputType::Advance32Bit`；`TextBox.cpp` |

HTML 控件和 `validateGen5IvCacheRequest()` 保留完整 `uint32_t` 输入范围。浏览器和 Wasm 执行入口要求 `Initial Advances = 0`，并将 `Max Advances` 限制为 `<= 20`：上游搜索器把命中写入相对桶，而 PokeFinder 读取端从文件头的绝对 `Initial Advances` 访问桶；非零值会生成错帧文件，且 Roamer 桶无法表示非零起点。因此本实现保留上游字段用于格式兼容，但拒绝非零执行请求。`Max Advances <= 20` 包含 25 个 Entralink、23 个 Normal 和 21 个 Roamer 桶，按上游筛选概率约产生 `928512` 条记录。累计结果超过 `1000000` 条或任一 Worker 批次即将超过 `65536` 条时立即终止并销毁 Worker，不写出部分文件；C++ bridge 在写入第 `65537` 条结果前返回 `ResultLimit = 2`，避免先分配超限结果再由 Worker 事后拒绝。该限制同时覆盖 `.ivcache` 的 `maxAdvances + 4` 桶下标回绕和无法分配的超大输出。

上游要求先选择 `Output File`；没有目标文件时显示原始未翻译提示 `Missing output file` 与 `Please select a file to save the results to`。简体中文逐字复用 `检索`、`初始帧`、`最大帧数`、`导出文件`、`取消`；`IV Cache Finder` 和全部日文词条保持英文。

## 算法

每个 Seed 从 `Initial Advances` 建立 `RNGList<u8, MT, 32>`；Web/Wasm 执行时该值固定为 `0`，随后检查：

- Entralink：Advance `i + 22`，桶范围 `0..Max Advances + 4`。
- Normal：Advance `i`，桶范围 `0..Max Advances + 2`。
- Roamer：Advance `i + 1`，桶范围 `0..Max Advances`；读取顺序为 HP、Atk、Def、SpD、Spe、SpA。
- 共通条件：HP、Def、SpD `>= 30`，且 Atk 或 SpA `>= 30`。
- Entralink/Normal：Spe `<= 1` 或 Spe `>= 30`。
- Roamer：Spe `>= 30`。

完整 Seed 空间拆成 `65536` 个互不重叠的分片，每片 `65536` 个 Seed。最多四个独立 Worker 排队消费分片，公开 Engine API 拒绝 `NaN`、Infinity、零和非整数 Worker 数。PokeFinder 桌面线程切分的相邻区间端点是闭区间，会重复扫描线程边界；本模块使用半开区间消除重复 Seed，并校验每条命中的 Seed 必须属于返回它的分片，输出桶在写入前按无符号 Seed 升序排列。Worker 崩溃、协议错误、批次异常或结果超限会销毁整个池，下一次检索重新创建 Worker。

## 文件格式

全部字段为小端 `uint32_t`：

```text
0xD08CB7C0
initialAdvances
maxAdvances
entralinkCounts[maxAdvances + 5]
normalCounts[maxAdvances + 3]
roamerCounts[maxAdvances + 1]
entralinkSeeds[...]  // 每桶升序
normalSeeds[...]
roamerSeeds[...]
```

Chrome/Edge 使用 File System Access API 时直接写入已选句柄；其他浏览器在点击 `Output File` 后使用同名下载回退。搜索期间可取消并重建 Worker；进入文件序列化和写入状态后禁用取消，避免界面显示已取消但文件仍继续写入。

## 实现文件

- `wasm/modules/gen5ivcache/bridge/gen5ivcache_bridge.cpp`
- `wasm/modules/gen5ivcache/tests/gen5ivcache_native_test.cpp`
- `src/features/gen5ivcache/worker/gen5ivcache.worker.ts`
- `src/features/gen5ivcache/worker/Gen5IvCacheWorkerPool.ts`
- `src/features/gen5ivcache/domain.ts`
- `src/features/gen5ivcache/Gen5IvCachePanel.tsx`

## 验证

- `domain.test.ts` 固定输入边界、浏览器执行与结果上限、完整分片覆盖、Worker 结果解码、Seed 分片归属和小端 `.ivcache` 布局。
- `Gen5IvCacheUiPreviewEngine.test.ts` 固定确定性预览桶与完整进度。
- `Gen5IvCacheWorkerPool.test.ts` 固定 Worker 崩溃、进度回调异常后的池重建，以及非法 Worker 数拒绝。
- `gen5ivcache_native_test.cpp` 固定 API、错误路径、末端 Seed 边界，并精确断言 `0x00000000..0x0000FFFF` 分片的 7 条命中；`gen5ivcache_result_limit_test.cpp` 使用测试专用阈值固定 C++ 写入前的结果上限错误。
- 完整 `2^32` 搜索属于生产长任务，不作为单元测试执行；算法结果仍需部署后由项目所有者授权在生产页面回归。
