export interface SaveFoodCatalog {
  kind: "puffs" | "beans" | "case";
  values: number[];
  count: number | null;
  names: { zh: string; en: string; ja: string }[];
  blocks?: PokeBlocks6Catalog | null;
  case?: import("./foodCases").FoodCaseCatalog | null;
}
export interface PokeBlocks6Catalog {
  values: number[];
  names: { zh: string; en: string; ja: string }[];
  occupiedPlots: number;
  plotCount: number;
}
export type FoodAction =
  "edit" | "fill" | "best" | "reset" | "sort" | "reverse" | "clear";
export interface SaveFoodEdit {
  action:
    | FoodAction
    | "blocksEdit"
    | "blocksFill"
    | "blocksClear"
    | "berries"
    | "caseEdit"
    | "caseFill"
    | "caseClear"
    | "caseSort";
  case?: import("./foodCases").FoodCaseEdit;
  values?: number[];
  count?: number;
  blockValues?: number[];
}
export function validatePokeBlocks(
  catalog: PokeBlocks6Catalog,
  values: string[],
): SaveFoodEdit {
  const counts = values.map((v) => (/^\d{1,10}$/.test(v) ? Number(v) : NaN));
  if (
    counts.length !== 12 ||
    counts.some(
      (v, i) =>
        !Number.isInteger(v) || v < 0 || (v > 999 && v !== catalog.values[i]),
    )
  )
    throw new Error("Invalid Pokéblock counts.");
  return { action: "blocksEdit", blockValues: counts };
}
export const supportsFood = (format: string) =>
  [
    "SAV3RS",
    "SAV3E",
    "SAV4DP",
    "SAV4Pt",
    "SAV8BS",
    "SAV6XY",
    "SAV6AO",
    "SAV7SM",
    "SAV7USUM",
  ].includes(format);
export function validateFood(
  catalog: SaveFoodCatalog,
  values: string[],
  count: string,
): SaveFoodEdit {
  const numbers = values.map((v) => (/^\d{1,3}$/.test(v) ? Number(v) : NaN));
  const puffs = catalog.kind === "puffs";
  const quantity = /^-?\d{1,11}$/.test(count) ? Number(count) : NaN;
  if (
    numbers.length !== catalog.values.length ||
    numbers.some(
      (v, i) =>
        !Number.isInteger(v) ||
        v < 0 ||
        (v > (puffs ? 26 : 255) && v !== catalog.values[i]),
    ) ||
    (puffs &&
      (!Number.isInteger(quantity) ||
        ((quantity < 0 || quantity > 100) && quantity !== catalog.count)))
  )
    throw new Error("Invalid food values.");
  return {
    action: "edit",
    values: numbers,
    ...(puffs ? { count: quantity } : {}),
  };
}
export const foodWords = {
  zh: {
    title: "宝可梦食物",
    puffs: "宝芙蕾",
    case: "宝可方块／宝芬",
    beans: "宝可豆",
    slot: "格位",
    value: "宝芙蕾种类",
    count: "持有数量",
    apply: "应用修改",
    discard: "放弃修改",
    read: "读取食物",
    fill: "全部补满",
    best: "补满顶级宝芙蕾",
    reset: "恢复五种初始宝芙蕾",
    sort: "升序排列",
    reverse: "降序排列",
    clear: "全部清空",
    unknown: "未识别编号",
    invalid:
      "请填写有效整数：宝芙蕾编号 0–26、持有数量 0–100；宝可豆数量 0–255。",
    note: "批量操作作用于工作副本，可用上方撤销恢复。请先应用或放弃未保存的修改。",
    puffNote:
      "格位与持有数量分别保存；恢复默认会设置前五个格位并将持有数量设为 5。",
  },
  en: {
    title: "Pokémon food",
    puffs: "Poké Puffs",
    case: "Pokéblocks / Poffins",
    beans: "Poké Beans",
    slot: "Slot",
    value: "Puff type",
    count: "Held count",
    apply: "Apply changes",
    discard: "Discard changes",
    read: "Read food",
    fill: "Fill all",
    best: "Fill supreme puffs",
    reset: "Restore five starting puffs",
    sort: "Sort ascending",
    reverse: "Sort descending",
    clear: "Clear all",
    unknown: "Unknown ID",
    invalid:
      "Enter whole numbers: puff ID 0–26, held count 0–100; bean count 0–255.",
    note: "Bulk actions update the working copy and can be undone above. Apply or discard pending changes first.",
    puffNote:
      "Slots and held count are saved separately. Reset sets the first five slots and the held count to 5.",
  },
  ja: {
    title: "ポケモンの食べ物",
    puffs: "ポフレ",
    case: "ポロック／ポフィン",
    beans: "ポケマメ",
    slot: "スロット",
    value: "ポフレの種類",
    count: "所持数",
    apply: "変更を適用",
    discard: "変更を破棄",
    read: "食べ物を読み込む",
    fill: "すべて補充",
    best: "最高級ポフレを補充",
    reset: "初期のポフレ5種類に戻す",
    sort: "昇順に並べる",
    reverse: "降順に並べる",
    clear: "すべて消去",
    unknown: "不明な番号",
    invalid:
      "整数を入力してください：ポフレ番号 0–26、所持数 0–100、ポケマメ数 0–255。",
    note: "一括操作は作業用コピーに適用され、上部の操作で元に戻せます。先に編集中の変更を適用するか破棄してください。",
    puffNote:
      "スロットと所持数は別々に保存されます。初期化すると最初の5スロットが設定され、所持数が5になります。",
  },
};

export const pokeBlockWords = {
  zh: {
    title: "宝可方块与树果田",
    blocks: "宝可方块",
    berries: "树果田",
    occupied: "种有树果的田地",
    reset: "随机重置全部树果田",
    confirm: "确认重置",
    cancel: "取消",
    note: "将替换全部 {count} 块树果田中的树果与生长状态：随机选择树果、设为成熟且数量为 4，并清除时间与浇水记录。可用上方撤销恢复。",
    invalid: "请填写 0–999 的整数；原存档中超出范围的数量只能保持原值。",
  },
  en: {
    title: "Pokéblocks and berry plots",
    blocks: "Pokéblocks",
    berries: "Berry plots",
    occupied: "Plots with berries",
    reset: "Randomize and reset all berry plots",
    confirm: "Confirm reset",
    cancel: "Cancel",
    note: "Replaces berries and growth state in all {count} plots: random berries, ripe stage, yield 4, and cleared timers and watering records. Undo above restores the previous working copy.",
    invalid:
      "Enter whole numbers from 0 to 999. Existing out-of-range counts may only be kept unchanged.",
  },
  ja: {
    title: "ポロックときのみ畑",
    blocks: "ポロック",
    berries: "きのみ畑",
    occupied: "きのみがある区画",
    reset: "全区画をランダムにリセット",
    confirm: "リセットを確定",
    cancel: "キャンセル",
    note: "全 {count} 区画のきのみと生育状態を置き換えます。きのみをランダムに選び、収穫可能、個数4、経過時間と水やり記録なしに設定します。上部の操作で元に戻せます。",
    invalid:
      "0–999 の整数を入力してください。元の範囲外の個数は変更せず保持できます。",
  },
};
