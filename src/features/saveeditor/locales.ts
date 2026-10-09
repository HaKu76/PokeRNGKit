import { ug4Words } from "./underground4";
import { misc4Words } from "./misc4";
import { honey4Words } from "./honeyTree4";
import { geonet4Words } from "./geonet4";
import { video4Words } from "./battleVideo4";
import { brTrainer4Words } from "./brTrainer4";
import { battlePass4Words } from "./battlePass4";
import { gsBall2Words } from "./gsBall2";
import { saveEditorCopy } from "./copy";
import { fileBatchWords } from "./fileBatch";
import { boxArchiveWords } from "./boxArchive";
import { boxImportWords } from "./boxImport";
import { boxBinaryWords } from "./boxBinary";

export const saveEditorResources = {
  zh: {
    misc4Error: misc4Words.zh.invalid,
    misc4Stale: misc4Words.zh.stale,
    underground4Error: ug4Words.zh.invalid,
    underground4Stale: ug4Words.zh.stale,
    honey4Error: honey4Words.zh.invalid,
    honey4Stale: honey4Words.zh.stale,
    geonet4Error: geonet4Words.zh.invalid,
    geonet4Stale: geonet4Words.zh.stale,
    video4Error: video4Words.zh.invalid,
    video4Stale: video4Words.zh.stale,
    brTrainer4Error: brTrainer4Words.zh.invalid,
    battlePassError: battlePass4Words.zh.invalid,
    gsBallError: gsBall2Words.zh.error,
    pokedexResetOnly:
      "此格式已开放图鉴、事件重置与殿堂记录，训练家编辑仍在接入中。",
    pokedexEventsOnly: "此格式已开放图鉴与事件编辑，训练家编辑仍在接入中。",
    hallError: "殿堂数据无效、昵称无法按此存档编码，或操作不适用，未应用修改。",
    eventError: "事件数据无效或不适用于此存档，未应用修改。",
    eventCompareError: "比较需要相同游戏版本及事件布局的两个存档。",
    eventCompareSize: "比较存档必须非空，且每个不超过 1 MiB。",
    boxImportError: boxImportWords.zh.error,
    boxBinaryError: boxBinaryWords.zh.error,
    boxArchiveError: boxArchiveWords.zh.error,
    boxArchiveEmpty: boxArchiveWords.zh.empty,
    fileBatchError: fileBatchWords.zh.error,
    fileBatchLimits: fileBatchWords.zh.limits,
    fileBatchPaths: fileBatchWords.zh.paths,
    inventory: "背包",
    bagAdvanced: "高级编辑（HaX）",
    bagAdvancedNote:
      "显示该版本完整道具目录并放宽单格数量限制。错口袋道具或超常数量可能无法在游戏中使用；格式不能原样保存时会拒绝修改。批量操作仍使用常规道具与数量规则。切换模式会放弃未应用的编辑草稿。",
    bagBatchTitle: "整理当前口袋",
    bagBatchNote:
      "仅处理当前口袋已应用的数据，不包含未应用的单格草稿。排序使用当前语言名称；数量会按每种道具上限截取。所有操作均可撤销。",
    bagAction: "操作",
    bagSortName: "名称",
    bagSortNameReverse: "名称(反向)",
    bagSortCount: "数量",
    bagSortCountReverse: "数量(反向)",
    bagSortId: "序号",
    bagSortIdReverse: "序号(反向)",
    bagSetCount: "统一已有道具数量",
    bagGiveAll: "获得全部",
    bagClearAll: "清空当前口袋",
    bagApplyBatch: "应用口袋操作",
    bagCapacityOrder: "容量不足时的选择方式",
    bagOrdered: "按目录顺序",
    bagRandom: "随机选择",
    bagGiveAllNote:
      "这会替换当前口袋的内容和标记，仅添加核心规则允许获得的道具。",
    bagCrampedNote: "口袋容量小于道具目录，将按所选方式填满可用格位。",
    bagClearAllNote: "这会清空当前口袋的全部道具及标记，其他口袋保持不变。",
    inventoryReadNote:
      "选择道具编辑种类、数量和标记，或展开口袋整理。应用后更新工作副本，可撤销或导出。读取不会自动清理异常值。道具图片尚未接入。",
    editBagItem: "编辑道具",
    revertBagItem: "还原道具草稿",
    clearBagItem: "清空此格位",
    applyBagItem: "应用道具修改",
    loadInventory: "读取背包",
    noInventory: "此存档未提供背包数据。",
    bagPouch: "口袋",
    searchInventory: "搜索道具名称或编号",
    showEmptyInventory: "显示空格位",
    bagItem: "道具",
    bagCount: "数量",
    bagFlags: "标记",
    bagFavorite: "收藏",
    bagNew: "新获得",
    bagFreeSpace: "自由空间",
    bagFreeSpaceIndex: "自由空间顺序",
    bagNewShop: "商店新品",
    bagHeld: "已携带",
    bagMax: "上限",
    bagUnusual: "超出该口袋的常规范围",
    noInventoryResults: "没有符合条件的道具。",
    bagPrevious: "上一页",
    bagNext: "下一页",
    bagPouches: {
      None: "无",
      Items: "道具",
      KeyItems: "重要物品",
      TMHMs: "招式学习器",
      Medicine: "回复道具",
      Berries: "树果",
      Balls: "精灵球",
      BattleItems: "战斗道具",
      MailItems: "邮件",
      PCItems: "电脑道具",
      FreeSpace: "自由空间",
      ZCrystals: "Ｚ纯晶",
      Candy: "糖果",
      Treasure: "贵重物品",
      Ingredients: "食材",
      MegaStones: "超级石",
    },
    trainingTitle: "特训与华丽大赛",
    contestTitle: "华丽大赛能力值",
    hyperTitle: "极限特训",
    contestCool: "帅气",
    contestBeauty: "美丽",
    contestCute: "可爱",
    contestSmart: "聪明",
    contestClever: "聪明",
    contestTough: "强壮",
    contestSheen: "光泽",
    maxContest: "华丽大赛数值全部设为 255",
    clearContest: "清空华丽大赛数值",
    allHyper: "标记全部极限特训",
    clearHyper: "清除全部特训标记",
    revertTraining: "还原训练草稿",
    applyTraining: "应用训练修改",
    hyperNote:
      "特训只改变标记，不覆盖原始个体值。手动标记不代表满足游戏的特训条件，请检查合法性。队伍能力值会重新计算，当前血量只在超过新上限时下调，异常状态保留。",
    historyTitle: "持有者与居住记录",
    loadHistory: "读取训练家记录",
    currentHolder: "当前持有者",
    residenceHistory: "居住记录",
    historyCountry: "国家或地区",
    historyRegion: "省或州",
    clearResidence: "清空此记录",
    clearAllResidences: "清空全部居住记录",
    revertHistory: "还原记录草稿",
    applyHistory: "应用训练家记录",
    historyNote:
      "持有者切换需要已有接手训练家姓名，只改变当前持有者标记。居住记录保留原顺序；更换国家会重置地区，清空记录不会自动移动其他记录。所有修改先进入草稿。",
    clearMemory: "清空记忆",
    memoryTitle: "记忆与互动",
    careTitle: "亲密度与互动数值",
    applyCare: "应用互动数值",
    careNote:
      "仅显示此格式保存的字段；数值范围为 0–255。接手训练家字段按训练家经历启用。",
    careEggNote:
      "蛋的原训练家亲密度字节记录剩余孵化周期，修改它会改变孵化进度。",
    careNames: {
      originalFriendship: "原训练家亲密度",
      handlingFriendship: "接手训练家亲密度",
      originalAffection: "原训练家好感度",
      handlingAffection: "接手训练家好感度",
      fullness: "饱食度",
      enjoyment: "愉悦度",
      sociability: "社交度",
    },
    loadMemory: "读取训练家记忆",
    memoryTrainer: "记忆所属训练家",
    handlingTrainer: "接手训练家",
    memoryEvent: "记忆内容",
    memoryArgument: "关联对象或地点",
    memoryIntensity: "记忆程度",
    memoryFeeling: "感受",
    applyMemory: "应用记忆",
    revertMemory: "还原记忆草稿",
    memoryUnavailable: "按上游规则，该训练家履历当前不能编辑这组记忆。",
    memoryNote:
      "根据记忆内容联动对象、地点、道具或招式目录。切换内容会重置关联参数，选择无记忆会清空参数、程度和感受。先应用或还原草稿再切换训练家；完成后请检查合法性。",
    revertRibbonDraft: "还原缎带草稿",
    ribbonStatuses: {
      unchecked: "未完成分析",
      missing: "缺少",
      invalid: "存在问题",
      possible: "核心认为可获得",
      mark: "遭遇证章",
      unmarked: "无特别提示",
    },
    ribbonAnalysisNote:
      "提示基于已应用的数据。修改草稿后请先应用再重新检查；可获得不表示当前宝可梦整体合法。",
    ribbonSuggest: "按核心建议设置",
    ribbonMinimal: "按核心规则精简",
    ribbonSuggestNote:
      "这两项直接修改工作副本并可撤销：建议设置会先移除可选项再添加核心允许的缎带，可能联动超级训练等关联字段；精简保留必需项并取消佩戴。请先应用或撤销草稿，操作后再检查完整合法性。",
    ribbonTitle: "缎带与证章",
    loadRibbons: "读取缎带与证章",
    searchRibbons: "搜索名称",
    ownedRibbons: "仅显示已拥有",
    affixedRibbon: "佩戴的缎带或证章",
    noAffixedRibbon: "不佩戴",
    allRibbons: "全部填满",
    clearRibbons: "全部清空",
    applyRibbons: "应用缎带与证章",
    ribbonNote:
      "按存档格式编辑持有状态、数量和佩戴项。全部填满或清空作用于整份列表，仅改变草稿；点击应用后可撤销。拥有或佩戴不代表符合遭遇规则，完成后请检查合法性。",
    relearnMoves: "回忆招式",
    suggestRelearn: "填入建议招式",
    clearRelearn: "清空四个槽位",
    applyRelearn: "应用回忆招式",
    relearnNote:
      "独立保存四个回忆招式，不改变当前招式或 PP。建议来自 PKHeX 合法性分析，仅填入表单；核对后点击应用，并重新检查合法性。",
    pokemonFiles: "宝可梦文件",
    choosePokemonFile: "选择宝可梦文件",
    importPokemonFile: "导入到选中格位",
    exportPokemonFile: "导出这只宝可梦",
    pokemonFileNote:
      "导入会替换选中格位，并由 PKHeX 转换为当前存档格式，部分数据可能改变。可撤销；导出为未加密的单只宝可梦文件。",
    pokemonFileError:
      "宝可梦文件无效、过大或无法转换为当前存档格式，请检查文件。",
    storageSettings: "整理宝可梦",
    targetBox: "目标位置",
    targetSlot: "目标格位",
    movePokemon: "移动到空位",
    swapPokemon: "交换位置",
    copyPokemon: "复制到目标",
    deletePokemon: "删除这只宝可梦",
    storageNote:
      "复制会替换目标格位；队伍删除后自动前移，移入空位会追加到末尾。所有操作均可撤销。",
    storageError: "格位无效、已锁定或不满足操作条件。移动需选择空位。",
    boxSettings: "盒子设置",
    boxName: "盒子名称",
    wallpaper: "壁纸",
    boxBatchError: "所选操作、范围或宝可梦数据无法完成批量处理，未应用修改。",
    propertyBatchError:
      "通用批量编辑未能完成。请检查指令和范围，或重新生成预览；工作副本未改变。",
    boxLayoutError: "请检查解锁箱数、箱子标记和交换目标。",
    boxValueError: "盒子名称或壁纸无效，请检查长度、字符和选项。",
    ...saveEditorCopy.zh,
    title: "PKHeX · 存档编辑器",
    shortTitle: "存档编辑器",
    legality: "合法性报告",
    checkLegality: "检查合法性",
    legalityValid: "PKHeX 检查通过",
    legalityInvalid: "PKHeX 检查发现问题",
    legalityIncomplete: "分析未能完整完成",
    legalityDetails: "查看详细报告",
    legalityNote:
      "分析当前工作副本中已应用的数据；存档校验通过不等于宝可梦合法性通过。",
    editPokemon: "编辑宝可梦",
    basicPokemonEdit: "基础数据",
    makeEgg: "转换为蛋",
    makeEggNote:
      "按上游规则设置蛋名称、周期和相遇记录，并清除适用的记忆。第三世代掌机格式会改为日文蛋数据，名称显示可能变化。队伍须保留非蛋成员；可撤销，完成后请检查合法性。",
    shinyEdit: "异色编辑",
    shinyMethod: "修改方式",
    shinyTarget: "目标状态",
    shinyPid: "修改个性值（PID）",
    shinySid: "修改隐藏训练家 ID（SID）",
    shinyAny: "异色",
    shinyStar: "星形异色（XOR 1）",
    shinySquare: "方形异色（XOR 0）",
    shinyOff: "非异色",
    applyShiny: "应用异色状态",
    shinyPidNote:
      "修改 PID，并按旧世代规则同步适用的加密常量。保留原训练家 ID；原有遭遇关联可能改变，请重新检查合法性。",
    shinySidNote:
      "保留 PID 和加密常量，修改此宝可梦的隐藏训练家 ID。这会改变它的原训练家身份，存档训练家与资料卡不会同步修改。",
    shinyTypeNote:
      "星形与方形按 XOR 值设置，实际表现还取决于游戏、配信及 GO 来源规则。无法满足当前形态等约束时会保留原数据；可以撤销。",
    shinyNoSolution:
      "当前形态、性格、性别和特性约束下没有符合要求的异色 PID。可改用隐藏训练家 ID 方式，或先调整这些字段。",
    eggDetails: "蛋与孵化",
    hatchCounter: "剩余孵化周期",
    hatchCounterNote:
      "这是孵化周期计数，不是剩余步数。允许保存 0–255，具体合法范围请检查合法性。",
    hatchMinimum: "当前格式的最小孵化周期",
    applyHatchCounter: "应用孵化周期",
    hatchEgg: "按核心规则孵化",
    hatchEggNote:
      "孵化会更新蛋状态、默认名称、亲密度、地点、当前日期及适用的记忆。保留原文件，可以撤销；不应用上方尚未保存的周期值。",
    originDetails: "来源与地点",
    originDetailsNote:
      "选择来源游戏后，球种与地点选项会随之更新。已有值会保留，请核对后应用；完成后可检查合法性。",
    originGame: "来源游戏",
    captureBall: "精灵球",
    metLocation: "相遇地点",
    eggLocation: "获得蛋的地点",
    loadOriginChoices: "读取来源与地点选项",
    applyOriginDetails: "应用来源与地点",
    originUnlisted: "原有值，不在当前选项中",
    encounterDetails: "相遇记录",
    encounterDetailsNote:
      "仅应用这里修改的字段。清空日期会移除日期记录；不会改变来源游戏、地点或蛋状态。编辑后可检查合法性。",
    metLevel: "相遇等级",
    metDate: "相遇日期",
    eggDate: "获得蛋的日期",
    fatefulEncounter: "命运相遇",
    applyEncounterDetails: "应用相遇记录",
    formArgument: "特殊形态参数",
    formRemain: "剩余天数",
    formElapsed: "已过天数",
    formMaximum: "最长保持天数",
    formCounter: "形态计数",
    formDecoration: "糖饰",
    applyFormArgument: "应用形态参数",
    formArgumentNote:
      "字段与范围按宝可梦、形态及世代提供。计时字节允许 0–255，但不代表全部数值符合游戏规则；应用后请检查合法性。第六世代多丽米亚的队伍最长保持天数会与已过天数同步。",
    formPartyOnlyNote:
      "此格式的剩余／已过天数只存储在队伍中，盒子不保存这些字段。",
    rawPokemonValues: "高级：原始性格值与加密常量",
    pidHex: "性格值（PID，十六进制）",
    ecHex: "加密常量（十六进制）",
    applyRawValues: "应用原始值",
    rerollPid: "重新生成性格值",
    rerollEc: "重新生成加密常量",
    rawValueError: "请输入 1–8 位十六进制数字（0–9、A–F），不能留空。",
    rawPokemonNote:
      "直接改值可能改变异色、性格、性别或形态，并破坏遇敌关联；应用后请检查合法性。重新生成使用 PKHeX 规则，旧来源宝可梦的加密常量可能必须保持与 PID 相同。这里只应用本区域操作，可撤销。",
    ppUps: "PP 提升次数",
    healPp: "恢复 PP",
    applyPokemon: "应用到工作副本",
    moveId: "招式编号",
    undo: "撤销上次修改",
    restoreSave: "还原原存档",
    workingCopyNote:
      "修改只写入工作副本，可撤销；导出后才生成新文件。属性调整会重新计算队伍能力值。",
    pokemonValueError:
      "宝可梦输入无效，请检查姓名、等级、数值范围及努力值总和（最多 510）。",
    pokemonSaved: "已更新工作副本，可继续编辑或导出。",
    open: "打开存档",
    close: "关闭存档",
    reset: "还原修改",
    export: "导出存档副本",
    trainer: "训练家信息",
    trainerName: "训练家姓名",
    tid: "公开 ID（TID）",
    sid: "隐藏 ID（SID）",
    money: "金钱",
    checksums: "数据校验",
    displayIds: "游戏显示 ID",
    playTime: "游戏时间",
    trainerMale: "男性",
    trainerFemale: "女性",
    trainerHours: "游戏时间：小时",
    trainerMinutes: "游戏时间：分钟",
    trainerSeconds: "游戏时间：秒",
    trainerTimeNote:
      "分钟与秒沿用 PKHeX 的两位输入，保存时对 60 取余（例如 75 保存为 15）。未修改的原值保持不变。",
    trainerAppearanceNote:
      "剑／盾更改性别时，会沿用当前肤色并重置角色外观与穿着；可通过撤销恢复。",
    applyTrainer: "应用训练家修改",
    trainerGameVersion: "游戏版本标记",
    trainerGameVersionNote:
      "仅修改版本标记，不转换存档格式或宝可梦来源。日月与究极日月格式不匹配时暂停配置联动。",
    trainerGameVersionError: "此存档不支持所选游戏版本。",
    trainerAppearance6Error:
      "昵称或外观值无效，或角色性别已变化。请检查范围，必要时重置昵称与外观草稿。",
    pokedexTitle: "图鉴",
    pokedexRead: "读取图鉴",
    pokedexSeen: "见过",
    pokedexCaught: "捕获",
    pokedexSeenAll: "全部设为见过",
    pokedexSeenNone: "全部设为未见过",
    pokedexCaughtAll: "全部设为已捕获",
    pokedexCaughtNone: "全部设为未捕获",
    pokedexSearch: "搜索宝可梦名称或编号",
    pokedexNoMatches: "没有匹配的宝可梦。",
    pokedexCounts: "见过 {seen} / {total}，捕获 {caught} / {total}",
    pokedexApply: "应用图鉴修改",
    pokedexReset: "重置图鉴草稿",
    pokedexNote:
      "见过与捕获分别编辑。批量按钮作用于整本图鉴，搜索只改变显示；应用后才写入工作副本，可通过撤销恢复。",
    pokedexGen2:
      "应用时，已捕获的未知图腾会按 PKHeX 补齐字母记录，并修复空的首次遇见记录。",
    pokedexGen3: "应用时会同步存档中的三份“见过”记录。",
    pokedexVc:
      "已按原文件名识别火红／叶绿特殊模式。应用时会清除禁用种类的捕获标记，保留其见过记录。",
    pokedexOnly: "此格式目前开放图鉴编辑，其他编辑功能仍在接入中。",
    pokedexError: "图鉴数据、条目或文件名无效，或此格式暂不支持图鉴编辑。",
    trainerLanguage: "存档语言",
    recordsTitle: "游戏记录",
    recordsRead: "读取游戏记录",
    recordsChoose: "记录名称或编号",
    recordsValue: "记录数值",
    recordsApply: "应用记录修改",
    recordsClamp:
      "此记录的正常上限是 {max}。修改超限原值后，将按正常上限保存。",
    recordsNegative: "原记录是负数，未修改时会保持；新数值须为非负整数。",
    recordsTime: "时间说明",
    recordsDetails: "记录详情",
    recordsSourceName: "上游原名",
    recordsOffset: "记录区偏移",
    recordsError: "无法修改此记录，请检查编号和数值范围。",
    recordsRepresentError: "此格式无法完整回读请求的记录数值，修改已取消。",
    trainerCurrencyNames: {
      bp: "对战点数（BP）",
      pokeMiles: "宝可里程",
      festivalCoins: "圆庆币",
      watts: "瓦特",
    },
    trainerCurrencyNotes: {
      bp: "",
      pokeMiles: "修改时会把当前与累计宝可里程设为同一数值。",
      festivalCoins: "累计圆庆币会按已使用数量与新余额重新计算。",
      watts: "余额超过累计获得量时，会一并提高累计记录。",
    },
    trainerCurrencyError: "请按当前存档支持的范围填写整数，不能留空。",
    trainerBadges: "徽章",
    trainerGameOptions: "游戏设置",
    trainerDates: "日期与时间",
    trainerDateNames: {
      started: "冒险开始",
      fame: "首次进入名人堂",
      saved: "最近保存",
    },
    trainerDatePrecision: {
      date: "仅日期",
      minute: "精确到分钟",
      second: "精确到秒",
      utc: "本地时间",
    },
    trainerDateEmpty: "原日期为空或无效；留空保持原数据，填写后替换。",
    trainerDateUtcNote:
      "按本机时区换算，应用时保留原有小数秒。夏令时回拨的重复时刻按浏览器规则选择，未改日期保持原时间戳。",
    trainerDateNote:
      "按游戏内时钟保存，不转换时区。各项按所示精度保存，未修改的原日期保持。",
    trainerDateError: "日期无效、超出允许范围或此存档不支持日期编辑。",
    trainerPosition: "地图与坐标",
    trainerSpatialNames: {
      map: "地图编号",
      x: "X 坐标",
      z: "Z 坐标",
      y: "Y 坐标",
      rotation: "旋转",
      scaleX: "X 缩放",
      scaleZ: "Z 缩放",
      scaleY: "Y 缩放",
    },
    trainerSpatialPlaces: "最多 {value} 位小数",
    trainerSpatialTruncate: "按上游保存规则，此值应用后为 {value}。",
    trainerSpatialInvalid: "原值不是有限数；未修改时保留，填写有效数值可替换。",
    trainerSpatialNote:
      "只改实际变动的字段。浮点值按游戏精度保存，旋转转换为游戏格式，应用后显示回读结果。",
    trainerSpatialGen6: "坐标按上游以 1/18 单位显示；改动字段同步其关联位置。",
    trainerSpatialGen7:
      "坐标按上游以 1/60 单位显示；改动位置时同步场景坐标，未改旋转保持原值。",
    trainerPositionNames: {
      map: "地图编号",
      x: "X 坐标",
      z: "Z 坐标",
      y: "Y 坐标",
    },
    trainerPositionNote: "随训练家信息一起应用，仅修改填写的位置字段。",
    trainerPositionMirror:
      "随训练家信息一起应用。修改 X/Y 时同步更新对应的关联坐标，其他位置字段保持。",
    trainerPositionWrap: "按上游保存规则，此 Z 负值应用后将显示为 {value}。",
    trainerPositionError: "此存档不支持地图位置编辑或坐标超出范围。",
    trainerPositionRepresentError:
      "无法在保留其他位置数据的前提下保存这个值，修改已取消。",
    trainerGameOptionNames: {
      textSpeed: "文字速度",
      battleStyle: "战斗方式",
      sound: "声音",
      battleEffects: "战斗动画",
    },
    trainerGameOptionChoices: {
      textSpeed: ["0 · 慢", "1 · 中", "2 · 快", "3", "4", "5", "6", "7"],
      battleStyle: ["切换", "连战"],
      sound: ["单声道", "立体声"],
      battleEffects: ["关闭", "开启"],
    },
    trainerGameOptionsNote:
      "随训练家信息一起应用。原文字速度 4–7 可保留，当前核心无法原样写入这些值，因此不能新选。",
    trainerGameOptionsError: "此存档不支持该游戏设置或数值超出范围。",
    trainerTextSpeedError:
      "当前核心无法原样写入该文字速度。原值会保留，请选择 0–3。",
    trainerBadge: "徽章 {n}",
    trainerBadgesNote: "仅修改所选徽章，不自动完成道馆剧情或解锁地图。",
    trainerBadgesError: "此存档不支持该徽章设置。",
    trainerConsoleRegion: "3DS 区域",
    trainerGeographyError: "请选择有效的国家、对应地区和 3DS 区域。",
    trainerLanguageNote:
      "修改游戏存档的语言，不切换本工具的界面语言，也不批量翻译现有宝可梦名字。",
    trainerLanguageError:
      "请选择此存档支持的语言；当前格式可能不提供语言编辑。",
    trainerValueError:
      "请检查训练家性别和游戏时间：小时为 0–65535，分钟与秒为 0–99。",
    trainerSkinError:
      "无法识别此存档的角色肤色，暂不能自动重置外观并更改性别。原文件未修改。",
    partyBoxes: "队伍数量 / 盒子数量",
    generation: "世代",
    profileName: "存档名称",
    apply: "同步到存档信息",
    pokemon: "宝可梦",
    party: "同行队伍",
    box: "盒子",
    slot: "位置",
    empty: "这里没有宝可梦。",
    readPokemon: "选择队伍或盒子内的宝可梦，查看信息并编辑基础数据。",
    nickname: "昵称",
    species: "种类",
    formChoice: "形态",
    defaultForm: "默认形态",
    useSpeciesName: "使用种类名称",
    identityNote:
      "种类或形态改变后，经验按当前等级重新计算，特性、性别及特殊参数随之调整。勾选使用种类名称时，应用后按宝可梦自身语言更新名字；特殊形态仍需检查合法性。",
    level: "等级",
    form: "形态编号",
    gender: "性别",
    shiny: "异色",
    egg: "蛋",
    nature: "性格",
    statNature: "能力值性格",
    pidChangeNote:
      "旧世代更改性格或特性可能重新生成性格值（PID），改变异色状态或遇敌关联。应用后请重新检查合法性；可撤销。",
    ability: "特性",
    item: "携带物品",
    moves: "招式",
    ivs: "个体值",
    evs: "努力值",
    hp: "HP",
    attack: "攻击",
    defense: "防御",
    spAttack: "特攻",
    spDefense: "特防",
    speed: "速度",
    originalTrainer: "初训家姓名",
    experience: "经验值",
    friendship: "亲密度",
    yes: "是",
    no: "否",
    male: "雄性",
    female: "雌性",
    genderless: "无性别",
    invalidPokemon: "宝可梦校验未通过；以下数据仅供参考。",
    failure: "处理失败，请检查存档格式；原文件未改动。",
    sizeError: "请选择 1 字节至 32 MiB 的存档文件。",
    fileError:
      "无法识别存档，请选择已解密的存档文件，而非游戏 ROM 或加密容器。",
    zipError: "请先解压 ZIP，再打开其中的存档。",
    nameError: "训练家姓名为空、过长或含此游戏不支持的字符。",
    rivalError:
      "劲敌姓名最多 7 字符，必须能在此游戏字符集中完整保存；原始姓名字节需为 16 位十六进制。",
    br4Error: "无法应用对战革命操作，请核对玩家记录、装备位置和当前存档。",
    br4Stale: "存档或所选玩家已改变，请重新读取装备并生成预览。",
    br4Game: "宝可梦对战革命",
    pokeathlon4Error:
      "无法应用竞技操作，请核对所选位置、数值上限、种类与第四世代形态。",
    pokeathlon4NameError:
      "训练家姓名最多七个字符，必须可完整保存；原始姓名字节需为 32 位十六进制。",
    pokeathlon4Stale: "存档已改变，请重新读取竞技数据并生成奖牌预览。",
    pokegear4Error:
      "无法应用通讯录操作。格位为 1–75，原始数值为 -128–127；请核对联系人和当前存档状态。",
    pokegear4Stale: "存档已改变，请重新读取通讯录并生成批量预览。",
    secretBase3NameError:
      "基地姓名需按该记录的语言无损保存，最多 7 字符；原始姓名为 14 位十六进制。",
    secretBase3Error:
      "秘密基地操作无法应用，请检查实际基地／成员位置、ID、种类和当前游戏候选；新等级为 2–100，统一努力值为 0–85。",
    misc3Error:
      "杂项修改无法应用，请检查代币 0–9999、图标种类 0–386 及当前存档状态。",
    mirageSourceError: "队伍首槽的原始个性值已改变，请重新读取幻影岛来源。",
    valueError: "输入值无效，请检查 ID 和金钱的允许范围。",
    runtimeError: "存档核心加载失败，请联网刷新后重试。",
    timeoutError: "处理超时，请重新打开存档；原文件未改动。",
    exportError: "副本校验失败，未导出文件。",
    games: {
      ruby: "红宝石",
      sapphire: "蓝宝石",
      emerald: "绿宝石",
      firered: "火红",
      leafgreen: "叶绿",
      colosseum: "竞技场",
      xd: "XD",
      diamond: "钻石",
      pearl: "珍珠",
      platinum: "白金",
      heartgold: "心金",
      soulsilver: "魂银",
      black: "黑",
      white: "白",
      black2: "黑 2",
      white2: "白 2",
      x: "X",
      y: "Y",
      "omega-ruby": "欧米伽红宝石",
      "alpha-sapphire": "阿尔法蓝宝石",
      sun: "太阳",
      moon: "月亮",
      "ultra-sun": "究极之日",
      "ultra-moon": "究极之月",
      sword: "剑",
      shield: "盾",
      brilliantdiamond: "晶灿钻石",
      shiningpearl: "明亮珍珠",
    },
  },
  en: {
    misc4Error: misc4Words.en.invalid,
    misc4Stale: misc4Words.en.stale,
    underground4Error: ug4Words.en.invalid,
    underground4Stale: ug4Words.en.stale,
    honey4Error: honey4Words.en.invalid,
    honey4Stale: honey4Words.en.stale,
    geonet4Error: geonet4Words.en.invalid,
    geonet4Stale: geonet4Words.en.stale,
    video4Error: video4Words.en.invalid,
    video4Stale: video4Words.en.stale,
    brTrainer4Error: brTrainer4Words.en.invalid,
    battlePassError: battlePass4Words.en.invalid,
    gsBallError: gsBall2Words.en.error,
    pokedexResetOnly:
      "Pokédex editing, event resets and Hall of Fame editing are available for this format. Trainer editing is still in development.",
    pokedexEventsOnly:
      "Pokédex and event editing are available for this format. Trainer editing is still in development.",
    hallError:
      "The Hall of Fame data or operation is invalid, or the nickname cannot be encoded for this save. No changes were applied.",
    eventError:
      "Event data is invalid or unavailable for this save. No changes were applied.",
    eventCompareError:
      "Comparison requires two saves with the same game version and event layout.",
    eventCompareSize:
      "Comparison saves must be nonempty and no larger than 1 MiB each.",
    boxImportError: boxImportWords.en.error,
    boxBinaryError: boxBinaryWords.en.error,
    boxArchiveError: boxArchiveWords.en.error,
    boxArchiveEmpty: boxArchiveWords.en.empty,
    fileBatchError: fileBatchWords.en.error,
    fileBatchLimits: fileBatchWords.en.limits,
    fileBatchPaths: fileBatchWords.en.paths,
    inventory: "Inventory",
    bagAdvanced: "Advanced editing (HaX)",
    bagAdvancedNote:
      "Show the full item catalog for this version and relax individual quantity limits. Items in the wrong pouch or unusual counts may not work in-game; edits are rejected if the format cannot retain them exactly. Bulk operations still use normal item and quantity rules. Switching modes discards unapplied drafts.",
    bagBatchTitle: "Organize current pouch",
    bagBatchNote:
      "Uses applied data in this pouch, excluding unsaved single-slot drafts. Name sorting uses the current language. Quantities are clamped per item. Every operation can be undone.",
    bagAction: "Action",
    bagSortName: "Name",
    bagSortNameReverse: "Name (Reverse)",
    bagSortCount: "Count",
    bagSortCountReverse: "Count (Reverse)",
    bagSortId: "Index",
    bagSortIdReverse: "Index (Reverse)",
    bagSetCount: "Set existing item counts",
    bagGiveAll: "Give all",
    bagClearAll: "Clear current pouch",
    bagApplyBatch: "Apply pouch action",
    bagCapacityOrder: "Selection when capacity is limited",
    bagOrdered: "Catalog order",
    bagRandom: "Random selection",
    bagGiveAllNote:
      "Replaces this pouch's contents and flags with items permitted by the core's give rules.",
    bagCrampedNote:
      "The catalog exceeds pouch capacity. Available slots will be filled using the selected method.",
    bagClearAllNote:
      "Clears every item and flag in this pouch. Other pouches are preserved.",
    inventoryReadNote:
      "Select an item to edit its identity, quantity and flags, or expand pouch actions. Apply to the working copy, then undo or export. Reading does not clean unusual values. Item images are not connected yet.",
    editBagItem: "Edit item",
    revertBagItem: "Revert item draft",
    clearBagItem: "Clear this slot",
    applyBagItem: "Apply item changes",
    loadInventory: "Read inventory",
    noInventory: "This save does not provide inventory data.",
    bagPouch: "Pouch",
    searchInventory: "Search item name or ID",
    showEmptyInventory: "Show empty slots",
    bagItem: "Item",
    bagCount: "Count",
    bagFlags: "Flags",
    bagFavorite: "Favorite",
    bagNew: "New",
    bagFreeSpace: "Free space",
    bagFreeSpaceIndex: "Free space order",
    bagNewShop: "New in shop",
    bagHeld: "Held",
    bagMax: "Maximum",
    bagUnusual: "Outside normal pouch limits",
    noInventoryResults: "No matching items.",
    bagPrevious: "Previous page",
    bagNext: "Next page",
    bagPouches: {
      None: "None",
      Items: "Items",
      KeyItems: "Key Items",
      TMHMs: "TMs/HMs",
      Medicine: "Medicine",
      Berries: "Berries",
      Balls: "Poké Balls",
      BattleItems: "Battle Items",
      MailItems: "Mail",
      PCItems: "PC Items",
      FreeSpace: "Free Space",
      ZCrystals: "Z-Crystals",
      Candy: "Candy",
      Treasure: "Treasure",
      Ingredients: "Ingredients",
      MegaStones: "Mega Stones",
    },
    trainingTitle: "Hyper Training and contests",
    contestTitle: "Contest stats",
    hyperTitle: "Hyper Training",
    contestCool: "Cool",
    contestBeauty: "Beauty",
    contestCute: "Cute",
    contestSmart: "Smart",
    contestClever: "Clever",
    contestTough: "Tough",
    contestSheen: "Sheen",
    maxContest: "Set all contest stats to 255",
    clearContest: "Clear contest stats",
    allHyper: "Mark all stats hyper trained",
    clearHyper: "Clear Hyper Training flags",
    revertTraining: "Revert training draft",
    applyTraining: "Apply training changes",
    hyperNote:
      "Hyper Training changes flags, not original IVs. Manual flags do not establish eligibility; check legality. Party stats are recalculated. Current HP is only lowered if it exceeds the new maximum, and status conditions are preserved.",
    historyTitle: "Handler and residence history",
    loadHistory: "Read trainer history",
    currentHolder: "Current handler",
    residenceHistory: "Residence history",
    historyCountry: "Country",
    historyRegion: "Region",
    clearResidence: "Clear this entry",
    clearAllResidences: "Clear all residences",
    revertHistory: "Revert history draft",
    applyHistory: "Apply trainer history",
    historyNote:
      "Switching handlers requires an existing handling trainer name and only changes the current handler flag. Residence order is preserved. Changing a country resets its region; clearing an entry does not shift other entries. Changes remain drafts until applied.",
    clearMemory: "Clear memory",
    memoryTitle: "Memories and interaction",
    careTitle: "Friendship and interaction values",
    applyCare: "Apply interaction values",
    careNote:
      "Only fields stored by this format are shown. Values range from 0 to 255. Handling trainer fields follow the trainer history rules.",
    careEggNote:
      "For an Egg, the original trainer friendship byte stores remaining hatch cycles. Changing it changes hatch progress.",
    careNames: {
      originalFriendship: "Original trainer friendship",
      handlingFriendship: "Handling trainer friendship",
      originalAffection: "Original trainer affection",
      handlingAffection: "Handling trainer affection",
      fullness: "Fullness",
      enjoyment: "Enjoyment",
      sociability: "Sociability",
    },
    loadMemory: "Load trainer memories",
    memoryTrainer: "Trainer",
    handlingTrainer: "Handling trainer",
    memoryEvent: "Memory",
    memoryArgument: "Related entity or location",
    memoryIntensity: "Intensity",
    memoryFeeling: "Feeling",
    applyMemory: "Apply memory",
    revertMemory: "Revert memory draft",
    memoryUnavailable:
      "Upstream trainer-history rules do not allow editing this memory group.",
    memoryNote:
      "Memory types select the relevant entity, location, item or move catalog. Changing the memory resets its argument; no memory clears the argument, intensity and feeling. Apply or revert the draft before switching trainers, then check legality.",
    revertRibbonDraft: "Revert ribbon draft",
    ribbonStatuses: {
      unchecked: "Analysis incomplete",
      missing: "Missing",
      invalid: "Problem found",
      possible: "Core considers obtainable",
      mark: "Encounter mark",
      unmarked: "No special hint",
    },
    ribbonAnalysisNote:
      "Hints describe applied data. Apply draft changes before checking again; obtainable does not mean the entire Pokémon is legal.",
    ribbonSuggest: "Apply Core suggestions",
    ribbonMinimal: "Minimize with Core rules",
    ribbonSuggestNote:
      "These operations update the working copy and can be undone. Suggestions remove optional entries then add Core-allowed ribbons and may update related Super Training fields. Minimizing retains required entries and clears the affixed selection. Apply or revert the draft first, then check full legality afterwards.",
    ribbonTitle: "Ribbons and marks",
    loadRibbons: "Load ribbons and marks",
    searchRibbons: "Search names",
    ownedRibbons: "Owned only",
    affixedRibbon: "Affixed ribbon or mark",
    noAffixedRibbon: "None affixed",
    allRibbons: "Fill all",
    clearRibbons: "Clear all",
    applyRibbons: "Apply ribbons and marks",
    ribbonNote:
      "Edit ownership, counts and the affixed ribbon for this format. Fill and clear affect the entire list in the draft; applying can be undone. Ownership or selection does not establish encounter legality; check legality afterwards.",
    relearnMoves: "Relearn moves",
    suggestRelearn: "Fill suggested moves",
    clearRelearn: "Clear all four slots",
    applyRelearn: "Apply relearn moves",
    relearnNote:
      "Stores four relearn moves independently without changing current moves or PP. PKHeX analysis suggestions fill the form only; review, apply, then check legality again.",
    pokemonFiles: "Pokémon files",
    choosePokemonFile: "Choose a Pokémon file",
    importPokemonFile: "Import to selected slot",
    exportPokemonFile: "Export this Pokémon",
    pokemonFileNote:
      "Import replaces the selected slot and uses PKHeX conversion to the save format, which may change some data. It can be undone. Export creates a decrypted Pokémon file.",
    pokemonFileError:
      "The Pokémon file is invalid, too large or cannot be converted to this save format.",
    storageSettings: "Organize Pokémon",
    targetBox: "Destination",
    targetSlot: "Target slot",
    movePokemon: "Move to empty slot",
    swapPokemon: "Swap positions",
    copyPokemon: "Copy to target",
    deletePokemon: "Delete this Pokémon",
    storageNote:
      "Copy replaces the target. Party deletion shifts later members; an empty party target appends. All operations can be undone.",
    storageError:
      "Invalid, locked or unsuitable slot. Moving requires an empty target.",
    boxSettings: "Box settings",
    boxName: "Box name",
    wallpaper: "Wallpaper",
    boxBatchError:
      "The operation, range or Pokémon data cannot be processed. No changes were applied.",
    propertyBatchError:
      "Property batch editing could not finish. Check the instructions and scope, or generate a new preview. The working copy is unchanged.",
    boxLayoutError: "Check the unlocked box count, box flags and swap target.",
    boxValueError:
      "Invalid box name or wallpaper. Check the length, characters and selection.",
    ...saveEditorCopy.en,
    title: "PKHeX · Save Editor",
    shortTitle: "Save Editor",
    legality: "Legality report",
    checkLegality: "Check legality",
    legalityValid: "PKHeX checks passed",
    legalityInvalid: "PKHeX found issues",
    legalityIncomplete: "Analysis did not complete",
    legalityDetails: "Show detailed report",
    legalityNote:
      "Checks applied data in the working copy. A valid save checksum is separate from Pokémon legality.",
    editPokemon: "Edit Pokémon",
    basicPokemonEdit: "Basic data",
    makeEgg: "Convert to egg",
    makeEggNote:
      "Apply upstream egg naming, cycle and encounter rules and clear applicable memories. Generation III handheld data changes to Japanese egg data and name display may change. Keep a non-egg party member. You can undo; check legality afterward.",
    shinyEdit: "Shiny editing",
    shinyMethod: "Edit method",
    shinyTarget: "Target state",
    shinyPid: "Change personality value (PID)",
    shinySid: "Change secret trainer ID (SID)",
    shinyAny: "Shiny",
    shinyStar: "Star shiny (XOR 1)",
    shinySquare: "Square shiny (XOR 0)",
    shinyOff: "Not shiny",
    applyShiny: "Apply shiny state",
    shinyPidNote:
      "Changes PID and the applicable encryption constant for older origins. Trainer IDs are preserved; encounter correlations may change. Recheck legality.",
    shinySidNote:
      "Preserves PID and encryption constant and changes this Pokémon’s secret trainer ID. Its original trainer identity changes; the save trainer and profiles are not updated.",
    shinyTypeNote:
      "Star and square requests use XOR values; appearance also depends on the game, event and GO origin rules. Unsatisfiable constraints leave the original unchanged. You can undo.",
    shinyNoSolution:
      "No shiny PID satisfies the current form, nature, gender and ability constraints. Use SID editing or adjust those fields first.",
    eggDetails: "Egg and hatching",
    hatchCounter: "Remaining hatch cycles",
    hatchCounterNote:
      "This is a cycle counter, not a step count. Values 0–255 can be stored; use legality analysis to check the encounter-specific range.",
    hatchMinimum: "Minimum cycles for this format",
    applyHatchCounter: "Apply hatch cycles",
    hatchEgg: "Hatch using core rules",
    hatchEggNote:
      "Hatching updates egg status, default name, friendship, location, current date and applicable memories. The original is preserved and you can undo. Unsaved cycle values above are not applied.",
    originDetails: "Origin and locations",
    originDetailsNote:
      "Changing the origin game updates ball and location choices. Existing values are retained for review before applying. Check legality after editing.",
    originGame: "Origin game",
    captureBall: "Poké Ball",
    metLocation: "Met location",
    eggLocation: "Egg received location",
    loadOriginChoices: "Load origin and location choices",
    applyOriginDetails: "Apply origin and locations",
    originUnlisted: "Existing value outside current choices",
    encounterDetails: "Encounter records",
    encounterDetailsNote:
      "Apply only changed fields here. Clear a date to remove it. Origin game, locations and egg status are preserved. Check legality after editing.",
    metLevel: "Met level",
    metDate: "Met date",
    eggDate: "Egg received date",
    fatefulEncounter: "Fateful encounter",
    applyEncounterDetails: "Apply encounter records",
    formArgument: "Special form parameters",
    formRemain: "Days remaining",
    formElapsed: "Days elapsed",
    formMaximum: "Longest streak (days)",
    formCounter: "Form counter",
    formDecoration: "Sweet",
    applyFormArgument: "Apply form parameters",
    formArgumentNote:
      "Fields and limits follow species, form and format. Timer bytes allow 0–255; check legality afterward. For Gen VI party Furfrou, the longest streak is set to the elapsed days.",
    formPartyOnlyNote:
      "This format stores remaining and elapsed days only in the party; boxes do not retain those fields.",
    rawPokemonValues: "Advanced: PID and encryption constant",
    pidHex: "PID (hexadecimal)",
    ecHex: "Encryption constant (hexadecimal)",
    applyRawValues: "Apply raw values",
    rerollPid: "Reroll PID",
    rerollEc: "Reroll encryption constant",
    rawValueError:
      "Enter 1–8 hexadecimal digits (0–9, A–F); blanks are not allowed.",
    rawPokemonNote:
      "Direct edits may change shininess, nature, gender or form and break encounter correlations. Check legality afterward. Rerolls use PKHeX rules; older origins may require the encryption constant to match the PID. Only this section is applied, and changes can be undone.",
    ppUps: "PP Ups",
    healPp: "Restore PP",
    applyPokemon: "Apply to working copy",
    moveId: "Move ID",
    undo: "Undo last change",
    restoreSave: "Restore original save",
    workingCopyNote:
      "Changes apply to the working copy and can be undone. Export creates a new file. Stats are recalculated after editing.",
    pokemonValueError:
      "Check Pokémon names, level, value limits and total EVs (up to 510).",
    pokemonSaved: "Working copy updated. Continue editing or export.",
    open: "Open save",
    close: "Close save",
    reset: "Reset changes",
    export: "Export save copy",
    trainer: "Trainer information",
    trainerName: "Trainer name",
    tid: "Public ID (TID)",
    sid: "Secret ID (SID)",
    money: "Money",
    checksums: "Checksums",
    displayIds: "In-game display IDs",
    playTime: "Play time",
    trainerMale: "Male",
    trainerFemale: "Female",
    trainerHours: "Play time: hours",
    trainerMinutes: "Play time: minutes",
    trainerSeconds: "Play time: seconds",
    trainerTimeNote:
      "Minutes and seconds use PKHeX's two-digit input and are saved modulo 60 (75 becomes 15). Unchanged original values are preserved.",
    trainerAppearanceNote:
      "In Sword/Shield, changing gender resets appearance and clothing using the current skin tone. Undo restores the previous state.",
    applyTrainer: "Apply trainer changes",
    trainerGameVersion: "Game version marker",
    trainerGameVersionNote:
      "Changes the version marker only, without converting the save format or Pokémon origins. Profile linking is unavailable when the SM/USUM format does not match.",
    trainerGameVersionError:
      "This save does not support the selected game version.",
    trainerAppearance6Error:
      "Invalid nickname or appearance value, or the trainer gender changed. Check the limits or reset the nickname and appearance draft.",
    pokedexTitle: "Pokédex",
    pokedexRead: "Read Pokédex",
    pokedexSeen: "Seen",
    pokedexCaught: "Caught",
    pokedexSeenAll: "Seen all",
    pokedexSeenNone: "Seen none",
    pokedexCaughtAll: "Caught all",
    pokedexCaughtNone: "Caught none",
    pokedexSearch: "Search Pokémon name or number",
    pokedexNoMatches: "No matching Pokémon.",
    pokedexCounts: "Seen {seen} / {total}, caught {caught} / {total}",
    pokedexApply: "Apply Pokédex changes",
    pokedexReset: "Reset Pokédex draft",
    pokedexNote:
      "Seen and caught are independent. Bulk buttons affect the whole Pokédex; search only filters the view. Apply writes to the working copy and can be undone.",
    pokedexGen2:
      "Applying fills the letter records for caught Unown and repairs an empty first-seen record, following PKHeX.",
    pokedexGen3: "Applying synchronizes all three copies of the seen flags.",
    pokedexVc:
      "The original filename identifies the special FireRed/LeafGreen mode. Applying clears disallowed caught flags while keeping their seen flags.",
    pokedexOnly:
      "Pokédex editing is available for this format; other editors are still being integrated.",
    pokedexError:
      "Invalid Pokédex data, entry or filename, or this format is not supported yet.",
    trainerLanguage: "Save language",
    recordsTitle: "Game records",
    recordsRead: "Read game records",
    recordsChoose: "Record name or index",
    recordsValue: "Record value",
    recordsApply: "Apply record change",
    recordsClamp:
      "The normal maximum is {max}. Editing an existing over-limit value clamps it to the normal maximum.",
    recordsNegative:
      "The original record is negative and remains unchanged until edited. New values must be nonnegative integers.",
    recordsTime: "Time interpretation",
    recordsDetails: "Record details",
    recordsSourceName: "Upstream name",
    recordsOffset: "Record block offset",
    recordsError:
      "Unable to edit this record. Check its index and value range.",
    recordsRepresentError:
      "This format cannot read back the requested record value. The change was cancelled.",
    trainerCurrencyNames: {
      bp: "Battle Points (BP)",
      pokeMiles: "Poké Miles",
      festivalCoins: "Festival Coins",
      watts: "Watts",
    },
    trainerCurrencyNotes: {
      bp: "",
      pokeMiles:
        "Sets current and total Poké Miles to the same value when changed.",
      festivalCoins:
        "Recalculates total Festival Coins from spent coins and the new balance.",
      watts:
        "Raises total earned Watts when the new balance exceeds that record.",
    },
    trainerCurrencyError:
      "Enter a whole number within this save's supported range. Do not leave it blank.",
    trainerBadges: "Badges",
    trainerGameOptions: "Game options",
    trainerDates: "Dates and times",
    trainerDatePrecision: {
      date: "Date only",
      minute: "Minute precision",
      second: "Second precision",
      utc: "Local time",
    },
    trainerDateEmpty:
      "Original date is empty or invalid. Leave blank to preserve it; enter a date to replace it.",
    trainerDateUtcNote:
      "Converted using this device’s timezone; original fractional seconds are preserved. Repeated DST times follow browser rules; unchanged dates keep their original timestamps.",
    trainerDateNames: {
      started: "Adventure started",
      fame: "First Hall of Fame",
      saved: "Last saved",
    },
    trainerDateNote:
      "Game clock values without timezone conversion. Each field uses the indicated precision; unchanged original dates are preserved.",
    trainerDateError:
      "Invalid date, outside the allowed range, or unsupported save format.",
    trainerPosition: "Map position",
    trainerSpatialNames: {
      map: "Map ID",
      x: "X coordinate",
      z: "Z coordinate",
      y: "Y coordinate",
      rotation: "Rotation",
      scaleX: "X scale",
      scaleZ: "Z scale",
      scaleY: "Y scale",
    },
    trainerSpatialPlaces: "Up to {value} decimal places",
    trainerSpatialTruncate:
      "Upstream storage truncates this value to {value} when applied.",
    trainerSpatialInvalid:
      "Original value is not finite. Leave unchanged to preserve it, or enter a valid replacement.",
    trainerSpatialNote:
      "Only changed fields are written. Floating-point precision and rotation follow the game format; applied values are read back.",
    trainerSpatialGen6:
      "Coordinates use upstream 1/18 units; changed fields update their linked positions.",
    trainerSpatialGen7:
      "Coordinates use upstream 1/60 units. Position edits synchronize overworld coordinates; unedited rotation is preserved.",
    trainerPositionNames: {
      map: "Map ID",
      x: "X coordinate",
      z: "Z coordinate",
      y: "Y coordinate",
    },
    trainerPositionNote:
      "Applied with trainer details. Only changed position fields are written.",
    trainerPositionMirror:
      "Applied with trainer details. Changing X/Y also updates its linked coordinate; other position fields are preserved.",
    trainerPositionWrap:
      "Following upstream storage rules, this negative Z value will display as {value} after applying.",
    trainerPositionError:
      "Map position editing is unsupported or the coordinates are out of range.",
    trainerPositionRepresentError:
      "This value cannot be saved while preserving other position data. The edit was cancelled.",
    trainerGameOptionNames: {
      textSpeed: "Text speed",
      battleStyle: "Battle style",
      sound: "Sound",
      battleEffects: "Battle effects",
    },
    trainerGameOptionChoices: {
      textSpeed: ["0 · Slow", "1 · Mid", "2 · Fast", "3", "4", "5", "6", "7"],
      battleStyle: ["Shift", "Set"],
      sound: ["Mono", "Stereo"],
      battleEffects: ["Off", "On"],
    },
    trainerGameOptionsNote:
      "Applied with the trainer details. Existing text speeds 4–7 are preserved; this core cannot write those values unchanged, so new selections are unavailable.",
    trainerGameOptionsError:
      "These game options are unsupported or out of range.",
    trainerTextSpeedError:
      "This core cannot preserve the requested text speed. The original remains unchanged; choose 0–3.",
    trainerBadge: "Badge {n}",
    trainerBadgesNote:
      "Changes the selected badges without completing gym story events or unlocking maps.",
    trainerBadgesError: "This badge selection is unavailable for the save.",
    trainerConsoleRegion: "3DS region",
    trainerGeographyError:
      "Choose a supported country, its region, and a 3DS region.",
    trainerLanguageNote:
      "Changes the game's saved language. It does not change this tool's interface language or translate existing Pokémon names.",
    trainerLanguageError:
      "Choose a language supported by this save. Language editing may be unavailable for this format.",
    trainerValueError:
      "Check trainer gender and play time: hours 0–65535, minutes and seconds 0–99.",
    trainerSkinError:
      "The saved skin tone is unrecognized, so appearance cannot be reset for a gender change. The original file is unchanged.",
    partyBoxes: "Party / Boxes",
    generation: "Generation",
    profileName: "Profile name",
    apply: "Apply to profile",
    pokemon: "Pokémon",
    party: "Party",
    box: "Box",
    slot: "Slot",
    empty: "No Pokémon here.",
    readPokemon: "Select party or box Pokémon to browse and edit basic data.",
    nickname: "Nickname",
    species: "Species",
    formChoice: "Form",
    defaultForm: "Default form",
    useSpeciesName: "Use species name",
    identityNote:
      "Species or form changes recalculate experience at the selected level and update abilities, gender and special form parameters. Using the species name updates the name in the Pokémon's own language when applied. Check legality for special forms.",
    level: "Level",
    form: "Form ID",
    gender: "Gender",
    shiny: "Shiny",
    egg: "Egg",
    nature: "Nature",
    statNature: "Stat nature",
    pidChangeNote:
      "Changing nature or ability in older formats may regenerate the PID and change shininess or encounter correlations. Recheck legality after applying; changes can be undone.",
    ability: "Ability",
    item: "Held item",
    moves: "Moves",
    ivs: "IVs",
    evs: "EVs",
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    spAttack: "Sp. Attack",
    spDefense: "Sp. Defense",
    speed: "Speed",
    originalTrainer: "Original trainer",
    experience: "Experience",
    friendship: "Friendship",
    yes: "Yes",
    no: "No",
    male: "Male",
    female: "Female",
    genderless: "Genderless",
    invalidPokemon:
      "Invalid Pokémon checksum; displayed data may be unreliable.",
    failure: "Unable to process this save. The original file is unchanged.",
    sizeError: "Choose a save between 1 byte and 32 MiB.",
    fileError:
      "Unrecognized save. Choose decrypted save data, not a ROM or encrypted container.",
    zipError: "Extract the ZIP before opening its save.",
    rivalError:
      "The rival name accepts up to 7 characters and must be losslessly encoded by this game. Raw name bytes require 16 hex digits.",
    br4Error:
      "Cannot apply the Battle Revolution operation. Check the player record, gear position and current save.",
    br4Stale:
      "The save or selected player has changed. Read the gear again and regenerate the preview.",
    br4Game: "Pokémon Battle Revolution",
    pokeathlon4Error:
      "Cannot apply the Pokéathlon operation. Check positions, numeric limits, species and Generation IV forms.",
    pokeathlon4NameError:
      "Trainer names allow seven characters and must roundtrip exactly. Raw name bytes use 32 hex digits.",
    pokeathlon4Stale:
      "The save has changed. Read the Pokéathlon data again and regenerate the medal preview.",
    pokegear4Error:
      "Cannot apply the contact operation. Slots are 1–75 and raw values are -128–127. Check the contact and current save state.",
    pokegear4Stale:
      "The save has changed. Read the contacts again and regenerate the batch preview.",
    secretBase3NameError:
      "The base name must be losslessly encoded using the record's language, with up to 7 characters. Raw name bytes require 14 hex digits.",
    secretBase3Error:
      "Secret base operations could not be applied. Check the physical base/member positions, IDs and current-game choices. New levels are 2–100 and the uniform EV is 0–85.",
    misc3Error:
      "Main settings could not be applied. Check coins 0–9999, icon species 0–386 and the current save state.",
    mirageSourceError:
      "The first raw party PID changed. Read the Mirage Island source again.",
    nameError:
      "Trainer name is empty, too long or contains unsupported characters.",
    valueError: "Invalid value. Check the ID and money limits.",
    runtimeError:
      "The save core could not load. Reconnect and reload the page.",
    timeoutError:
      "Processing timed out. Reopen the save; the original file is unchanged.",
    exportError: "Export verification failed. No file was exported.",
    games: {
      ruby: "Ruby",
      sapphire: "Sapphire",
      emerald: "Emerald",
      firered: "FireRed",
      leafgreen: "LeafGreen",
      colosseum: "Colosseum",
      xd: "XD",
      diamond: "Diamond",
      pearl: "Pearl",
      platinum: "Platinum",
      heartgold: "HeartGold",
      soulsilver: "SoulSilver",
      black: "Black",
      white: "White",
      black2: "Black 2",
      white2: "White 2",
      x: "X",
      y: "Y",
      "omega-ruby": "Omega Ruby",
      "alpha-sapphire": "Alpha Sapphire",
      sun: "Sun",
      moon: "Moon",
      "ultra-sun": "Ultra Sun",
      "ultra-moon": "Ultra Moon",
      sword: "Sword",
      shield: "Shield",
      brilliantdiamond: "Brilliant Diamond",
      shiningpearl: "Shining Pearl",
    },
  },
  ja: {
    misc4Error: misc4Words.ja.invalid,
    misc4Stale: misc4Words.ja.stale,
    underground4Error: ug4Words.ja.invalid,
    underground4Stale: ug4Words.ja.stale,
    honey4Error: honey4Words.ja.invalid,
    honey4Stale: honey4Words.ja.stale,
    geonet4Error: geonet4Words.ja.invalid,
    geonet4Stale: geonet4Words.ja.stale,
    video4Error: video4Words.ja.invalid,
    video4Stale: video4Words.ja.stale,
    brTrainer4Error: brTrainer4Words.ja.invalid,
    battlePassError: battlePass4Words.ja.invalid,
    gsBallError: gsBall2Words.ja.error,
    pokedexResetOnly:
      "この形式は図鑑、イベントのリセット、殿堂入り記録の編集に対応しています。トレーナー編集は開発中です。",
    pokedexEventsOnly:
      "この形式は図鑑とイベントの編集に対応しています。トレーナー編集は開発中です。",
    hallError:
      "殿堂入りデータや操作が無効、または名前をこのセーブに符号化できません。変更は適用されていません。",
    eventError:
      "イベントデータが無効か、このセーブでは使用できません。変更は適用されていません。",
    eventCompareError:
      "比較には同じゲームバージョンとイベント構造のセーブが2つ必要です。",
    eventCompareSize:
      "比較するセーブは空でない1 MiB以下のファイルにしてください。",
    boxImportError: boxImportWords.ja.error,
    boxBinaryError: boxBinaryWords.ja.error,
    boxArchiveError: boxArchiveWords.ja.error,
    boxArchiveEmpty: boxArchiveWords.ja.empty,
    fileBatchError: fileBatchWords.ja.error,
    fileBatchLimits: fileBatchWords.ja.limits,
    fileBatchPaths: fileBatchWords.ja.paths,
    inventory: "バッグ",
    bagAdvanced: "高度な編集（HaX）",
    bagAdvancedNote:
      "このバージョンの全道具を表示し、個別の数量制限を緩和します。異なるポケットの道具や通常範囲外の数量はゲーム内で使えない場合があります。形式が値をそのまま保存できなければ変更を拒否します。一括操作は通常の道具と数量の規則に従います。モード切替で未適用の編集内容は破棄されます。",
    bagBatchTitle: "現在のポケットを整理",
    bagBatchNote:
      "現在のポケットの適用済みデータを対象とし、未適用の個別編集は含みません。名前順は現在の言語を使い、個数は道具別の上限に収めます。すべて元に戻せます。",
    bagAction: "操作",
    bagSortName: "名前順(昇順)",
    bagSortNameReverse: "名前順(降順)",
    bagSortCount: "個数順(昇順)",
    bagSortCountReverse: "個数順(降順)",
    bagSortId: "種類順(昇順)",
    bagSortIdReverse: "種類順(降順)",
    bagSetCount: "既存の道具の個数を統一",
    bagGiveAll: "すべて入手",
    bagClearAll: "現在のポケットを空にする",
    bagApplyBatch: "ポケット操作を適用",
    bagCapacityOrder: "容量不足時の選択方法",
    bagOrdered: "リスト順",
    bagRandom: "ランダム",
    bagGiveAllNote:
      "現在のポケットの内容とフラグを置き換え、コアの入手ルールで許可された道具のみ追加します。",
    bagCrampedNote:
      "リストがポケット容量を超えるため、選択した方法で空きスロットを埋めます。",
    bagClearAllNote:
      "現在のポケットの道具とフラグをすべて消去します。他のポケットは保持します。",
    inventoryReadNote:
      "道具の種類・個数・フラグを編集するか、ポケットの整理を開きます。作業コピーに適用後、元に戻すか出力できます。読み取り時は異常値を自動削除しません。道具画像は未対応です。",
    editBagItem: "道具を編集",
    revertBagItem: "道具の変更を戻す",
    clearBagItem: "このスロットを空にする",
    applyBagItem: "道具の変更を適用",
    loadInventory: "バッグを読み込む",
    noInventory: "このセーブにはバッグデータがありません。",
    bagPouch: "ポケット",
    searchInventory: "道具名または番号を検索",
    showEmptyInventory: "空きスロットを表示",
    bagItem: "道具",
    bagCount: "個数",
    bagFlags: "フラグ",
    bagFavorite: "お気に入り",
    bagNew: "新規",
    bagFreeSpace: "フリースペース",
    bagFreeSpaceIndex: "フリースペースの順番",
    bagNewShop: "ショップの新商品",
    bagHeld: "持たせている",
    bagMax: "上限",
    bagUnusual: "ポケットの通常範囲外",
    noInventoryResults: "該当する道具がありません。",
    bagPrevious: "前のページ",
    bagNext: "次のページ",
    bagPouches: {
      None: "なし",
      Items: "どうぐ",
      KeyItems: "たいせつなもの",
      TMHMs: "わざマシン",
      Medicine: "かいふく",
      Berries: "きのみ",
      Balls: "ボール",
      BattleItems: "せんとうよう",
      MailItems: "メール",
      PCItems: "パソコンのどうぐ",
      FreeSpace: "フリースペース",
      ZCrystals: "Ｚクリスタル",
      Candy: "アメ",
      Treasure: "おたから",
      Ingredients: "しょくざい",
      MegaStones: "メガストーン",
    },
    trainingTitle: "すごいとっくんとコンテスト",
    contestTitle: "コンテスト能力",
    hyperTitle: "すごいとっくん",
    contestCool: "かっこよさ",
    contestBeauty: "うつくしさ",
    contestCute: "かわいさ",
    contestSmart: "かしこさ",
    contestClever: "かしこさ",
    contestTough: "たくましさ",
    contestSheen: "けづや",
    maxContest: "コンテスト能力をすべて 255 にする",
    clearContest: "コンテスト能力を消去",
    allHyper: "すべてに特訓フラグを設定",
    clearHyper: "すべての特訓フラグを消去",
    revertTraining: "特訓の下書きを戻す",
    applyTraining: "特訓の変更を適用",
    hyperNote:
      "特訓フラグだけを変更し、元の個体値は維持します。手動設定はゲーム内条件を満たすことを保証しません。合法性を確認してください。手持ちの能力値を再計算し、現在 HP は新しい上限を超える場合のみ下げ、状態異常は維持します。",
    historyTitle: "現在の持ち主と居住履歴",
    loadHistory: "トレーナー履歴を読み込む",
    currentHolder: "現在の持ち主",
    residenceHistory: "居住履歴",
    historyCountry: "国・地域",
    historyRegion: "地方",
    clearResidence: "この記録を消去",
    clearAllResidences: "すべての居住履歴を消去",
    revertHistory: "履歴の下書きを戻す",
    applyHistory: "トレーナー履歴を適用",
    historyNote:
      "持ち主の切り替えには受け取り側の名前が必要です。現在の持ち主のフラグだけを変更します。居住履歴の順序は維持されます。国を変更すると地方が初期化され、記録を消去しても他の記録は移動しません。適用するまでは下書きです。",
    clearMemory: "思い出を空にする",
    memoryTitle: "思い出とふれあい",
    careTitle: "なつき度とふれあいの値",
    applyCare: "ふれあいの値を適用",
    careNote:
      "この形式で保存される項目のみ表示します。範囲は 0～255 です。受け取り側の項目はトレーナーの履歴に従って有効になります。",
    careEggNote:
      "タマゴの最初の親のなつき度は、残りの孵化サイクルを記録しています。変更すると孵化の進行も変わります。",
    careNames: {
      originalFriendship: "最初の親のなつき度",
      handlingFriendship: "受け取り側のなつき度",
      originalAffection: "最初の親のなかよし度",
      handlingAffection: "受け取り側のなかよし度",
      fullness: "満腹度",
      enjoyment: "満足度",
      sociability: "社交性",
    },
    loadMemory: "思い出を読み込む",
    memoryTrainer: "思い出のトレーナー",
    handlingTrainer: "引き取ったトレーナー",
    memoryEvent: "思い出",
    memoryArgument: "関連する対象・場所",
    memoryIntensity: "強さ",
    memoryFeeling: "気持ち",
    applyMemory: "思い出を適用",
    revertMemory: "思い出の下書きを戻す",
    memoryUnavailable:
      "上流のトレーナー履歴の規則により、この思い出は現在編集できません。",
    memoryNote:
      "思い出に応じて対象、場所、道具、技の候補が切り替わります。内容を変更すると関連値をリセットし、思い出なしでは関連値、強さ、気持ちを消去します。トレーナーの切替前に下書きを適用または戻し、最後に合法性を確認してください。",
    revertRibbonDraft: "リボンの下書きを戻す",
    ribbonStatuses: {
      unchecked: "解析未完了",
      missing: "不足",
      invalid: "問題あり",
      possible: "コア判定で取得可能",
      mark: "出会いのあかし",
      unmarked: "特別な指摘なし",
    },
    ribbonAnalysisNote:
      "表示は適用済みデータの解析です。下書きを適用してから再確認してください。取得可能でも個体全体の合法性を保証しません。",
    ribbonSuggest: "コアの推奨を適用",
    ribbonMinimal: "コアの規則で最小化",
    ribbonSuggestNote:
      "作業コピーを直接変更し、元に戻せます。推奨は任意の項目を除去してから取得可能なリボンを追加し、スパトレなど関連項目も変更する場合があります。最小化は必須項目を残し、付ける設定を解除します。下書きを適用または戻してから操作し、全体の合法性を再確認してください。",
    ribbonTitle: "リボンとあかし",
    loadRibbons: "リボンとあかしを読み込む",
    searchRibbons: "名前を検索",
    ownedRibbons: "所持のみ表示",
    affixedRibbon: "付けるリボン・あかし",
    noAffixedRibbon: "付けない",
    allRibbons: "すべて最大にする",
    clearRibbons: "すべて空にする",
    applyRibbons: "リボンとあかしを適用",
    ribbonNote:
      "形式に応じて所持状態、個数、付ける項目を編集します。一括操作はリスト全体の下書きに反映され、適用後も元に戻せます。所持や選択が出会いの条件に合うとは限らないため、適用後に合法性を確認してください。",
    relearnMoves: "思い出し技",
    suggestRelearn: "推奨技を入力",
    clearRelearn: "4枠を空にする",
    applyRelearn: "思い出し技を適用",
    relearnNote:
      "現在の技やPPを変更せず、4つの思い出し技を保存します。PKHeXの解析による推奨値はフォームへの入力のみです。確認して適用した後、合法性を再確認してください。",
    pokemonFiles: "ポケモンファイル",
    choosePokemonFile: "ポケモンファイルを選択",
    importPokemonFile: "選択位置に読み込む",
    exportPokemonFile: "このポケモンを書き出す",
    pokemonFileNote:
      "読み込みは選択位置を置き換え、PKHeXでセーブ形式へ変換します。一部のデータは変わる場合があります。元に戻せます。書き出しは非暗号化の単体ファイルです。",
    pokemonFileError:
      "ファイルが無効、大きすぎる、またはこのセーブ形式に変換できません。",
    storageSettings: "ポケモンの整理",
    targetBox: "移動先",
    targetSlot: "移動先の位置",
    movePokemon: "空きへ移動",
    swapPokemon: "位置を交換",
    copyPokemon: "コピー",
    deletePokemon: "このポケモンを削除",
    storageNote:
      "コピーは移動先を置き換えます。手持ちの削除後は前詰めし、空きへの追加は末尾になります。すべて元に戻せます。",
    storageError:
      "位置が無効、ロック中、または操作条件を満たしていません。移動先は空きを選択してください。",
    boxSettings: "ボックス設定",
    boxName: "ボックス名",
    wallpaper: "壁紙",
    boxBatchError:
      "操作・範囲・ポケモンのデータを処理できません。変更は適用されていません。",
    propertyBatchError:
      "一括編集を完了できませんでした。命令と範囲を確認するか、プレビューを作り直してください。作業コピーは変更されていません。",
    boxLayoutError: "解放数・ボックスフラグ・交換先を確認してください。",
    boxValueError:
      "ボックス名または壁紙が無効です。文字数、文字、選択を確認してください。",
    ...saveEditorCopy.ja,
    title: "PKHeX · セーブ編集",
    shortTitle: "セーブ編集",
    legality: "合法性レポート",
    checkLegality: "合法性を確認",
    legalityValid: "PKHeX の検査を通過",
    legalityInvalid: "PKHeX が問題を検出",
    legalityIncomplete: "解析が完了しませんでした",
    legalityDetails: "詳細レポートを表示",
    legalityNote:
      "作業用コピーに適用済みのデータを解析します。セーブのチェックサムとポケモンの合法性は別の検査です。",
    editPokemon: "ポケモンを編集",
    basicPokemonEdit: "基本データ",
    makeEgg: "タマゴに変換",
    makeEggNote:
      "上流の規則で名前・サイクル・出会いの記録を設定し、該当する思い出を消去します。第三世代の携帯機形式は日本語のタマゴデータとなり、名前の表示が変わる場合があります。手持ちにタマゴ以外を残してください。元に戻せます。合法性を確認してください。",
    shinyEdit: "色違いの編集",
    shinyMethod: "変更方法",
    shinyTarget: "目標の状態",
    shinyPid: "性格値（PID）を変更",
    shinySid: "裏トレーナー ID（SID）を変更",
    shinyAny: "色違い",
    shinyStar: "星型（XOR 1）",
    shinySquare: "四角型（XOR 0）",
    shinyOff: "通常色",
    applyShiny: "色違い状態を適用",
    shinyPidNote:
      "PID と旧世代由来の該当する暗号化定数を変更します。親の ID は保持されます。出会いの関連が変わるため合法性を再確認してください。",
    shinySidNote:
      "PID と暗号化定数を保持して、このポケモンの裏 ID を変更します。親の識別情報が変わりますが、セーブのトレーナーやプロフィールは変更しません。",
    shinyTypeNote:
      "星型と四角型は XOR 値で設定します。実際の表示はゲーム・配信・GO 由来の規則にも依存します。条件を満たせない場合は元のデータを保持します。元に戻せます。",
    shinyNoSolution:
      "現在のフォルム・性格・性別・特性の条件を満たす色違い PID がありません。裏 ID 方式を使うか、先に条件を変更してください。",
    eggDetails: "タマゴと孵化",
    hatchCounter: "残り孵化サイクル",
    hatchCounterNote:
      "残り歩数ではなくサイクル数です。0–255 を保存できます。出会いごとの範囲は合法性チェックで確認してください。",
    hatchMinimum: "この形式の最小孵化サイクル",
    applyHatchCounter: "孵化サイクルを適用",
    hatchEgg: "コアの規則で孵化",
    hatchEggNote:
      "タマゴ状態・種族名・なつき度・場所・現在の日付・該当する思い出を更新します。元ファイルは保持し、元に戻せます。上の未保存サイクル値は適用しません。",
    originDetails: "出身と場所",
    originDetailsNote:
      "出身ゲームを選ぶとボールと場所の選択肢が更新されます。既存の値は保持されるため、確認してから適用してください。編集後に合法性を確認できます。",
    originGame: "出身ゲーム",
    captureBall: "ボール",
    metLocation: "出会った場所",
    eggLocation: "タマゴを受け取った場所",
    loadOriginChoices: "出身と場所の選択肢を読み込む",
    applyOriginDetails: "出身と場所を適用",
    originUnlisted: "現在の選択肢にない既存値",
    encounterDetails: "出会いの記録",
    encounterDetailsNote:
      "ここで変更した項目のみ適用します。日付を空にすると記録を削除します。出身ゲーム・場所・タマゴ状態は保持されます。編集後に合法性を確認できます。",
    metLevel: "出会ったレベル",
    metDate: "出会った日",
    eggDate: "タマゴを受け取った日",
    fatefulEncounter: "運命的な出会い",
    applyEncounterDetails: "出会いの記録を適用",
    formArgument: "特殊フォルムの設定",
    formRemain: "残り日数",
    formElapsed: "経過日数",
    formMaximum: "最長維持日数",
    formCounter: "フォルムのカウント",
    formDecoration: "アメざいく",
    applyFormArgument: "フォルムの設定を適用",
    formArgumentNote:
      "種類・フォルム・世代に応じた項目と上限です。日数は0～255を保存できますが、適用後に合法性を確認してください。第六世代の手持ちトリミアンでは最長維持日数が経過日数と同期します。",
    formPartyOnlyNote:
      "この形式の残り日数と経過日数は手持ち専用で、ボックスには保存されません。",
    rawPokemonValues: "詳細：性格値と暗号化定数",
    pidHex: "性格値（PID、16進数）",
    ecHex: "暗号化定数（16進数）",
    applyRawValues: "値を適用",
    rerollPid: "性格値を再生成",
    rerollEc: "暗号化定数を再生成",
    rawValueError:
      "1～8桁の16進数（0～9、A～F）を入力してください。空欄は使用できません。",
    rawPokemonNote:
      "直接編集すると色違い、性格、性別、フォルムや出会いの関連が変わる場合があります。適用後に合法性を確認してください。再生成はPKHeXの規則に従い、旧世代出身では暗号化定数がPIDと同じになる場合があります。この欄の操作だけを適用し、元に戻せます。",
    ppUps: "PPアップ回数",
    healPp: "PPを回復",
    applyPokemon: "作業用コピーに適用",
    moveId: "技番号",
    undo: "直前の変更を取り消す",
    restoreSave: "元のセーブに戻す",
    workingCopyNote:
      "変更は作業用コピーに適用され、取り消せます。出力時に新しいファイルを作成します。能力値は再計算されます。",
    pokemonValueError:
      "名前、レベル、数値の範囲、努力値合計（最大510）を確認してください。",
    pokemonSaved: "作業用コピーを更新しました。編集を続けるか出力できます。",
    open: "セーブを開く",
    close: "セーブを閉じる",
    reset: "変更を戻す",
    export: "コピーを出力",
    trainer: "トレーナー情報",
    trainerName: "トレーナー名",
    tid: "表 ID（TID）",
    sid: "裏 ID（SID）",
    money: "所持金",
    checksums: "チェックサム",
    displayIds: "ゲーム内表示 ID",
    playTime: "プレイ時間",
    trainerMale: "男性",
    trainerFemale: "女性",
    trainerHours: "プレイ時間：時間",
    trainerMinutes: "プレイ時間：分",
    trainerSeconds: "プレイ時間：秒",
    trainerTimeNote:
      "分と秒は PKHeX と同じ2桁入力で、保存時に60で割った余りになります（75は15）。変更していない元の値は保持します。",
    trainerAppearanceNote:
      "ソード・シールドで性別を変更すると、現在の肌色に合わせて外見と服装をリセットします。取り消しで元に戻せます。",
    applyTrainer: "トレーナーの変更を適用",
    trainerGameVersion: "ゲームバージョンの識別値",
    trainerGameVersionNote:
      "識別値のみ変更し、セーブ形式やポケモンの出身は変換しません。SM・USUM の形式が一致しない場合、プロフィール連携は利用できません。",
    trainerGameVersionError:
      "このセーブでは選択したゲームバージョンを使用できません。",
    trainerAppearance6Error:
      "ニックネーム・外見の値が無効、または性別が変更されています。範囲を確認し、必要なら下書きをリセットしてください。",
    pokedexTitle: "ポケモン図鑑",
    pokedexRead: "図鑑を読み込む",
    pokedexSeen: "見つけた",
    pokedexCaught: "捕まえた",
    pokedexSeenAll: "すべて見つけた",
    pokedexSeenNone: "すべて未発見",
    pokedexCaughtAll: "すべて捕まえた",
    pokedexCaughtNone: "すべて未捕獲",
    pokedexSearch: "ポケモン名・番号で検索",
    pokedexNoMatches: "一致するポケモンはありません。",
    pokedexCounts: "見つけた {seen} / {total}、捕まえた {caught} / {total}",
    pokedexApply: "図鑑の変更を適用",
    pokedexReset: "図鑑の下書きをリセット",
    pokedexNote:
      "発見と捕獲を個別に編集します。一括操作は図鑑全体に適用され、検索は表示のみを絞り込みます。適用後も取り消しで戻せます。",
    pokedexGen2:
      "適用時、捕獲済みアンノーンの文字記録を埋め、最初に見つけた記録が空なら PKHeX と同様に修復します。",
    pokedexGen3: "適用時、3 か所の発見記録を同期します。",
    pokedexVc:
      "元のファイル名から FR/LG の特殊モードを識別しました。適用時に対象外の捕獲フラグを解除し、発見記録は保持します。",
    pokedexOnly:
      "この形式では図鑑を編集できます。他の編集機能は対応作業中です。",
    pokedexError:
      "図鑑データ・項目・ファイル名が無効、または未対応の形式です。",
    trainerLanguage: "セーブの言語",
    recordsTitle: "ゲームの記録",
    recordsRead: "ゲームの記録を読み込む",
    recordsChoose: "記録名または番号",
    recordsValue: "記録値",
    recordsApply: "記録の変更を適用",
    recordsClamp:
      "通常の上限は{max}です。上限を超える元の値を変更すると通常の上限で保存されます。",
    recordsNegative:
      "元の値は負数です。変更しなければ保持されます。新しい値は0以上の整数にしてください。",
    recordsTime: "時間の解釈",
    recordsDetails: "記録の詳細",
    recordsSourceName: "上流の原名",
    recordsOffset: "記録ブロック内の位置",
    recordsError: "記録を変更できません。番号と値の範囲を確認してください。",
    recordsRepresentError:
      "この形式では指定した記録値を読み戻せないため、変更を取り消しました。",
    trainerCurrencyNames: {
      bp: "バトルポイント（BP）",
      pokeMiles: "ポケマイル",
      festivalCoins: "フェスコイン",
      watts: "ワット",
    },
    trainerCurrencyNotes: {
      bp: "",
      pokeMiles: "変更時に現在と累計のポケマイルを同じ値に設定します。",
      festivalCoins: "使用済みコインと新しい残高から累計を再計算します。",
      watts: "残高が累計獲得量を超える場合は累計も引き上げます。",
    },
    trainerCurrencyError:
      "このセーブの対応範囲内の整数を入力してください。空欄にはできません。",
    trainerBadges: "バッジ",
    trainerGameOptions: "ゲーム設定",
    trainerDates: "日付と時刻",
    trainerDatePrecision: {
      date: "日付のみ",
      minute: "分単位",
      second: "秒単位",
      utc: "現地時刻",
    },
    trainerDateEmpty:
      "元の日付が空または無効です。空欄のままなら保持し、入力すると置き換えます。",
    trainerDateUtcNote:
      "端末のタイムゾーンで変換し、元の秒未満の値は保持します。夏時間終了時の重複時刻はブラウザーの規則に従い、未変更の日付は元のタイムスタンプを保持します。",
    trainerDateNames: {
      started: "冒険の開始",
      fame: "初めての殿堂入り",
      saved: "最後の保存",
    },
    trainerDateNote:
      "ゲーム内時計の値です。タイムゾーン変換は行わず、表示された精度で保存します。未変更の日付は保持します。",
    trainerDateError: "無効な日付、範囲外の値、または未対応のセーブ形式です。",
    trainerPosition: "マップと座標",
    trainerSpatialNames: {
      map: "マップ番号",
      x: "X 座標",
      z: "Z 座標",
      y: "Y 座標",
      rotation: "回転",
      scaleX: "X 拡大率",
      scaleZ: "Z 拡大率",
      scaleY: "Y 拡大率",
    },
    trainerSpatialPlaces: "小数点以下 {value} 桁まで",
    trainerSpatialTruncate:
      "上流の保存規則により、適用後の値は {value} になります。",
    trainerSpatialInvalid:
      "元の値が有限数ではありません。未変更なら保持し、有効な値を入力すると置き換えます。",
    trainerSpatialNote:
      "変更した項目のみ書き込みます。浮動小数点の精度と回転はゲームの形式に従い、適用後の値を読み戻して表示します。",
    trainerSpatialGen6:
      "座標は上流と同じ 1/18 単位です。変更した項目の関連座標も更新します。",
    trainerSpatialGen7:
      "座標は上流と同じ 1/60 単位です。位置変更時はフィールド座標も同期し、未変更の回転は保持します。",
    trainerPositionNames: {
      map: "マップ番号",
      x: "X 座標",
      z: "Z 座標",
      y: "Y 座標",
    },
    trainerPositionNote:
      "トレーナー情報と一緒に適用し、変更した位置項目だけを書き込みます。",
    trainerPositionMirror:
      "トレーナー情報と一緒に適用します。X/Y の変更時は対応する関連座標も更新し、他の位置項目は保持します。",
    trainerPositionWrap:
      "上流の保存規則に従い、この負の Z 値は適用後に {value} と表示されます。",
    trainerPositionError:
      "位置編集に対応していないセーブ、または範囲外の座標です。",
    trainerPositionRepresentError:
      "他の位置データを保持したまま保存できない値です。変更を取り消しました。",
    trainerGameOptionNames: {
      textSpeed: "文字の速さ",
      battleStyle: "試合のルール",
      sound: "サウンド",
      battleEffects: "戦闘アニメ",
    },
    trainerGameOptionChoices: {
      textSpeed: [
        "0 · おそい",
        "1 · ふつう",
        "2 · はやい",
        "3",
        "4",
        "5",
        "6",
        "7",
      ],
      battleStyle: ["いれかえ", "かちぬき"],
      sound: ["モノラル", "ステレオ"],
      battleEffects: ["みない", "みる"],
    },
    trainerGameOptionsNote:
      "トレーナー情報と一緒に適用します。元の文字速度4～7は保持できますが、現在のコアではそのまま書き込めないため新たに選択できません。",
    trainerGameOptionsError:
      "このセーブに対応していない設定、または範囲外の値です。",
    trainerTextSpeedError:
      "指定の文字速度をこのコアでは保持できません。元の値は変更せず、0～3を選んでください。",
    trainerBadge: "バッジ {n}",
    trainerBadgesNote:
      "選択したバッジのみ変更します。ジムのイベント完了やマップ解放は行いません。",
    trainerBadgesError: "このセーブではそのバッジ設定を使用できません。",
    trainerConsoleRegion: "3DSの地域",
    trainerGeographyError: "対応する国と地方、3DSの地域を選んでください。",
    trainerLanguageNote:
      "ゲームのセーブ言語を変更します。このツールの表示言語や既存のポケモンの名前は変更しません。",
    trainerLanguageError:
      "このセーブに対応する言語を選んでください。形式によっては言語を編集できません。",
    trainerValueError:
      "性別とプレイ時間を確認してください。時間は0～65535、分と秒は0～99です。",
    trainerSkinError:
      "保存された肌色を認識できないため、外見をリセットして性別を変更できません。元のファイルは変更していません。",
    partyBoxes: "手持ち / ボックス数",
    generation: "世代",
    profileName: "プロファイル名",
    apply: "プロファイルに反映",
    pokemon: "ポケモン",
    party: "手持ち",
    box: "ボックス",
    slot: "位置",
    empty: "ポケモンがいません。",
    readPokemon:
      "手持ちやボックスのポケモンを選び、情報の確認や基本データの編集ができます。",
    nickname: "ニックネーム",
    species: "種類",
    formChoice: "フォルム",
    defaultForm: "通常のフォルム",
    useSpeciesName: "種族名を使う",
    identityNote:
      "種類やフォルムの変更時は現在のレベルから経験値を再計算し、特性・性別・特殊フォルムの値を更新します。種族名を使う場合は適用時にポケモン自身の言語で名前を更新します。特殊なフォルムは合法性を確認してください。",
    level: "レベル",
    form: "フォルム番号",
    gender: "性別",
    shiny: "色違い",
    egg: "タマゴ",
    nature: "性格",
    statNature: "能力値の性格",
    pidChangeNote:
      "旧世代で性格や特性を変更すると性格値（PID）が再生成され、色違いや出会いの関連が変わる場合があります。適用後に合法性を再確認してください。元に戻せます。",
    ability: "特性",
    item: "持ち物",
    moves: "技",
    ivs: "個体値",
    evs: "努力値",
    hp: "HP",
    attack: "攻撃",
    defense: "防御",
    spAttack: "特攻",
    spDefense: "特防",
    speed: "素早さ",
    originalTrainer: "親の名前",
    experience: "経験値",
    friendship: "なつき度",
    yes: "はい",
    no: "いいえ",
    male: "オス",
    female: "メス",
    genderless: "性別不明",
    invalidPokemon:
      "ポケモンのチェックサムが不正です。表示データは参考情報です。",
    failure: "処理に失敗しました。元のファイルは変更されていません。",
    sizeError: "1バイトから32 MiBのセーブを選択してください。",
    fileError:
      "認識できません。ROMや暗号化コンテナではなく復号済みセーブを選択してください。",
    zipError: "ZIPを解凍してからセーブを開いてください。",
    nameError: "名前が空、長すぎる、または使用できない文字を含んでいます。",
    rivalError:
      "ライバル名は7文字までで、このゲームの文字コードで完全に保存できる必要があります。バイト列は16桁の16進数です。",
    br4Error:
      "バトルレボリューションの操作を適用できません。プレイヤー記録、装備位置と現在のセーブを確認してください。",
    br4Stale:
      "セーブや選択プレイヤーが変わりました。装備を再読み込みしてプレビューを作り直してください。",
    br4Game: "ポケモンバトルレボリューション",
    pokeathlon4Error:
      "ポケスロン操作を適用できません。位置、数値上限、種類と第四世代フォルムを確認してください。",
    pokeathlon4NameError:
      "トレーナー名は完全に保存できる七文字までです。元バイト列は32桁の16進数です。",
    pokeathlon4Stale:
      "セーブが変わりました。ポケスロンデータを再読み込みしてメダルのプレビューを作り直してください。",
    pokegear4Error:
      "連絡先の操作を適用できません。位置は 1–75、元の数値は -128–127 です。連絡先と現在のセーブ状態を確認してください。",
    pokegear4Stale:
      "セーブが変わりました。連絡先を再読み込みして一括プレビューを作り直してください。",
    secretBase3NameError:
      "基地名は記録の言語で完全に保存できる7文字までです。バイト列は14桁の16進数です。",
    secretBase3Error:
      "ひみつきちの操作を適用できません。実際の基地・メンバー位置、ID、ゲームの候補を確認してください。新しいレベルは 2–100、共通努力値は 0–85 です。",
    misc3Error:
      "基本設定を適用できません。コイン 0–9999、アイコンの種類 0–386 と現在のセーブ状態を確認してください。",
    mirageSourceError:
      "手持ち先頭スロットの元の性格値が変わりました。マボロシじまの元データを再読み込みしてください。",
    valueError: "IDと所持金の範囲を確認してください。",
    runtimeError:
      "セーブ機能を読み込めません。オンラインで再読み込みしてください。",
    timeoutError: "処理がタイムアウトしました。セーブを開き直してください。",
    exportError: "出力の検証に失敗しました。ファイルは出力されていません。",
    games: {
      ruby: "ルビー",
      sapphire: "サファイア",
      emerald: "エメラルド",
      firered: "ファイアレッド",
      leafgreen: "リーフグリーン",
      colosseum: "コロシアム",
      xd: "XD",
      diamond: "ダイヤモンド",
      pearl: "パール",
      platinum: "プラチナ",
      heartgold: "ハートゴールド",
      soulsilver: "ソウルシルバー",
      black: "ブラック",
      white: "ホワイト",
      black2: "ブラック2",
      white2: "ホワイト2",
      x: "X",
      y: "Y",
      "omega-ruby": "オメガルビー",
      "alpha-sapphire": "アルファサファイア",
      sun: "サン",
      moon: "ムーン",
      "ultra-sun": "ウルトラサン",
      "ultra-moon": "ウルトラムーン",
      sword: "ソード",
      shield: "シールド",
      brilliantdiamond: "ブリリアントダイヤモンド",
      shiningpearl: "シャイニングパール",
    },
  },
};

export function localizeSaveError(
  message: string,
  words: typeof saveEditorResources.en,
) {
  if (/Box import/.test(message)) return words.boxImportError;
  if (/Box binary/.test(message)) return words.boxBinaryError;
  if (/^Entity file/.test(message)) return words.pokemonFileError;
  if (/Box archive contains no/.test(message)) return words.boxArchiveEmpty;
  if (/Box archive/.test(message)) return words.boxArchiveError;
  if (/File batch.*(?:limit|too large)/.test(message))
    return words.fileBatchLimits;
  if (/File batch path/.test(message)) return words.fileBatchPaths;
  if (/File batch/.test(message)) return words.fileBatchError;
  if (/Property batch|Invalid property batch/.test(message))
    return words.propertyBatchError;
  if (/Event comparison files/.test(message)) return words.eventCompareSize;
  if (/Event comparison requires|Event layouts differ/.test(message))
    return words.eventCompareError;
  if (
    /event reset|reset event|event flag|event value|event fields|Event changes|Event edit|Event export|event catalog|event comparison|event query|event language/i.test(
      message,
    )
  )
    return words.eventError;
  if (/GS Ball/i.test(message)) return words.gsBallError;
  if (/Battle Pass.*(?:preview is stale|player changed)/i.test(message))
    return words.br4Stale;
  if (/BR trainer.*(?:stale|player changed)/i.test(message))
    return words.br4Stale;
  if (/battle video4.*stale/i.test(message)) return words.video4Stale;
  if (/Misc4.*stale/i.test(message)) return words.misc4Stale;
  if (/Misc4/i.test(message)) return words.misc4Error;
  if (/Underground4.*stale/i.test(message)) return words.underground4Stale;
  if (/Underground4/i.test(message)) return words.underground4Error;
  if (/HoneyTree4.*stale/i.test(message)) return words.honey4Stale;
  if (/HoneyTree4/i.test(message)) return words.honey4Error;
  if (/Geonet4.*stale/i.test(message)) return words.geonet4Stale;
  if (/Geonet4/i.test(message)) return words.geonet4Error;
  if (/battle video4/i.test(message)) return words.video4Error;
  if (/BR trainer/i.test(message)) return words.brTrainer4Error;
  if (/Battle Pass/i.test(message)) return words.battlePassError;
  if (/Battle Revolution.*valid checksums/i.test(message)) return words.invalid;
  if (/Battle Revolution.*(?:preview is stale|player changed)/i.test(message))
    return words.br4Stale;
  if (/Battle Revolution/i.test(message)) return words.br4Error;
  if (/Pokeathlon4.*valid checksums/i.test(message)) return words.invalid;
  if (/Pokeathlon4 preview is stale/i.test(message))
    return words.pokeathlon4Stale;
  if (/Pokeathlon4 trainer name/i.test(message))
    return words.pokeathlon4NameError;
  if (/Pokeathlon4/i.test(message)) return words.pokeathlon4Error;
  if (/PokeGear4.*valid checksums/i.test(message)) return words.invalid;
  if (/PokeGear4 preview is stale/i.test(message)) return words.pokegear4Stale;
  if (/PokeGear4/i.test(message)) return words.pokegear4Error;
  if (/Gen3 secret base.*valid checksums/i.test(message)) return words.invalid;
  if (/Gen3 secret base name/i.test(message)) return words.secretBase3NameError;
  if (/Gen3 secret base/i.test(message)) return words.secretBase3Error;
  if (/Rival.*name/i.test(message)) return words.rivalError;
  if (/first raw party PID changed/i.test(message))
    return words.mirageSourceError;
  if (/Gen3 main.*valid checksums/i.test(message)) return words.invalid;
  if (/Gen3 main|trainer card icon/i.test(message)) return words.misc3Error;
  if (/Hall of Fame/i.test(message)) return words.hallError;
  if (/^Storage /.test(message)) return words.storageError;
  if (/Box batch|Invalid box batch values/.test(message))
    return words.boxBatchError;
  if (/Invalid box layout values/.test(message)) return words.boxLayoutError;
  if (/box name|box wallpaper|box position/.test(message))
    return words.boxValueError;
  if (/shiny PID has no solution/.test(message)) return words.shinyNoSolution;
  if (/^Pokemon /.test(message)) return words.pokemonValueError;
  if (/between 1 byte/.test(message)) return words.sizeError;
  if (/Unrecognized/.test(message)) return words.fileError;
  if (/ZIP/.test(message)) return words.zipError;
  if (/Trainer name|trainer name|OT:/.test(message)) return words.nameError;
  if (/Pokedex/.test(message)) return words.pokedexError;
  if (/Trainer nickname|Trainer appearance/.test(message))
    return words.trainerAppearance6Error;
  if (/Trainer game version/.test(message))
    return words.trainerGameVersionError;
  if (/Trainer language/.test(message)) return words.trainerLanguageError;
  if (/Game record value cannot/.test(message))
    return words.recordsRepresentError;
  if (/Game record|game record/.test(message)) return words.recordsError;
  if (/Trainer currency/.test(message)) return words.trainerCurrencyError;
  if (/Trainer badges/.test(message)) return words.trainerBadgesError;
  if (/Trainer game options/.test(message))
    return words.trainerGameOptionsError;
  if (/Trainer text speed/.test(message)) return words.trainerTextSpeedError;
  if (/Trainer position cannot be represented/.test(message))
    return words.trainerPositionRepresentError;
  if (/Trainer dates/.test(message)) return words.trainerDateError;
  if (/Trainer spatial position.*cannot be represented/.test(message))
    return words.trainerPositionRepresentError;
  if (/Trainer spatial position/.test(message))
    return words.trainerPositionError;
  if (/Trainer position/.test(message)) return words.trainerPositionError;
  if (/Trainer geography/.test(message)) return words.trainerGeographyError;
  if (/unrecognized skin color/.test(message)) return words.trainerSkinError;
  if (
    /Trainer gender|Trainer play time|^(Gender|Hours|Minutes|Seconds):/.test(
      message,
    )
  )
    return words.trainerValueError;
  if (/TID16:|SID16:|Money|money/.test(message)) return words.valueError;
  if (/read-only|valid checksums/.test(message)) return words.invalid;
  if (/timed out/.test(message)) return words.timeoutError;
  if (/Export verification/.test(message)) return words.exportError;
  if (/runtime|API version|fetch|start|import/i.test(message))
    return words.runtimeError;
  return words.failure;
}
