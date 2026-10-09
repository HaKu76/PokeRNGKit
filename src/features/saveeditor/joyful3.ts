export interface Joyful3Field {
  id: number;
  value: number;
  max: number;
  width: number;
  stored: number | null;
}
export interface Joyful3Catalog {
  canEdit: boolean;
  fields: Joyful3Field[];
}
export interface Joyful3Edit {
  fields: { id: number; value: number }[];
}
export const supportsJoyful3 = (format: string) =>
  format === "SAV3E" || format === "SAV3FRLG";
export const joyful3Draft = (c: Joyful3Catalog) =>
  c.fields.map((f) => String(f.value));
export function joyful3Edit(
  c: Joyful3Catalog,
  draft: string[],
  rewrite: boolean[],
): Joyful3Edit {
  if (
    !c.canEdit ||
    draft.length !== c.fields.length ||
    rewrite.length !== c.fields.length
  )
    throw new Error("Invalid Gen3 minigame draft.");
  const fields = c.fields.flatMap((f, i) => {
    if (
      typeof rewrite[i] !== "boolean" ||
      (rewrite[i] && f.id !== 1 && f.id !== 5)
    )
      throw new Error("Invalid score rewrite.");
    if (!rewrite[i] && draft[i] === String(f.value)) return [];
    if (
      !new RegExp(`^\\d{0,${f.width}}$`).test(draft[i]) ||
      Number(draft[i]) > f.max
    )
      throw new Error("Invalid minigame value.");
    return [{ id: f.id, value: Number(draft[i]) }];
  });
  if (!fields.length) throw new Error("No Gen3 minigame changes.");
  return { fields };
}
export const joyful3Words = {
  zh: {
    title: "小游戏与树果粉",
    read: "读取小游戏记录",
    jump: "宝可梦跳跃",
    berries: "树果捡拾与树果粉",
    labels: [
      "连续次数",
      "高分",
      "5 连次数",
      "满员游戏次数",
      "已捕获",
      "高分",
      "5 连次数",
      "树果粉末",
    ],
    apply: "应用记录修改",
    discard: "放弃草稿",
    old: "原始记录超出输入范围，未修改时保留。新小游戏记录为 0–9999，树果粉为 0–99999。",
    raw: "原始成绩存储",
    value: "读取成绩",
    stored: "完整存储值",
    rewrite: "按当前输入重新保存这项成绩",
    rewriteNote: "重新保存会用当前输入替换完整成绩值；未选择的旧成绩保持原样。",
    invalid:
      "请检查输入：小游戏记录最多四位数字，树果粉最多五位，空白按 0 保存。",
    note: "只应用明确修改的项目。修改可撤销，原存档保持不变。",
  },
  en: {
    title: "Minigames and Berry Powder",
    read: "Read minigame records",
    jump: "Pokémon Jump",
    berries: "Berry Picking and Berry Powder",
    labels: [
      "In a Row",
      "High Score",
      "5 In a Row",
      "Games with max players",
      "Caught",
      "High Score",
      "5 In a Row",
      "Berry Powder",
    ],
    apply: "Apply record changes",
    discard: "Discard draft",
    old: "Original records exceed the input range and remain unchanged unless edited. New minigame records are 0–9999 and Berry Powder is 0–99999.",
    raw: "Original score storage",
    value: "Read score",
    stored: "Full stored value",
    rewrite: "Save this score again using the current input",
    rewriteNote:
      "Saving again replaces the full stored score with the current input. Unselected original scores remain unchanged.",
    invalid:
      "Minigame records accept up to four digits and Berry Powder up to five. Empty input is saved as 0.",
    note: "Only explicitly edited entries are applied. Changes can be undone and the original save is preserved.",
  },
  ja: {
    title: "ミニゲーム・きのみのこな",
    read: "ミニゲーム記録を読み込む",
    jump: "ミニポケモンでジャンプ！",
    berries: "ドードリオきのみどり・きのみのこな",
    labels: [
      "連続スコア",
      "ハイスコア",
      "5連続スコア",
      "最大人数でのゲーム回数",
      "キャッチ数",
      "ハイスコア",
      "5連続スコア",
      "きのみのこな",
    ],
    apply: "記録の変更を適用",
    discard: "下書きを破棄",
    old: "元の記録が入力範囲を超えています。変更しなければ保持します。新しいゲーム記録は 0–9999、きのみのこなは 0–99999 です。",
    raw: "元のスコア保存値",
    value: "読み取ったスコア",
    stored: "完全な保存値",
    rewrite: "現在の入力でこのスコアを再保存",
    rewriteNote:
      "再保存すると完全なスコア保存値を現在の入力に置き換えます。選択しない元のスコアは保持します。",
    invalid:
      "ゲーム記録は4桁まで、きのみのこなは5桁までの数字を入力してください。空欄は 0 として保存します。",
    note: "明示的に編集した項目だけを適用します。変更は元に戻せ、元のセーブは保持されます。",
  },
};
