import { ath4Labels } from "./pokeathlon4Labels";
export type Ath4Lang = "zh" | "en" | "ja";
export type Ath4Text = Record<Ath4Lang, string>;
export interface Ath4Pokemon {
  species: number;
  form: number;
  gender: number;
  shiny: boolean;
  pid: string;
  tid: number;
  sid: number;
  sprite: string;
}
export interface Ath4Trainer {
  name: string;
  nameHex: string;
  tid: number;
  sid: number;
  language: number;
}
export interface Ath4Record {
  value: number;
  members: Ath4Pokemon[];
}
export interface Ath4Event {
  attempts: number;
  records: Ath4Record[];
  trainers: Ath4Trainer[] | null;
}
export interface Pokeathlon4Catalog {
  canEdit: boolean;
  sourceHash: string;
  points: number;
  dailyFlags: number;
  cardFlags: number;
  medals: number[];
  courses: { scores: number[]; members: Ath4Pokemon[] }[];
  personal: Ath4Event[];
  connections: Ath4Event[];
  counters: { source: string; value: number; maximum: number }[];
  best: number[];
  totalFirst: number;
  globalScore: number;
  trophies: number;
  fameLevel: number;
  speciesChoices: {
    id: number;
    name: Ath4Text;
    forms: {
      id: number;
      name: Ath4Text;
      sprite: string;
      femaleSprite: string;
    }[];
  }[];
  languageChoices: { id: number; name: Ath4Text }[];
  cardChoices: { id: number; name: Ath4Text }[];
  cardStats: number[];
}
export interface Ath4PokemonEdit {
  species?: number;
  form?: number;
  gender?: number;
  shiny?: boolean;
  pid?: number;
  tid?: number;
  sid?: number;
}
export interface Ath4TrainerEdit {
  name?: string;
  nameHex?: string;
  tid?: number;
  sid?: number;
  language?: number;
}
export type Pokeathlon4Edit =
  | {
      action: "general" | "counters" | "best";
      values: { id: number; value: number }[];
    }
  | {
      action: "medal" | "course";
      index: number;
      values: { id: number; value: number }[];
    }
  | { action: "medalsBatch"; enabled: boolean; sourceHash: string }
  | {
      action: "participant";
      index: number;
      slot: number;
      pokemon: Ath4PokemonEdit;
    }
  | {
      action: "attempts";
      index: number;
      connection: boolean;
      values: { id: number; value: number }[];
    }
  | {
      action: "record";
      index: number;
      slot: number;
      connection: boolean;
      values: { id: number; value: number }[];
    }
  | {
      action: "entry";
      index: number;
      slot: number;
      member: number;
      connection: boolean;
      pokemon: Pick<Ath4PokemonEdit, "species" | "form">;
    }
  | {
      action: "trainer";
      index: number;
      slot: number;
      trainer: Ath4TrainerEdit;
    };
export const supportsPokeathlon4 = (format: string) => format === "SAV4HGSS";
export const ath4CourseNames = [
  "Speed",
  "Power",
  "Skill",
  "Stamina",
  "Jump",
] as const;
export const ath4EventNames = [
  "HurdleDash",
  "PennantCapture",
  "CirclePush",
  "BlockSmash",
  "DiscCatch",
  "LampJump",
  "RelayRun",
  "RingDrop",
  "SnowThrow",
  "GoalRoll",
] as const;
export function ath4Number(text: string, maximum: number, emptyZero = false) {
  if (emptyZero && text.trim() === "") return 0;
  if (
    !/^\d+$/.test(text) ||
    !Number.isSafeInteger(Number(text)) ||
    Number(text) > maximum
  )
    throw Error("Invalid Pokeathlon4 numeric value.");
  return Number(text);
}
export function ath4Id(text: string) {
  return /^[\t\n\v\f\r ]*\+?\d+[\t\n\v\f\r ]*$/.test(text) &&
    Number.isSafeInteger(Number(text)) &&
    Number(text) <= 65535
    ? Number(text)
    : 0;
}
export function ath4Pid(text: string) {
  const hex = text.replace(/[^0-9a-f]/gi, "");
  return hex.length > 8 ? 0 : hex ? parseInt(hex, 16) : 0;
}
export function ath4Changed(
  original: number[],
  draft: string[],
  maximum: (id: number) => number,
) {
  if (draft.length !== original.length)
    throw Error("Invalid Pokeathlon4 field count.");
  const values = draft.flatMap((value, id) =>
    value === String(original[id])
      ? []
      : [{ id, value: ath4Number(value, maximum(id)) }],
  );
  if (!values.length) throw Error("No Pokeathlon4 changes.");
  return values;
}
export function ath4Batch(
  c: Pokeathlon4Catalog,
  enabled: boolean,
): Pokeathlon4Edit {
  if (
    !c.canEdit ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash) ||
    c.medals.length !== 493
  )
    throw Error("Invalid Pokeathlon4 medal preview.");
  return { action: "medalsBatch", enabled, sourceHash: c.sourceHash };
}
export function ath4PokemonPatch(
  c: Pokeathlon4Catalog,
  p: Ath4Pokemon,
  d: Record<string, string>,
  participant: boolean,
): Ath4PokemonEdit {
  if (!c.canEdit) throw Error("Pokeathlon4 is read-only.");
  const edit: Ath4PokemonEdit = {};
  for (const key of [
    "species",
    "form",
    "gender",
    "shiny",
    "pid",
    "tid",
    "sid",
  ] as const) {
    if (
      (key === "tid" || key === "sid") &&
      ath4Id(d[key] ?? String(p[key])) === p[key]
    )
      continue;
    if (key === "pid" && ath4Pid(d[key] ?? p.pid) === parseInt(p.pid, 16))
      continue;
    if (
      d[key] === undefined ||
      d[key] === String(p[key]) ||
      ((key === "tid" || key === "sid") &&
        d[key] === String(p[key]).padStart(5, "0"))
    )
      continue;
    if (key !== "species" && key !== "form" && !participant)
      throw Error("Invalid Pokeathlon4 entry fields.");
    if (key === "shiny") {
      if (!["true", "false"].includes(d[key]))
        throw Error("Invalid Pokeathlon4 shiny flag.");
      edit.shiny = d[key] === "true";
    } else if (key === "pid") {
      edit.pid = ath4Pid(d.pid);
    } else if (key === "gender") {
      if (p.gender > 1) throw Error("Invalid Pokeathlon4 gender change.");
      edit.gender = ath4Number(d.gender, 1);
    } else if (key === "tid" || key === "sid") edit[key] = ath4Id(d[key]);
    else edit[key] = ath4Number(d[key], key === "species" ? 493 : 31);
  }
  if (edit.species !== undefined || edit.form !== undefined) {
    const species = edit.species ?? p.species,
      form = edit.form ?? (edit.species !== undefined ? 0 : p.form);
    if (
      !c.speciesChoices
        .find((v) => v.id === species)
        ?.forms.some((v) => v.id === form)
    )
      throw Error("Invalid Pokeathlon4 species or form.");
    if (edit.species !== undefined) edit.form = form;
  }
  if (!Object.keys(edit).length) throw Error("No Pokeathlon4 changes.");
  return edit;
}
export function ath4TrainerPatch(
  c: Pokeathlon4Catalog,
  t: Ath4Trainer,
  d: Record<string, string>,
  raw: boolean,
): Ath4TrainerEdit {
  if (!c.canEdit) throw Error("Pokeathlon4 is read-only.");
  const edit: Ath4TrainerEdit = {};
  if (raw && d.nameHex.toUpperCase() !== t.nameHex.toUpperCase()) {
    if (!/^[0-9a-fA-F]{32}$/.test(d.nameHex))
      throw Error("Invalid Pokeathlon4 trainer name bytes.");
    edit.nameHex = d.nameHex;
  }
  if (!raw && d.name !== t.name) {
    if (d.name.length > 7) throw Error("Invalid Pokeathlon4 trainer name.");
    edit.name = d.name;
  }
  if (ath4Id(d.tid) !== t.tid) edit.tid = ath4Id(d.tid);
  if (ath4Id(d.sid) !== t.sid) edit.sid = ath4Id(d.sid);
  if (d.language !== String(t.language)) {
    const id = ath4Number(d.language, 255);
    if (!c.languageChoices.some((v) => v.id === id))
      throw Error("Invalid Pokeathlon4 trainer language.");
    edit.language = id;
  }
  if (!Object.keys(edit).length) throw Error("No Pokeathlon4 changes.");
  return edit;
}
export function ath4PokemonDirty(
  p: Ath4Pokemon,
  d: Record<string, string>,
  participant: boolean,
) {
  return [
    "species",
    "form",
    ...(participant ? ["gender", "shiny", "pid", "tid", "sid"] : []),
  ].some((k) =>
    k === "tid"
      ? ath4Id(d[k]) !== p.tid
      : k === "sid"
        ? ath4Id(d[k]) !== p.sid
        : k === "pid"
          ? ath4Pid(d[k]) !== parseInt(p.pid, 16)
          : k === "shiny"
            ? d[k] !== String(p.shiny)
            : Number(d[k]) !== p[k as "species" | "form" | "gender"],
  );
}
export function ath4TrainerDirty(
  t: Ath4Trainer,
  d: Record<string, string>,
  raw: boolean,
) {
  return (
    (raw
      ? d.nameHex.toUpperCase() !== t.nameHex.toUpperCase()
      : d.name !== t.name) ||
    ath4Id(d.tid) !== t.tid ||
    ath4Id(d.sid) !== t.sid ||
    Number(d.language) !== t.language
  );
}
export const ath4Words = {
  zh: {
    read: "读取竞技数据",
    section: "编辑分组",
    object: "编辑对象",
    genderless: "无性别",
    apply: "应用改动",
    discard: "放弃草稿",
    draft: "处理当前草稿或预览后再切换分组。",
    invalid: "请检查所选位置、数值范围、姓名和形态。",
    note: "只修改明确编辑的字段，其他记录和原存档保持不变。可在存档工具中撤销并导出工作副本。",
    name: "训练家姓名",
    rawName: "原始姓名字节",
    nameMode: "姓名编辑方式",
    text: "文字",
    raw: "原始字节",
    keep: "保持原值",
    unknown: "未识别",
    member: "队伍成员",
    record: "成绩位置",
    trainer: "通信训练家",
    participant: "参赛队伍",
    score: "成绩",
    attempts: "尝试次数",
    preview: "预览全部奖牌操作",
    confirm: "应用预览",
    cancel: "关闭预览",
    before: "当前奖牌数",
    after: "应用后奖牌数",
    batchNote:
      "整块奖牌将被替换为每种全部五枚或全部清空，旧高位也会重置。其他分组保持不变。",
    cardNote: "这里只编辑获得标记，不会添加背包中的数据卡道具。",
    shop: "每日购买标记",
    minutes: "分钟",
    maximum: "新输入上限",
    total: "赛事第一次数合计",
    global: "综合成绩",
    trophies: "友谊奖杯数量",
    fame: "名望等级",
    source: "原始记录",
    shiny: "异色",
    gender: "性别",
    pid: "性格值（PID）",
    form: "形态",
    parsed: "写入值",
    idNote:
      "按源行为，ID 空白、溢出或不能解析时写入 0；PID 只提取十六进制字符。应用前请核对写入值。",
    tid: "公开 ID",
    sid: "秘密 ID",
    male: "雄性",
    female: "雌性",
    shinyNote: "异色标志、性别、性格值和 ID 在此独立保存，不会互相重新生成。",
    genderNote: "源按钮只允许切换雄性／雌性，其他旧性别保持原样。",
    hurdle: "跨栏成绩以帧数保存，越小越好。",
    summary: "当前存档计算值",
    nameNote:
      "姓名最多七个字符；原始字节为 32 位十六进制。语言单独修改时保留姓名原始字节。",
  },
  en: {
    read: "Read Pokéathlon data",
    section: "Edit section",
    object: "Edit object",
    genderless: "Genderless",
    apply: "Apply changes",
    discard: "Discard draft",
    draft: "Finish the current draft or preview before switching sections.",
    invalid: "Check positions, numeric limits, names and forms.",
    note: "Only explicitly edited fields change. Other records and the original stay intact. Undo and export the working copy in the save tools.",
    name: "Trainer name",
    rawName: "Raw name bytes",
    nameMode: "Name editing mode",
    text: "Text",
    raw: "Raw bytes",
    keep: "Keep original",
    unknown: "Unknown",
    member: "Team member",
    record: "Record position",
    trainer: "Connection trainer",
    participant: "Participants",
    score: "Score",
    attempts: "Attempts",
    preview: "Preview all-medal operation",
    confirm: "Apply preview",
    cancel: "Close preview",
    before: "Current medals",
    after: "Medals after applying",
    batchNote:
      "The entire medal block becomes all five medals per species or empty. Old upper bits also reset. Other sections stay intact.",
    cardNote:
      "This edits obtained flags only. It does not add Data Card items to the bag.",
    shop: "Daily purchase flag",
    minutes: "minutes",
    maximum: "New input maximum",
    total: "Total event first places",
    global: "Global score",
    trophies: "Friendship trophies",
    fame: "Fame level",
    source: "Original record",
    shiny: "Shiny",
    gender: "Gender",
    pid: "Personality value (PID)",
    form: "Form",
    parsed: "Value to write",
    idNote:
      "Following the source, empty, overflowing or unparseable IDs become 0. PID uses hex characters only. Review the values before applying.",
    tid: "Public ID",
    sid: "Secret ID",
    male: "Male",
    female: "Female",
    shinyNote:
      "Shiny flags, gender, PID and IDs are stored independently here; no related values are regenerated.",
    genderNote:
      "The source button only toggles male/female. Other original genders stay unchanged.",
    hurdle: "Hurdle records use frames; lower is better.",
    summary: "Calculated from the current save",
    nameNote:
      "Names allow seven characters. Raw bytes use 32 hex digits. Changing language alone preserves the name bytes.",
  },
  ja: {
    read: "ポケスロンデータを読む",
    section: "編集グループ",
    object: "編集対象",
    genderless: "性別不明",
    apply: "変更を適用",
    discard: "下書きを破棄",
    draft:
      "現在の下書きやプレビューを処理してからグループを切り替えてください。",
    invalid: "位置、数値範囲、名前とフォルムを確認してください。",
    note: "明示して編集した項目だけを変更します。他の記録と元ファイルは保持します。セーブ機能で元に戻すか作業コピーを書き出せます。",
    name: "トレーナー名",
    rawName: "名前の元バイト列",
    nameMode: "名前の編集方法",
    text: "文字",
    raw: "元バイト列",
    keep: "元の値を保持",
    unknown: "不明",
    member: "チームのメンバー",
    record: "記録位置",
    trainer: "通信トレーナー",
    participant: "参加チーム",
    score: "成績",
    attempts: "挑戦回数",
    preview: "全メダル操作を確認",
    confirm: "プレビューを適用",
    cancel: "プレビューを閉じる",
    before: "現在のメダル数",
    after: "適用後のメダル数",
    batchNote:
      "メダル全体を全種類の五枚獲得または全消去で置き換えます。元の上位ビットもリセットします。他のグループは保持します。",
    cardNote:
      "獲得フラグのみ編集します。バッグにデータカード道具を追加しません。",
    shop: "毎日の購入フラグ",
    minutes: "分",
    maximum: "新規入力の上限",
    total: "各競技の一位回数合計",
    global: "総合成績",
    trophies: "フレンドシップトロフィー数",
    fame: "知名度レベル",
    source: "元の記録",
    shiny: "色違い",
    gender: "性別",
    pid: "性格値（PID）",
    form: "フォルム",
    parsed: "保存する値",
    idNote:
      "元の処理に従い、空欄・範囲外・解析不能なIDは0になります。性格値は16進文字のみ抽出します。適用前に保存する値を確認してください。",
    tid: "表ID",
    sid: "裏ID",
    male: "オス",
    female: "メス",
    shinyNote:
      "色違いフラグ、性別、性格値とIDは独立して保存されます。関連する値を再生成しません。",
    genderNote:
      "元のボタンはオス／メスのみ切り替えます。その他の元の性別は保持します。",
    hurdle: "ハードルの記録はフレーム数で保存され、少ないほど良い成績です。",
    summary: "現在のセーブからの計算値",
    nameNote:
      "名前は七文字までです。元バイト列は32桁の16進数です。言語のみの変更は名前のバイト列を保持します。",
  },
};
export const pokeathlon4Words = {
  zh: { title: ath4Labels.zh.SAV_Pokeathlon4 },
  en: { title: ath4Labels.en.SAV_Pokeathlon4 },
  ja: { title: ath4Labels.ja.SAV_Pokeathlon4 },
};
