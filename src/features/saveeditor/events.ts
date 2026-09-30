export interface EventLabel {
  index: number;
  name: string;
  category: number;
  presets: { name: string; value: number }[];
}
export interface EventCatalog {
  flags: boolean[];
  values: number[];
  flagLabels: EventLabel[];
  workLabels: EventLabel[];
  updatesQr: boolean;
}
export interface EventEdit {
  flags: { index: number; value: boolean }[];
  values: { index: number; value: number }[];
}
export interface EventDiff {
  setFlags: number[];
  clearedFlags: number[];
  values: { index: number; before: number; after: number }[];
}
export const supportsEvents = (format: string) =>
  [
    "SAV3RS",
    "SAV3E",
    "SAV3FRLG",
    "SAV4DP",
    "SAV4Pt",
    "SAV4HGSS",
    "SAV5BW",
    "SAV5B2W2",
    "SAV6XY",
    "SAV6AO",
    "SAV7SM",
    "SAV7USUM",
  ].includes(format);
export const eventDraft = (c: EventCatalog) => ({
  flags: [...c.flags],
  values: c.values.map(String),
});
export function validateEvents(
  c: EventCatalog,
  d: ReturnType<typeof eventDraft>,
): EventEdit {
  if (
    d.flags.length !== c.flags.length ||
    d.values.length !== c.values.length ||
    d.flags.some((v) => typeof v !== "boolean")
  )
    throw new Error("Invalid event fields.");
  const values = d.values.map((v) => (/^\d{1,5}$/.test(v) ? Number(v) : NaN));
  if (values.some((v) => !Number.isInteger(v) || v < 0 || v > 65535))
    throw new Error("Invalid event fields.");
  return {
    flags: d.flags.flatMap((value, index) =>
      value === c.flags[index] ? [] : [{ index, value }],
    ),
    values: values.flatMap((value, index) =>
      value === c.values[index] ? [] : [{ index, value }],
    ),
  };
}
export function eventIndex(value: string, count: number) {
  if (!/^\d{1,5}$/.test(value) || Number(value) >= count)
    throw new Error("Invalid event index.");
  return Number(value);
}
export function validateEventFiles(files: readonly Pick<File, "size">[]) {
  if (
    files.length !== 2 ||
    files.some(
      (f) =>
        !Number.isSafeInteger(f.size) || f.size < 1 || f.size > 1024 * 1024,
    )
  )
    throw new Error("Event comparison files must be between 1 byte and 1 MiB.");
}
export const eventWords = {
  zh: {
    title: "事件标记与数值",
    read: "读取事件数据",
    flags: "事件标记",
    values: "事件数值",
    category: "分类",
    all: "全部",
    known: "仅显示具名项目",
    search: "搜索名称或编号",
    select: "选择项目",
    index: "按编号定位",
    go: "定位",
    unknown: "未命名项目",
    enabled: "已设置",
    value: "数值",
    preset: "预设数值",
    custom: "自定义",
    empty: "没有匹配项目。可清空搜索或按编号定位。",
    apply: "应用修改",
    discard: "放弃修改",
    invalid: "请输入范围内的项目编号与 0–65535 的十进制整数，不能留空。",
    changes: "待应用修改",
    note: "草稿在项目之间保留，应用后可撤销。事件含义使用上游名称；缺少译文时保留上游回退文本。",
    qr: "第七世代应用事件修改时，会按 PKHeX 规则同步玛机雅娜等 QR 领取数据。未修改的草稿不会触发同步。",
    compare: "比较两个存档",
    old: "较早存档",
    newer: "较新存档",
    compareNote:
      "选择同一游戏版本的两个存档，每个最大 1 MiB。比较不会替换当前工作副本。",
    compareInvalid: "请选择两个不超过 1 MiB 的非空存档。",
    set: "新增标记",
    cleared: "清除标记",
    none: "无",
    result: "事件差异",
    download: "下载比较结果",
    categories: [
      "无",
      "隐藏道具",
      "训练师开关",
      "剧情进度",
      "飞行开关",
      "杂项",
      "统计数据",
      "成就",
      "实用功能",
      "事件遭遇",
      "可领取礼物",
    ],
    rebattle: "再次挑战",
  },
  en: {
    title: "Event flags and values",
    read: "Read event data",
    flags: "Event flags",
    values: "Event values",
    category: "Category",
    all: "All",
    known: "Named entries only",
    search: "Search name or index",
    select: "Select entry",
    index: "Go to index",
    go: "Go",
    unknown: "Unnamed entry",
    enabled: "Set",
    value: "Value",
    preset: "Preset value",
    custom: "Custom",
    empty: "No matching entries. Clear the search or go to an index.",
    apply: "Apply changes",
    discard: "Discard changes",
    invalid:
      "Enter an index within its range and a decimal value from 0 to 65535. Empty values are not allowed.",
    changes: "Pending changes",
    note: "Drafts are retained when switching entries and applied edits can be undone. Event descriptions use upstream text with its fallback for missing translations.",
    qr: "In Generation VII, applying event edits also synchronizes QR gift data such as Magearna according to PKHeX rules. Unchanged drafts do not trigger synchronization.",
    compare: "Compare two saves",
    old: "Older save",
    newer: "Newer save",
    compareNote:
      "Choose two saves from the same game version, up to 1 MiB each. Comparison does not replace the working copy.",
    compareInvalid: "Choose two nonempty save files, up to 1 MiB each.",
    set: "Set flags",
    cleared: "Cleared flags",
    none: "None",
    result: "Event differences",
    download: "Download comparison",
    categories: [
      "None",
      "Hidden Item",
      "Trainer Toggle",
      "Story Progress",
      "Fly Toggle",
      "Misc",
      "Statistic",
      "Achievement",
      "Useful Feature",
      "Event Encounter",
      "Gift Available",
    ],
    rebattle: "Rebattle",
  },
  ja: {
    title: "イベントフラグと数値",
    read: "イベントデータを読み込む",
    flags: "イベントフラグ",
    values: "イベント数値",
    category: "分類",
    all: "すべて",
    known: "名前付き項目のみ",
    search: "名前または番号を検索",
    select: "項目を選択",
    index: "番号で移動",
    go: "移動",
    unknown: "名前のない項目",
    enabled: "設定済み",
    value: "数値",
    preset: "プリセット値",
    custom: "任意の値",
    empty: "一致する項目がありません。検索を解除するか番号で移動してください。",
    apply: "変更を適用",
    discard: "変更を破棄",
    invalid:
      "範囲内の項目番号と0～65535の10進整数を入力してください。空欄は使用できません。",
    changes: "未適用の変更",
    note: "項目を切り替えても下書きは保持され、適用後は元に戻せます。イベント名は上流の翻訳と未翻訳時の代替テキストを使用します。",
    qr: "第7世代でイベント変更を適用すると、PKHeXの規則に従ってマギアナなどのQR受取データも同期します。未変更の下書きでは同期しません。",
    compare: "2つのセーブを比較",
    old: "変更前のセーブ",
    newer: "変更後のセーブ",
    compareNote:
      "同じゲームバージョンのセーブを2つ選んでください。各1 MiBまで。比較で作業コピーは置き換わりません。",
    compareInvalid: "空でない1 MiB以下のセーブを2つ選んでください。",
    set: "追加されたフラグ",
    cleared: "解除されたフラグ",
    none: "なし",
    result: "イベント差分",
    download: "比較結果を保存",
    categories: [
      "なし",
      "隠し道具",
      "トレーナーフラグ",
      "ストーリー進行",
      "そらをとぶ",
      "その他",
      "統計",
      "実績",
      "便利な機能",
      "イベント遭遇",
      "受取可能なギフト",
    ],
    rebattle: "再戦",
  },
};
export function eventDiffText(diff: EventDiff, lang: keyof typeof eventWords) {
  const w = eventWords[lang];
  return `${w.set}\n${diff.setFlags.join(", ") || w.none}\n\n${w.cleared}\n${diff.clearedFlags.join(", ") || w.none}\n\n${w.values}\n${diff.values.map((v) => `${v.index}: ${v.before} → ${v.after}`).join("\n") || w.none}`;
}
