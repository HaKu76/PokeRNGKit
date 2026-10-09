import type { LocalizedText } from "./domain";
import type { Br4Lang } from "./br4";
export interface Misc4Row {
  key: string;
  group: string;
  name: LocalizedText;
  value: number;
  minimum: number;
  maximum: number;
  width: number;
  writable: boolean;
  choices: { id: number; name: LocalizedText }[] | null;
  storeMaximum: number | null;
}
export interface Misc4Catalog {
  canEdit: boolean;
  sourceHash: string;
  groups: { id: string; name: LocalizedText }[];
  rows: Misc4Row[];
  backdrops: number[] | null;
  backdropChoices: { id: number; name: LocalizedText }[];
  pixels: number[] | null;
  hallAvailable: boolean;
}
export interface Misc4Edit {
  action:
    | "numbers"
    | "backdrops"
    | "all"
    | "legal"
    | "clear"
    | "resave"
    | "dotCycle"
    | "dotImport";
  sourceHash: string;
  values?: { key: string; value: number }[];
  group?: string;
  backdrops?: number[];
  pixel?: number;
  rgb?: number[];
  imageSize?: number;
  targetHash?: string;
}
export interface Misc4Preview {
  request: Misc4Edit;
  changed: Misc4Row[];
  data: { region: string; offset: number; before: string; after: string }[];
  backdrops: number[] | null;
  pixels: number[] | null;
}
export const supportsMisc4 = (format: string) =>
  ["SAV4DP", "SAV4Pt", "SAV4HGSS"].includes(format);
function base(c: Misc4Catalog) {
  if (!c.canEdit || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid Misc4 preview.");
  return { sourceHash: c.sourceHash };
}
export function misc4Number(
  c: Misc4Catalog,
  key: string,
  value: number,
): Misc4Edit {
  const r = c.rows.find((v) => v.key === key);
  if (
    !r ||
    !r.writable ||
    !Number.isSafeInteger(value) ||
    value < r.minimum ||
    value > r.maximum ||
    (r.choices && !r.choices.some((v) => v.id === value))
  )
    throw Error("Invalid Misc4 numeric fields.");
  return { ...base(c), action: "numbers", values: [{ key, value }] };
}
export function misc4Actions(
  group: string,
): ("all" | "legal" | "clear" | "resave")[] {
  if (["seals", "accessories"].includes(group))
    return ["all", "legal", "clear"];
  if (group === "backdrops") return ["all", "legal", "clear", "resave"];
  if (group === "poketch") return ["all", "resave"];
  if (["fly", "walker"].includes(group)) return ["all"];
  if (["records32", "records16"].includes(group)) return ["resave"];
  return [];
}
export function misc4Bulk(
  c: Misc4Catalog,
  group: string,
  action: "all" | "legal" | "clear" | "resave",
): Misc4Edit {
  if (
    !c.groups.some((g) => g.id === group) ||
    !misc4Actions(group).includes(action)
  )
    throw Error("Invalid Misc4 bulk group.");
  return {
    ...base(c),
    action,
    group: group.startsWith("records") ? "records" : group,
  };
}
export function misc4Backdrops(
  c: Misc4Catalog,
  backdrops: number[],
): Misc4Edit {
  if (
    backdrops.length !== 18 ||
    backdrops.some((v) => !Number.isInteger(v) || v < 0 || v > 18)
  )
    throw Error("Invalid Misc4 backdrop fields.");
  return { ...base(c), action: "backdrops", backdrops };
}
export function misc4Pixel(c: Misc4Catalog, pixel: number): Misc4Edit {
  if (!c.pixels || !Number.isInteger(pixel) || pixel < 0 || pixel >= 480)
    throw Error("Invalid Misc4 dot fields.");
  return { ...base(c), action: "dotCycle", pixel };
}
export function misc4Image(
  c: Misc4Catalog,
  rgb: number[],
  imageSize: number,
): Misc4Edit {
  if (
    !c.pixels ||
    rgb.length !== 1440 ||
    rgb.some((v) => !Number.isInteger(v) || v < 0 || v > 255) ||
    !Number.isInteger(imageSize) ||
    imageSize < 1 ||
    imageSize > 2058
  )
    throw Error("Invalid Misc4 image fields.");
  return { ...base(c), action: "dotImport", rgb, imageSize };
}
export function misc4Frozen(c: Misc4Catalog, p: Misc4Preview): Misc4Edit {
  base(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "")
  )
    throw Error("Misc4 preview is stale.");
  return p.request;
}
export const misc4Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    group: string;
    entry: string;
    current: string;
    next: string;
    input: string;
    stored: string;
    limit: string;
    preview: string;
    confirm: string;
    cancel: string;
    discard: string;
    all: string;
    legal: string;
    clear: string;
    resave: string;
    slot: string;
    dot: string;
    pixel: string;
    cycle: string;
    image: string;
    imageNote: string;
    imageError: string;
    old: string;
    data: string;
    noChanges: string;
    missingHall: string;
    linked: string;
    poffins: string;
    gear: string;
    ath: string;
    note: string;
    backdropNote: string;
    recordNote: string;
    invalid: string;
    stale: string;
  }
> = {
  zh: {
    title: "第四世代其他存档工具",
    read: "读取其他存档工具",
    group: "设置分组",
    entry: "条目",
    current: "当前值",
    next: "修改值",
    input: "输入",
    stored: "保存",
    limit: "输入范围",
    preview: "预览修改",
    confirm: "确认应用",
    cancel: "取消预览",
    discard: "放弃修改",
    all: "全部获得",
    legal: "仅获得已发布内容",
    clear: "全部清空",
    resave: "重新保存",
    slot: "位置",
    dot: "点阵画板",
    pixel: "像素位置",
    cycle: "切换此像素颜色",
    image: "导入图片",
    imageNote:
      "图片须为 24×20 像素、不超过 2058 字节、最多四种亮度。沿用来源的亮度转换和原画布位叠加，先预览再应用；图像格式由本地浏览器支持决定。",
    imageError: "图片尺寸、大小或格式不符合要求，或浏览器无法解码。",
    old: "保留旧值",
    data: "存档数据变化",
    noChanges: "没有数据变化",
    missingHall: "舞台额外记录未初始化或不可用；本入口不会创建记录块。",
    linked: "相关编辑器",
    poffins: "宝芬",
    gear: "宝可装置",
    ath: "全能竞技赛",
    note: "只应用明确修改，原件保持不变。塔的当前／继续计数会沿用来源联动，城堡写入保护相邻等级。",
    backdropNote:
      "重新保存背景会跳过空位并压缩顺序；重复背景沿用来源的最后位置覆盖。批量操作和重新保存均先显示变化。",
    recordNote:
      "浏览在副本中读取，不改变记录加密。修改或重新保存记录会重算记录块校验；输入上限与 Core 保存上限分别显示。",
    invalid: "其他存档工具操作或数值无效。",
    stale: "存档或预览已变化，请重新读取并预览。",
  },
  en: {
    title: "Gen IV miscellaneous save tools",
    read: "Read miscellaneous tools",
    group: "Settings group",
    entry: "Entry",
    current: "Current",
    next: "New value",
    input: "Input",
    stored: "Stored",
    limit: "Input range",
    preview: "Preview changes",
    confirm: "Apply preview",
    cancel: "Cancel preview",
    discard: "Discard changes",
    all: "Give all",
    legal: "Give released only",
    clear: "Clear all",
    resave: "Resave",
    slot: "Position",
    dot: "Dot Artist",
    pixel: "Pixel position",
    cycle: "Cycle this pixel",
    image: "Import image",
    imageNote:
      "Images must be 24×20 pixels, at most 2058 bytes and have at most four brightness values. The source brightness mapping and existing canvas bit overlay are preserved. Preview before applying; format support depends on your local browser.",
    imageError:
      "The image dimensions, size or format are unsupported, or the browser cannot decode it.",
    old: "Keep stored value",
    data: "Save data changes",
    noChanges: "No data changes",
    missingHall:
      "The extra Hall record block is uninitialized or unavailable; this tool does not create it.",
    linked: "Related editors",
    poffins: "Poffins",
    gear: "Pokegear",
    ath: "Pokeathlon",
    note: "Only explicit changes apply; the original stays unchanged. Tower counters follow the source event coupling, and Castle edits protect adjacent ranks.",
    backdropNote:
      "Resaving backdrops skips empty positions and compacts the order. Duplicate backdrops use the source's last-position overwrite. Bulk changes and resaves require a preview.",
    recordNote:
      "Reads use a clone without changing record encryption. Record edits and resaves refresh the record checksum. Input and Core storage limits are shown separately.",
    invalid: "Invalid miscellaneous save operation or value.",
    stale: "The save or preview changed. Read and preview it again.",
  },
  ja: {
    title: "第4世代のその他セーブ編集",
    read: "その他のデータを読み込む",
    group: "設定グループ",
    entry: "項目",
    current: "現在の値",
    next: "変更値",
    input: "入力",
    stored: "保存値",
    limit: "入力範囲",
    preview: "変更を確認",
    confirm: "変更を適用",
    cancel: "プレビューを閉じる",
    discard: "変更を破棄",
    all: "すべて入手",
    legal: "配信済みのみ入手",
    clear: "すべて消去",
    resave: "再保存",
    slot: "位置",
    dot: "ドットアート",
    pixel: "ピクセル位置",
    cycle: "このピクセルの色を変更",
    image: "画像を読み込む",
    imageNote:
      "画像は24×20ピクセル、2058バイト以下、明るさは4種類以内です。元の明るさ変換と既存データへのビット重ね合わせを維持します。適用前に確認してください。画像形式はローカルブラウザーの対応範囲に限られます。",
    imageError:
      "画像のサイズや形式が対応範囲外か、ブラウザーが画像を読み込めません。",
    old: "保存値を維持",
    data: "セーブデータの変更",
    noChanges: "データの変更なし",
    missingHall:
      "追加のステージ記録が未初期化または使用できません。このツールでは作成しません。",
    linked: "関連エディター",
    poffins: "ポフィン",
    gear: "ポケギア",
    ath: "ポケスロン",
    note: "指定した変更だけを適用し、元ファイルを維持します。タワーの数値は元のイベント連動に従い、キャッスルは隣のランクを保護します。",
    backdropNote:
      "背景の再保存は空欄を飛ばして順番を詰めます。同じ背景は元と同様に最後の位置で上書きされます。一括変更と再保存は事前に確認します。",
    recordNote:
      "記録はコピー上で読み、元の暗号化を変えません。編集や再保存は記録のチェックサムを更新します。入力とCoreの保存上限は別々に表示します。",
    invalid: "セーブの操作または値が無効です。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
  },
};
