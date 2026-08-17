# 第八世代定点乱数

## 功能范围

本模块对应 PokeFinder 4.3.2 `Gen 8 Static`，仅接受 Brilliant Diamond / Shining Pearl Profile。PokeFinder 该模块只有 Generator，没有 Searcher；PokeRNGKit 不增加上游不存在的 Sword / Shield Static 或反向检索工作流。

- 支持 Starters、Gifts、Fossils、Stationary、Roamers、Legends、Ramanas Park (Pure Space)、Ramanas Park (Strange Space)、Mythics 共 9 类 47 个模板。
- 支持 None、25 种 Synchronize Nature，以及普通非固定性别模板的 Cute Charm `♂ Lead` / `♀ Lead`。
- 支持 Seed 0 / Seed 1、Initial Advances、Max Advances、Offset、异色/性别/特性/性格/身高/体重/六项 IV 筛选、取消、虚拟滚动、排序、CSV 和 IV/能力值切换。
- Template 的 Level、Ability、Shiny、IV Count 为只读；上游禁用的 Hidden Power 与 Wild 筛选不显示。

结果表的虚拟滚动容器在 `1380px` 以下保持 `clamp(440px, 56vh, 680px)` 的确定高度。不得在单列响应式布局中让该容器随约 4,000,000px 的虚拟内容自动增高，否则 100,000 条结果会被错误判断为同时可见并耗尽页面内存。

模板分布固定为：Starters 3、Gifts 3、Fossils 7、Stationary 3、Roamers 2、Legends 7、Ramanas Park (Pure Space) 11、Ramanas Park (Strange Space) 6、Mythics 5。

## 输入限制

空数字文本按照上游 `TextBox::getUInt()` / `getULong()` 解释为 `0`。HTML 控件和领域校验同时应用以下边界。

| 输入                     | 范围                                                                             | 行为                                                                 | 上游依据                                                     |
| ------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Profile                  | Brilliant Diamond / Shining Pearl；TID/SID `0..65535`                            | Sword / Shield Profile 拒绝                                          | `Static8.cpp`、`ProfileDisplay8::setup(..., Game::BDSP)`     |
| Seed 0 / Seed 1          | 十六进制，各最多 16 位                                                           | 空值为 `0`；两项同时为 `0` 时拒绝                                    | `Static8.cpp`、`TextBox.cpp` 的 `Seed64Bit`                  |
| Initial Advances         | 十进制 `uint32_t`，`0..4294967295`                                               | 默认 `0`，空值为 `0`                                                 | `Static8.ui`、`Static8.cpp`、`TextBox.cpp` 的 `Advance32Bit` |
| Max Advances             | 十进制 `uint32_t`，`0..4294967295`                                               | 默认 `100000`；包含起点，实际处理 `N + 1` 帧                         | `Static8.ui`、`StaticGenerator8.cpp` 的 `cnt <= maxAdvances` |
| Offset                   | 十进制 `uint32_t`，`0..4294967295`                                               | 默认空，读取为 `0`                                                   | `Static8.ui`、`Static8.cpp`                                  |
| 推进组合                 | `Initial + Offset + Max <= 4294967295`                                           | 超出上游 `uint32_t` 状态范围时拒绝                                   | `StaticGenerator8` 构造参数与 Xorshift advance 类型          |
| Lead                     | Nature `0..24`、Cute Charm F `25`、Cute Charm M `26`、None `255`                 | 固定性别模板隐藏 Cute Charm；Roamer 只使用 Synchronize 或随机 Nature | `Lead.hpp`、`Static8.cpp`、`StaticGenerator8.cpp`            |
| Category / Template      | 9 类、47 个模板；Species `1..493`、Form `0..31`、Level `1..100`、IV Count `0..3` | 只显示当前 BD/SP 版本可用模板                                        | `Encounters8.cpp`、`StaticTemplate8.hpp`、`encounters.json`  |
| Shiny / Gender / Ability | Any / Star / Square / Star/Square；Any / Male / Female；Any / `1` / `2` / `H`    | 模板锁定规则仍由 Generator 强制                                      | `Filter.ui`、`StateFilter.cpp`、`StaticGenerator8.cpp`       |
| Nature                   | 25 项位掩码                                                                      | UI 至少按全选处理；Disable Filters 时忽略                            | `Filter.ui`、`StateFilter.cpp`                               |
| Height / Weight          | 两组闭区间，端点 `0..255`                                                        | 每组最小值不得大于最大值                                             | `StateFilter::compareState(State8)`                          |
| IV                       | 六组闭区间，端点 `0..31`                                                         | 每组最小值不得大于最大值                                             | `Filter::isValid()`、`StateFilter.cpp`                       |
| Result Limit             | `1..100000`                                                                      | Worker 与 Wasm 同时限制                                              | PokeRNGKit Worker/Wasm 边界                                  |

浏览器单次任务最多评估 `250,000,000` 个状态；该保护限制不改变上游控件的 `uint32_t` 输入边界。

## 模板与算法

普通定点使用 Xorshift 与 32 项 `RNGList`。每帧依次生成 EC、fake SID/TID、PID、异色修正、保底 IV、剩余 IV、Ability、Gender、Nature、Height 和 Weight，再计算 Characteristic、Ability ID 与六项能力值。Never 模板强制非异色；Random 先按 fake SID/TID 判定，再按当前档案 TSV 修正 PID；Fateful 随机异色强制 Square。

Roamer 仅包含 Mesprit 与 Cresselia。外层 Xorshift 每帧生成 EC，再以该 EC 初始化 `XoroshiroBDSP`；固定生成 3 个 31 IV，不产生 Hidden Ability。Mesprit 为无性别，Cresselia 固定雌性。

## Worker 与 Wasm

- Module id：`gen8static`；contract / API version：`1`；operation：`generator`
- 请求为 41 个 `uint32_t`，结果为 11 个 `uint32_t`
- 生产算法仅在 Dedicated Worker 内的 C++/Emscripten Wasm 执行；最多 8 个独立 Worker，不使用 SharedArrayBuffer 或 pthread
- Worker 按 `chunkIndex` 恢复确定顺序，取消后终止并重建实例，拒绝迟到批次、越界指针和异常结果长度

结果记录固定为 Advances、EC、PID、压缩 Ability/Gender/Nature/Shiny/Characteristic、Height/Weight、六项 IV、Ability ID 和六项能力值。界面展开为 PokeFinder `StaticModel8` 的 16 列。

## 数据来源

`scripts/generate_gen8_static_data.mjs` 从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 `Gen8/encounters.json` 与 PokeFinder 4.3.2 `personal_bdsp.bin` 生成 TypeScript 模板和 C++ Personal 紧凑数据。

- `encounters.json`：8,761 bytes，SHA-256 `493D8A4CAFA0A57FC0C729E808333647C30EEF84085B75F427F23D1823D2284D`
- `personal_bdsp.bin`：SHA-256 `4E5CBCB1FBE7FFE559EAD6555DC02878E0D9B8700CE185998B381CFBB4DB7EC3`
- `src/features/gen8static/data.ts`：SHA-256 `1BFEB694B277D306503F03BA171E5C609AD0A3D8998C0B805206B70ADAA68BF7`
- `wasm/modules/gen8static/bridge/personal_data.inc`：SHA-256 `C662136D3341F38D5BEF0E182DD29D85DF1A3CE7C0379D0C55F98E748FCC2393`

完整 PokeFinder 文件哈希见 `third_party/pokefinder/UPSTREAM.md`。生成产物保留 GPL-3.0-or-later 归属和源码提供义务。

## 固定夹具

固定输入为 Seed 0 `1234567887654321`、Seed 1 `8765432112345678`、TID `12345`、SID `54321`。

- Turtwig 首帧：EC `220345D0`、PID `2203506A`、IV `4/23/15/30/19/26`、Ability ID `65`、Nature `22`、Characteristic `20`、Height `124`、Weight `99`、Stats `20/12/12/11/12/8`
- Turtwig 第 9 帧：EC `E8D55A32`、PID `0FEB047B`、IV `16/12/0/15/29/20`、Nature `11`、Characteristic `29`、Height `129`、Weight `95`、Stats `21/12/9/10/11/9`
- Mesprit 首帧：EC `220345D0`、PID `185226FF`、IV `13/31/7/3/31/31`、Ability `1`、Ability ID `26`、Genderless、Nature `10`、Characteristic `16`、Height `194`、Weight `73`、Stats `146/112/113/111/125/110`

## 验证

- `src/features/gen8static/domain.test.ts`：64 位 Seed、41-word 编码、`Max Advances + 1`、确定性分片、版本/溢出边界和首帧解码。
- `src/features/gen8static/preview/Gen8StaticUiPreviewEngine.test.ts`：预览结果与取消。
- `wasm/modules/gen8static/tests/gen8static_native_test.cpp`：Turtwig、Omanyte、Heatran Cute Charm、Articuno Synchronize 与 Hidden Ability、Jirachi Never Shiny、Mesprit、Cresselia、零 Seed、推进溢出、范围保护和结果上限；另以朴素 Xorshift 推进对照 1,000,000 帧跳表结果。

完整应用层验证已通过 124 个测试文件共 462 项测试，49/49 原生夹具与默认 48 个 Emscripten 模块构建均已完成。外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Worker/Wasm 生成 Turtwig 固定 10 帧，首帧与第 9 帧逐字段匹配上述夹具；390、768、1280 与 1920px 下无整页横向溢出，结果首行与表头间距为 0，控制台无 warning 或 error。

2026-08-18 修复了双 Seed 输入 `111`、默认 Max Advances `100000` 后滚动结果导致页面卡死的问题。根因是 `1380px` 以下面板改为自动高度时，结果区没有同步保留确定高度。外部 Chrome 在 `1280x900` 下完成真实 Worker/Wasm 回归：表格可视高度 `411px`、虚拟内容高度 `4,000,042px`，顶部只渲染 21 行，滚动到末帧后只渲染 20 行，页面总高度保持约 `1,721px`；5 秒稳定观察期间最大 renderer 工作集约 `406.5..408.7 MB`，控制台无 warning 或 error。

算法结果仍须在 GitHub Actions 部署后，按项目所有者提供的生产 URL 执行回归；本地测试、原生/Wasm 构建与本地浏览器检查不能替代生产验收。
