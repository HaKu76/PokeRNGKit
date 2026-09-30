export interface FoodCaseEntry {
  index: number;
  type: number;
  stats: number[];
  level: number;
  new: boolean | null;
  primary?: number | null;
  secondary?: number | null;
  many?: boolean | null;
}
export interface FoodCaseCatalog {
  kind: "blocks3" | "poffins4" | "poffins8b";
  entries: FoodCaseEntry[];
  types: { value: number; name: { zh: string; en: string; ja: string } }[];
}
export interface FoodCaseEdit {
  index: number;
  type: number;
  stats: number[];
  level?: number;
  new?: boolean;
}
export function validateFoodCase(
  catalog: FoodCaseCatalog,
  entry: FoodCaseEntry,
  type: string,
  stats: string[],
  level: string,
  isNew: boolean,
): FoodCaseEdit {
  const byte = (s: string) => /^\d{1,3}$/.test(s) && Number(s) <= 255;
  if (
    !catalog.entries.some((e) => e.index === entry.index) ||
    !byte(type) ||
    (Number(type) !== entry.type &&
      !catalog.types.some((t) => t.value === Number(type))) ||
    stats.length !== 6 ||
    !stats.every(byte) ||
    (catalog.kind === "poffins8b" && !byte(level))
  )
    throw new Error("Invalid food case values.");
  return {
    index: entry.index,
    type: Number(type),
    stats: stats.map(Number),
    ...(catalog.kind === "poffins8b"
      ? { level: Number(level), new: isNew }
      : {}),
  };
}
export type FoodCaseSort =
  | "index"
  | "type"
  | "level"
  | "new"
  | "stat0"
  | "stat1"
  | "stat2"
  | "stat3"
  | "stat4"
  | "stat5";
export function sortFoodCase(
  entries: FoodCaseEntry[],
  key: FoodCaseSort,
  descending: boolean,
) {
  const value = (entry: FoodCaseEntry) =>
    key === "new"
      ? Number(entry.new)
      : key.startsWith("stat")
        ? entry.stats[Number(key.slice(4))]
        : entry[key as "index" | "type" | "level"];
  return [...entries].sort(
    (a, b) =>
      (value(a) - value(b)) * (descending ? -1 : 1) || a.index - b.index,
  );
}
export const foodCaseWords = {
  zh: {
    blocks3: "宝可方块盒",
    poffins4: "宝芬盒",
    poffins8b: "宝芬盒",
    type: "种类",
    color: "颜色",
    slot: "格位",
    level: "等级",
    new: "新增标记",
    stats: ["辣味", "涩味", "甜味", "苦味", "酸味", "光滑度"],
    feel: "口感",
    unknown: "未识别编号",
    sort: "显示排序",
    descending: "降序",
    typeId: "种类编号",
    organize: "整理顺序",
    invalid: "请使用有效的种类及 0–255 的整数；已有未识别种类可保持原值。",
    derived: "等级由五项口味中的最大值计算。",
    order:
      "BDSP 保存时会先排已有条目、再排新增条目，空位排在末尾；格位可能发生变化。",
    fill8: "BDSP 补满使用 PKHeX 的等级 60 模板，口味与光滑度均为 255。",
    saved: "已保存条目的口味信息",
    primary: "主要口味",
    secondary: "次要口味",
    many: "多种口味",
    yes: "是",
    no: "否",
  },
  en: {
    blocks3: "Pokéblock Case",
    poffins4: "Poffin Case",
    poffins8b: "Poffin Case",
    type: "Type",
    color: "Color",
    slot: "Slot",
    level: "Level",
    new: "New marker",
    stats: ["Spicy", "Dry", "Sweet", "Bitter", "Sour", "Smoothness"],
    feel: "Feel",
    unknown: "Unknown ID",
    sort: "Display order",
    descending: "Descending",
    typeId: "Type ID",
    organize: "Organize order",
    invalid:
      "Use a listed type and whole numbers from 0 to 255. Existing unknown types can be kept unchanged.",
    derived: "Level is the highest of the five flavor values.",
    order:
      "BDSP saves existing entries before new entries, with empty slots last. Slot positions may change.",
    fill8:
      "BDSP fill uses PKHeX's level 60 template with all flavors and smoothness set to 255.",
    saved: "Saved entry flavor details",
    primary: "Primary flavor",
    secondary: "Secondary flavor",
    many: "Multiple flavors",
    yes: "Yes",
    no: "No",
  },
  ja: {
    blocks3: "ポロックケース",
    poffins4: "ポフィンケース",
    poffins8b: "ポフィンケース",
    type: "種類",
    color: "色",
    slot: "スロット",
    level: "レベル",
    new: "新規マーク",
    stats: ["辛さ", "渋さ", "甘さ", "苦さ", "酸っぱさ", "なめらかさ"],
    feel: "食感",
    unknown: "不明な番号",
    sort: "表示順",
    descending: "降順",
    typeId: "種類番号",
    organize: "順番を整理",
    invalid:
      "一覧の種類と 0–255 の整数を使用してください。元の不明な種類は変更せず保持できます。",
    derived: "レベルは5種類の味の最大値です。",
    order:
      "BDSP の保存時は既存、新規、空きの順に整理され、スロット位置が変わる場合があります。",
    fill8:
      "BDSP の補充は PKHeX のレベル60の設定を使い、味となめらかさをすべて255にします。",
    saved: "保存済みの味の情報",
    primary: "主な味",
    secondary: "副の味",
    many: "複数の味",
    yes: "はい",
    no: "いいえ",
  },
};
