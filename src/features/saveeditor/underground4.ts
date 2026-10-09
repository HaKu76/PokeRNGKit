import type { LocalizedText } from "./domain";
import type { Br4Lang } from "./br4";
export interface Ug4Stat {
  id: number;
  name: LocalizedText;
  value: number;
}
export interface Ug4Slot {
  id: number;
  item: number;
  size: number | null;
}
export interface Ug4Pouch {
  kind: string;
  name: LocalizedText;
  slots: Ug4Slot[];
  choices: { id: number; name: LocalizedText }[];
}
export interface Ug4Catalog {
  canEdit: boolean;
  sourceHash: string;
  stats: Ug4Stat[];
  pouches: Ug4Pouch[];
}
export interface Ug4Edit {
  action: "stats" | "pouch" | "resavePouch" | "resave";
  sourceHash: string;
  language: Br4Lang;
  stats?: { id: number; value: number }[];
  kind?: string;
  slots?: { id: number; item?: number; sizeText?: string }[];
  targetHash?: string;
}
export interface Ug4Preview {
  request: Ug4Edit;
  stats: Ug4Stat[];
  pouches: Ug4Pouch[];
  changed: number[];
  beforeHex: string;
  afterHex: string;
}
export const supportsUnderground4 = (format: string) =>
  ["SAV4DP", "SAV4Pt"].includes(format);
function base(c: Ug4Catalog, language: Br4Lang) {
  if (
    !c.canEdit ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !["zh", "en", "ja"].includes(language)
  )
    throw Error("Invalid Underground4 preview.");
  return { sourceHash: c.sourceHash, language };
}
export function ug4Stat(
  c: Ug4Catalog,
  language: Br4Lang,
  id: number,
  value: number,
): Ug4Edit {
  if (
    !c.stats.some((s) => s.id === id) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 999999
  )
    throw Error("Invalid Underground4 score fields.");
  return { ...base(c, language), action: "stats", stats: [{ id, value }] };
}
export function ug4Slot(
  c: Ug4Catalog,
  language: Br4Lang,
  kind: string,
  id: number,
  item: number | undefined,
  sizeText: string | undefined,
): Ug4Edit {
  const p = c.pouches.find((v) => v.kind === kind),
    slot = p?.slots.find((s) => s.id === id);
  if (
    !p ||
    !slot ||
    (item === undefined && sizeText === undefined) ||
    (item !== undefined &&
      (!Number.isInteger(item) ||
        !p.choices.some(
          (v) =>
            v.id === item &&
            (item === 0 || kind === "spheres" || v.name[language] !== ""),
        ))) ||
    (sizeText !== undefined &&
      (kind !== "spheres" ||
        (sizeText.length > 2 && sizeText !== String(slot.size))))
  )
    throw Error("Invalid Underground4 slot fields.");
  return {
    ...base(c, language),
    action: "pouch",
    kind,
    slots: [
      {
        id,
        ...(item !== undefined ? { item } : {}),
        ...(sizeText !== undefined ? { sizeText } : {}),
      },
    ],
  };
}
export function ug4Resave(
  c: Ug4Catalog,
  language: Br4Lang,
  kind?: string,
): Ug4Edit {
  if (kind && !c.pouches.some((p) => p.kind === kind))
    throw Error("Invalid Underground4 pouch.");
  return {
    ...base(c, language),
    action: kind ? "resavePouch" : "resave",
    ...(kind ? { kind } : {}),
  };
}
export function ug4Frozen(c: Ug4Catalog, p: Ug4Preview): Ug4Edit {
  base(c, p.request.language);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "")
  )
    throw Error("Underground4 preview is stale.");
  return p.request;
}
export const ug4Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    section: string;
    stats: string;
    slot: string;
    item: string;
    size: string;
    current: string;
    value: string;
    old: string;
    preview: string;
    apply: string;
    cancel: string;
    discard: string;
    resave: string;
    resaveAll: string;
    note: string;
    sizeNote: string;
    resaveNote: string;
    changes: string;
    bytes: string;
    noChanges: string;
    invalid: string;
    stale: string;
  }
> = {
  zh: {
    title: "地下世界编辑器",
    read: "读取地下世界",
    section: "设置分组",
    stats: "分数",
    slot: "格位",
    item: "道具",
    size: "玉的大小",
    current: "当前值",
    value: "修改值",
    old: "保留旧值",
    preview: "预览修改",
    apply: "确认应用",
    cancel: "取消预览",
    discard: "放弃修改",
    resave: "重新保存此背包",
    resaveAll: "按窗口规则重新保存全部",
    note: "普通修改只写指定成绩或格位，保留其他旧值与空位；原件保持不变。",
    sizeNote:
      "新大小输入最多两字符，沿用来源的整数解析与 byte 保存；-1 会存为 255。空白或无法解析的文本会清空当前玉格位，请先查看预览。",
    resaveNote:
      "重新保存会清除越界物品、跳过空位并压缩顺序；重新保存全部还会将十三项分数限制到 0–999999。原语言资源的重复名称可能合并为首个编号。",
    changes: "实际变化",
    bytes: "原始数据变化",
    noChanges: "没有数据变化",
    invalid: "地下世界操作或数值无效。",
    stale: "存档或预览已变化，请重新读取并预览。",
  },
  en: {
    title: "Underground Editor",
    read: "Read Underground",
    section: "Settings group",
    stats: "Scores",
    slot: "Slot",
    item: "Item",
    size: "Sphere size",
    current: "Current",
    value: "New value",
    old: "Keep stored value",
    preview: "Preview changes",
    apply: "Apply preview",
    cancel: "Cancel preview",
    discard: "Discard changes",
    resave: "Resave this pouch",
    resaveAll: "Resave all using window rules",
    note: "Ordinary edits only change specified scores or slots and preserve other stored values and gaps. The original stays unchanged.",
    sizeNote:
      "New size input uses at most two characters and the source integer-to-byte conversion; -1 stores 255. Empty or unparsable input clears the current sphere slot. Inspect the preview first.",
    resaveNote:
      "Resaving removes out-of-range items, skips empty slots and compacts the order. Resaving all also clamps thirteen scores to 0–999999. Duplicate names in the selected language may map to the first original index.",
    changes: "Actual changes",
    bytes: "Raw data changes",
    noChanges: "No data changes",
    invalid: "Invalid Underground operation or value.",
    stale: "The save or preview changed. Read and preview it again.",
  },
  ja: {
    title: "地下通路エディター",
    read: "地下通路を読み込む",
    section: "設定グループ",
    stats: "スコア",
    slot: "スロット",
    item: "アイテム",
    size: "タマの大きさ",
    current: "現在の値",
    value: "変更値",
    old: "保存値を維持",
    preview: "変更を確認",
    apply: "変更を適用",
    cancel: "プレビューを閉じる",
    discard: "変更を破棄",
    resave: "このポーチを再保存",
    resaveAll: "元の編集ルールで全体を再保存",
    note: "通常の編集は指定したスコアやスロットだけを変更し、ほかの保存値や空欄を維持します。元ファイルは変更しません。",
    sizeNote:
      "新しい大きさは2文字までで、元と同様に整数をbyteに変換します。-1は255になります。空欄や解析できない値は現在のタマを消します。適用前に確認してください。",
    resaveNote:
      "再保存は範囲外のアイテムを除去し、空欄を飛ばして順番を詰めます。全体の再保存は13項目のスコアも0–999999に収めます。選択言語で同名の項目は元の最初の番号に統合される場合があります。",
    changes: "実際の変更",
    bytes: "元のデータの変更",
    noChanges: "データの変更なし",
    invalid: "地下通路の操作または値が無効です。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
  },
};
