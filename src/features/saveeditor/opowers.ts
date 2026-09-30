export interface OPowerCatalog {
  stateKeys: string[];
  states: number[];
  points: number;
  fieldKeys: string[];
  field1: number[];
  field2: number[];
  battleKeys: string[];
  battle1: number[];
  battle2: number[];
}
export interface OPowerEdit {
  action: "edit" | "unlock" | "clear";
  points?: number;
  states?: boolean[];
  field1?: number[];
  field2?: number[];
  battle1?: number[];
  battle2?: number[];
}
export type OPowerDraft = {
  points: string;
  states: boolean[];
  field1: string[];
  field2: string[];
  battle1: string[];
  battle2: string[];
};
export const supportsOPowers = (format: string) =>
  format === "SAV6XY" || format === "SAV6AO";
export function opowerDraft(c: OPowerCatalog): OPowerDraft {
  return {
    points: String(c.points),
    states: c.states.map((s) => s === 1),
    field1: c.field1.map(String),
    field2: c.field2.map(String),
    battle1: c.battle1.map(String),
    battle2: c.battle2.map(String),
  };
}
export function validateOPowers(d: OPowerDraft): OPowerEdit {
  const valid = (v: string) => /^\d{1,3}$/.test(v) && Number(v) <= 255;
  if (
    !valid(d.points) ||
    d.states.length !== 65 ||
    d.states.some((v) => typeof v !== "boolean") ||
    [d.field1, d.field2, d.battle1, d.battle2].some(
      (a, i) => a.length !== (i < 2 ? 10 : 7) || !a.every(valid),
    )
  )
    throw new Error("Invalid O-Power values.");
  return {
    action: "edit",
    points: Number(d.points),
    states: [...d.states],
    field1: d.field1.map(Number),
    field2: d.field2.map(Number),
    battle1: d.battle1.map(Number),
    battle2: d.battle2.map(Number),
  };
}
export const opowerWords = {
  zh: {
    title: "O 力量",
    read: "读取 O 力量",
    points: "点数",
    state: "解锁项目",
    unlocked: "已解锁",
    field: "场地力量",
    battle: "战斗力量",
    first: "数值 1",
    second: "数值 2",
    apply: "应用修改",
    discard: "放弃修改",
    unlock: "全部解锁",
    clear: "清空",
    invalid: "点数及各项数值须为 0–255 的整数。",
    unknown: "原始状态编号",
    note: "全部解锁会将所有状态设为已解锁、两组数值设为 3，保留点数。清空会保留总开关，并清零其他状态、数值和点数。修改作用于工作副本，可撤销。",
    preserve: "未识别的原始状态在未主动切换时保留。",
  },
  en: {
    title: "O-Powers",
    read: "Read O-Powers",
    points: "Points",
    state: "Unlock entry",
    unlocked: "Unlocked",
    field: "Field powers",
    battle: "Battle powers",
    first: "Value 1",
    second: "Value 2",
    apply: "Apply changes",
    discard: "Discard changes",
    unlock: "Unlock all",
    clear: "Clear",
    invalid: "Enter whole numbers from 0 to 255 for points and every value.",
    unknown: "Raw state ID",
    note: "Unlock all enables every state and sets both value groups to 3, preserving points. Clear preserves the master switch and zeros other states, values and points. Changes affect the working copy and can be undone.",
    preserve: "Unrecognized states are preserved unless explicitly toggled.",
  },
  ja: {
    title: "Oパワー",
    read: "Oパワーを読み込む",
    points: "ポイント",
    state: "解放項目",
    unlocked: "解放済み",
    field: "フィールドパワー",
    battle: "バトルパワー",
    first: "値1",
    second: "値2",
    apply: "変更を適用",
    discard: "変更を破棄",
    unlock: "すべて解放",
    clear: "クリア",
    invalid: "ポイントと各値を0～255の整数で入力してください。",
    unknown: "元の状態番号",
    note: "全解放ではすべての状態を解放し、両方の値を3に設定します。ポイントは保持されます。クリアでは全体スイッチを保持し、他の状態・値・ポイントを0にします。変更は作業コピーに適用され、元に戻せます。",
    preserve: "未認識の状態は、明示的に切り替えない限り保持されます。",
  },
};
