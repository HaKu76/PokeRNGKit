# PokeRNGKit

PokeRNGKit 是面向宝可梦 RNG 研究与检索的本地优先 Web 工具集。项目英文工程名已确定，当前不设置中文名。项目以
[Admiral-Fish/PokeFinder](https://github.com/Admiral-Fish/PokeFinder) 4.3.2 的算法与测试资料为上游参考，目标是在不牺牲结果正确性的前提下，提供 Web 原生、可离线、无需后端的使用体验。

## 项目状态

**当前里程碑：完成第七世代主模块。** PokeFinder 4.3.2 的第三、第四、第五世代模块已经进入仓库；第八世代 Profiles、IDs 与 Eggs 已实现。第七世代 Stationary、Wild、SOS、Egg、Battle Tree 与 Event 已实现，下一模块为 Main RNG Tool。3DSRNGTool 除 `NTR Helper` 外全部保留在开发范围内，包括公共 Profile Manager。

- 当前范围：完整 PokeFinder 4.3.2，以及除 `NTR Helper` 外的全部 3DSRNGTool 功能
- 已完成范围：PokeFinder Gen III、Gen IV、Gen V、全局工具、Gen VIII Profiles / IDs / Eggs，以及 3DSRNGTool Gen VII Stationary / Wild / SOS / Egg / ID / Battle Tree / Event
- 当前工作：实现 Gen VII Main RNG Tool，随后完成 Egg Seed Finder、Festival Plaza Facility RNG 与 3DSRNGTool Profile Manager
- 明确排除：仅 3DSRNGTool `NTR Helper`
- 上游核验基线：PokeFinder 4.3.2
- 完整库存与状态：[docs/module-inventory.md](docs/module-inventory.md)
- 模块说明：[Gen 3 ID](docs/modules/gen3id.md) / [Gen 3 Initial Seed Finder](docs/modules/gen3initialseed.md) / [Gen 3 Seed to Time](docs/modules/gen3seedtotime.md) / [GameCube Seed Finder](docs/modules/gen3ngcseed.md) / [Gen 3 GameCube RNG](docs/modules/gen3gamecube.md) / [Gen 3 PID to IVs](docs/modules/gen3pidtoiv.md) / [Gen 3 PokeSpot](docs/modules/gen3pokespot.md) / [Gen 3 Jirachi Advancer](docs/modules/gen3jirachiadvancer.md) / [Gen 3 Static](docs/modules/gen3static.md) / [Gen 3 Wild](docs/modules/gen3wild.md) / [Gen 3 IVs to PID](docs/modules/gen3ivtopid.md) / [Gen 3 Egg](docs/modules/gen3egg.md) / [Gen 3 Spinda Painter](docs/modules/gen3spindapainter.md) / [Gen 3 Profiles](docs/modules/gen3profiles.md) / [IV Calculator](docs/modules/gen3ivcalculator.md) / [Gen 4 ID](docs/modules/gen4id.md) / [Gen 4 Seed to Time](docs/modules/gen4seedtotime.md) / [Gen 4 Static](docs/modules/gen4static.md) / [Gen 4 Wild](docs/modules/gen4wild.md) / [Gen 4 Egg](docs/modules/gen4egg.md) / [Gen 4 Advance Finder](docs/modules/gen4advance.md) / [Gen 4 Wondercard IVs](docs/modules/gen4event.md) / [Gen 4 Chained Shiny to SID](docs/modules/gen4chainedsid.md) / [Gen 4 Profiles](docs/modules/gen4profiles.md) / [Gen 5 Profiles](docs/modules/gen5profiles.md) / [Gen 5 TID/SID](docs/modules/gen5id.md) / [Gen 5 Adjacent Seeds](docs/modules/gen5adjacentseeds.md) / [Gen 5 IV Cache Finder](docs/modules/gen5ivcache.md) / [Gen 5 SHA1 Cache Finder](docs/modules/gen5sha1cache.md) / [Gen 5 Dream Radar](docs/modules/gen5dreamradar.md) / [Gen 5 Static](docs/modules/gen5static.md) / [Gen 5 Wild](docs/modules/gen5wild.md) / [Gen 5 Hidden Grotto](docs/modules/gen5hiddengrotto.md) / [Gen 5 Eggs](docs/modules/gen5egg.md) / [Gen 5 Event](docs/modules/gen5event.md) / [Gen 7 Stationary](docs/modules/gen7stationary.md) / [Gen 7 Wild](docs/modules/gen7wild.md) / [Gen 7 SOS](docs/modules/gen7sos.md) / [Gen 7 Egg](docs/modules/gen7egg.md) / [Gen 7 Battle Tree](docs/modules/gen7battletree.md) / [Gen 7 Event](docs/modules/gen7event.md) / [Gen 7 ID](docs/modules/gen7id.md) / [Gen 8 Profiles](docs/modules/gen8profiles.md) / [Gen 8 ID](docs/modules/gen8id.md) / [Gen 8 Eggs](docs/modules/gen8egg.md) / [Researcher](docs/modules/researcher.md) / [宝可病毒查询](docs/modules/pokerusfinder.md) / [Encounter Lookup](docs/modules/encounterlookup.md)
- 进度与跨环境交接：[docs/progress.md](docs/progress.md)
- 第七世代来源记录：[3DSRNGTool](third_party/3dsrngtool/UPSTREAM.md) / [Gen 7 Stationary](docs/modules/gen7stationary.md) / [Gen 7 Wild](docs/modules/gen7wild.md) / [Gen 7 SOS](docs/modules/gen7sos.md) / [Gen 7 Egg](docs/modules/gen7egg.md) / [Gen 7 Battle Tree](docs/modules/gen7battletree.md) / [Gen 7 Event](docs/modules/gen7event.md) / [Gen 7 ID](docs/modules/gen7id.md)
- 宝可病毒来源记录：[Pokerus Finder](third_party/pokerusfinder/UPSTREAM.md)
- 需求基线：[docs/requirements.md](docs/requirements.md)
- 技术方案：[docs/tech-stack.md](docs/tech-stack.md)
- AI 开发入口：[docs/ai-development.md](docs/ai-development.md)

## 产品定位

PokeRNGKit 不是桌面程序的逐像素复刻，而是保留已实现 PokeFinder Core 模块的算法，通过 WebAssembly 在浏览器中运行，并用 React 构建适合桌面和移动浏览器的原生交互。所有计算、档案和设置都留在用户设备上。

当前已落地的 ID 模块包含：

- XD/Colosseum、FireRed/LeafGreen/Emerald、Ruby/Sapphire 三种第三世代 ID 生成模式
- TID、SID、TSV 精确筛选
- Initial Advances / Max Advances 分片计算
- Web Worker Pool 并行调度、进度、取消和错误状态
- 虚拟化结果表、数值排序和 CSV 导出

当前 Gen IV ID 工作区包含：

- 日期、时间、Delay 的 Generator 与年份、Delay 区间的 Searcher
- TID、SID、TID/SID、PID、TID/PID 与 TSV 精确筛选
- 独立 `gen4id` Wasm、Worker Pool、进度、取消、排序和 CSV
- 输入边界、固定夹具和协议见 [Gen 4 ID](docs/modules/gen4id.md)

当前 Initial Seed Finder 工作区包含：

- `RS IDs`：由 TID/SID 枚举全部 Ruby/Sapphire 初始 16 位 Seed 候选及帧数
- `FRLG / RSE`：从目标 32 位 Seed 反向 PokeRNG，按 `Max Results` 返回初始 Seed 与帧数
- `gen3initialseed` Wasm C ABI、独立 Worker/Wasm 实例、分片进度、取消、稳定排序和 CSV
- `Target Seed` 空值按项目统一 Seed 规则视为 `0`；`Max Results` 为 `1..65536`
- 算法、输入边界和来源见 [Gen 3 Initial Seed Finder](docs/modules/gen3initialseed.md)；本轮未构建或验收

当前 Seed to Time 工作区包含：

- PokeFinder `SeedToTime3` 的 16/32 位 Seed、年份、只读 Advances 和时间表
- 32 位 Seed 使用 PokeRNGR 回推原始 16 位 Seed，保留上游 2000 年后的日历缺陷
- 独立 `gen3seedtotime` Wasm、Dedicated Worker、固定夹具和三语界面；本轮未构建或验收
- 算法、输入边界和来源见 [Gen 3 Seed to Time](docs/modules/gen3seedtotime.md)

当前 GameCube Seed Finder 工作区包含：

- Pokemon XD、Pokemon Colosseum 与 Pokemon Channel 三种 NGC Seed 查询
- XD/竞技场的多轮候选筛选，以及 Channel 至少 10 条方向模式输入
- 首次搜索按上游询问是否使用 Gales/Colo `.precalc`，本地校验与分区读取；选择 No 时保留完整搜索
- 独立 `gen3ngcseed` Wasm、Worker Pool、进度、取消、结果排序、去重与单结果复制
- 上游 Gales 首轮越界差异、输入边界和文件格式见 [GameCube Seed Finder](docs/modules/gen3ngcseed.md)；本轮未构建或验收

当前 IVs to PID 工作区包含：

- 六项 IV、性格、TID 输入；空 TID 按上游行为作为 `0`
- Method 1、Reverse Method 1、Method 2、Method 4、XD/Colo、Channel、Cute Charm (DPPt/HGSS)
- Seed、PID、SID、Ability、四种性别比例和 Method 结果列
- 独立 `gen3ivtopid` Wasm、Dedicated Worker、排序和 CSV
- 算法、输入边界和上游文件见 [Gen 3 IVs to PID](docs/modules/gen3ivtopid.md)；本轮未构建或验收

当前 Egg 工作区包含：

- Emerald `EBred`、`EBredSplit`、`EBredAlternate` 与 Ruby/Sapphire/FireRed/LeafGreen `RSFRLGBred`、`RSFRLGBredSplit`、`RSFRLGBredAlternate`、`RSFRLGBredMixed` 生成方式
- Held/Pickup Seed、校准值、查看图鉴次数、好感度、蛋种类、亲代 IV/性别/性格/道具和当前存档 TID/SID
- 性格、觉醒力量、IV、能力、性别、特性和异色筛选；遗传来源显示、排序、CSV、进度与取消
- 独立 `gen3egg` Wasm、Worker Pool、Emerald 与 RS/FRLG 不同结果列布局；当前只提供 Generator，不包含 Egg Searcher
- 算法、输入边界和固定夹具见 [Gen 3 Egg](docs/modules/gen3egg.md)；本轮未构建或验收

当前 Spinda Painter 工作区包含：

- PID 的四字节半字节位置映射，空 PID 按 `0` 显示；拖动斑点后回写无前导零十六进制 PID
- PokeFinder 原始 `512x512` 晃晃斑底图与四张各自尺寸的斑点 PNG，鼠标拖动和方向键均按 8 像素网格移动
- 由 PID 显示性格、性别和特性；不使用 Wasm/Worker，也不含 RNG 搜索
- 算法、输入边界和资源来源见 [Gen 3 Spinda Painter](docs/modules/gen3spindapainter.md)；本轮未构建或验收

当前 Gen IV Static 工作区包含：

- Diamond、Pearl、Platinum、HeartGold、SoulSilver 的 99 条定点模板
- Method 1、Method J、Method K、Synchronize 和 Cute Charm Generator/Searcher
- 六项 IV 默认 `0..31`，筛选格式、快捷键和三栏控制布局与 Gen III Static 对齐
- 固定列宽结果表、排序、CSV、觉醒属性、觉醒威力、个性、电话和音高
- 独立 `gen4static` Wasm/Worker 与 G4 存档 schema；个体值计算器是跨工作区的单一全局工具，由工具自身选择六个 PokeFinder 数据集
- 算法、输入边界和参考来源见 [Gen 4 Static](docs/modules/gen4static.md)

当前 Gen VII ID 工作区包含：

- Sun、Moon、Ultra Sun、Ultra Moon 的版本选择和对应 ID 起始帧
- SFMT `Nextulong()`、TID/SID/TSV/TRV、Gen7TID、指针修正和首版单值筛选
- 独立 `gen7id` Wasm、Dedicated Worker Pool、进度、取消、虚拟化结果表和 CSV
- 主要行为来源为本地优化版 `3DSRNGTool`，公开祖先仅用于归属追溯；本模块尚未完成构建和部署验收

当前 Gen VII Stationary 工作区包含：

- Sun、Moon、Ultra Sun、Ultra Moon 的 SFMT 连续定点帧，以及 228 条版本限定模板
- NPC 模型状态、Raining phase、Blink / Safe Frame、DelayType 1..27、Poke Pelago、In-Game Trade、Totem 与 Ultra Space Wilds
- IV、性格、觉醒力量、性别、特性、异色、方块异色、完美 IV 数量和 Blink 筛选
- 独立 `gen7stationary` Wasm API v1、57/9-word 会话契约、单 Dedicated Worker、进度、取消、虚拟结果表、排序与 CSV
- 算法、输入边界、模板权限和当前未验证状态见 [Gen 7 Stationary](docs/modules/gen7stationary.md)

当前 Gen VII Wild 工作区包含：

- Sun、Moon、Ultra Sun、Ultra Moon 的普通野生、Ultra Beast、Island Scan、Fishing、Ambush Encounters 与 Berry Tree
- 版本/昼夜槽位、NPC、Raining、Fishing Bubbling / Overview、Ambush Trigger、Delay2、Wild Cry 与完整 Lead 行为
- IV、性格、觉醒力量、性别、特性、异色、方块异色、槽位、特殊遭遇、等级、完美 IV 数量和 Blink 筛选
- 独立 `gen7wild` Wasm API v1、91/11-word 会话契约、单 Dedicated Worker、进度、取消、虚拟结果表、排序与 CSV
- 算法、输入边界、遭遇数据和当前未验证状态见 [Gen 7 Wild](docs/modules/gen7wild.md)

当前 Gen VII SOS 工作区包含：

- Pokemon Generation 与 Call Prediction 两个上游工作流，以及 Main Form SFMT64 / 战斗内 SFMT32 双随机数流
- Caller、九个普通/天气 Ally 槽位、链长、等级、Call Rate、HP 条、道具、保底 IV、HA、同步与 Path Finder
- 独立 `gen7sos` Wasm API v1、77/14-word 会话契约、单 Dedicated Worker、进度、取消、虚拟化结果表、排序与 CSV
- 算法、输入边界、`Rate 2` 来源差异和路径窗口策略见 [Gen 7 SOS](docs/modules/gen7sos.md)

当前 Gen VII Egg 工作区包含：

- Frame Range、Egg Number 与 Shortest Path 三种上游工作流，以及四字 TinyMT 当前状态
- 双亲 IV、道具、特性、百变怪、性别比、异国孵化、闪耀护符、尼多型、同图鉴、其他 TSV 和闪数提醒
- 独立 `gen7egg` Wasm API v1、187/20-word 会话契约、单 Dedicated Worker、进度、取消、虚拟化结果表、排序与 CSV
- 输入边界、双亲跨字段规则、路径算法、固定夹具和当前验证状态见 [Gen 7 Egg](docs/modules/gen7egg.md)

当前 Gen VII Battle Tree 工作区包含：

- Sun、Moon、Ultra Sun、Ultra Moon 的 SFMT64 连续帧、NPC 眨眼模型、Delay、Streak 与 Trainer ID 筛选
- 普通场次和每十场特殊训练家生成；`209..254` 均表示不过滤，`192..205` 显示上游英文训练家名称
- 独立 `gen7battletree` Wasm API v1、9/7-word 会话契约、单 Dedicated Worker、进度、取消、虚拟化结果表、排序与 CSV
- 输入边界、训练家区间、固定夹具和本地验证状态见 [Gen 7 Battle Tree](docs/modules/gen7battletree.md)

当前 Gen VII Event 工作区包含：

- Sun、Moon、Ultra Sun、Ultra Moon 配信连续帧，以及本地 `.wc7` / `.wc7full` 导入
- 物种、形态、等级、固定 IV、保底随机 V 数、Ability / Nature / Gender 锁定、PID Type、自 ID、蛋、未登入图鉴和其他信息
- 独立 `gen7event` Wasm API v1、58/9-word 会话契约、单 Dedicated Worker、完整筛选、进度、取消、虚拟化结果表、排序与 CSV
- 输入边界、Wonder Card 字段、生成顺序和验证状态见 [Gen 7 Event](docs/modules/gen7event.md)

当前 Gen VIII ID 工作区包含：

- 两段 64 位 Seed、初始帧和状态数量输入，保留 `uint32_t` 帧号自然回绕与空值读取为 `0` 的上游语义
- TID、SID、TID/SID、PID、TSV 与 Display TID 六种筛选；切换模式清空文本，空文本表示不筛选
- 独立 `gen8id` Wasm API v2、最多八个 Dedicated Worker、确定性分片、进度、取消、250,000,000 次状态评估上限、100,000 行结果上限和虚拟结果表
- 四组 PokeFinder `id8.json` 固定夹具、五列普通十进制结果和完整输入边界见 [Gen 8 ID](docs/modules/gen8id.md)

当前 Gen VIII Eggs 工作区包含：

- Brilliant Diamond / Shining Pearl 档案、两段 64 位 Seed、好感度、初始帧、最大帧数与 Offset
- 双亲 IV / 特性 / 性别 / 道具 / 性格、红线、异国孵化、闪耀护符、圆形护符和特殊蛋种分支
- 独立 `gen8egg` Wasm API v1、Dedicated Worker Pool、250,000,000 次任务上限、100,000 行结果上限、进度、取消、虚拟结果表与 CSV
- 输入边界、53/13-word 契约和上游夹具见 [Gen 8 Eggs](docs/modules/gen8egg.md)

当前 Gen IV Wild 工作区包含：

- DPPt Method J、HGSS Method K、甜甜蜜树、宝可追踪、草丛、冲浪、碎岩、钓鱼、捕虫大赛、撞树、大量出现、双插槽、广播、大湿地/后院替换、丑丑鱼和狩猎地带
- 六项 IV 默认 `0..31`，布局、筛选顺序、快捷键、固定列宽结果表、排序、CSV、进度和取消与 Gen III Wild 对齐
- 独立 `gen4wild` Wasm/Worker Pool、静态遭遇数据、搜索分片和 G4 存档；Searcher 可见结果不显示内部 Delay/Hour
- 算法、输入边界和固定夹具见 [Gen 4 Wild](docs/modules/gen4wild.md)；本轮未构建或验收

当前 Gen IV Egg 工作区包含：

- DPPt/HGSS Egg Generator/Searcher、MT19937 PID、异国孵化 ARNG 重抽和三项遗传 IV
- 双亲 IV/性别组合、221 个合法蛋种、性别比例、完整筛选、DPPt Poketch 计算与 HGSS 电话结果
- 独立 `gen4egg` Wasm/Worker Pool、固定宽度结果、排序、虚拟表、CSV、进度和取消
- 算法、输入边界、数据来源和固定夹具见 [Gen 4 Egg](docs/modules/gen4egg.md)；生产 Wasm 与部署页面验收待完成

当前 Advance Finder 工作区包含：

- Calls、Chatot 与第五世代 Needles 连续观测匹配，支持空序列、五条以内过滤和完整源表恢复语义
- 结构化 `Advances,Value` 源行、独立入口、父 Generator 结果表嵌入、Jump to Advance、清空和取消
- 独立 `gen4advance` Wasm/Dedicated Worker、API v2、固定宽度结果和 Calls/Chatot/Needles 原生错误边界夹具
- Gen5 Static Generator 通过可拖动居中弹层复用该模块；算法、输入边界与上游行为见 [Advance Finder](docs/modules/gen4advance.md)

当前 Gen V Profiles 工作区包含：

- Black、White、Black 2、White 2 的 Profile Manager、Editor 与 Profile Calibrator
- 独立 IndexedDB schema 和 localStorage 镜像，以及 JSON 导入、导出、选择、复制、删除和排序
- IV、Needle、Seed 三种校准，DS/DSi/3DS、七种语言、Nazo、SHA1、MTFast 和初始推进规则
- 独立 `gen5profiles` Wasm/Worker Pool、API v1、确定性 UI 预览和原生固定夹具
- 输入边界、持久化、ABI 和当前 Cache 文件名限制见 [Gen 5 Profiles](docs/modules/gen5profiles.md)

当前 Gen V TID/SID 工作区包含：

- Search By 与 Seed Finder 两条上游工作流，以及 PID、TID、SID、日期、秒数和推进范围筛选
- Black、White、Black 2、White 2 的 SHA-1 Seed、初始 ID 推进和九列虚拟结果表
- 独立 `gen5id` Wasm/Worker Pool、API v1、250,000,000 次筛选任务上限、无筛选结果提前终止、取消和确定性排序
- 输入边界、固定宽度 ABI、结果防御性校验和固定夹具见 [Gen 5 TID/SID](docs/modules/gen5id.md)

当前 Gen V Adjacent Seeds 工作区包含：

- Black、White、Black 2、White 2 的目标日期时间、Timer0、按键、Encounter 与 IV advances 搜索
- Seed、日期时间、Timer0、IV Advance、六项 IV 和 PID Advance 结果，以及 Chatot Pitches / Save Needles 预览
- 独立 `gen5adjacentseeds` Wasm/Worker Pool、API v1、100,000 行结果上限、取消和确定性排序
- 输入边界、固定宽度 ABI、Profile 依赖和固定夹具见 [Gen 5 Adjacent Seeds](docs/modules/gen5adjacentseeds.md)

当前 Gen V IV Cache Finder 工作区包含：

- 完整 `2^32` MT Seed 空间的 Entralink、Normal 与 Roamer 高个体 Seed 筛选，以及 `.ivcache` 文件导出
- 独立 `gen5ivcache` Wasm/Worker Pool、API v1、65,536 个分片、1,000,000 行结果上限、取消和 Worker 崩溃重建
- 为保持 PokeFinder `.ivcache` 桶与读取端一致，浏览器和 Wasm 执行要求 `Initial Advances = 0`，`Max Advances <= 20`
- 输入边界、相对桶限制、文件格式和固定夹具见 [Gen 5 IV Cache Finder](docs/modules/gen5ivcache.md)

当前 Gen V SHA1 Cache Finder 工作区包含：

- 复用第五世代 Profile 和 `.ivcache`，扫描 Timer0、日期、全部 2144 个有效按键组合与每天 86400 秒
- 独立 `gen5sha1cache` Wasm/Worker Pool、API v1、最多四个 Worker、进度、取消和 PokeFinder 兼容 `.sha1cache` 导出
- 输入边界、BW/BW2 IV 桶选择、SHA-1 缓存格式和固定夹具见 [Gen 5 SHA1 Cache Finder](docs/modules/gen5sha1cache.md)

当前 Gen V Dream Radar 工作区包含：

- Black 2 / White 2 的 Generator 与 Searcher、最多六个连续 Slot、徽章等级、Memory Link、个体值、性格和觉醒力量筛选
- Dream Radar 固定模板、BWRNG/MT、SHA-1、按键组合、初始推进、PID 与结果派生值均在独立 Worker 的 C++/Wasm 中计算
- 独立 `gen5dreamradar` Wasm/Worker Pool、API v1、100,000 行结果上限、250,000,000 次状态评估上限、进度、取消和虚拟结果表
- 输入边界、固定模板性别消耗、Generator/Searcher 列布局和四组 40 帧上游对照见 [Gen 5 Dream Radar](docs/modules/gen5dreamradar.md)

当前 Gen V Static 工作区包含：

- Black、White、Black 2 与 White 2 的 Generator/Searcher，以及御三家、化石、礼物、定点、传说、配信、游走、Curtis 与 Yancy 九类模板
- 普通定点、野生定点、赠送蛋与游走宝可梦的独立 BWRNG/MT 路径，并支持 IV Cache 与 SHA1 Cache 快速检索
- 独立 `gen5static` Wasm/Worker Pool、API v1、进度、取消、确定性分片归并、100,000 行结果上限和虚拟结果表
- 输入边界、上游模板来源、缓存兼容、Curtis/Yancy 行为与固定夹具见 [Gen 5 Static](docs/modules/gen5static.md)

当前 Gen V Wild 工作区包含：

- Black、White、Black 2 与 White 2 的 Generator/Searcher，以及草丛、深色草丛、摇动草丛、冲浪、水纹冲浪、钓鱼与水纹钓鱼七类遭遇
- 季节、地点、宝可梦与遭遇槽位联动，支持 Synchronize、Cute Charm、Magnet Pull、Static、Pressure、Hustle、Vital Spirit、Suction Cups、Sticky Hold、Compound Eyes 和 BW2 Lucky Power
- 独立 `gen5wild` Wasm/Worker Pool、API v1、raw/IV Cache/IV+SHA Cache 三条检索路径、250,000,000 次状态评估上限、100,000 行结果上限和虚拟结果表
- 输入边界、遭遇数据、BW/BW2 算法差异、缓存兼容、结果列和固定夹具见 [Gen 5 Wild](docs/modules/gen5wild.md)

当前 Gen V Hidden Grotto 工作区包含：

- Black 2 / White 2 的 Grotto Slot Generator/Searcher 与 Pokemon Generator/Searcher 四条工作流
- 20 个隐藏洞穴地点、4 组 11 类 Slot、Grotto Power、指定 Group/Pokemon/Gender、Synchronize 与 Shiny Charm 分支
- 独立 `gen5hiddengrotto` Wasm/Worker Pool、API v1、四能力握手、raw/IV Cache/IV+SHA Cache 检索、250,000,000 次状态评估和 100,000 行结果上限
- 输入边界、遭遇数据、Slot/Pokemon 算法、缓存兼容、结果列和固定夹具见 [Gen 5 Hidden Grotto](docs/modules/gen5hiddengrotto.md)

当前 Gen V Eggs 工作区包含：

- Black、White、Black 2 与 White 2 的 Generator/Searcher、双亲 IV/特性/性别/道具/性格、异国孵化与隐藏特性遗传规则
- 允许的第五世代蛋种、特殊物种派生、完整筛选、遗传来源、能力值切换、CSV、虚拟结果表与可拖动 Advance Finder
- 独立 `gen5egg` Wasm/Worker Pool、API v1、确定性分片、进度、取消、250,000,000 次状态评估上限和 100,000 行结果上限
- 输入边界、双亲规范化、BW/BW2 算法差异、结果列和固定夹具见 [Gen 5 Eggs](docs/modules/gen5egg.md)

当前 Gen V Event 工作区包含：

- Black、White、Black 2 与 White 2 的 Generator/Searcher，以及 204 字节 `.pgf` 配信卡导入
- 配信 TID/SID、物种、固定或随机性格/性别/特性/异色/个体值、等级、蛋标记和完整筛选
- 独立 `gen5event` Wasm/Worker Pool、API v1、确定性分片、进度、取消、虚拟结果表与可拖动 Advance Finder
- 输入边界、PGF 字段、算法顺序、结果列和固定夹具见 [Gen 5 Event](docs/modules/gen5event.md)

当前 Researcher 工作区包含：

- LCRNG、XDRNG、ARNG、MT、BWRNG、SFMT、Xoroshiro、TinyMT 与 Xorshift 共 14 种 RNG
- 10 个有序 Custom 表达式、当前/上一行 PRNG 与 Custom 引用、十六进制显示和结果内 Search/Next
- 独立 `researcher` Wasm/Dedicated Worker、API v1、10,000 行分批、250,000 行浏览器上限和确定性 UI 预览
- 输入边界、表达式语义、固定宽度 ABI 与上游来源见 [Researcher](docs/modules/researcher.md)

当前 Gen IV Wondercard IVs 工作区包含：

- Diamond、Pearl、Platinum、HeartGold、SoulSilver 的配信 IV Generator/Searcher
- Seed、推进范围、Offset、Delay、六项 IV、觉醒属性、物种、等级和性格输入
- 独立 `gen4event` Wasm/Worker Pool、固定宽度结果、排序、虚拟表、进度和取消
- Generator 保留上游仅按 IV 筛选的行为；Searcher 按 IV 组合恢复 Seed 并校验 Delay/Hour
- 算法、输入边界和固定夹具见 [Gen 4 Wondercard IVs](docs/modules/gen4event.md)；完整 Wasm 与部署页面验收待完成

当前 Gen IV Chained Shiny to SID 工作区包含：

- DPPt 连锁异色观测的物种、特性、性别、性格、TID 和六项能力值输入
- 多条观测连续收窄 8192 个 SID 候选，唯一结果与可能结果状态、清空和取消
- 独立 `gen4chainedsid` Wasm/Worker、API v1、固定夹具和三语导航
- 算法、输入边界和固定夹具见 [Gen 4 Chained Shiny to SID](docs/modules/gen4chainedsid.md)；原生 parity 夹具已通过，完整 Wasm 与部署页面验收待完成

当前 Static 工作区包含：

- PokeFinder 第三世代掌机 Static 的 67 条模板，按 8 类组织并随当前存档版本过滤
- Method 1、Method 4 与 Latios/Latias 游走 IV 缺陷
- Seed、Initial Advances、Max Advances、Offset、TID、SID
- IV、性格多选、觉醒力量多选、特性、性别和异色筛选
- Static Searcher 的 IV 组合枚举与反向 Seed 恢复
- 觉醒属性、觉醒威力、能力值显示、取消筛选和 IV 组合键快捷设置
- 独立 Generator/Searcher Worker Pool、进度、取消、虚拟化结果表、排序和 CSV

当前 Wild 模块包含：

- Ruby、Sapphire、Emerald、FireRed 与 LeafGreen 的陆地、冲浪、碎岩和三种鱼竿遭遇表
- 地点按 PokeFinder 上游中英资源显示；上游无精确细分地点时保留 EncounterTableGenerator 英文原名，日文资源当前同样保留上游英文
- Method 1、Method 2、Method 4，以及 Emerald 的同步、迷人身躯、等级修正和槽位修正队首规则
- RSE 碎岩遭遇率修正、Route 119 丑丑鱼钓点和 Safari Zone 额外 RNG 推进
- 当前全局掌机存档的版本、TID、SID 联动，以及性格多选筛选
- Shiny、Gender、Ability、Nature、Hidden Power、Encounter Slot、Level 和六项 IV 范围筛选；支持“取消筛选”
- Pokémon 联动的槽位/等级范围、IV 快捷键、能力值显示和 16 列结果表
- 独立 `gen3wild` Wasm、Worker Pool、进度、取消、虚拟化结果表、排序和 CSV
- Searcher 按六项 IV 笛卡尔积反向恢复候选 Seed，复用 Wild 特殊规则与完整筛选，并以独立 Worker Pool 分片执行
- PokeFinder Route 111 固定夹具；当前本机尚未编译运行，等待 Actions 验证

当前三代存档信息基础包含：

- 新建、编辑、复制、删除和选择
- IndexedDB 主存储与 localStorage 镜像兜底
- JSON 导入、导出与同时清除两处缓存
- 全局右下角小型悬浮窗、默认收起、折叠状态记忆和当前存档摘要
- 悬浮窗展开后点击页面其他区域不会自动收起，避免误触中断存档信息管理。

全局个体值计算器对齐 PokeFinder `IVCalculator`、`IVChecker` 与 `Nature`，支持 Gen III、Platinum、HGSS、BW2、SwSh 和 BDSP 六个数据集，以及物种、形态、性格、个性、觉醒力量、多行能力值交集和下一级提示。该轻量确定性工具使用 TypeScript；大范围 RNG 计算仍只在 C++/Wasm Worker 中执行。

应用左侧模块导航使用默认收起的覆盖式抽屉，避免在桌面和移动视口持续占用计算工作区宽度。

后续开发计划包含：

- 补齐 PokeFinder Gen VIII 剩余模块
- 补齐 3DSRNGTool Gen VI、Gen VII 与公共工具，`NTR Helper` 除外
- PWA 安装与首次加载后的离线使用加固
- 浏览器矩阵、性能基线和可访问性补充

第四世代当前实现 `gen4id`、`gen4seedtotime`、`gen4static`、`gen4wild`、`gen4egg`、`gen4advance`、`gen4event` 与 `gen4chainedsid`；第五世代当前实现 `gen5profiles`、`gen5id`、`gen5adjacentseeds`、`gen5ivcache`、`gen5sha1cache`、`gen5dreamradar`、`gen5static`、`gen5wild`、`gen5hiddengrotto`、`gen5egg` 与 `gen5event`。其他尚未实现的世代算法继续使用独立 Wasm 模块和验收记录，不把算法并入现有模块。

## 纯静态与隐私

PokeRNGKit 必须能够部署到 GitHub Pages、Cloudflare Pages 或任意等价静态文件托管服务：

- 不设置应用后端、账号系统或云端数据库。
- RNG 计算由浏览器内 Web Worker 中的 WebAssembly 完成。
- 档案保存在 IndexedDB，语言和轻量界面偏好保存在 `localStorage`。
- 不引入遥测、行为分析、广告、第三方字体或运行时 CDN 依赖。
- 初次访问和版本更新需要下载静态资源；成功缓存后，核心功能可离线使用。
- 清除站点数据会删除本地档案和设置，项目无法从服务器恢复这些数据。

在普通静态托管上运行是硬约束。基线实现不依赖 `SharedArrayBuffer`、Wasm threads、COOP/COEP 响应头或跨源隔离。

## 架构概览

```text
React UI
  |-- local UI state (React)
  |-- profiles (IndexedDB + localStorage mirror)
  |-- settings (localStorage)
  `-- typed messages
        `-- Web Worker
              `-- Worker Pool
                    |-- Emscripten gen3id module
                    |-- Emscripten gen3initialseed module
                    |-- Emscripten gen3seedtotime module
                    |-- Emscripten gen3ngcseed module
                    |-- Emscripten gen3gamecube module
                    |-- Emscripten gen3pidtoiv module
                    |-- Emscripten gen3pokespot module
                    |-- Emscripten gen3jirachi module
                    |-- Emscripten gen3static module
                    |-- Emscripten gen3wild module
                    |-- Emscripten gen3ivtopid module
                    |-- Emscripten gen3egg module
                    |-- Emscripten gen4static module
                    |-- Emscripten gen4wild module
                    |-- Emscripten gen4egg module
                    |-- Emscripten gen4event module
                    |-- Emscripten gen4chainedsid module
                    |-- Emscripten gen4advance module
                    |-- Emscripten gen5profiles module
                    |-- Emscripten gen5id module
                    |-- Emscripten gen5adjacentseeds module
                    |-- Emscripten gen5ivcache module
                    |-- Emscripten gen5dreamradar module
                    |-- Emscripten gen7id module
                    |-- Emscripten gen8id module
                    |-- Emscripten gen8egg module
                    |-- Emscripten pokerusfinder module
                    `-- Emscripten researcher module
                          `-- upstream C++ rules + thin adapters
```

Wasm 模块只在 Worker 内实例化。搜索被拆成可让出事件循环的工作分片，Worker 以批次传输结果并在分片之间处理取消消息，因此不需要共享内存。界面层不直接依赖 C++ 类、Qt 类型或上游文件型 `ProfileLoader`。

更完整的目录规划、Wasm 边界和 Worker 协议见 [docs/tech-stack.md](docs/tech-stack.md)。

## 开发入口

工程入口统一由 npm 提供。先安装 `.node-version` 指定的 Node.js，并让 npm 与 `packageManager` 字段一致。

### 本地 UI 验收

不安装 Emscripten 也可以启动界面预览：

```bash
npm ci
npm run dev:ui
```

打开 <http://127.0.0.1:5173/>。

需要先构建静态文件再预览时使用：

```bash
npm run preview:ui
```

打开 <http://127.0.0.1:4173/>。

UI 预览模式使用确定性样例数据，可以验收 ID Generator/Searcher、Initial Seed Finder、Static Generator/Searcher、Wild Generator/Searcher、存档信息、输入、筛选、进度、取消、结果表、排序、CSV、三语和响应式布局。页面会持续显示“UI 预览”提示；该模式不加载 Wasm、不注册 PWA Service Worker，不能用于验证 RNG 结果、Worker 性能、大范围计算速度或离线能力。

本地验收服务器固定绑定 `127.0.0.1`，只允许当前电脑访问。如果 Windows 首次运行 Node.js 时弹出防火墙网络放行或管理员密码提示，可以直接取消/不允许；不需要为本地验收创建公网或局域网放行规则。

### 本地完整功能

完整 Wasm 构建需要通过[官方 emsdk](https://emscripten.org/docs/getting_started/downloads.html)激活 Emscripten。CMake 与 Ninja 已由 npm 精确锁定并跨平台安装。`wasm:test:native` 另需本机 C++ 编译器，Windows 可使用 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，GitHub Actions 的 Ubuntu runner 已提供系统编译器。

```bash
npm install --global npm@12.0.2
npm ci
npm run wasm:doctor
npm run dev
npm run dev:ui
npm run dev:web
npm run build
npm run build:ui
npm run build:web
npm run preview:ui
npm test
npm run lint
npm run format:files -- <file...>
npm run format:changed
npm run format:check
npm run wasm:build
npm run wasm:test:native
npm run verify
```

已确认的工具链基线：

- Node.js 24.19.0 LTS
- npm 12.0.2
- Emscripten 6.0.6（通过 emsdk 精确锁定）
- CMake runtime 4.3.1（npm 精确锁定）
- Ninja runtime 1.13.2（npm 精确锁定）

前端依赖的兼容范围与精确锁定规则记录在 [docs/tech-stack.md](docs/tech-stack.md#4-当前版本与锁定策略)。

## 构建与测试

`npm run build` 先生成 release 模式的 `gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3ngcseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3pidtoiv`、`gen3egg`、`gen3gamecube`、`gen3pokespot`、`gen3jirachi`、`gen4id`、`gen4seedtotime`、`gen4static`、`gen4wild`、`gen4egg`、`gen4event`、`gen4chainedsid`、`gen4advance`、`gen5profiles`、`gen5id`、`gen5adjacentseeds`、`gen5ivcache`、`gen5sha1cache`、`gen5dreamradar`、`gen5static`、`gen5wild`、`gen5hiddengrotto`、`gen5egg`、`gen5event`、`gen7stationary`、`gen7wild`、`gen7sos`、`gen7egg`、`gen7battletree`、`gen7event`、`gen7id`、`gen8id`、`gen8egg`、`pokerusfinder` 与 `researcher` MJS/Wasm 产物，再由 Vite 将带内容哈希的 JS、CSS、Worker、PWA 和 Wasm 资源输出到 `dist/`。这些目录都是生成物，不提交到 Git。

测试规划分为五层：

1. C++/Wasm 与 PokeFinder 上游夹具的算法一致性测试。
2. TypeScript 领域逻辑、消息协议、数据迁移和 CSV 的单元测试。
3. React 组件与用户交互测试（后续补充）。
4. Worker + 真实 Wasm + IndexedDB 的浏览器集成测试（后续补充）。
5. Playwright 覆盖核心流程、静态子路径部署和离线重载（Pages 预览稳定后引入）。

当前验证门槛要求四十一个 Wasm 模块的固定输入结果对齐已记录夹具、长范围计算可汇报进度并响应取消、GitHub Pages 能加载对应 Worker/Wasm 模块，且离线重载可用。本轮由 Codex 按模块完成本地工程验证、独立提交并推送；算法回归仅能在 Actions 部署完成、项目所有者给出生产 URL 并授权后执行，项目所有者保留界面、设备和正式发布的最终验收。

## 部署

CI/CD 使用 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)：

1. 在固定 Node、npm 与 Emscripten 版本下安装依赖；CMake/Ninja 由 `npm ci` 安装。
2. 执行格式检查、lint、类型检查、TypeScript 单元测试、原生 Core 一致性测试和生产构建。
3. 上传同一份 `dist/`，由独立 job 部署到 GitHub Pages。
4. 配置 Cloudflare Secrets 与项目变量后，可将同一份 `dist/` 部署到 Cloudflare Pages；后续绑定 `hakuhiro.top` 下的正式域名。

当前首要目标是 GitHub Pages 测试部署。Codex 按本轮授权逐模块提交并推送 `main` 后，Actions 会尝试启用 Pages、构建 Wasm 和站点，并部署到预计地址 <https://haku76.github.io/PokeRNGKit/>。如果仓库策略阻止自动启用，在 GitHub `Settings -> Pages -> Build and deployment` 中将 Source 设为 `GitHub Actions`，再重新运行工作流。

生产构建使用相对资源路径，以同时支持 `/PokeRNGKit/` 测试路径和 Cloudflare 自定义域名根路径。Cloudflare 正式部署将使用 `hakuhiro.top` 下的地址；具体主机名确定前不硬编码 URL。`dist/legal/` 会包含 GPL 文本和上游记录，页面页脚同时提供源码入口。

### 构建职责

正式发布采用全自动构建：Git 仓库只保存源码、lockfile 和构建脚本，GitHub Actions 在固定工具链中生成 Wasm 与 `dist/`。不提交本地生成的 `public/wasm/`、`wasm/build/` 或 `dist/`，避免二进制与源码不同步、不同机器优化参数不一致，以及无法确认部署产物来源。

本地编译保留为开发和应急能力。如果 Actions 暂时不可用，可在符合锁定版本的 Windows PowerShell 环境中运行：

```powershell
npm run verify:full
$env:BASE_PATH = "./"
npm run build:web
```

随后把完整 `dist/` 作为一个整体交给静态托管；不要只上传本地 `.wasm` 并与另一轮 Web 构建混用。GitHub Pages 当前仍以 Actions artifact 为唯一正式入口，CI 问题优先修复工作流，不切换到提交 `gh-pages` 分支或跟踪生成物。

## 路线图

- **阶段 0：仓库基线** - README、需求、技术栈、忽略规则与许可证策略（已完成）。
- **阶段 1：第三世代 ID Generator/Searcher** - `gen3id` API v2、独立 Worker、三语界面、红蓝宝石 ID 反查和一致性夹具（已实现，待 Actions、部署回归与最终验收）。
- **阶段 2A：第三世代 Static Generator** - `gen3static`、Method 1/4、游走缺陷、筛选和结果工作区（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 2B：Static Searcher** - 反向 IV 恢复、搜索边界、独立 Worker Pool 和结果工作区（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 2C：`gen3seedtotime`** - 第三世代 Seed 到日期时间、32 位回推、独立 Wasm/Worker、固定夹具和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 2D：`gen3spindapainter`** - PID 与晃晃斑斑点双向映射、原始图像资源、拖动与键盘交互、输入边界和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 2E：`gen3ngcseed` GameCube Seed Finder** - XD、竞技场、频道、Precalc、本地 Worker Pool 和算法文档（已实现，待工程检查、Actions、部署回归与最终验收）。
- **阶段 3：三代存档信息** - IndexedDB、localStorage 兜底、导入导出、清除和悬浮窗（已进入 Git 基线，待项目所有者验收）。
- **阶段 4A：Wild Generator** - 遭遇数据、独立 `gen3wild` Wasm/Worker、特殊地点规则、完整筛选和固定夹具（已实现，待 Actions、部署回归与最终验收）。
- **阶段 4B：Wild Searcher** - IV 反向检索、完整筛选和独立 Worker Pool（已实现，待 Actions、部署回归与最终验收）。
- **阶段 5：`gen3ivtopid` IVs to PID** - 六项 IV 反推第三世代 PID、独立 Wasm/Worker、上游方法和算法文档（已实现，待 Actions、部署回归与最终验收）。
- **阶段 6：`gen3egg` Egg Generator** - 第三世代 Emerald 与 RS/FRLG 孵化生成、亲代遗传、筛选、结果表、独立 Wasm/Worker 和算法文档（已进入 Git 基线，待部署回归与最终验收）。
- **阶段 6A：`gen3gamecube` GameCube RNG** - XD/Colosseum/Channel Generator/Searcher、69/1/77 条模板、独立 Wasm/Worker Pool 和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 6B：`gen3pidtoiv`、`gen3pokespot`、`gen3jirachi`** - 第三世代 PID to IVs、XD PokeSpot、Channel Jirachi Advancer、独立 Wasm/Worker 和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 7：`gen4static` Static Generator/Searcher** - 第四世代 Method 1/J/K、独立 G4 存档、全局个体值计算器、Wasm/Worker 和算法文档（当前合并工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 7B：`gen4wild` Wild Generator/Searcher** - 第四世代野生遭遇、特殊地点数据、独立 Wasm/Worker 和算法文档（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 7C：`gen4id` ID Generator/Searcher** - 第四世代日期时间与 Delay 枚举、ID 精确筛选、独立 Wasm/Worker 和算法文档（已实现并通过原生夹具与工程检查，待完整 Wasm、Actions、部署回归与最终验收）。
- **阶段 7D：`gen4egg` Egg Generator/Searcher** - DPPt/HGSS 孵化、异国孵化、双亲遗传、Searcher、独立 Wasm/Worker Pool 和算法文档（当前工作区，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7E：`gen4advance` Advance Finder** - Calls/Chatot/Needles 连续观测匹配、独立 Wasm/Worker、Jump to Advance 和算法文档（当前工作区，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7F：`gen5profiles` Profile Manager / Calibrator** - 第五世代存档 CRUD、独立持久化、三种参数校准、Wasm/Worker 和算法文档（当前工作区，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7G：`researcher` Researcher** - 14 种通用 RNG、10 个 Custom 表达式、结果检索、独立 Wasm/Worker 和算法文档（当前工作区，待完整工程检查、生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7H：`gen5id` Gen 5 TID/SID** - 第五世代 Search By、Seed Finder、SHA-1、初始 ID 推进、独立 Wasm/Worker Pool 和算法文档（当前工作区，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7I：`gen5adjacentseeds` Adjacent Seeds** - 第五世代相邻种子、Chatot / Needle 预览、独立 Wasm/Worker Pool 和算法文档（当前工作区，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7J：`gen5ivcache` IV Cache Finder** - 第五世代 MT Seed 全空间缓存筛选、`.ivcache` 导出、独立 Wasm/Worker Pool、相对桶边界和算法文档（当前工作区，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7K：`gen5sha1cache` SHA1 Cache Finder** - 第五世代 Profile/IV Cache 全日期 SHA-1 扫描、`.sha1cache` 导出、独立 Wasm/Worker Pool 和算法文档（当前工作区，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7L：`gen5dreamradar` Dream Radar** - 第五世代 Dream Radar Generator/Searcher、六个连续 Slot、SHA-1、BWRNG/MT、独立 Wasm/Worker Pool 和算法文档（当前工作区，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7M：`gen5static` Gen 5 Static** - 第五世代定点 Generator/Searcher、九类模板、IV/SHA Cache 路径、独立 Wasm/Worker Pool 和算法文档（已进入主分支，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7N：`gen5wild` Gen 5 Wild** - 第五世代七类野生遭遇、队首修正、Lucky Power、IV/SHA Cache 路径、独立 Wasm/Worker Pool 和算法文档（当前工作区已完成工程检查，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7O：`gen5egg` Gen 5 Eggs** - 第五世代孵化 Generator/Searcher、双亲遗传、异国孵化、Advance Finder、独立 Wasm/Worker Pool 和算法文档（已进入主分支，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7P：`gen5event` Gen 5 Event** - 第五世代配信 Generator/Searcher、PGF 导入、Advance Finder、独立 Wasm/Worker Pool 和算法文档（已进入主分支，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 7Q：`gen5hiddengrotto` Hidden Grotto** - 第五世代隐藏洞穴 Slot/Pokemon Generator/Searcher、Grotto Power、IV/SHA Cache 路径、独立 Wasm/Worker Pool 和算法文档（当前工作区已完成工程检查，待生产 Wasm、Actions、部署回归与最终验收）。
- **阶段 8：`gen7stationary`、`gen7wild`、`gen7sos`、`gen7egg`、`gen7battletree`、`gen7event`、`gen7id` 与 `pokerusfinder`** - 第七世代 Stationary / Wild / SOS / Egg / Battle Tree / Event / ID Generator，以及 DevonStudios 第三/四世代宝可病毒帧查询；Event 已完成实现，待完整工程检查、Actions、部署回归与最终验收。
- **阶段 8A：`gen8profiles` Profile Manager** - 第八世代 Sword/Shield/BDSP 档案 CRUD、拖动排序、独立 IndexedDB/localStorage、JSON 备份、响应式表格和上游输入文档（当前工作区，待工程检查、部署回归与最终验收）。
- **阶段 8B：`gen8id` Gen 8 TID/SID** - 第八世代 Xorshift ID Generator、六种筛选、独立 Wasm/Worker、虚拟结果表和上游固定夹具（当前工作区，待工程检查、Actions、部署回归与最终验收）。
- **阶段 8C：`gen8egg` Gen 8 Eggs** - BDSP 双亲、遗传、异国孵化、护符、独立 Wasm/Worker 与上游夹具（已实现，待工程检查、Actions、部署回归与最终验收）。
- **阶段 8D：`gen8event` Gen 8 Event** - 第八世代配信 Generator/Searcher。
- **阶段 8E：`gen8raids` Gen 8 Raids** - Sword/Shield 巢穴与事件团体战。
- **阶段 8F：`gen8static` Gen 8 Static** - Sword/Shield 与 BDSP 定点 Generator/Searcher。
- **阶段 8G：`gen8underground` Underground** - BDSP 地下大洞窟遇敌。
- **阶段 8H：`gen8wild` Gen 8 Wild** - Sword/Shield 与 BDSP 野生 Generator/Searcher。
- **阶段 8I：`gen8denmap` Den Map** - 第八世代巢穴地图工具。
- **阶段 9：3DSRNGTool** - Gen VII Event 已实现，下一模块为 Main RNG Tool，再继续 Egg Seed Finder、Festival Plaza Facility RNG、Profile Manager、Gen VI、其他公共工具与其余库存；仅 `NTR Helper` 不开发。
- **阶段 10：发布加固与验收** - 完整工程检查、Actions 部署、PWA 离线、可访问性、浏览器矩阵、性能预算、许可证和生产页面回归。

## 许可证、署名与源码分发

PokeFinder 源码头声明可按 **GNU GPL v3 或更高版本**使用。PokeRNGKit 作为包含其衍生和链接代码的整体，以 `GPL-3.0-or-later` 发布。公开部署与发布必须持续满足以下事项：

- 在仓库中保留完整 GPL 许可证文本、原作者版权声明和上游署名。
- 记录采用的上游版本、提交或归档校验和，以及 PokeRNGKit 的修改清单。
- 发布 `.wasm` 和部署站点时，同步提供构建该二进制所对应的完整源代码、构建脚本与安装说明。
- 不以仅提供上游链接替代 PokeRNGKit 自身修改源码的分发义务。
- 审核所有第三方数据、图标、字体和素材的独立许可证，未经许可不复制游戏素材。

本节是工程约束，不构成法律意见。首次公开发布前应完成一次 GPL 与素材来源审查。

## 免责声明

PokeRNGKit 是非官方、由社区开发的研究工具，与 Nintendo、Creatures Inc.、GAME FREAK inc.、The Pokemon Company 或其关联方没有隶属、授权或背书关系。

Pokemon、宝可梦及相关名称、角色和素材是其各自权利人的商标或版权作品。项目名称中的相关指代仅用于说明工具用途。除非取得明确许可，本项目不分发官方美术、精灵图、音频、Logo 或其他受保护素材。
