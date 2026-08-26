# 第四世代 Wild Generator / Searcher

## 完美个体筛选

- 控件：Perfect IV Value / Perfect IV Count；中文界面显示“完美个体值 / 完美个体数”。
- 默认：Value 为 `31`，Count 为 `0`；Value 范围 `0..31`，Count 范围 `0..6`。
- 语义：六项 IV 中大于等于 Value 的项目数量必须至少达到 Count；Count 为 `0` 时不缩小结果。
- Searcher 先将六项 IV 的闭区间与完美个体条件求交，再按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 编号；例如六项 `0..31`、`31/5` 只产生 `187` 个候选，不会按 `32^6` 计数。六项范围和完美条件仍是 AND 关系，不是互斥模式。
- 上游依据：3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `3DSRNGTool/MainForm.Designer.cs` 与 `3DSRNGTool/Core/RNGFilters.cs`。

> - 模块标识：`gen4wild`
> - 当前状态：Generator/Searcher、静态遭遇数据、UI、Worker Pool、Wasm bridge 和夹具已完成工程与原生验证；外部浏览器和生产页面回归待完成
> - PokeFinder 基线：4.3.2 revision `dd00fe7`
> - EncounterTableGenerator Gen4 基线：revision `9a2ed62`
> - API 版本：`2`

## 1. 覆盖范围

- 游戏：Diamond、Pearl、Platinum、HeartGold、SoulSilver。
- 方法：DPPt 使用 Method J，HGSS 使用 Method K；甜甜蜜树使用 Honey Tree，宝可追踪使用 Poke Radar。
- 遭遇：草丛、冲浪、碎岩、破旧钓竿、好钓竿、厉害钓竿、甜甜蜜树、捕虫大赛和 HGSS 三组撞树。
- 特殊规则：时间段、大量出现、双插槽、宝可追踪与闪草、丑丑鱼钓点、大湿地/自豪的后院替换、HGSS 广播、跟随亲密度和狩猎地带模块。
- 队首：None、Synchronize、Cute Charm、Compound Eyes、Arena Trap、Illuminate、No Guard、Sticky Hold、Suction Cups、Hustle、Pressure、Vital Spirit、Magnet Pull、Static；界面按游戏和遭遇隐藏不适用选项。
- 筛选：异色、性别、特性、性格、遭遇槽位、等级、六项 IV、觉醒属性；Generator 提供“取消筛选”。
- 结果：固定列宽、虚拟表、排序、CSV、进度、取消和 250,000 条结果上限。

G4 Wild 复用 G3 Wild 的三栏控制网格、筛选器顺序、IV 快捷键、结果表和操作状态，不复用 G3 请求、Worker、Wasm、存档或算法状态。G3/G4 存档保持独立；个体值计算器是全局单一工具，G4 Wild 只调用其公共入口。

应用侧栏切换到其他模块时，本页面在当前浏览器页面会话内保持挂载，保留 Generator/Searcher 输入、筛选、结果和排序；刷新页面后恢复模块默认状态。

## 2. 输入边界

| 输入                                     | 范围 / 行为                                                             | 上游或实现依据                                     |
| ---------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| Seed                                     | 十六进制 `00000000..FFFFFFFF`，最多 8 位；空值按 `0`                    | `Form/Controls/TextBox.cpp`、`Form/Gen4/Wild4.cpp` |
| Initial Advances / Max Advances / Offset | 十进制 `0..4294967295`；三者组合不得超过 `0xFFFFFFFF`                   | PokeFinder `u32` 参数与 Web 领域校验               |
| Max Advances                             | 包含起点，输入 `N` 处理 `N + 1` 个状态；单任务最多 2,000,000 个状态     | `WildGenerator4` 循环与 Worker 任务边界            |
| Searcher Min/Max Advance                 | 十进制 `0..4294967295`，闭区间                                          | `WildSearcher4` 的 `u32` 参数                      |
| Searcher Min/Max Delay                   | 十进制 `0..65535`，闭区间                                               | 初始 Seed 低 16 位与 Web `u16` 校验                |
| TID / SID                                | 十进制 `0..65535`                                                       | 独立 G4 存档与 `Profile4`                          |
| 六项 IV                                  | 每项 `0..31`，最小值不得大于最大值；Generator/Searcher 默认均为 `0..31` | `Filter.ui` 与当前 G3/G4 一致性要求                |
| Level                                    | 十进制 `1..100`，最小值不得大于最大值                                   | `Filter.ui`、`StateFilter`                         |
| Happiness                                | `0 / 20 / 30 / 40 / 50`                                                 | `Form/Gen4/Wild4.ui`                               |
| Safari blocks                            | 草原、森林、岩场、水边各 `0..99`                                        | `Form/Gen4/Wild4.ui`                               |
| Nature / 觉醒属性 / Encounter Slot       | 分别为 25 / 16 / 当前遭遇表槽位多选；空选择按全选                       | `StateFilter` 与 CheckList 语义                    |

IV 名称按钮与 G3 对齐：普通点击恢复 `0..31`，Ctrl 点击设置 `31..31`，Alt 点击设置 `30..31`，Ctrl+Alt 点击设置 `0..0`。

甜甜蜜树和宝可追踪必须恰好选择一个遭遇槽位。捕虫大赛和 HGSS 狩猎地带的 Searcher 至少一项最小 IV 必须为 `31`；PokeFinder 的对应提示没有已完成简体中文翻译，因此保留英文源文本。

## 3. 遭遇数据

`scripts/generate_gen4_wild_data.py` 读取 EncounterTableGenerator Gen4 二进制、PokeFinder Gen4 Personal 数据和中英日资源，生成 `src/features/gen4wild/data.ts`。运行结构为：

```text
python scripts/generate_gen4_wild_data.py \
  --generated <EncounterTableGenerator 输出根目录> \
  --resources <EncounterTableGenerator 输出根目录> \
  --personal <PokeFinder/Core/Resources/Personal/Gen4> \
  --i18n <PokeFinder/Core/Resources/i18n> \
  --output src/features/gen4wild/data.ts
```

生成数据包含：

- DPPt/HGSS 常规野生表、蜂蜜树、捕虫大赛、撞树和 HGSS 狩猎地带。
- DPPt 时间替换、双插槽、大量出现、宝可追踪、大湿地、自豪的后院和丑丑鱼规则。
- HGSS 时间表、广播、大量出现、夜间替换、狩猎地带模块要求和跟随亲密度相关遭遇率。
- 五个版本的 Personal 数据，以及中英日物种、道具和地点名称。

生产运行只读取仓库内生成数据，不访问后端、运行时 CDN 或远端接口。

## 4. 算法与结果

生产算法直接编译 PokeFinder `WildGenerator4`、`WildSearcher4`、`EncounterArea4`、`Profile4`、`LCRNGReverse` 和共享父类。React/TypeScript 只负责表单、遭遇表变体、校验、分片、结果解码和显示，不重写生产 RNG。

Generator 的 DPPt 可见列为 Advances、`Battle Advances`、音高和通用状态列；HGSS 额外显示电话。Searcher 对齐 PokeFinder `WildModel4`，可见首列只有 Seed、Advances 和通用状态列；Delay 与 Hour 仅用于内部 Seed 验证，不加入结果表。

通用状态列为道具、遭遇槽位/宝可梦、等级、PID、异色、性格、特性、六项 IV、觉醒属性、觉醒威力、性别和个性。中文术语固定为“觉醒力量”“觉醒属性”“觉醒威力”；宝可梦名称不附加“定点”或其他模块后缀。

## 5. Wasm 与 Worker

```text
Gen4WildPanel
  |-- Gen4WildWorkerPool
  `-- Gen4WildSearcherWorkerPool
        `-- Dedicated Worker x N
              `-- gen4wild.mjs + gen4wild.wasm
                    |-- gen4wild_generate
                    `-- gen4wild_search
```

模块使用 `rngModuleContract.ts` 的 Worker 信封和 API v2。请求结构固定为 75 个 `uint32_t`，每个槽位固定为 19 个 `uint32_t`，Generator/Searcher 结果均固定为 22 个 `uint32_t`。C++ 使用 `static_assert` 固定记录宽度，Worker 解码前检查结果长度。

Generator 每片最多 100,000 个状态；Searcher 每片最多 10,000 个交集 IV 组合。Pool 按 `chunkIndex` 提交乱序批次；取消或达到结果上限时终止现有 Worker，下一任务重新初始化。单任务 IV 组合和 Generator 状态上限均为 2,000,000，结果上限为 250,000。

Worker 在调用 Wasm 前重新执行领域校验，拒绝不匹配的游戏/遭遇表、方法、槽位、`u8/u16/u32` 边界和特殊 Searcher 约束。Wasm 不使用 pthread、`SharedArrayBuffer` 或跨源隔离。

## 6. 固定夹具

`wasm/modules/gen4wild/tests/wild4_native_test.cpp` 使用 Platinum Route 222 Grass：

```text
Seed: 390451572
Method: Method J
Advances: 0..9
TID / SID: 12345 / 54321
```

首条预期为 Advances `0`、`Battle Advances` `50`、PID `1504931347`、IV `27/23/6/31/22/19`、Slot `4`、Species `278`、Level `38`、Nature `22`、觉醒属性 `6`、觉醒威力 `70`、电话 `1`、音高 `7`。同一地点全 31 IV、Advance `0..1000`、Delay `600..2000` 的 Searcher 预期返回 `33` 条；六项 `0..31`、`31/5` 的索引 `186` 也返回同样结果，`187` 被拒绝；非法 fixed slot 必须返回错误。

TypeScript 测试覆盖包含式分片、IV 笛卡尔积分片、19/22 word ABI、方法/版本/槽位/Delay/特殊 31 IV 校验，以及 Generator/Searcher UI 预览的确定性、结果上限和取消。

## 7. 来源与参考

- PokeFinder revision：`dd00fe7`。
- EncounterTableGenerator Gen4 revision：`9a2ed62`。
- PokeFinder 主要文件：`Form/Gen4/Wild4.cpp/.ui`、`Model/Gen4/WildModel4.cpp/.hpp`、`Core/Gen4/Generators/WildGenerator4.cpp/.hpp`、`Core/Gen4/Searchers/WildSearcher4.cpp/.hpp`、`Core/Gen4/EncounterArea4.cpp/.hpp`、`Test/Gen4/WildGenerator4Test.cpp`、`WildSearcher4Test.cpp`、`wild4.json`。
- [zaksabeast/PokemonRNGGuides](https://github.com/zaksabeast/PokemonRNGGuides) revision `c0b2bb664f04a4ef052e6dd4d831351703fa4047` 没有第四世代 Wild Generator/Searcher 实现；本模块只参考其 React 工作台和任务流程组织，不复制或编译其源码。

完整 vendored 文件、SHA-256、修改边界和许可证见 [`third_party/pokefinder/UPSTREAM.md`](../../third_party/pokefinder/UPSTREAM.md)。

## 8. 验证状态

2026-08-27 已完成紧凑布局迁移：Generator/Searcher 移至存档信息左侧，乱数信息、设置、筛选项在桌面同排，筛选项独占可伸缩宽度；筛选底部操作、结果提示、虚拟表首行偏移和末列表头边界同步收敛。模块专属布局迁入 `src/features/gen4wild/Gen4WildPanel.css`，页面通过 `gen4wild-page` 局部变量控制 `30px` 控件密度，移除 `src/styles.css` 中对应的全局覆盖。

已使用外部 Chrome 的本地 UI 预览 `http://127.0.0.1:5173/` 检查：桌面三栏为约 `270 / 304 / 480px`，页面无横向溢出；`900x800` 时三栏单列、选项字段单列且页面无横向溢出。下拉菜单与触发框同宽，菜单选项高度为 `30px`；生成预览结果表可横向滚动，首行紧贴 `40px` 表头，末列表头右边界为 `0px`。该检查只验证界面和交互，不验证 RNG 结果或性能。

2026-08-27 已通过 `npm run verify`：Prettier、TypeScript、178 个测试文件共 619 项测试，以及 Vite/PWA 生产构建均成功。Lint 保留 `Gen3StaticPanel.tsx:298` 的既有 Hook 依赖 warning，构建保留既有大 chunk warning。2026-08-25 的 `$env:POKERNGKIT_WASM_MODULES='gen3static,gen3wild,gen4static,gen4wild'; npm run wasm:test:native` 4/4 native 夹具，以及六项 `0..31`、`31/5` 的组合索引边界仍已通过。

下一步等待 GitHub Actions 完成部署。部署后再使用项目所有者提供的生产 URL，在外部 Chrome/Edge 对照 PokeFinder 回归 DPPt Method J、HGSS Method K、甜甜蜜树、宝可追踪、捕虫大赛、狩猎地带、取消和结果列。
