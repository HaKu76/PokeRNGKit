# PKHeX 完整接入清单

2026-09-26 所有者要求完整接入。基线为所有者提供的 PKHeX 26.08.26 源码，
不以 Core 已编译或单项功能完成代替完整接入。目标保持纯静态、本地处理和三语界面。

## 完成门槛

每项记录上游依据、实际界面、读取/编辑/导出能力、输入限制及验证证据。
上游世代特有窗口必须逐项核对；不支持的格式明确禁用，不静默改写。
所有编辑进入工作副本，提供撤销/还原；导出重算校验并重新读取验证。

## 实施顺序

| 阶段         | 内容                                                                   | 当前状态                                                                                         |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 可视化仓储   | 队伍、真实盒子格位、名称、壁纸、宝可梦图像、选择与详情                 | 已实现；X 合成样本壁纸／图像／格位已在 Chrome 检查，其他格式与实档待核验                         |
| 宝可梦编辑   | 基础身份、属性/能力值、招式、初训家/相遇、蛋、缎带、记忆、世代特有字段 | 常用字段、独立基础／进阶及蛋操作已接入；其余格式与专属功能仍待完成，浏览器待核验                 |
| 仓储操作     | 导入/导出单只、移动/交换/复制/删除、箱名/壁纸、批量编辑、撤销          | 单只、整理、布局、批量菜单、属性批量、ZIP 与文件导入预览已接入；精确整箱替换已接入，浏览器待核验 |
| 合法性工具   | 分析报告、遇敌来源、数据转换、实体/礼物数据库                          | 单只报告已实现，浏览器待检查                                                                     |
| 通用存档     | 完整训练家、背包、图鉴、神秘礼物、事件标记/常量                        | 训练家分项、背包、图鉴及 Gen2–7／Let’s Go／BDSP 事件已接入；礼物、其他事件布局与专属字段待完成   |
| 世代专属     | 以下每个上游子窗口对应功能及特殊槽位                                   | 待逐项实现                                                                                       |
| 本地文件流程 | 存档识别、备份副本、单体/批量文件和目录导入导出                        | 存档副本、单只文件及文件批量 Worker／三语选择预览／ZIP 已接入，浏览器待核验                      |
| 平台差异     | WinForms 外壳、桌面插件、任意本机文件监控与原始设备访问                | 评估浏览器等效路径；无后端                                                                       |

## 当前工程证据

API 80 接入 Gen3–7 事件标记／数值的完整数组、具名分类与预设、按编号编辑、草稿差异及双文件研究比较。
12 布局三语目录、每个编号、全文件 Core 输出、原子拒绝、QR 联动及比较方向专项通过；浏览器与真实存档待核验。
API 81 接入 Gen2 的 2000 个标记与 256 个 byte 数值，目录提供独立编辑权限和 0–255 上限。
五种布局、八组文件长度及原有 Gen3–7 专项通过；双文件比较、撤销和原件保持接通，浏览器与真实存档待核验。
API 82 接入 Let’s Go 的 4096 个标记与 1000 个有符号数值，保留全部分组及 72 个未分类槽位。
具名资源、预设、草稿、撤销和 Core 双文件比较已接通；正负边界、原始字节／完整文件与称号保留专项通过，浏览器与真实存档待核验。
API 83 接入 BDSP 两版本四修订版的普通标记、独立系统标记及 Int32 数值，沿用具名预设、草稿与三语工作区。
Core 比较、撤销、完整数组回读及精确修订版导出已接通；原始字节与八布局专项通过，浏览器及真实存档待核验。
API 84 接入 Gen1 定点与赠送事件重置，提供三语搜索、多选、应用与撤销；RB 18 项、Yellow 21 项均沿用 Core 的关联标记。
国际版／日文版四布局的全部项目、双标记组合、原始位与完整文件对照、无效请求及导出专项通过，浏览器与真实存档待核验。
其余事件窗口仍按各自清单推进。

独立宝可梦文件内核已分离 SaveFile 依赖；14 种第三至第九世代实体类型的基础编辑和四种存储／加密表示专项通过。
API 66 增加独立读取／编辑／导出与 Worker 客户端；第一／二世代后续通过 API 71 专用列表读写接入。
悬浮存档工具已增加独立文件三语工作区、原件下载、撤销和四种导出组合。完整检查状态见进度。
API 67 接入独立实体合法性摘要与完整报告，以 PKM.PersonalInfo 和无指定格位上下文分析；副本变化会清除旧报告。
API 68 接入独立训练、日期、记忆、亲密度、训练家历史、缎带、回忆招式、闪光、原始值与形态计数编辑。
API 69 接入独立来源游戏／球种／相遇与蛋地点的目录、预览及编辑，使用实体格式自身范围。
API 70 接入独立蛋操作及明确的目标游戏／训练家上下文，复用三语表单和撤销；检查状态见进度。
API 71 接入第一／二世代单体列表的名称、种类、等级、训练家、四项 DV、五项能力经验与招式编辑；第二世代另提供亲密度与道具。
导出保留名称缓冲区与蛋标记，复用工作副本和撤销。
API 72 接入两代专用捕获字段、第一世代属性、第二世代宝可病毒与蛋操作，并提供按所选语言恢复种类名称。
命名语言随工作副本与撤销保留；捕获率建议恢复、原始队伍字段、其余格式、转换及浏览器核验仍待完成，不以公共字段接入代替全功能完成。

API 64 已接入箱子文件导入的来源展开、固定预览、分别确认、Worker 与三语界面，并复用工作副本撤销。
11 格式 × 27 组导入设置与 Core 读取同一输入文件的完整导出逐字节一致；完整原生、核心构建与裁剪属性检查通过。
界面提交前检查通过 205 文件／756 项测试；Chrome 普通刷新及新标签页仍加载旧资源，新版实际导入、撤销和窄屏核验未完成。
API 65 将整箱二进制导入导出接入会话、Worker 和三语入口，沿用 SaveFile.GetPCBinary／GetBoxBinary／SetPCBinary／SetBoxBinary 的原格位语义。
11 格式 × 27 组设置的当前／全部箱子及会话专项通过，完整检查与浏览器状态见进度。
开发中发现 G3PKM.Valid 不检查校验和，已给三个批量输入路径补充明确校验；PK3 损坏输入专项通过，完整验证状态见进度。

API 63 接入当前／全部箱子的 ZIP 导出及三语范围、目录、编号、空格选项。
按上游 BoxExport 输出解密队伍格式，自动区分重复名称并保持原存档；浏览器下载与真实文件待核验。

文件批量内部预览通过 11 格式定向检查，包含原格式 ZIP 对照、混合目录、部分失败和随机结果冻结。
明确扩展名的加密 PK4／PK5 先解密再识别，拒绝实际格式冲突，保留原件与相对目录；API 62 接入文件批量页签、Worker 与重复下载。
Chrome 已用工程样本核对 PK3 裁剪后完整属性目录、文件预览和 ZIP 落盘；目录选择与其他格式／真实文件仍待核验，不以单项检查标记完整接入。

通用属性批量编辑已核对顺序执行、部分失败、来源条件和名称解析，11 格式定向语义检查通过。
API 61 已接入预览／提交适配、队伍格位重排、Worker 生命周期及三语指令页签；浏览器裁剪后的实际属性目录与界面仍待核验。

API 60 已接入 BoxMenuStrip 的四类批量菜单、当前／全箱范围、反向／反选与三语操作。
API 59 已接入解锁箱数、原始标记和整箱交换；API 58 已接入 Z-A 图鉴编辑。
对应工程证据见模块文档与进度记录，浏览器和真实存档仍待核验。

Z-A 图鉴已核对三组形态位、十语言、头目／超级进化和四种显示性别，增加三种修订的合成分块检查。
三组专项、完整原生套件及完整 verify 通过，API 57 不变。
编辑入口已在 API 58 接入；越界种类映射与批量清除差异已处理，真实存档和浏览器待核验。

API 57 接入朱／紫原版及 DLC 图鉴编辑：状态、四组形态位、九语言、三地区显示和批量操作。
保留未改原值，修复缺失 DLC 块清除和形态所属地区差异；六组专项、原生套件、核心构建与完整 verify 通过，实档与浏览器待核验。

朱／紫图鉴已核对旧／新两种条目结构，增加两版本各三种修订的合成分块检查。
产品读写入口在 API 57 接入；未知块类型与历史块表仍为合成设置，不作为真实存档验收。

API 56 接入阿尔宙斯图鉴与 30 项高级研究计数，覆盖形态、体型、任务和汇报流程。
两种合成存档修订用于工程验证；真实存档端到端及浏览器验收待完成。

API 55 接入剑／盾三个地区图鉴的独立记录、形态／语言／显示／次数和批量菜单。
合成分块工程检查与产品功能分开记录；真实存档端到端及浏览器检查待完成。

剑／盾新增合成分块序列化夹具，覆盖两版本与三种图鉴块组合的加密、重读及无关字节保持。
未知块类型为测试设置，不视为真实游戏存档或产品入口验收；图鉴界面在 API 55 接入。

API 54 接入 BDSP 图鉴状态、性别、九语言、普通／闪光形态及全国开关，工程检查通过。

API 53 接入 Let’s Go 图鉴、体型及捕获／传送次数，工程检查通过，浏览器待核验。

API 52 接入 SM／USUM 图鉴，包含独立形态、九语言及单条目／全图鉴操作，工程检查通过。

API 51 接入 XY／ORAS 图鉴、旧世代来源、遇见／获得计数和 DexNav 批量设置，复用第五／六世代界面。
两种格式的完整输出对照通过；上游索引、性别表及末项范围差异已记录，浏览器待核验。

API 50 接入 SAV_Pokedex5 的黑白／黑白2图鉴、普通／闪光显示、形态、七语言、全国模式及图案值。
批量修饰选项显式呈现，两种布局原生保存对照通过，浏览器待核验。

API 49 接入 SAV_Pokedex4 的 DP/Pt/HGSS 图鉴、六语言、性别／形态顺序、解锁及批量操作。
三种布局的完整输出与独立 Core 保存对照通过，浏览器待核验。

API 48 接入 SAV_SimplePokedex 对应的第一至第三世代见过/捕获与四种批量操作。
三语名称、本地图像、工作副本/撤销/下载，按上游处理未知图腾字母、GBA 关联位图和 FRLG 特殊模式。
第一、二世代采用独立图鉴编辑能力，不开放其他未接入编辑器；后续世代专用图鉴继续推进，浏览器待核验。

API 47 接入 XY 训练家昵称及完整外观属性：男性 30 项、女性 34 项，三语名称、枚举和高级编号。
保留原始未改位模式/昵称尾部，支持性别变化后的草稿重置、撤销和导出回读；其他训练家字段仍待接入。

API 46 接入 SM/USUM、剑盾和 BDSP 游戏版本标记，第六世代保持上游禁用行为。
提供三语目录、草稿/撤销/回读；日月与究极日月不转换格式，标记与格式不匹配时暂停配置联动。
同步修复配置下拉框内部值和应用/撤销后的候选同步，其他训练家字段仍待接入，浏览器待核验。

API 45 接入 XY/ORAS、SM/USUM、剑盾和 BDSP 地图位置，包括旋转和剑盾缩放。
按格式处理 float 单位/关联位置、uint64 地图、BDSP 截断和未改异常字节。
五种工程存档与剑盾 Core 对象、原生套件、22 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告。
剑盾仍使用 Core 对象，真实存档往返和浏览器待核验。

API 44 增加第六/七世代最近保存、剑盾开始/最近保存及 BDSP 本地日期，统一精度和范围元数据。
保留分钟精度、BDSP 小数秒及未改异常数据，支持明确日期修复；剑盾仍缺实档往返证据。
最终原生套件、21 项前端测试、变更文件 lint、全量类型检查、核心与网页构建通过，保留既有构建警告。
浏览器待核验，不把日期功能视为完整训练家或整个 PKHeX 已完成。

API 43 增加第四至第七世代冒险开始/首次名人堂日期，按世代范围精确到秒，不转换时区。
支持草稿/撤销与完整原始日期回读，保留未修改异常值及第五世代高位；最近保存与剑盾/BDSP 日期在 API 44 接入。
九种存档日期检查、原生套件、17 项前端测试、变更文件 lint、核心与网页构建通过，保留既有构建警告。
浏览器待核验，完整清单继续推进。

API 42 增加 DS 训练家地图与坐标，三语折叠入口、位置草稿成组撤销、第四世代关联坐标同步及负 Z 保存结果提示。
未改位置及异常地图值保持，无法完整回读的地图修改拒绝；其他世代位置布局继续按清单实现。
五种 DS 存档边界/完整输出、负 Z 编码、关联坐标及异常值保持、原生套件、20 项前端测试、类型、变更文件 lint 与两阶段构建通过；浏览器待核验。

API 41 扩展第四/第五世代训练家国家和地区，使用各世代目录及默认地区资源；DS 隐藏不存在的主机区域。
国家零值按世代处理，原异常值未改时保持，修改时验证配对并沿用工作副本/撤销与导出回读。
五种 DS 存档的目录/配对、各国家首尾地区完整输出、异常值保持、原生套件、19 项前端测试、类型、变更文件 lint 与两阶段构建通过；浏览器待核验。

API 40 增加 GBA 训练家游戏设置：文字速度、战斗方式、声音和战斗动画，三语折叠入口与草稿/撤销联动。
只改实际变动字段，保留其他设置位；Core 对文字速度 4–7 的写入会截断，因此仅保留未改原值，拒绝新的不可回读请求。
三种 GBA 格式的组合与完整输出、异常值保持、原生套件、18 项前端测试、类型、变更文件 lint 与两阶段构建通过；浏览器待核验。

API 39 接入 TrainerStat 对应的游戏记录选择与编辑，支持动态上限、偏移详情、时间解释及工作副本/撤销。
五种存档的全部 200/30 项完整输出、边界与异常原值保持、原生套件、剑／盾 Core 对象、14 项前端测试通过。
最终类型、变更文件 lint、核心与网页构建通过，保留既有构建警告。
后续补齐记录三语名称，按上游字符串匹配并保留原名详情，未知含义明确标注；浏览器仍待核验。

API 38 接入训练家 BP、宝可里程、圆庆币和瓦特，按格式控制范围并联动对应累计记录。
七种存档完整输出、边界/未改异常值、累计记录及剑／盾 Core 对象、原生套件通过。
13 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告；浏览器仍待核验。
其他训练家字段、旧世代其他窗口的代币与完整 PKHeX 清单继续推进。

API 37 接入已开放格式的逐枚徽章编辑，普通格式 8 项、HGSS 16 项，支持训练家草稿、应用与撤销。
BDSP 仅重写实际改变的系统标记，未改异常值保持；不自动完成道馆事件或解锁地图。
九种存档逐枚设置/清除、完整输出、边界及原生套件、12 项前端测试与变更文件 lint 通过。
类型、核心与网页构建通过，保留既有构建警告，浏览器仍待核验；其他训练家进度与完整清单继续推进。

API 36 接入 XY、ORAS、SM、USUM 的训练家国家、地区和 3DS 区域，复用三语本地目录。
保留未改异常值，撤销时维持未应用国家/地区草稿的配对；其余格式不开放这组字段。
四种存档完整输出、目录/边界与异常值保持、原生套件、11 项前端测试、变更文件 lint 通过。
类型、核心与网页构建通过，保留既有构建警告，浏览器仍待核验；其他训练家字段及完整清单继续推进。

API 35 接入第六至第八世代已开放格式的训练家存档语言，按版本目录选择，与界面语言独立。
姓名未改保留原字节，改名使用目标语言编码；剑／盾沿用 Core 同步运行时语言。
五种存档全部语言与 Unicode 改名、旧格式拒绝、剑／盾 Core 对象及原生套件通过。
10 项前端测试、类型、变更文件 lint、核心及网页构建通过，保留既有构建警告；浏览器仍待核验。
其他训练家字段及更多格式仍待接入，不把语言选择视为完整训练家窗口完成。

API 34 接入训练家性别/时间和工作副本应用/撤销，保持未改姓名字节与异常时间原值。
11 种存档完整输出、剑／盾 Core 对象外观联动、原生套件、9 项前端测试、变更文件 lint、最终类型、核心与网页构建通过。
保留既有构建警告，浏览器待核验。
完整训练家语言、地区、徽章、地图及专有字段仍待接入，不把这些通用字段视为整个训练家窗口完成。

API 33 接入背包高级编辑（HaX）：完整版本目录、单格高级数量范围及 PC/自由空间批量入口。
普通模式和批量规则保持；高级写入额外核对请求值，拒绝截断/丢弃。
11 种存档及原生套件、BDSP 清空重排与空白项数量差异、7 项前端测试、类型、变更文件 lint、最终核心与网页构建通过。
保留既有构建警告；本地 Chrome 仍加载旧版，浏览器待核验。

API 32 接入背包列表及单格草稿的本地道具图片，包含 606 张未修改 PNG 与来源哈希。
按 Core 世代编号转换和 TM/TR 图像规则配图；空格无图，未知编号使用回退图。
编号映射、11 种存档图像序列化及原生套件、606 张图片哈希、7 项前端测试、类型、变更文件 lint、核心与网页构建通过。
保留既有构建警告，浏览器仍待核验。

API 31 接入口袋六种排序、统一数量、获得全部、清空和容量不足时的随机选择，沿用上游核心方法与输入限制。
单格/批量共用编码差异合入、工作副本及撤销流程；11 种存档排序/批量完整输出、随机容量/范围、输入边界、原生套件、648 前端测试与变更文件 lint 通过。
特殊道具独立数量上限、类型、核心与网页构建通过，保留既有构建警告；浏览器待核验。道具图片和 HaX 模式仍待接入。

API 30 接入单格道具种类、数量及支持标记编辑、清空草稿与撤销联动。
按口袋/道具限定输入，合入核心编码差异并核对完整背包；早期格式清空时前移后续格位。
11 种存档完整输出、标记往返、顺序/保留位、原生套件、648 前端测试、类型及变更文件 lint 通过。
最终核心与网页构建通过，保留既有构建警告，浏览器待核验；排序、批量操作与图片仍待接入。

API 29 接入背包读取、口袋/格位、三语名称、逐道具数量上限与实际接口标记，支持搜索、空格位和分页。
读取不清理异常值或写入文件；11 种存档读取、未知编号/超限值保持、原生套件、648 前端测试与变更文件 lint 通过。
类型、核心与网页构建通过，保留既有构建警告；浏览器待核验。编辑、排序、批量操作与图片待接入。

API 28 基础编辑修正隐式经验重置与治疗副作用，保留未修改的原训练家名称字节。
按实际计算能力值决定是否重算，并保留伤势、濒死及异常状态。
11 种存档受伤/濒死场景及原生套件通过，覆盖队伍/盒子、完整载荷、经验成长曲线、其他格位及原文件保持。
类型、变更文件 lint、5 项前端领域测试、核心与网页构建通过；保留既有构建警告，浏览器待核验。

API 27 新增 StatEditor 的极限特训六标记和 ContestStat 六项数值，按实体接口提供读取/编辑能力。
明确特攻/特防/速度映射，保留原始个体值、未使用标记位及健康状态；不将手动编辑等同于合法性建议。
华丽大赛 11 种存档、极限特训三种存档往返及 15 实体能力/边界检查通过。
原生套件、648 前端测试、类型、变更文件 lint 及两阶段构建通过，保留既有构建警告，浏览器待核验。

API 26 新增主编辑器的当前持有者切换与 MemoryAmie 的五组居住记录。
采用国家/地区三语目录、选择禁用与显式清空规则，不自动模拟交易或整理空位。
四种存档居住记录、五种存档持有者往返、完整载荷与数据保持检查通过。
原生套件、648 前端测试、类型、变更文件 lint 和两阶段构建通过，保留既有构建警告。
同时分离只读目录与编辑禁用条件，不放宽写入范围。
MemoryAmie 的持有者控件本身只读，已按实际来源修正功能归属；浏览器待核验。

API 25 新增双训练家亲密度/好感度及格式支持的饱食、愉悦、社交度。
使用桌面 0–255 编辑范围并保留未修改的较大社交度原值；只写入变更项，明确蛋周期语义。
五种存档字段往返及数据保持、原生套件、648 前端测试、类型、lint 及两阶段构建通过。
保留既有警告，浏览器新版待核验；居住记录与当前持有者切换仍待实现。

API 24 新增双训练家记忆目录、内容/参数/程度/感受编辑及本地化预览，采用上游世代规则。
工作副本修订号使摘要外面板的旧草稿失效。五种存档的双训练家记忆、边界及完整载荷保持通过；
原生套件、648 前端测试、类型、lint 和两阶段构建通过，保留既有警告。
记忆窗口的居住/好感等其他区域仍待接入，浏览器仍待新版页面核验。

API 23 新增缎带分析状态和核心建议/精简操作，对应上游的批量合法性辅助路径。
保留超级训练等关联字段，草稿未应用时禁用批量操作；11 格式核心一致性、类型、lint、648 前端测试与两阶段构建通过。
保留既有警告，浏览器待检查；完整清单继续推进。

缎带面板新增 161 张上游原图，包含华丽大赛等级与回忆图标阈值，全部本地加载。
3 项资源/映射检查、类型、lint、前端构建与格式检查通过。Chrome 刷新仍为旧入口；合法性辅助及浏览器检查仍待完成。

API 22 接入缎带/证章手动编辑、数量和佩戴项，按需三语目录及草稿批量填满/清空。
15 实体字段对照和 11 格式往返、类型、lint、645 前端测试及两阶段构建通过。
保留既有警告和测试清理提示，浏览器待检查。
窗口图标、合法性提示与建议仍未完成。

API 21 接入四槽回忆招式与核心建议预览；建议只填入草稿，应用后可撤销。
保留当前招式、PP 和健康状态，不自动宣称合法性；五种存档往返、建议与核心一致检查通过。
原生套件、类型、lint、645 前端测试和两阶段构建通过，保留既有警告，浏览器待检查。

API 20 新增 PID/SID 双路径异色操作，包含指定 XOR 与取消异色，保留旧世代身份约束。
未知图腾无解时有限返回并保留输入，错误和操作提示提供三语。
11 格式双路径往返、未知图腾有解/无解及 EC 同步、类型、lint、645 前端测试和构建通过。
保留既有警告，浏览器待检查，其他完整清单仍未完成。

API 19 新增转换为蛋及上游字段联动，保留已有蛋记录并检查全蛋队伍限制。
11 格式原训练家/交易场景往返、数据保持和队伍限制、类型、lint、645 前端测试及构建通过。
浏览器待检查；不宣称自动生成合法遭遇或完整接入。

API 18 接入孵化周期与核心孵化，修正有其他持有者时蛋周期的读写字段。
11 格式往返、周期边界、随机记忆范围与数据保持、类型、lint、645 前端测试及构建通过。
保留既有警告；转为蛋等其余功能和浏览器验证仍待完成。

API 17 新增来源游戏、球种和相遇/蛋地点编辑，按来源/格式调用核心三语目录，
支持转移来源及 BDSP 特殊无地点值。选项预览不改工作副本，应用保留无关字段。
11 格式目录与编辑往返、边界和数据保持检查、类型、lint、645 前端测试与两阶段构建通过。
重启预览后 Chrome 仍读旧版页面，新增功能浏览器待检查；蛋状态转换及遭遇建议/数据库仍待实现。

API 16 新增相遇等级、日期和命运相遇标记的独立编辑，按真实存储宽度与日期范围校验。
仅应用变更字段，保留无关日期字节及队伍健康状态。来源/地点目录和蛋状态转换仍待实现。
11 格式往返、实体边界、受伤队伍状态保持、类型、lint、645 前端测试及核心/前端构建通过。
保留既有警告，浏览器待检查。

API 4 已实现可视化仓储及昵称、等级、亲密度、初训家/ID、IV/EV、招式/PP 基础编辑，
支持工作副本撤销和副本导出。11 种原生夹具、641 项前端测试及构建通过；浏览器待刷新检查。
种类、形态、性格、特性、相遇、缎带/记忆以及仓储移动等仍未接入，不将宝可梦编辑阶段标为完成。

API 5 新增选中格位的合法性摘要和详细报告，使用上游中/英/日文本。
合法/非法 PK3 样本及 11 种存档队伍/盒子上下文的原生检查通过；核心和前端构建通过。
补齐 TSX 测试收集后 185 文件 / 644 测试通过；新界面浏览器检查尚未完成。
只完成单只报告接口，合法性工具阶段仍有遇敌来源、转换和数据库待接入。

API 6 新增盒子名称/壁纸编辑及本地预览，接入工作副本、撤销与副本导出。
11 种存档的空/最长名称、首尾壁纸、非法输入与宝可梦数据保持的原生检查通过。
核心构建、185 文件 / 644 测试、类型与 lint 通过，核心生成后的最终前端打包通过，浏览器待检查；
解锁箱数、BoxFlags 和箱子重排仍未完成。

API 10 补充四招式的 PP 提升次数与恢复 PP，11 种格式的 0–3 次提升往返和越界拒绝通过。
核心与最终前端构建、类型及 lint 通过；完整宝可梦字段仍未完成，浏览器待检查。

API 11 新增性格、特性槽位、携带物品及第八世代能力值性格编辑，按上游处理旧世代 PID 关联。
11 种格式属性往返、第五世代隐藏特性切回、其他格位与原文件保持检查通过。
核心及最终前端构建、类型、lint、185 文件 / 644 前端测试通过。
种类/形态/性别及其他特殊字段仍未完成，浏览器待检查。

API 12 接入种类、形态、性别与默认名称，目录联动特性，写入按等级更新经验曲线。
11 种格式身份及昵称往返、第三世代未知图腾、支持格式的洛托姆/超能妙喵检查通过。
类型、lint、核心与最终前端构建、185 文件 / 644 前端测试通过，浏览器待检查。
原始 PID/加密常量、特殊形态参数和相遇/蛋等仍待接入。

API 13 新增独立高级 PID/加密常量编辑与核心重新生成，保护队伍 HP/异常状态和其他格位。
11 种格式原始值往返及边界拒绝通过，核心及最终前端构建、类型、lint、
185 文件 / 645 前端测试通过，浏览器待检查。
特殊形态参数、相遇/蛋及异色快捷操作等仍未完成。

API 14 接入特殊形态参数的命名、普通计数与计时控件，区分第六世代队伍区与盒子存储字段。
第六/七世代适用存档往返通过，PK8 糖饰和计数仅完成实体字段检查。
核心及最终前端构建、类型、lint、185 文件 / 645 前端测试通过。
身份变化后的参数默认值联动、相遇/蛋和异色快捷操作仍待接入，浏览器待检查。

API 15 补齐身份变化后的特殊参数范围联动，按旧/新模式清零、限制或保留值，保护盒子存储计数。
适用第六/七世代往返及 PK8 实体层转换边界、类型、核心及最终前端构建、
185 文件 / 645 前端测试通过。
相遇/蛋、异色快捷操作及后续完整清单仍未完成，浏览器待检查。

## 上游子窗口盘点

API 7 已接入盒内移动到空位、交换、覆盖复制与删除，11 种格式逐格载荷/队伍/原文件保持及
US 锁定格位检查通过；基础宝可梦编辑补齐锁定拒绝。原生检查、核心构建、185 文件 / 644 前端测试、类型和 lint 通过；核心生成后的最终前端打包通过。
API 8 已补齐队伍调度与损坏实体清理；单只文件流程和批量操作仍未完成。
11 种格式的队伍顺序、完整载荷与盒子/原文件保持检查通过，PK6 损坏实体删除通过。
185 文件 / 644 测试、类型、lint、核心与最终前端构建通过；浏览器新版检查待完成。

API 9 已接入单只文件导入与解密导出，使用核心默认转换规则，不启用强制不兼容转换。
11 种格式往返、PK3 → PK4、逆世代及 PGT 冲突拒绝检查通过；185 文件 / 644 前端测试、
类型、lint、核心与最终前端构建通过。浏览器待检查，批量/目录/加密导出仍未完成。

下表是来源文件盘点，不等于每个文件都需独立面板；共 129 个非 Designer 子窗口源码。
功能可合并进编辑页，但必须保留各版本的数据语义。所有状态初始为待核对，不能推定完成。

| 上游文件（PKHeX.WinForms）                                                    | 状态                                                               |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Subforms/BoxExporter.cs`                                                     | 待核对                                                             |
| `Subforms/EntitySearchSetup.cs`                                               | 待核对                                                             |
| `Subforms/KChart.cs`                                                          | 待核对                                                             |
| `Subforms/Misc/EntitySummaryImage.cs`                                         | 待核对                                                             |
| `Subforms/Misc/PropertyComparer.cs`                                           | 待核对                                                             |
| `Subforms/Misc/SortableBindingList.cs`                                        | 待核对                                                             |
| `Subforms/PKM Editors/BatchEditor.cs`                                         | API 61：存档范围指令、预览与确认已接入；目录文件流程待接入         |
| `Subforms/PKM Editors/MemoryAmie.cs`                                          | 记忆、亲密度/好感、互动数值与居住记录已接入；浏览器待核验          |
| `Subforms/PKM Editors/MoveShopEditor.cs`                                      | 待核对                                                             |
| `Subforms/PKM Editors/PlusRecordEditor.cs`                                    | 待核对                                                             |
| `Subforms/PKM Editors/RibbonEditor.cs`                                        | 手动字段/数量/佩戴、图标及合法性辅助已接入；浏览器待检查           |
| `Subforms/PKM Editors/SuperTrainingEditor.cs`                                 | 待核对                                                             |
| `Subforms/PKM Editors/TechRecordEditor.cs`                                    | 待核对                                                             |
| `Subforms/PKM Editors/Text.cs`                                                | 待核对                                                             |
| `Subforms/ReportGrid.cs`                                                      | 待核对                                                             |
| `Subforms/SAV_Database.cs`                                                    | 待核对                                                             |
| `Subforms/SAV_Encounters.cs`                                                  | 待核对                                                             |
| `Subforms/SAV_FolderList.cs`                                                  | 待核对                                                             |
| `Subforms/SAV_MysteryGiftDB.cs`                                               | 待核对                                                             |
| `Subforms/Save Editors/Gen1/SAV_EventReset1.cs`                               | 已接入四布局事件重置、三语、多选与撤销；浏览器与实档待核验         |
| `Subforms/Save Editors/Gen1/SAV_HallOfFame1.cs`                               | API 85：核心、三语六格图像、全部操作与撤销已接入；浏览器待核验     |
| `Subforms/Save Editors/Gen2/SAV_Misc2.cs`                                     | API 86：水晶 GS 球事件、三语状态和撤销已接入；浏览器待核验         |
| `Subforms/Save Editors/Gen3/PokeBlock3CaseEditor.cs`                          | API 75：逐格／批量与三语目录已接入；工程检查通过，浏览器待核验     |
| `Subforms/Save Editors/Gen3/SAV_HallOfFame3.cs`                               | API 87：三语六格图像、全部操作与撤销已接入；工程通过，浏览器待核验 |
| `Subforms/Save Editors/Gen3/SAV_Misc3.cs`                                     | API 95：主设置、幻影岛及此前各标签功能接入；浏览器与真实存档待核验 |
| `Subforms/Save Editors/Gen3/SAV_RTC3.cs`                                      | API 78：两组时钟／归零／树果修复工程检查通过；浏览器待核验         |
| `Subforms/Save Editors/Gen3/SAV_Roamer3.cs`                                   | API 88：三语字段、遭遇 IV 与撤销已接入；工程通过，浏览器待核验     |
| `Subforms/Save Editors/Gen3/SAV_SecretBase3.cs`                               | API 96：基地训练家、六格队伍与形态预览接入；浏览器与真实存档待核验 |
| `Subforms/Save Editors/Gen4/PoffinCase4Editor.cs`                             | API 75：逐格／批量与三语目录已接入；工程检查通过，浏览器待核验     |
| `Subforms/Save Editors/Gen4/PokeGear4Editor.cs`                               | API 97：75 格通讯录、原始数值与批量预览工程通过；浏览器待核验      |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonConnection4Editor.cs`        | API 98：随竞技窗口接入；工程通过，浏览器与实档待核验               |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonEventData4Editor.cs`         | API 98：随竞技窗口接入；工程通过，浏览器与实档待核验               |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonEventRecord4Editor.cs`       | API 98：随竞技窗口接入；工程通过，浏览器与实档待核验               |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonEventTrainer4Editor.cs`      | API 98：随竞技窗口接入；工程通过，浏览器与实档待核验               |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonParticipant4Editor.cs`       | API 98：随竞技窗口接入；工程通过，浏览器与实档待核验               |
| `Subforms/Save Editors/Gen4/Pokeathlon/PokeathlonSpeciesForm4Editor.cs`       | API 98：随竞技窗口接入；工程通过，浏览器与实档待核验               |
| `Subforms/Save Editors/Gen4/SAV_Apricorn.cs`                                  | API 76：数量／批量／三语图像工程检查通过；浏览器待核验             |
| `Subforms/Save Editors/Gen4/SAV_BattlePass.cs`                                | API 100：人物、台词、成绩、队伍及完整操作工程通过；浏览器待核验    |
| `Subforms/Save Editors/Gen4/SAV_DLC4.cs`                                      | API 102：录像四格／四队、导入预览与导出工程通过；浏览器待核验      |
| `Subforms/Save Editors/Gen4/SAV_Gear.cs`                                      | API 99：装备、套装、批量与四玩家工程通过；浏览器与实档待核验       |
| `Subforms/Save Editors/Gen4/SAV_Geonet4.cs`                                   | API 103：点位、旗标及批量预览工程通过；浏览器与实档待核验          |
| `Subforms/Save Editors/Gen4/SAV_HoneyTree.cs`                                 | API 104：21 树、明确补丁及重新保存预览工程通过；浏览器待核验       |
| `Subforms/Save Editors/Gen4/SAV_Misc4.cs`                                     | API 105：全分组、设施、点阵、冻结预览工程通过；浏览器待核验        |
| `Subforms/Save Editors/Gen4/SAV_Pokeathlon4.cs`                               | API 98：随竞技窗口接入；工程通过，浏览器与实档待核验               |
| `Subforms/Save Editors/Gen4/SAV_Pokedex4.cs`                                  | 已接入；三种布局工程检查通过，浏览器待核验                         |
| `Subforms/Save Editors/Gen4/SAV_Trainer4BR.cs`                                | API 101：训练家、时间与四玩家工程通过；浏览器待核验                |
| `Subforms/Save Editors/Gen4/SAV_Underground.cs`                               | API 106：四类背包、十三成绩、球体与冻结预览接通；工程检查通过      |
| `Subforms/Save Editors/Gen5/CGearImage.cs`                                    | API 107：图片转换、预览、PNG 导入导出工程通过；浏览器待核验        |
| `Subforms/Save Editors/Gen5/Join Avenue/IJoinAvenueSpecificEditor.cs`         | 待核对                                                             |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueAssistantSpecificEditor.cs` | 待核对                                                             |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueEntityGeneralEditor.cs`     | 待核对                                                             |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueFanSpecificEditor.cs`       | 待核对                                                             |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueListEditor.cs`              | 待核对                                                             |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueSettingsEditor.cs`          | 待核对                                                             |
| `Subforms/Save Editors/Gen5/Join Avenue/JoinAvenueVisitorSpecificEditor.cs`   | 待核对                                                             |
| `Subforms/Save Editors/Gen5/Join Avenue/SAV_JoinAvenue.cs`                    | 待核对                                                             |
| `Subforms/Save Editors/Gen5/SAV_DLC5.cs`                                      | API 107 接入 C-Gear；其余分组 Core／三语已核对，夹具及接入待完成   |
| `Subforms/Save Editors/Gen5/SAV_GlobalLink5.cs`                               | 待核对                                                             |
| `Subforms/Save Editors/Gen5/SAV_Medals5.cs`                                   | 待核对                                                             |
| `Subforms/Save Editors/Gen5/SAV_Misc5.cs`                                     | 待核对                                                             |
| `Subforms/Save Editors/Gen5/SAV_Pokedex5.cs`                                  | 已接入；两种布局工程检查通过，浏览器待核验                         |
| `Subforms/Save Editors/Gen5/SAV_UnityTower.cs`                                | 待核对                                                             |
| `Subforms/Save Editors/Gen6/SAV_BerryFieldXY.cs`                              | 待核对                                                             |
| `Subforms/Save Editors/Gen6/SAV_BoxLayout.cs`                                 | API 59：箱名、壁纸、解锁数、标记、整箱交换；沿用当前编辑白名单     |
| `Subforms/Save Editors/Gen6/SAV_HallOfFame.cs`                                | 待核对                                                             |
| `Subforms/Save Editors/Gen6/SAV_Link6.cs`                                     | 待核对                                                             |
| `Subforms/Save Editors/Gen6/SAV_OPower.cs`                                    | API 77：状态／数值／批量／三语工程检查通过；浏览器待核验           |
| `Subforms/Save Editors/Gen6/SAV_PokeBlockORAS.cs`                             | API 74 数量／批量与树果田操作工程检查通过；浏览器待核验            |
| `Subforms/Save Editors/Gen6/SAV_PokedexORAS.cs`                               | 已接入；字段及批量工程检查通过，浏览器待核验                       |
| `Subforms/Save Editors/Gen6/SAV_PokedexXY.cs`                                 | 已接入；字段及批量工程检查通过，浏览器待核验                       |
| `Subforms/Save Editors/Gen6/SAV_Pokepuff.cs`                                  | API 73 逐项／批量编辑工程检查通过；浏览器与真实存档待核验          |
| `Subforms/Save Editors/Gen6/SAV_Roamer6.cs`                                   | API 79：读取／编辑／推导已接入；X 合成样本修改／撤销已检查         |
| `Subforms/Save Editors/Gen6/SAV_SecretBase.cs`                                | 待核对                                                             |
| `Subforms/Save Editors/Gen6/SAV_SuperTrain.cs`                                | 待核对                                                             |
| `Subforms/Save Editors/Gen6/SAV_Trainer.cs`                                   | 基础/性别/时间/语言/地区/徽章/对应点数已接入；其他字段待接入       |
| `Subforms/Save Editors/Gen7/SAV_Capture7GG.cs`                                | 已接入 API 53；工程检查通过，浏览器待核验                          |
| `Subforms/Save Editors/Gen7/SAV_FestivalPlaza.cs`                             | 待核对                                                             |
| `Subforms/Save Editors/Gen7/SAV_HallOfFame7.cs`                               | 待核对                                                             |
| `Subforms/Save Editors/Gen7/SAV_Pokebean.cs`                                  | API 73 逐项／批量编辑工程检查通过；浏览器与真实存档待核验          |
| `Subforms/Save Editors/Gen7/SAV_PokedexGG.cs`                                 | 已接入 API 53；工程检查通过，浏览器待核验                          |
| `Subforms/Save Editors/Gen7/SAV_PokedexSM.cs`                                 | 已接入 API 52；形态、九语言及批量操作                              |
| `Subforms/Save Editors/Gen7/SAV_Trainer7.cs`                                  | 基础/性别/时间/语言/地区/对应点数已接入；其他字段待接入            |
| `Subforms/Save Editors/Gen7/SAV_Trainer7GG.cs`                                | 待核对                                                             |
| `Subforms/Save Editors/Gen7/SAV_ZygardeCell.cs`                               | 待核对                                                             |
| `Subforms/Save Editors/Gen8/PokedexResearchTask8aPanel.cs`                    | 待核对                                                             |
| `Subforms/Save Editors/Gen8/SAV_BlockDump8.cs`                                | 待核对                                                             |
| `Subforms/Save Editors/Gen8/SAV_FlagWork8b.cs`                                | API 83：八布局普通／系统标记、Int32 数值及比较已接入，浏览器待核验 |
| `Subforms/Save Editors/Gen8/SAV_Misc8b.cs`                                    | 待核对                                                             |
| `Subforms/Save Editors/Gen8/SAV_Poffin8b.cs`                                  | API 75：逐格／批量与三语目录已接入；工程检查通过，浏览器待核验     |
| `Subforms/Save Editors/Gen8/SAV_PokedexBDSP.cs`                               | 已接入 API 54；工程检查通过，浏览器待核验                          |
| `Subforms/Save Editors/Gen8/SAV_PokedexLA.cs`                                 | API 56 已接入；真实存档与浏览器待核验                              |
| `Subforms/Save Editors/Gen8/SAV_PokedexResearchEditorLA.cs`                   | API 56 已接入全部 30 项计数；真实存档与浏览器待核验                |
| `Subforms/Save Editors/Gen8/SAV_PokedexSWSH.cs`                               | API 55 已接入；真实存档与浏览器待核验                              |
| `Subforms/Save Editors/Gen8/SAV_Raid8.cs`                                     | 待核对                                                             |
| `Subforms/Save Editors/Gen8/SAV_SealStickers8b.cs`                            | 待核对                                                             |
| `Subforms/Save Editors/Gen8/SAV_Trainer8.cs`                                  | 基础/性别/时间/语言/对应点数已接入；其他字段待接入                 |
| `Subforms/Save Editors/Gen8/SAV_Trainer8a.cs`                                 | 待核对                                                             |
| `Subforms/Save Editors/Gen8/SAV_Trainer8b.cs`                                 | 基础/性别/时间/语言/徽章/对应点数已接入；其他字段待接入            |
| `Subforms/Save Editors/Gen8/SAV_Underground8b.cs`                             | 待核对                                                             |
| `Subforms/Save Editors/Gen9/DonutEditor9a.cs`                                 | 待核对                                                             |
| `Subforms/Save Editors/Gen9/DonutFlavorProfile9a.cs`                          | 待核对                                                             |
| `Subforms/Save Editors/Gen9/EventWorkGrid64.cs`                               | 待核对                                                             |
| `Subforms/Save Editors/Gen9/SAV_Donut9a.cs`                                   | 待核对                                                             |
| `Subforms/Save Editors/Gen9/SAV_DonutGenerator9a.cs`                          | 待核对                                                             |
| `Subforms/Save Editors/Gen9/SAV_Fashion9.cs`                                  | 待核对                                                             |
| `Subforms/Save Editors/Gen9/SAV_FlagWork9a.cs`                                | 待核对                                                             |
| `Subforms/Save Editors/Gen9/SAV_Pokedex9a.cs`                                 | API 58：三语图鉴、三组形态、十语言、超级进化与批量编辑             |
| `Subforms/Save Editors/Gen9/SAV_PokedexSV.cs`                                 | 已接入旧版状态、形态、语言、显示及批量；工程检查通过，浏览器待核验 |
| `Subforms/Save Editors/Gen9/SAV_PokedexSVKitakami.cs`                         | 已接入四组形态位及三地区显示、批量；工程检查通过，浏览器待核验     |
| `Subforms/Save Editors/Gen9/SAV_Raid9.cs`                                     | 待核对                                                             |
| `Subforms/Save Editors/Gen9/SAV_RaidSevenStar9.cs`                            | 待核对                                                             |
| `Subforms/Save Editors/Gen9/SAV_Trainer9.cs`                                  | 待核对                                                             |
| `Subforms/Save Editors/Gen9/SAV_Trainer9a.cs`                                 | 待核对                                                             |
| `Subforms/Save Editors/Misc/SAV_Accessor.cs`                                  | 待核对                                                             |
| `Subforms/Save Editors/SAV_BoxList.cs`                                        | 待核对                                                             |
| `Subforms/Save Editors/SAV_BoxViewer.cs`                                      | 待核对                                                             |
| `Subforms/Save Editors/SAV_Chatter.cs`                                        | 待核对                                                             |
| `Subforms/Save Editors/SAV_EventFlags.cs`                                     | API 80：Gen3–7 标记／数值／预设／双存档比较已接入，浏览器待核验    |
| `Subforms/Save Editors/SAV_EventFlags2.cs`                                    | API 81：五布局事件标记／byte 数值／预设／比较已接入，浏览器待核验  |
| `Subforms/Save Editors/SAV_EventWork.cs`                                      | API 82：两版本分组／Int32 数值／预设／比较已接入，浏览器待核验     |
| `Subforms/Save Editors/SAV_GroupViewer.cs`                                    | 待核对                                                             |
| `Subforms/Save Editors/SAV_Inventory.cs`                                      | 读取/编辑/整理/图片含 HaX；浏览器待核验                            |
| `Subforms/Save Editors/SAV_MailBox.cs`                                        | 待核对                                                             |
| `Subforms/Save Editors/SAV_SimplePokedex.cs`                                  | 已接入 Gen1–3；区域布局、批量标记及联动规则通过工程检查            |
| `Subforms/Save Editors/SAV_SimpleTrainer.cs`                                  | 基础/GBA 设置/DS 地区及坐标已接入；日期等字段待接入                |
| `Subforms/Save Editors/SAV_Wondercard.cs`                                     | 待核对                                                             |
| `Subforms/Save Editors/TrainerStat.cs`                                        | 读写与三语名称已接入；浏览器待核验                                 |
| `Subforms/SaveHandlerTroubleshooter.cs`                                       | 待核对                                                             |
| `Subforms/SettingsEditor.cs`                                                  | 待核对                                                             |
