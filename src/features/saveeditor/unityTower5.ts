import type { LocalizedText } from "./domain";
export interface Tower5Point {
  id: number;
  country: number;
  region: number;
  point: number;
  owned: boolean;
  countryName: LocalizedText;
  regionName: LocalizedText;
}
export interface Tower5Floor {
  country: number;
  name: LocalizedText;
  legal: boolean;
  unlocked: boolean;
}
export interface Tower5Catalog {
  canEdit: boolean;
  sourceHash: string;
  country: number;
  region: number;
  ownSafe: boolean;
  ownListed: boolean;
  global: boolean;
  rawGlobal: number;
  unlocked: boolean;
  rawUnlocked: number;
  points: Tower5Point[];
  floors: Tower5Floor[];
  rawHex: string;
}
export interface Tower5Edit {
  action: "patch" | "all" | "legal" | "clear" | "resave";
  sourceHash: string;
  targetHash?: string;
  points?: { id: number; point: number }[];
  floors?: { country: number; unlocked: boolean }[];
  global?: boolean;
  unlocked?: boolean;
}
export interface Tower5Preview {
  request: Tower5Edit;
  result: Tower5Catalog;
  changedOffsets: number[];
}
export const supportsUnityTower5 = (format: string) =>
  ["SAV5BW", "SAV5B2W2"].includes(format);
function base(c: Tower5Catalog) {
  if (!c.canEdit || !c.ownSafe || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid UnityTower5 catalog.");
  return { sourceHash: c.sourceHash };
}
export function tower5Patch(
  c: Tower5Catalog,
  parts: Pick<Tower5Edit, "points" | "floors" | "global" | "unlocked">,
): Tower5Edit {
  base(c);
  if (
    !parts.points?.length &&
    !parts.floors?.length &&
    parts.global === undefined &&
    parts.unlocked === undefined
  )
    throw Error("Empty UnityTower5 patch.");
  if (parts.points) {
    if (
      !parts.points.length ||
      parts.points.length > c.points.length ||
      new Set(parts.points.map((p) => p.id)).size !== parts.points.length ||
      parts.points.some(
        (p) =>
          !c.points.some((row) => row.id === p.id) ||
          !Number.isInteger(p.point) ||
          p.point < 0 ||
          p.point > 3,
      )
    )
      throw Error("Invalid UnityTower5 points.");
  }
  if (parts.floors) {
    if (
      !parts.floors.length ||
      parts.floors.length > c.floors.length ||
      new Set(parts.floors.map((f) => f.country)).size !==
        parts.floors.length ||
      parts.floors.some(
        (f) =>
          !c.floors.some((row) => row.country === f.country) ||
          typeof f.unlocked !== "boolean",
      )
    )
      throw Error("Invalid UnityTower5 floors.");
  }
  for (const value of [parts.global, parts.unlocked])
    if (value !== undefined && typeof value !== "boolean")
      throw Error("Invalid UnityTower5 flag.");
  return { ...base(c), action: "patch", ...parts };
}
export function tower5Action(
  c: Tower5Catalog,
  action: Exclude<Tower5Edit["action"], "patch">,
): Tower5Edit {
  return { ...base(c), action };
}
export function tower5Frozen(c: Tower5Catalog, p: Tower5Preview): Tower5Edit {
  base(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit ||
    !p.result.ownSafe
  )
    throw Error("UnityTower5 preview is stale.");
  return p.request;
}
export const tower5Words = {
  zh: {
    title: "联合塔编辑器",
    read: "读取联合塔",
    country: "国家",
    region: "地区",
    point: "地点",
    floor: "楼层",
    global: "全球可见",
    unlocked: "联合塔解锁",
    all: "设置所有位置",
    legal: "设置所有合法位置",
    clear: "清除位置",
    resave: "按窗口规则重新保存",
    owned: "存档自身位置",
    ownNote:
      "应用后，存档自身国家／地区的地点会重新标为红色。实际变化以预览为准。",
    unsafe: "自身地区超出物理国家槽，无法编辑。请先在存档信息中修正位置。",
    unlisted: "自身位置不在界面目录内，但位于可写槽；保留并按来源联动标记。",
    legalTag: "来源合法国家",
    pointNames: ["无", "蓝", "黄", "红"],
    resaveNote:
      "重新保存会按来源清理后重写全部可见地点与楼层，并将非零标记规范为1。普通补丁保留未指定旧值。",
    invalid: "联合塔字段、地点、楼层或操作无效，请核对输入。",
    stale: "存档或预览已变化，请重新读取并预览。",
    yes: "是",
    no: "否",
  },
  en: {
    title: "Unity Tower Editor",
    read: "Read Unity Tower",
    country: "Country",
    region: "Region",
    point: "Point",
    floor: "Floor",
    global: "Whole Globe Visible",
    unlocked: "Unity Tower Unlocked",
    all: "Set All Locations",
    legal: "Set All Legal Locations",
    clear: "Clear Locations",
    resave: "Resave using window rules",
    owned: "Registered save location",
    ownNote:
      "After applying, the save's own country/region point is marked red again. Inspect the actual preview changes.",
    unsafe:
      "The registered region is outside its physical country slot. Correct the save location before editing.",
    unlisted:
      "The registered location is outside the displayed directory but fits its slot. It stays intact and follows the source linkage.",
    legalTag: "Source legal country",
    pointNames: ["None", "Blue", "Yellow", "Red"],
    resaveNote:
      "Resaving clears then rewrites all displayed points and floors and normalizes nonzero flags to 1. Ordinary patches preserve unspecified stored values.",
    invalid:
      "Invalid Unity Tower fields, point, floor or action. Check the input.",
    stale: "The save or preview changed. Read and preview it again.",
    yes: "Yes",
    no: "No",
  },
  ja: {
    title: "ユナイテッドタワー",
    read: "ユナイテッドタワーを読み込む",
    country: "国",
    region: "言語",
    point: "ポイント",
    floor: "階",
    global: "世界表示",
    unlocked: "ユナイテッドタワー解禁",
    all: "全ての地域を登録",
    legal: "全ての正規地域を登録",
    clear: "登録した地域を消去",
    resave: "元の編集ルールで再保存",
    owned: "セーブの登録位置",
    ownNote:
      "適用後はセーブ自身の国・地域を赤で再登録します。実際の変化をプレビューで確認してください。",
    unsafe:
      "登録地域が国の物理領域を超えています。セーブの位置情報を先に修正してください。",
    unlisted:
      "登録位置は表示一覧外ですが領域内です。維持したまま元のルールで位置を登録します。",
    legalTag: "元の正規国",
    pointNames: ["ない", "青", "黄", "赤"],
    resaveNote:
      "再保存は表示地点とフロアを消去後に書き直し、非ゼロのフラグを1に揃えます。通常の変更は未指定の旧値を維持します。",
    invalid: "項目、地点、フロアまたは操作が無効です。入力を確認してください。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
    yes: "はい",
    no: "いいえ",
  },
};
