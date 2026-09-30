export interface RtcCatalog {
  initial: number[];
  elapsed: number[];
}
export interface RtcEdit {
  action: "edit" | "reset" | "berryFix";
  initial?: number[];
  elapsed?: number[];
}
export const rtcLimits = [65535, 23, 59, 59];
export const supportsRtc = (format: string) =>
  format === "SAV3RS" || format === "SAV3E";
export const rtcDraft = (c: RtcCatalog) => ({
  initial: c.initial.map(String),
  elapsed: c.elapsed.map(String),
});
export function validateRtc(
  c: RtcCatalog,
  d: ReturnType<typeof rtcDraft>,
): RtcEdit {
  const read = (values: string[], old: number[]) => {
    if (values.length !== 4) throw new Error("Four clock fields required.");
    const result = values.map((v, i) =>
      new RegExp(i === 0 ? "^\\d{1,5}$" : "^\\d{1,3}$").test(v)
        ? Number(v)
        : NaN,
    );
    if (
      result.some(
        (v, i) =>
          !Number.isInteger(v) || v < 0 || (v > rtcLimits[i] && v !== old[i]),
      )
    )
      throw new Error("Invalid clock values.");
    return result;
  };
  return {
    action: "edit",
    initial: read(d.initial, c.initial),
    elapsed: read(d.elapsed, c.elapsed),
  };
}
export const rtcWords = {
  zh: {
    title: "存档时钟",
    read: "读取时钟",
    initial: "初始时钟",
    elapsed: "已过去时间",
    fields: ["天", "时", "分", "秒"],
    apply: "应用修改",
    discard: "放弃修改",
    reset: "两组时钟归零",
    berryFix: "推进树果修复日期",
    invalid:
      "请填写整数：天 0–65535、时 0–23、分与秒 0–59。未改动的异常原值可保留。",
    unusual: "原始值超出常规范围，未修改时保持原值。",
    note: "树果修复将已过去天数推进到至少 734 天，不减少更大的原值。归零和修复作用于工作副本，可撤销；请先应用或放弃草稿。",
  },
  en: {
    title: "Save clock",
    read: "Read clocks",
    initial: "Initial clock",
    elapsed: "Elapsed time",
    fields: ["Days", "Hours", "Minutes", "Seconds"],
    apply: "Apply changes",
    discard: "Discard changes",
    reset: "Zero both clocks",
    berryFix: "Advance berry-fix date",
    invalid:
      "Enter whole numbers: days 0–65535, hours 0–23, minutes and seconds 0–59. Unchanged unusual values can be preserved.",
    unusual:
      "The original value exceeds the usual range and is preserved when unchanged.",
    note: "Berry Fix advances elapsed days to at least 734 without reducing a larger value. Reset and repair affect the working copy and can be undone. Apply or discard drafts first.",
  },
  ja: {
    title: "セーブ内時計",
    read: "時計を読み込む",
    initial: "初期時計",
    elapsed: "経過時間",
    fields: ["日", "時", "分", "秒"],
    apply: "変更を適用",
    discard: "変更を破棄",
    reset: "両方の時計を0にする",
    berryFix: "きのみ修復日まで進める",
    invalid:
      "日を0～65535、時を0～23、分・秒を0～59の整数で入力してください。未変更の範囲外値は保持できます。",
    unusual: "元の値が通常範囲外です。変更しない場合は保持されます。",
    note: "きのみ修復では経過日数を最低734日まで進め、より大きな値は保持します。リセットと修復は作業コピーに適用され、元に戻せます。先に編集中の変更を適用または破棄してください。",
  },
};
