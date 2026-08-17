# 第八世代野生乱数

## 功能范围

本模块对应 PokeFinder 4.3.2 `Gen 8 Wild`，仅接受 Brilliant Diamond / Shining Pearl Profile。上游 `Wild8` 只有 Generator；PokeRNGKit 不增加 Sword / Shield 或反向检索工作流。

- 支持 Grass、Honey Tree、Rock Smash、Surfing、Old Rod、Good Rod、Super Rod 七类遭遇入口。
- 支持清晨、白天、夜晚、宝可追踪、大量出现、丑丑鱼钓点、Great Marsh / Trophy Garden Replacement 和 21 个甜甜蜜树地点。
- 支持 None、Synchronize、Cute Charm、Harvest、Flash Fire、Magnet Pull、Static、Storm Drain、Compound Eyes、Pressure 队首修正；上游同值 Lead 按 UI 分组显示。
- 支持异色、性别、特性、性格、隐藏力量、槽位、等级、身高、体重和六项 IV 筛选；结果表支持 IV/能力值切换、虚拟滚动、排序、CSV、进度、取消和清空。

PokeFinder `WildStateFilter::compareState(const WildState8&)` 不检查 Nature。本项目保留上游其他比较顺序，并在 Web 领域层和 Wasm bridge 中补充 Nature 筛选，使界面上的 Nature 控件产生确定行为。

## 输入限制

空数字文本按照上游 `TextBox::getUInt()` / `getULong()` 解释为 `0`。HTML 控件和领域校验同时应用以下边界。

| 输入                          | 范围                                                                                                                                          | 行为                                                             | 上游依据                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| Profile                       | Brilliant Diamond / Shining Pearl；TID/SID `0..65535`                                                                                         | Sword / Shield Profile 拒绝                                      | `Wild8.cpp`、`ProfileDisplay8::setup(..., Game::BDSP)`   |
| Seed 0 / Seed 1               | 十六进制，各最多 16 位                                                                                                                        | 空值为 `0`；两项同时为 `0` 时拒绝                                | `Wild8.cpp`、`TextBox.cpp` 的 `Seed64Bit`                |
| Initial Advances              | 十进制 `uint32_t`，`0..4294967295`                                                                                                            | 默认 `0`，空值为 `0`                                             | `Wild8.ui`、`TextBox.cpp` 的 `Advance32Bit`              |
| Max Advances                  | 十进制 `uint32_t`，`0..4294967295`                                                                                                            | 默认 `100000`；包含起点，实际处理 `N + 1` 帧                     | `Wild8.ui`、`WildGenerator8.cpp` 的 `cnt <= maxAdvances` |
| Offset                        | 十进制 `uint32_t`，`0..4294967295`                                                                                                            | 默认空，读取为 `0`                                               | `Wild8.ui`、`Wild8.cpp`                                  |
| 推进组合                      | `Initial + Offset + Max <= 4294967295`                                                                                                        | 超出 Xorshift `uint32_t` 状态范围时拒绝                          | `WildGenerator8` 与 `RNGList`                            |
| Encounter                     | Grass、Honey Tree、Rock Smash、Surfing、Old Rod、Good Rod、Super Rod                                                                          | 按版本和数据表联动地点                                           | `Wild8.cpp`、`Encounters8.cpp`                           |
| Lead                          | Synchronize `0..24`、Cute Charm `25/26`、Slot Modifier `27..31`、Hustle/Pressure/Vital Spirit `32`、Compound Eyes/Super Luck `34`、None `255` | Honey Tree 隐藏不适用的队首；项目校验保留上游枚举范围            | `Lead.hpp`、`Wild8.cpp`                                  |
| Time / Radar / Swarm / Feebas | Time `0..2`；其余布尔值                                                                                                                       | Honey Tree 隐藏 Time、Radar、Swarm；Feebas 只在钓鱼地点出现      | `Wild8.cpp`、`EncounterArea8.cpp`                        |
| Replacement                   | 物种 `0..493`；Great Marsh / Trophy Garden 使用对应替换池                                                                                     | 不在当前地点池中的物种拒绝                                       | `Wild8.cpp`、`Encounters8.cpp`                           |
| Honey Tree slot               | 当前地点去重后的槽位，必须且只能选 1 个                                                                                                       | 领域层和 Wasm 同时拒绝多槽请求                                   | `Wild8.cpp`、`WildGenerator8.cpp`                        |
| Shiny / Gender / Ability      | Any / Star / Square / Star/Square；Any / Male / Female；Any / `0` / `1`                                                                       | 与上游 `WildStateFilter` 一致                                    | `Filter.ui`、`StateFilter.cpp`                           |
| Nature / Hidden Power         | 25 项 / 16 项位掩码                                                                                                                           | Nature 为项目补充的实际筛选；Hidden Power 保留控件并参与项目筛选 | `Filter.ui`、`StateFilter.cpp`                           |
| Level / Height / Weight       | Level `1..100`；Height/Weight 闭区间端点 `0..255`                                                                                             | 每组最小值不得大于最大值                                         | `Filter.ui`、`StateFilter.cpp`                           |
| IV                            | 六组闭区间端点 `0..31`                                                                                                                        | 每组最小值不得大于最大值                                         | `Filter::isValid()`、`StateFilter.cpp`                   |
| Result Limit                  | `1..100000`                                                                                                                                   | Worker 与 Wasm 同时限制                                          | PokeRNGKit Worker/Wasm 边界                              |

浏览器单次任务最多评估 `250,000,000` 个状态；该保护限制不改变上游控件的 `uint32_t` 输入边界。Rock Smash 控件按上游保留，但当前 BDSP `Encounters8::getBDSP` 没有 Rock Smash 分支，因此其地点列表为空并禁用生成按钮。

## 算法

每个起始帧使用 Xorshift 填充 128 项 RNGList。普通遭遇按 Feebas、队首槽位或 BDSP encounter slot 选择物种，再生成等级、Cute Charm 性别修正、Unown 形态、EC、fake SID/TID、PID、异色修正、六项 IV、Ability、Gender、Nature、Height、Weight 和 Item。Honey Tree 固定槽位并使用对应地点的第一组道具。最后计算 Characteristic、Ability ID、隐藏力量和六项能力值。

Great Marsh 使用普通图鉴或全国图鉴替换池；Trophy Garden 支持两项替换。甜甜蜜树按 TID/SID 计算 Munchlax Tree ID，并按物种去重后生成 2 或 3 组槽位。队首的 Pressure/Hustle/Vital Spirit、Compound Eyes/Super Luck、Synchronize、Cute Charm、Harvest、Flash Fire、Magnet Pull、Static 和 Storm Drain 均在 bridge 中按上游顺序处理。

## Worker 与 Wasm

- Module id：`gen8wild`；contract / API version：`1`；operation：`generator`
- 请求为 48 个 `uint32_t`，结果为 12 个 `uint32_t`
- 生产算法只在 Dedicated Worker 内的 C++/Emscripten Wasm 执行；最多 8 个独立 Worker，不使用 SharedArrayBuffer 或 pthread
- Worker 按 `chunkIndex` 恢复确定顺序；取消后终止并重建实例，拒绝迟到批次、异常结果长度和越界 Wasm 指针
- 结果记录固定为 Advances、Item、Slot、Species、Level、EC、PID、Shiny、Nature、Ability、六项 IV、Hidden Power、Gender、Height、Weight、Characteristic 和六项能力值；接口压缩为 12 个结果字

## 数据来源

`scripts/generate_gen8_wild_data.mjs` 从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 BDSP FieldEncountTable、MapInfo、地点名和 `location_modifier.json`，以及 PokeFinder 4.3.2 `personal_bdsp.bin` 生成 TypeScript/C++ 静态数据。

- `FieldEncountTable_d.json`：1,005,103 bytes，SHA-256 `B1B917F62AB4E5D0DEA592D41253B5B137255BDB4178AB1E467935A7475333D7`
- `FieldEncountTable_p.json`：1,005,098 bytes，SHA-256 `ABC33ADE1D1C49851086070C5F81C97922F6616674BCE79909A17BA8DB03E049`
- `MapInfo.json`：2,530,118 bytes，SHA-256 `311D0F7BB76D4DA2862F0BE3CE811FF1A4652E37CA8547EF324425C7E046EBED`
- `english_dp_fld_areaname.json`：131,661 bytes，SHA-256 `30E1A753E577EC2E783077AA95F90BEEB1FFC99766BCB4A888F6E8EB43FD2CD4`
- `location_modifier.json`：3,809 bytes，SHA-256 `E1D708DF084FC0E3AB76EA4BF8AE8BAFB2637207C2657522DA0A460B8F98FF3B`
- `personal_bdsp.bin`：38,080 bytes，SHA-256 `4E5CBCB1FBE7FFE559EAD6555DC02878E0D9B8700CE185998B381CFBB4DB7EC3`
- `src/features/gen8wild/data.ts`：1,097,328 bytes，SHA-256 `2F0053803BDF688EC080894879FB6990901787533FD9A4153249EFF6B5C8BE03`
- `wasm/modules/gen8wild/bridge/wild_data.inc`：172,994 bytes，SHA-256 `985B95A53A6584802991954D6D4D4A4A590EBF4F30982A2233D1D98C2539BD7C`

生成结果包含 BD/SP 各 124 个去重区域、21 个甜甜蜜树地点、Great Marsh 普通/全国图鉴替换池、Trophy Garden 替换池和 494 条 Personal 记录。生成数据和 C++ bridge 保留 GPL-3.0-or-later 归属及源码提供义务。

## 固定夹具

固定输入使用 Seed 0 `1234567887654321`、Seed 1 `8765432112345678`、TID `12345`、SID `54321`。

- Route 222 Grass 首帧：EC `FA750384`（`4201972612`）、PID `588E9617`（`1485739543`）、Slot `5`、Species `278`、Level `41`、IV `18/16/24/19/2/16`、Ability Index `93`、Height `72`、Weight `97`、Characteristic `14`
- Route 205 South Honey Tree 首帧：Species `265`、Level `14`、Item `151`、Ability Index `19`

上游 `Test/Gen8/wild8.json` 还包含 16 组普通 Wild 和 5 组 Honey Tree 场景；本地原生夹具已覆盖首组、Honey Tree、零 Seed、槽位、结果上限和错误边界，完整场景扩展仍属于后续验证工作。

## 验证

- `npm run verify`：已通过格式、Lint、TypeScript、129 个 Vitest 文件的 480 项测试和 Vite/PWA 构建；Lint 保留 6 条既有 TanStack Virtual warning。
- `npm run wasm:test:native`：51/51 原生夹具通过，含 `gen8wild_native_parity` 的普通 Grass、Honey Tree、筛选、结果上限和错误边界。
- `npm run wasm:build`：已通过，生成 `public/wasm/gen8wild.mjs`（7394 bytes）和 `public/wasm/gen8wild.wasm`（62151 bytes）；构建工具链输出 CMake 4.3.1 的 Emscripten shared library warning，不影响产物生成。
- 外部 Chrome 本地回归：`http://127.0.0.1:5173/` 已通过 BDSP Grass、双 Seed `111`、100000 结果上限和结果区滚动；生成 100000 条结果、处理 100001 帧、4 Workers，`gen8wild-table` 从 `scrollTop=0` 到 `500` 正常更新，模块控制台无错误。大幅滚轮手势曾触发浏览器连接超时，页面随后完成滚动，未复现应用冻结。
- Edge 实机回归与部署后算法回归尚未运行；生产页面算法回归仍需 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。

本地测试、原生/Wasm 构建和浏览器检查属于工程证据，不能替代 GitHub Actions 部署后的生产页面算法回归和项目所有者最终验收。
