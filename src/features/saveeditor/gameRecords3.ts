export interface GameRecord3Entry {
  index: number;
  name: string;
  value: number;
}
export interface FameTime3 {
  hours: number;
  minutes: number;
  seconds: number;
  rawHours: number;
  rawMinutes: number;
  rawSeconds: number;
}
export interface GameRecord3Catalog {
  canEdit: boolean;
  entries: GameRecord3Entry[];
  time: FameTime3;
}
export interface GameRecord3Edit {
  action: "value" | "time";
  index: number;
  value?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}
export const supportsGameRecords3 = (format: string) =>
  ["SAV3RS", "SAV3E", "SAV3FRLG"].includes(format);
export const gameRecord3Draft = (c: GameRecord3Catalog, index: number) => ({
  value: String(c.entries.find((e) => e.index === index)?.value ?? 0),
  hours: String(c.time.hours),
  minutes: String(c.time.minutes),
  seconds: String(c.time.seconds),
});
function decimal(value: string, max: number, width: number) {
  if (!new RegExp(`^\\d{1,${width}}$`).test(value) || Number(value) > max)
    throw new Error("Invalid Gen3 game record value.");
  return Number(value);
}
export function gameRecord3Edit(
  c: GameRecord3Catalog,
  index: number,
  mode: "value" | "time",
  d: ReturnType<typeof gameRecord3Draft>,
): GameRecord3Edit {
  if (
    !c.canEdit ||
    !Number.isInteger(index) ||
    !c.entries.some((e) => e.index === index)
  )
    throw new Error("Invalid Gen3 game record position.");
  if (mode === "value")
    return { action: "value", index, value: decimal(d.value, 4294967295, 10) };
  if (mode !== "time" || index !== 1)
    throw new Error("Invalid Gen3 game record time target.");
  return {
    action: "time",
    index,
    hours: decimal(d.hours, 9999, 4),
    minutes: decimal(d.minutes, 59, 2),
    seconds: decimal(d.seconds, 59, 2),
  };
}
export const packFameTime3 = (
  hours: number,
  minutes: number,
  seconds: number,
) => hours * 65536 + minutes * 256 + seconds;
export const gameRecords3Words = {
  zh: {
    title: "游戏记录",
    read: "读取游戏记录",
    record: "记录",
    value: "记录数值",
    mode: "显示方式",
    raw: "数值编辑",
    time: "首通时间",
    hours: "时",
    minutes: "分",
    seconds: "秒",
    apply: "应用修改",
    discard: "放弃草稿",
    source: "上游名称",
    draft: "先应用或放弃草稿，再切换记录或编辑方式。",
    invalid: "数值为 0–4294967295；首通时间为 0–9999 时、0–59 分、0–59 秒。",
    oldTime: "原始时间超出控件范围。当前显示已限于输入范围，点击应用才会改写。",
    note: "修改记录不会更改训练家游戏时长或其他记录；可撤销，原存档保持不变。",
  },
  en: {
    title: "Game records",
    read: "Read game records",
    record: "Record",
    value: "Record value",
    mode: "Display mode",
    raw: "Numeric value",
    time: "First Hall of Fame time",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    apply: "Apply changes",
    discard: "Discard draft",
    source: "Upstream name",
    draft: "Apply or discard the draft before changing records or modes.",
    invalid:
      "Values must be 0–4294967295. Time accepts 0–9999 hours, 0–59 minutes and 0–59 seconds.",
    oldTime:
      "The original time exceeds the control ranges. Displayed fields are limited to those ranges; applying will rewrite the record.",
    note: "Editing this record does not change trainer play time or other records. Changes can be undone and the original save is preserved.",
  },
  ja: {
    title: "ゲーム記録",
    read: "ゲーム記録を読み込む",
    record: "記録",
    value: "記録の値",
    mode: "表示方法",
    raw: "数値編集",
    time: "初回殿堂入り時間",
    hours: "時",
    minutes: "分",
    seconds: "秒",
    apply: "変更を適用",
    discard: "下書きを破棄",
    source: "上流の名称",
    draft: "記録や編集方法を切り替える前に下書きを適用または破棄してください。",
    invalid: "数値は 0–4294967295、時間は 0–9999 時、0–59 分、0–59 秒です。",
    oldTime:
      "元の時間が入力範囲を超えています。表示値は範囲内に制限し、適用時のみ記録を書き換えます。",
    note: "トレーナーのプレイ時間や他の記録は変更しません。変更は元に戻せ、元のセーブは保持されます。",
  },
};
