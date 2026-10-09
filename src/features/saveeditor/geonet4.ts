import type { LocalizedText } from "./domain";
import type { Br4Lang } from "./br4";
export interface Geo4Row {
  id: number;
  country: number;
  region: number;
  legal: boolean;
  owned: boolean;
  point: number;
  countryName: LocalizedText;
  regionName: LocalizedText;
}
export interface Geo4Catalog {
  canEdit: boolean;
  sourceHash: string;
  country: number;
  region: number;
  ownValid: boolean;
  global: boolean;
  rawGlobal: number;
  rows: Geo4Row[];
  plans: {
    action: "all" | "legal" | "clear" | "save";
    counts: number[];
    changed: number[];
    global: boolean;
    targetHex: string;
  }[];
}
export interface Geo4Edit {
  action: "points" | "global" | "all" | "legal" | "clear" | "save";
  sourceHash: string;
  points?: { id: number; point: number }[];
  global?: boolean;
}
export const supportsGeonet4 = (format: string) =>
  ["SAV4DP", "SAV4Pt", "SAV4HGSS"].includes(format);
function base(c: Geo4Catalog) {
  if (!c.canEdit || !c.ownValid || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid Geonet4 preview.");
  return { sourceHash: c.sourceHash };
}
export function geonet4Point(
  c: Geo4Catalog,
  id: number,
  point: number,
): Geo4Edit {
  if (
    !c.rows.some((v) => v.id === id) ||
    !Number.isInteger(point) ||
    point < 0 ||
    point > 3
  )
    throw Error("Invalid Geonet4 point.");
  return { ...base(c), action: "points", points: [{ id, point }] };
}
export function geonet4Global(c: Geo4Catalog, global: boolean): Geo4Edit {
  return { ...base(c), action: "global", global };
}
export function geonet4Batch(
  c: Geo4Catalog,
  action: "all" | "legal" | "clear" | "save",
): Geo4Edit {
  const plan = c.plans.find((v) => v.action === action);
  if (
    !plan ||
    plan.counts.length !== 4 ||
    !plan.counts.every((v) => Number.isInteger(v) && v >= 0) ||
    !/^[A-F0-9]{7462}$/.test(plan.targetHex)
  )
    throw Error("Invalid Geonet4 plan.");
  return { ...base(c), action };
}
export const geonet4Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    country: string;
    region: string;
    point: string;
    global: string;
    apply: string;
    discard: string;
    all: string;
    legal: string;
    clear: string;
    save: string;
    batch: string;
    preview: string;
    confirm: string;
    cancel: string;
    own: string;
    ownInvalid: string;
    note: string;
    batchNote: string;
    rawFlag: string;
    changes: string;
    count: string;
    hidden: string;
    invalid: string;
    stale: string;
    points: string[];
  }
> = {
  zh: {
    title: "Geonet 世界地图",
    read: "读取地图",
    country: "国家",
    region: "地区",
    point: "点位状态",
    global: "世界地图旗标",
    apply: "应用改动",
    discard: "放弃草稿",
    all: "设置所有地点",
    legal: "设置所有合法地点",
    clear: "清除地点",
    save: "明确重新保存",
    batch: "批量操作",
    preview: "预览操作",
    confirm: "应用预览",
    cancel: "关闭预览",
    own: "注册地保存为红点",
    ownInvalid:
      "注册地编码超出地图范围，请先在训练家工具中修正。地图仍可浏览。",
    note: "普通点位补丁保留未显示格位与原旗标字节，保存时注册地保持红点。原存档保持，可撤销并导出工作副本。",
    batchNote:
      "批量只修改上游定义的地点，不清空整个地图块。仅合法地点保留其他国家原状态；清除后注册地仍为红点，旗标按注册国家处理。明确重新保存会归一化旗标并恢复注册地红点。",
    rawFlag: "原始旗标值",
    changes: "变化点位数量",
    count: "点位数量",
    hidden: "未显示格位",
    invalid: "请核对地图点位、状态、注册地和当前预览。",
    stale: "存档已改变，请重新读取地图并预览。",
    points: ["无：未通信", "蓝：今天首次通信", "黄：已通信", "红：玩家注册地"],
  },
  en: {
    title: "Geonet world map",
    read: "Read map",
    country: "Country",
    region: "Region",
    point: "Point state",
    global: "World map flag",
    apply: "Apply changes",
    discard: "Discard draft",
    all: "Set all locations",
    legal: "Set all legal locations",
    clear: "Clear locations",
    save: "Explicitly resave",
    batch: "Batch operation",
    preview: "Preview operation",
    confirm: "Apply preview",
    cancel: "Close preview",
    own: "Registered location saves as red",
    ownInvalid:
      "The registered location is outside the map. Correct it in trainer tools first; the map remains readable.",
    note: "Point patches keep hidden positions and the original flag byte. Saving keeps the registered location red. The original stays intact; undo or export the working copy.",
    batchNote:
      "Batch operations change only upstream-defined locations, without clearing the whole block. Legal-only keeps other countries unchanged. Clearing keeps the registered location red and handles the flag by country. Explicit resave normalizes the flag and restores the registered red point.",
    rawFlag: "Original flag value",
    changes: "Changed points",
    count: "Point count",
    hidden: "Hidden position",
    invalid: "Check the point, state, registered location and current preview.",
    stale: "The save changed. Read the map and preview again.",
    points: [
      "None: never communicated",
      "Blue: first communication today",
      "Yellow: communicated",
      "Red: registered location",
    ],
  },
  ja: {
    title: "ジオネット世界地図",
    read: "地図を読む",
    country: "国",
    region: "地域",
    point: "地点の状態",
    global: "世界地図フラグ",
    apply: "変更を適用",
    discard: "下書きを破棄",
    all: "全地点を設定",
    legal: "利用可能な全地点を設定",
    clear: "地点を消去",
    save: "明示して再保存",
    batch: "一括操作",
    preview: "操作を確認",
    confirm: "プレビューを適用",
    cancel: "プレビューを閉じる",
    own: "登録地は赤で保存",
    ownInvalid:
      "登録地が地図の範囲外です。先にトレーナー機能で修正してください。地図は閲覧できます。",
    note: "地点の変更は非表示の位置と元のフラグバイトを保持します。保存時に登録地を赤にします。元ファイルは保持し、元に戻すか作業コピーを書き出せます。",
    batchNote:
      "一括操作は上流で定義した地点だけを変更し、ブロック全体を消去しません。利用可能地点だけの操作は他の国を保持します。消去しても登録地は赤で、国に応じてフラグを設定します。明示的な再保存はフラグを正規化して登録地を赤に戻します。",
    rawFlag: "元のフラグ値",
    changes: "変更地点数",
    count: "地点数",
    hidden: "非表示の位置",
    invalid: "地点、状態、登録地と現在のプレビューを確認してください。",
    stale: "セーブが変わりました。地図を読み直して再確認してください。",
    points: [
      "なし：未通信",
      "青：今日初めて通信",
      "黄：通信済み",
      "赤：プレイヤー登録地",
    ],
  },
};
