# 第六世代宝可雷达乱数

## 功能范围

本模块对应 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 Gen VI `Poke Radar` TinyMT 工作流。每个结果包含音乐随机值/状态、实际 Boost、四个宝可梦摇草块、一个不可踩空块、闪光块标记和 9×9 概览。

算法只在独立 `gen6pokeradar` Dedicated Worker 和 `gen6pokeradar.mjs/.wasm` 中执行。TypeScript 负责输入校验、固定宽度请求/结果、9×9 概览、虚拟结果表和 CSV。

## 输入限制

| 输入                      | 进制与范围                                   | 默认/行为                                  | 上游依据                                                       |
| ------------------------- | -------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Tiny Seed                 | 十六进制，最多 8 位，`0..0xFFFFFFFF`         | 空值为 `0`                                 | `RNG/TinyMT.cs`                                                |
| Initial Frame / Max Frame | 十进制，`0..1000000000`；浏览器 `0..5000000` | Initial 必须小于等于 Max                   | `Util/FuncUtil.cs::MAXFRAME`、Gen VI Web 预算                  |
| Tiny Frame                | 十进制，`0..1000000000`                      | 每个结果推进 `Tiny Frame + Frame`          | `Gen6/TinyTimeline.cs`、`PokeRadar.cs`                         |
| Party Size                | 十进制，`0..6`                               | 生成前消耗 `3 * Party Size` 个 TinyMT 状态 | `PokeRadar.cs::PKMNUM`                                         |
| Chain Length              | 十进制，`0..100`                             | `>=40` 时好草块必定按 1/100 阈值检查闪光   | `PokeRadar.cs::Chainlength`、WinForms `NumericUpDown` 默认范围 |
| Boost                     | 布尔                                         | 仅音乐值 `>=50` 时实际生效                 | `PokeRadar.cs::Boost`                                          |
| Result Limit              | 十进制，`1..100000`                          | 达到上限后停止 Worker 任务                 | Web Worker 任务保护                                            |

## 算法与结果

TinyMT 先消耗 `3 * Party Size`。音乐为 `Rand(100)`：`0..1` 显示 `A`，`2..49` 显示 `-`，`50..99` 显示 `M`；Boost 只有在输入开启且音乐 `>=50` 时保留。

四个宝可梦块依次使用 Ring `0..3`，各消耗 Direction、Location 和 GoodRate 检查；GoodRate 固定为 `23/43/63/83`。好块额外消耗一次占位状态，然后按 Boost/40 连锁的 `100` 阈值或 `8100 - 200 * ChainLength` 判定 Shiny/Good。最后生成 Ring `0..2` 的一个 Empty 块。坐标严格使用上游 `Patch.X/Y` 映射，9×9 中心为 `C`，状态字符为 `B/G/S/X`。

## Worker 与 Wasm 契约

- Module id：`gen6pokeradar`
- Contract version：`1`
- Wasm API version：`1`
- Operation：`generator`
- 请求：8 个 `uint32_t` 字
- 结果：16 个 `uint32_t` 字；5 个摇草块分别打包 Ring、Direction、Location、State、X 与 Y
- Worker：每个任务使用独立 Dedicated Worker；取消后终止并重建实例；结果指针执行对齐和 Wasm 堆边界检查

固定夹具位于 `wasm/modules/gen6pokeradar/tests/gen6pokeradar_native_test.cpp`，覆盖 API、32 帧连续生成和全部坐标落入 9×9。TypeScript 夹具覆盖 8-word 编码、块解码、音乐/Boost/闪光位、概览和输入边界。

## 已验证

- `npm test -- src/features/gen6pokeradar`：2 个文件、4 项测试通过
- `npm run verify`：143 个测试文件、522 项测试、Vite 转换 2218 个模块、PWA 预缓存 200 项
- Lint：0 error、11 条 TanStack Virtual `react-hooks/incompatible-library` warning，其中 1 条来自本模块虚拟结果表
- `$env:POKERNGKIT_WASM_MODULES='gen6pokeradar'; node scripts/wasm.mjs test-native`：1/1 原生夹具通过
- 激活 Emscripten 6.0.6 后 `$env:POKERNGKIT_WASM_MODULES='gen6pokeradar'; node scripts/wasm.mjs build`：通过
- `public/wasm/gen6pokeradar.mjs`：7565 bytes，SHA-256 `5285F825A7E98462E079928F310C7F3722A56C0772268FB2713263AA2DC794DC`
- `public/wasm/gen6pokeradar.wasm`：6743 bytes，SHA-256 `2173E008765E425837148DDBFD30297C32519A696F094C876195579955F07F7B`
- 未运行：外部 Chrome / Edge UI 回归；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权

## 上游与许可

主要来源：

- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\PokeRadar.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\Gen6\TinyTimeline.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\MainForm.Designer.cs`
- `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN\3DSRNGTool\RNG\TinyMT.cs`

3DSRNGTool 代码按 MIT 条款记录来源；PokeRNGKit 整体继续按 GPL-3.0-or-later 发布，并保留上游版权与商标免责声明。
