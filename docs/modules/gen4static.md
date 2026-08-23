# 第四世代 Static Generator / Searcher

本文说明 `gen4static` 的第四世代定点 Generator/Searcher、输入边界、结果布局和 Worker/Wasm 边界。生产算法位于 `wasm/modules/gen4static/bridge/gen4static_bridge.cpp`，TypeScript 只负责表单、筛选、分片、排序和结果解码。

## 1. 覆盖范围

- 游戏：Diamond、Pearl、Platinum、HeartGold、SoulSilver。
- 方法：Method 1、Method J、Method K。
- 分类：Starters、Fossils、Gifts、Game Corner、Stationary、Legends、Events、Roamers。
- 模板：由 EncounterTableGenerator 的 Gen4 encounter 表与 PokeFinder `personal_pt.bin` 生成 99 条记录。
- 队首：None、Synchronize、Cute Charm 男/女；Method 1 按上游约束只能使用 None。
- 筛选：Nature、觉醒属性、六项 IV、异色、性别和特性槽。

G4 页面复用 G3 Static 的三栏控制网格、IV 表格、快捷键、结果虚拟表和取消筛选开关的交互方式，但不复用 G3 的请求、Worker、存档或计算器状态。

应用侧栏切换到其他模块时，本页面在当前浏览器页面会话内保持挂载，保留 Generator/Searcher 输入、筛选、结果和排序；刷新页面后恢复模块默认状态。

## 2. 计算规则

Generator 复制 PokeFinder `StaticGenerator4::generateMethod1/MethodJ/MethodK` 的 RNG 调用顺序。Method 1 先读取 PID 的低/高 16 位，再读取两组 IV；Method J/K 先处理 Cute Charm 或 Synchronize，再按性格循环读取 PID，最后读取 IV。结果中的 Advances 是 `Initial Advances + candidateIndex`，`Offset` 只参与 RNG 定位。

Searcher 按 `LCRNGReverse::recoverPokeRNGIV` 恢复 IV 对应 Seed，随后按方法、队首、Delay 和 Advance 范围验证 PID。IV 组合顺序为 `HP -> Atk -> Def -> SpA -> SpD -> Spe`，每组分片最多 500 个组合，C ABI 单次最多处理 100,000 个组合。

Generator 的 `Max Advances` 包含起点，状态总数为 `Max Advances + 1`；这是 PokeFinder 上游 `for (cnt = 0; cnt <= maxAdvances; cnt++)` 的实际语义。

[zaksabeast/PokemonRNGGuides](https://github.com/zaksabeast/PokemonRNGGuides) `c0b2bb6` 作为独立交叉参考：其 Rust `stationary` Generator 同样先顺序读取 `iv1`、`iv2` 再构造六项 IV，Searcher 采用“恢复 IV Seed -> Method 1/J/K 映射 -> SeedFilters”的分层。PokeRNGKit 保持 PokeFinder `dd00fe7` 为控件、算法语义和固定结果的权威基线，不复制或编译 PokemonRNGGuides 源码。

## 3. 输入边界

| 输入                                     | 范围 / 行为                                                       |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Seed                                     | 十六进制 `0..FFFFFFFF`，最多 8 位；空值按 `0`                     |
| Initial Advances / Max Advances / Offset | 十进制 `0..4294967295`，最多 10 位；三者组合不得溢出 `0xFFFFFFFF` |
| Searcher Min/Max Delay                   | 十进制 `0..4294967295`，闭区间                                    |
| Searcher Min/Max Advance                 | 十进制 `0..4294967295`，闭区间                                    |
| TID / SID                                | 十进制 `0..65535`，最多 5 位                                      |
| Level                                    | Encounter 模板固定为 `1..100`                                     |
| 六项 IV                                  | 每项 `0..31`；Generator 与 Searcher 初始均为最小 `0`、最大 `31`   |
| Nature                                   | 25 项掩码，空选择按全选                                           |
| 觉醒属性                                 | 16 项掩码，空选择按全选                                           |
| 异色                                     | Any、非异色、异色                                                 |
| 性别                                     | Any、雄性、雌性、无性别                                           |
| 特性                                     | Any、槽位 0、槽位 1                                               |

IV 名称按钮行为与 G3 对齐：普通点击 `0..31`，Ctrl 点击 `31..31`，Alt 点击 `30..31`，Ctrl+Alt 点击 `0..0`。筛选器支持多选列表的 Ctrl 重置提示；Generator 另有“取消筛选”。

## 4. 结果列

Generator 的 DPPt 结果为 Advances、音高及通用状态列；HGSS 额外显示电话。Searcher 结果以 Seed、Delay、Hour、Advances 开头，随后显示 PID、异色、性格、特性、六项 IV、觉醒属性、觉醒威力、性别和个性。列定义同时用于排序和 CSV，CSS 为每种列数固定 grid track，结果区域仅在表格内部横向滚动。

术语固定为：Hidden Power 使用“觉醒力量”，Hidden 使用“觉醒属性”，Power 使用“觉醒威力”，Characteristic 使用“个性”，Call 使用“电话”，Chatot 使用“音高”。

## 5. Wasm / Worker

模块 manifest 与 C ABI API 版本均为 `1`，导出：`gen4static_api_version`、`gen4static_generate`、`gen4static_search`、`gen4static_result_ptr`、`gen4static_result_count`、`gen4static_last_error`。Generator 状态记录 68 字节，Searcher 状态记录 80 字节；Worker 解码前检查记录宽度，并按 `chunkIndex` 恢复批次顺序。

取消会终止并重建独立 Worker。结果上限为 100,000；输入总范围超过 2,000,000 个状态/组合时由领域校验拒绝。

## 6. 数据生成与来源

- PokeFinder revision：`dd00fe7`（4.3.2）。
- EncounterTableGenerator revision：`9a2ed62`。
- PokemonRNGGuides 交叉参考 revision：`c0b2bb664f04a4ef052e6dd4d831351703fa4047`。
- 生成脚本：`node scripts/generate_gen4_static_data.mjs --encounters <Gen4/encounters.json> --personal <Core/Resources/Personal/Gen4/personal_pt.bin> --output src/features/gen4static/encounters.ts`。
- 个人数据和三语名称、能力、个性资源由 `scripts/generate_gen4_iv_data.mjs` 生成 `src/features/gen4ivcalculator/gen4IvData.ts`。
- 生成文件带 GPL-3.0-or-later 来源声明，不手工编辑。

完整上游文件、修改边界与许可证见 [`third_party/pokefinder/UPSTREAM.md`](../../third_party/pokefinder/UPSTREAM.md)。

## 7. 验证状态

TypeScript 领域测试、分片测试、数据数量测试和 UI 预览引擎测试已写入工作区。2026-08-13 经项目所有者授权，使用外部 Chrome 对 `https://haku76.github.io/PokeRNGKit/` 的生产资源 `index-mLBsBTQF.js` 回归 Method 1 / Manaphy：Seed `0`、Initial Advances `0`、Max Advances `9`、Offset `0` 返回 10 条，首条 Advances `0`、PID `E97E0000`、IV `17/19/20/13/12/16`、觉醒属性岩石、威力 `31`，与原生固定夹具十进制 PID `3917348864` 一致。Method J/K、Searcher、取消、移动端和项目所有者最终验收仍待完成。
