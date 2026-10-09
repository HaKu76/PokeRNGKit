import type { LocalizedText } from "./domain";
import type { Br4Lang } from "./br4";
export interface Honey4Row {
  id: number;
  time: number;
  shake: number;
  group: number;
  slot: number;
  subTable: number;
  rare: boolean;
  species: number | null;
  alternate: number | null;
  rawHex: string;
  saveValues: number[];
  saveHex: string;
}
export interface Honey4Catalog {
  canEdit: boolean;
  sourceHash: string;
  munchlaxTrees: number[];
  trees: Honey4Row[];
  choices: {
    group: number;
    slot: number;
    species: number;
    alternate: number | null;
    name: LocalizedText;
    alternateName: LocalizedText | null;
  }[];
}
export interface Honey4Edit {
  action: "patch" | "save" | "catchable";
  sourceHash: string;
  id: number;
  time?: number;
  shake?: number;
  group?: number;
  slot?: number;
}
export const supportsHoneyTree4 = (format: string) =>
  ["SAV4DP", "SAV4Pt"].includes(format);
export const honey4Limits = {
  time: 1440,
  shake: 3,
  group: 3,
  slot: 5,
} as const;
export type Honey4Field = keyof typeof honey4Limits;
export function honey4Edit(
  c: Honey4Catalog,
  id: number,
  action: Honey4Edit["action"],
  fields: Partial<Record<Honey4Field, number>> = {},
): Honey4Edit {
  if (
    !c.canEdit ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !Number.isInteger(id) ||
    id < 0 ||
    id >= 21 ||
    !c.trees.some((t) => t.id === id)
  )
    throw Error("Invalid HoneyTree4 preview.");
  const keys = Object.keys(fields) as Honey4Field[];
  if (
    !(["patch", "save", "catchable"] as string[]).includes(action) ||
    (action === "patch" ? !keys.length : keys.length > 0) ||
    keys.some(
      (k) =>
        !(k in honey4Limits) ||
        !Number.isInteger(fields[k]) ||
        fields[k]! < 0 ||
        fields[k]! > honey4Limits[k],
    )
  )
    throw Error("Invalid HoneyTree4 fields.");
  return { action, sourceHash: c.sourceHash, id, ...fields };
}
const enTrees = [
  "Route 205, Floaroma Town side",
  "Route 205, Eterna City side",
  "Route 206",
  "Route 207",
  "Route 208",
  "Route 209",
  "Route 210, Solaceon Town side",
  "Route 210, Celestic Town side",
  "Route 211",
  "Route 212, Hearthome City side",
  "Route 212, Pastoria City side",
  "Route 213",
  "Route 214",
  "Route 215",
  "Route 218",
  "Route 221",
  "Route 222",
  "Valley Windworks",
  "Eterna Forest",
  "Fuego Ironworks",
  "Floaroma Meadow",
];
export const honey4Trees: Record<Br4Lang, string[]> = {
  en: enTrees,
  zh: [
    "205号道路（苑之镇侧）",
    "205号道路（百代市侧）",
    "206号道路",
    "207号道路",
    "208号道路",
    "209号道路",
    "210号道路（随意镇侧）",
    "210号道路（神和镇侧）",
    "211号道路",
    "212号道路（缘之市侧）",
    "212号道路（湿原市侧）",
    "213号道路",
    "214号道路",
    "215号道路",
    "218号道路",
    "221号道路",
    "222号道路",
    "山谷发电厂",
    "百代森林",
    "多多罗炼铁厂",
    "苑之花田",
  ],
  ja: [
    "205番道路（ソノオタウン側）",
    "205番道路（ハクタイシティ側）",
    "206番道路",
    "207番道路",
    "208番道路",
    "209番道路",
    "210番道路（ズイタウン側）",
    "210番道路（カンナギタウン側）",
    "211番道路",
    "212番道路（ヨスガシティ側）",
    "212番道路（ノモセシティ側）",
    "213番道路",
    "214番道路",
    "215番道路",
    "218番道路",
    "221番道路",
    "222番道路",
    "たにまのはつでんしょ",
    "ハクタイのもり",
    "タタラせいてつじょ",
    "ソノオのはなばたけ",
  ],
};
export const honey4Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    tree: string;
    rare: string;
    fields: Record<Honey4Field, string>;
    species: string;
    unknown: string;
    raw: string;
    subTable: string;
    apply: string;
    discard: string;
    catchable: string;
    save: string;
    preview: string;
    confirm: string;
    cancel: string;
    warning: string;
    preserve: string;
    normalize: string;
    invalid: string;
    stale: string;
    diamond: string;
    pearl: string;
  }
> = {
  zh: {
    title: "甜甜蜜树",
    read: "读取甜甜蜜树",
    tree: "甜甜蜜树",
    rare: "小卡比树",
    fields: {
      time: "剩余时间（分钟）",
      shake: "摇动",
      group: "群",
      slot: "槽",
    },
    species: "种类",
    unknown: "旧值超出窗口范围",
    raw: "原始字节",
    subTable: "隐藏子表",
    apply: "应用修改",
    discard: "放弃修改",
    catchable: "设为可捕获",
    save: "按窗口范围重新保存",
    preview: "预览重新保存",
    confirm: "确认重新保存",
    cancel: "取消",
    warning:
      "这棵树不属于当前训练家的小卡比树；捕获小卡比兽将不符合该存档的训练家 ID 组合。",
    preserve:
      "只修改填写的字段；修改群时同时更新隐藏子表。设为可捕获只将剩余时间改为 1080。",
    normalize: "重新保存会将四项旧值限制到窗口范围，并重新计算隐藏子表。",
    invalid: "甜甜蜜树操作或数值无效。",
    stale: "存档已变化，请重新读取甜甜蜜树。",
    diamond: "钻石",
    pearl: "珍珠",
  },
  en: {
    title: "Honey Trees",
    read: "Read Honey Trees",
    tree: "Honey Tree",
    rare: "Munchlax trees",
    fields: {
      time: "Time remaining (minutes)",
      shake: "Shake",
      group: "Group",
      slot: "Slot",
    },
    species: "Species",
    unknown: "Stored values exceed window limits",
    raw: "Raw bytes",
    subTable: "Hidden subtable",
    apply: "Apply changes",
    discard: "Discard changes",
    catchable: "Make catchable",
    save: "Resave using window limits",
    preview: "Preview resave",
    confirm: "Confirm resave",
    cancel: "Cancel",
    warning:
      "This is not a Munchlax tree for this trainer. Catching Munchlax here is illegal for this save's trainer ID combination.",
    preserve:
      "Only supplied fields change; Group also updates the hidden subtable. Make catchable only sets time to 1080.",
    normalize:
      "Resaving clamps all four stored values to window limits and recalculates the hidden subtable.",
    invalid: "Invalid Honey Tree operation or value.",
    stale: "The save changed. Read Honey Trees again.",
    diamond: "Diamond",
    pearl: "Pearl",
  },
  ja: {
    title: "あまいミツの木",
    read: "ミツの木を読み込む",
    tree: "ミツの木",
    rare: "ゴンベの木",
    fields: {
      time: "残り時間（分）",
      shake: "揺れ",
      group: "グループ",
      slot: "スロット",
    },
    species: "種類",
    unknown: "保存値が編集範囲を超えています",
    raw: "元のバイト列",
    subTable: "内部サブテーブル",
    apply: "変更を適用",
    discard: "変更を破棄",
    catchable: "捕獲可能にする",
    save: "編集範囲で再保存",
    preview: "再保存を確認",
    confirm: "再保存を適用",
    cancel: "キャンセル",
    warning:
      "この木は現在のトレーナーのゴンベの木ではありません。ここで捕獲したゴンベは、このセーブのトレーナー ID に適合しません。",
    preserve:
      "指定した項目だけを変更します。グループは内部サブテーブルも更新します。捕獲可能にする操作は残り時間だけを1080にします。",
    normalize:
      "再保存は四つの保存値を編集範囲内に収め、内部サブテーブルを再計算します。",
    invalid: "ミツの木の操作または値が無効です。",
    stale: "セーブが変更されました。ミツの木を再読み込みしてください。",
    diamond: "ダイヤモンド",
    pearl: "パール",
  },
};
