export interface PokeGear4Catalog {
  canEdit: boolean;
  player: number;
  sourceHash: string;
  slots: number[];
  choices: { id: number; source: string }[];
  plans: { action: "all" | "nonTrainers" | "clear"; slots: number[] }[];
}
export type Gear4Batch = "all" | "nonTrainers" | "clear";
export type PokeGear4Edit =
  | { action: "slots"; slots: { slot: number; value: number }[] }
  | { action: Gear4Batch; sourceHash: string };
export const supportsPokeGear4 = (format: string) => format === "SAV4HGSS";
export function gear4SlotEdit(
  c: PokeGear4Catalog,
  slot: number,
  mode: "choice" | "raw",
  value: string,
): PokeGear4Edit {
  if (
    !c.canEdit ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= c.slots.length ||
    !/^-?\d{1,3}$/.test(value) ||
    Number(value) < -128 ||
    Number(value) > 127 ||
    (mode === "choice" && !c.choices.some((v) => v.id === Number(value)))
  )
    throw Error("Invalid PokeGear4 slot value.");
  return { action: "slots", slots: [{ slot, value: Number(value) }] };
}
export function gear4BatchEdit(
  c: PokeGear4Catalog,
  action: Gear4Batch,
): PokeGear4Edit {
  if (
    !c.canEdit ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash) ||
    !c.plans.some(
      (v) => v.action === action && v.slots.length === c.slots.length,
    )
  )
    throw Error("Invalid PokeGear4 preview.");
  return { action, sourceHash: c.sourceHash };
}
export const gear4SourceName = (source: string) => source.replaceAll("_", " ");
export function gear4Contact(
  c: PokeGear4Catalog,
  id: number,
  lang: "zh" | "en" | "ja",
) {
  const source = c.choices.find((v) => v.id === id)?.source;
  if (!source) return `${pokegear4Words[lang].unknown} (${id})`;
  const role: Record<string, [string, string]> = {
    None: ["空格", "空き"],
    Mother: ["母亲", "ママ"],
    Professor_Elm: ["Elm 博士", "Elm 博士"],
    Professor_Oak: ["Oak 博士", "Oak 博士"],
    Daycare_Man: ["寄放屋男主人", "育て屋の男性"],
    Daycare_Lady: ["寄放屋女主人", "育て屋の女性"],
    Bike_Shop: ["自行车店", "自転車屋"],
  };
  return lang !== "en" && role[source]
    ? role[source][lang === "zh" ? 0 : 1]
    : gear4SourceName(source);
}
export const pokegear4Words = {
  zh: {
    title: "宝可装置通讯录",
    read: "读取通讯录",
    single: "逐格编辑",
    batch: "批量替换",
    slot: "通讯录位置",
    value: "联系人",
    mode: "编辑方式",
    choice: "联系人候选",
    raw: "有符号原始数值",
    rawNote: "原始数值为 -128–127，-1 对应空格。未识别值和重复项不会自动清理。",
    unknown: "未识别联系人",
    keep: "保留原始值",
    apply: "应用位置修改",
    discard: "放弃草稿",
    actions: {
      all: "加入全部",
      nonTrainers: "仅加入非训练家",
      clear: "清空通讯录",
    },
    preview: "预览替换",
    commit: "应用预览中的替换",
    cancel: "关闭预览",
    replace: "此操作替换全部通讯录，不是合并；请确认下方顺序。",
    excludeAll: "加入全部按上游顺序排除当前主角与自行车店。",
    excludeNon: "仅加入非训练家使用上游指定名单，并排除当前主角。",
    player: "当前主角",
    before: "当前非空数",
    after: "替换后非空数",
    empty: "空格数",
    changed: "变化位置数",
    list: "完整位置列表",
    source: "上游名称",
    draft: "先应用或放弃草稿，再切换位置、方式或操作。",
    invalid: "请检查位置、候选或原始十进制数值；批量预览过期时重新读取。",
    note: "修改可撤销，原存档保持不变。",
  },
  en: {
    title: "Pokégear contacts",
    read: "Read contacts",
    single: "Edit a slot",
    batch: "Replace contacts",
    slot: "Contact slot",
    value: "Contact",
    mode: "Editing mode",
    choice: "Contact choices",
    raw: "Raw signed value",
    rawNote:
      "Raw values are -128–127; -1 is an empty slot. Unknown values and duplicates are not automatically cleaned up.",
    unknown: "Unknown contact",
    keep: "Keep original value",
    apply: "Apply slot changes",
    discard: "Discard draft",
    actions: {
      all: "Give All",
      nonTrainers: "Give All Non-Trainers",
      clear: "Delete All",
    },
    preview: "Preview replacement",
    commit: "Apply previewed replacement",
    cancel: "Close preview",
    replace:
      "This replaces the entire contact list instead of merging it. Review the order below.",
    excludeAll:
      "Give All follows the upstream order and excludes the current player character and Bike Shop.",
    excludeNon:
      "The non-trainer action uses the upstream list and excludes the current player character.",
    player: "Current player character",
    before: "Current nonempty slots",
    after: "New nonempty slots",
    empty: "Empty slots",
    changed: "Changed positions",
    list: "Complete slot list",
    source: "Upstream name",
    draft:
      "Apply or discard the draft before changing slots, modes or actions.",
    invalid:
      "Check the slot, choice or raw decimal value. Read again if the batch preview is stale.",
    note: "Changes can be undone and the original save is preserved.",
  },
  ja: {
    title: "ポケギアの電話帳",
    read: "電話帳を読み込む",
    single: "スロット編集",
    batch: "電話帳を置換",
    slot: "電話帳の位置",
    value: "連絡先",
    mode: "編集方法",
    choice: "連絡先の候補",
    raw: "元の符号付き数値",
    rawNote:
      "元の数値は -128–127、-1 は空きです。未認識の値や重複を自動整理しません。",
    unknown: "未認識の連絡先",
    keep: "元の値を保持",
    apply: "位置の変更を適用",
    discard: "下書きを破棄",
    actions: {
      all: "全連絡先を追加",
      nonTrainers: "トレーナー以外を追加",
      clear: "電話帳を消去",
    },
    preview: "置換をプレビュー",
    commit: "表示中の置換を適用",
    cancel: "プレビューを閉じる",
    replace:
      "電話帳全体を置き換えます。既存の連絡先への追加ではありません。下の順序を確認してください。",
    excludeAll: "全追加は上流の順序で、現在の主人公と自転車屋を除外します。",
    excludeNon:
      "トレーナー以外の追加は上流の指定リストを使い、現在の主人公を除外します。",
    player: "現在の主人公",
    before: "現在の連絡先数",
    after: "置換後の連絡先数",
    empty: "空き数",
    changed: "変わる位置の数",
    list: "全位置の一覧",
    source: "上流の名前",
    draft: "位置、方法、操作を変える前に下書きを適用または破棄してください。",
    invalid:
      "位置、候補、元の10進数を確認してください。プレビューが古い場合は再読み込みしてください。",
    note: "変更は元に戻せ、元のセーブは保持されます。",
  },
};
