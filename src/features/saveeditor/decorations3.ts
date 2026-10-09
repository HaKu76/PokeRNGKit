import type { LocalizedText } from "./domain";
export interface Decoration3Category {
  id: number;
  name: LocalizedText;
  slots: number[];
  choices: { id: number; name: LocalizedText }[];
}
export interface Decoration3Catalog {
  canEdit: boolean;
  categories: Decoration3Category[];
}
export interface Decoration3Edit {
  category: number;
  slots: number[];
}
export const supportsDecorations3 = (format: string) =>
  format === "SAV3RS" || format === "SAV3E";
export function decoration3Edit(
  c: Decoration3Catalog,
  category: number,
  slots: number[],
): Decoration3Edit {
  const entry = c.categories.find((v) => v.id === category);
  if (
    !c.canEdit ||
    !Number.isInteger(category) ||
    !entry ||
    slots.length !== entry.slots.length ||
    slots.some(
      (v, i) =>
        !Number.isInteger(v) ||
        v < 0 ||
        v > 255 ||
        (!entry.choices.some((x) => x.id === v) && entry.slots[i] !== v),
    )
  )
    throw new Error("Invalid Gen3 decoration fields.");
  return { category, slots: [...slots] };
}
export const packDecorations3 = (slots: number[]) => [
  ...slots.filter((v) => v !== 0),
  ...slots.filter((v) => v === 0),
];
export const decorations3Words = {
  zh: {
    title: "装饰品",
    read: "读取装饰品",
    category: "分类",
    slot: "格位",
    empty: "空槽",
    unknown: "原始编号",
    apply: "应用分类修改",
    organize: "整理此分类空槽",
    discard: "放弃草稿",
    clear: "清空此分类",
    dirty: "先应用或放弃草稿，再切换分类。",
    note: "应用时保留非空装饰品顺序，将空槽移到此分类末尾。修改可撤销，原存档保持不变。",
    invalid: "请使用此分类的装饰品；已有异常编号仅可保留或替换。",
  },
  en: {
    title: "Decorations",
    read: "Read decorations",
    category: "Category",
    slot: "Slot",
    empty: "Empty",
    unknown: "Original ID",
    apply: "Apply category changes",
    organize: "Move empty slots to the end",
    discard: "Discard draft",
    clear: "Clear this category",
    dirty: "Apply or discard the draft before changing categories.",
    note: "Applying keeps nonempty decorations in order and moves empty slots to the end of this category. Changes can be undone and the original save is preserved.",
    invalid:
      "Choose decorations from this category. Existing invalid IDs can only be kept or replaced.",
  },
  ja: {
    title: "模様替えグッズ",
    read: "グッズを読み込む",
    category: "分類",
    slot: "枠",
    empty: "空き",
    unknown: "元の番号",
    apply: "分類の変更を適用",
    organize: "空き枠を末尾に整理",
    discard: "下書きを破棄",
    clear: "この分類を空にする",
    dirty: "分類を切り替える前に下書きを適用または破棄してください。",
    note: "適用時にグッズの順番を保持し、空き枠を分類の末尾に移します。変更は元に戻せ、元のセーブは保持されます。",
    invalid:
      "この分類のグッズを選択してください。元の不正な番号は保持または置換できます。",
  },
};
