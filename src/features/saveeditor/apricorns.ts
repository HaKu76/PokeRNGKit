import type { BagOperation } from "./domain";
export function apricornOperation(
  action: "apricornEdit" | "apricornFill" | "apricornClear",
  values?: string[],
): BagOperation {
  if (
    action === "apricornEdit" &&
    (!values ||
      values.length !== 7 ||
      values.some((v) => !/^\d{1,3}$/.test(v) || Number(v) > 255))
  )
    throw new Error("Invalid apricorn counts.");
  return {
    pouch: -1,
    action,
    language: "en",
    shuffle: false,
    ...(action === "apricornEdit"
      ? { apricornValues: values!.map(Number) }
      : {}),
  };
}
export const apricornWords = {
  zh: {
    title: "球果盒",
    apply: "应用修改",
    discard: "放弃修改",
    fill: "全部设为 99",
    clear: "全部清空",
    invalid: "七类球果数量均须为 0–255 的整数。",
    note: "逐项数量支持 0–255；全部补满按 PKHeX 设置为 99。修改只作用于工作副本，可撤销。",
  },
  en: {
    title: "Apricorn pouch",
    apply: "Apply changes",
    discard: "Discard changes",
    fill: "Set all to 99",
    clear: "Clear all",
    invalid: "Enter whole numbers from 0 to 255 for all seven apricorns.",
    note: "Each count supports 0–255; Fill sets all counts to 99, matching PKHeX. Changes affect the working copy and can be undone.",
  },
  ja: {
    title: "ぼんぐりケース",
    apply: "変更を適用",
    discard: "変更を破棄",
    fill: "すべて99個にする",
    clear: "すべて空にする",
    invalid: "7種類すべての個数を0～255の整数で入力してください。",
    note: "個数は0～255に対応。一括補充ではPKHeXと同じ99個に設定します。変更は作業コピーのみに適用され、元に戻せます。",
  },
};
