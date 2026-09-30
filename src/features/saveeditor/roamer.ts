export interface RoamerCatalog {
  species: number;
  state: number;
  encounters: number;
  suggestedSpecies: number | null;
}
export interface RoamerEdit {
  species: number;
  state: number;
  encounters: number;
}
export const supportsRoamer = (format: string) => format === "SAV6XY";
export const roamerDraft = (c: RoamerCatalog) => ({
  species: c.species,
  state: c.state,
  encounters: String(c.encounters),
});
export function validateRoamer(
  c: RoamerCatalog,
  d: ReturnType<typeof roamerDraft>,
): RoamerEdit {
  const count = /^\d{1,10}$/.test(d.encounters) ? Number(d.encounters) : NaN;
  if (
    !Number.isInteger(d.species) ||
    (d.species !== c.species && ![144, 145, 146].includes(d.species)) ||
    !Number.isInteger(d.state) ||
    (d.state !== c.state && (d.state < 0 || d.state > 4)) ||
    !Number.isInteger(count) ||
    count < 0 ||
    (count > 11 && count !== c.encounters)
  )
    throw new Error("Invalid roamer fields.");
  return { species: d.species, state: d.state, encounters: count };
}
export const roamerWords = {
  zh: {
    title: "游走宝可梦",
    read: "读取游走信息",
    species: "宝可梦种类",
    names: ["急冻鸟", "闪电鸟", "火焰鸟"],
    state: "游走状态",
    states: ["未激活", "游走中", "固定地点", "已击败", "已捕获"],
    count: "遭遇次数",
    unset: "尚未设置",
    unknown: "原始编号",
    suggest: "按初始伙伴选择种类",
    apply: "应用修改",
    discard: "放弃修改",
    invalid:
      "请选择有效种类和状态，遭遇次数为 0–11 的整数；未修改的异常原值可保留。",
    note: "读取不会激活游走剧情，也不会覆盖未设置的种类。修改作用于工作副本，可撤销；不自动修改初始伙伴或其他剧情标记。",
  },
  en: {
    title: "Roaming Pokémon",
    read: "Read roamer",
    species: "Species",
    names: ["Articuno", "Zapdos", "Moltres"],
    state: "Roaming state",
    states: ["Inactive", "Roaming", "Stationary", "Defeated", "Captured"],
    count: "Times encountered",
    unset: "Not set",
    unknown: "Original ID",
    suggest: "Use starter-based species",
    apply: "Apply changes",
    discard: "Discard changes",
    invalid:
      "Choose a valid species and state and an encounter count from 0 to 11. Unchanged unusual values can be preserved.",
    note: "Reading does not activate the roaming event or replace an unset species. Changes affect the working copy and can be undone; the starter and other event flags are not changed automatically.",
  },
  ja: {
    title: "徘徊ポケモン",
    read: "徘徊情報を読み込む",
    species: "種類",
    names: ["フリーザー", "サンダー", "ファイヤー"],
    state: "徘徊状態",
    states: ["未開始", "徘徊中", "固定地点", "倒した", "捕獲済み"],
    count: "遭遇回数",
    unset: "未設定",
    unknown: "元の番号",
    suggest: "最初のパートナーに対応する種類を選ぶ",
    apply: "変更を適用",
    discard: "変更を破棄",
    invalid:
      "有効な種類・状態を選び、遭遇回数を0～11の整数で入力してください。未変更の範囲外値は保持できます。",
    note: "読み込みだけでは徘徊イベントを開始せず、未設定の種類も保持します。変更は作業コピーに適用され、元に戻せます。最初のパートナーや他のイベントフラグは自動変更しません。",
  },
};
