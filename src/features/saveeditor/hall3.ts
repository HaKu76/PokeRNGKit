import type { LocalizedText } from "./domain";
import { hall1Words } from "./hall1";
export interface Hall3Member {
  species: number;
  speciesInternal: number;
  level: number;
  tid: number;
  sid: number;
  pid: string;
  nickname: string;
  nicknameHex: string;
  shiny: boolean;
  form: number;
  sprite: string;
}
export interface Hall3Catalog {
  available: boolean;
  canEdit: boolean;
  version: number;
  versions: { id: number; name: LocalizedText }[];
  teams: Hall3Member[][];
  speciesChoices: { id: number; name: LocalizedText }[];
}
export interface Hall3Fields {
  species?: number;
  level?: number;
  tid?: number;
  sid?: number;
  pid?: number;
  nickname?: string;
  nicknameHex?: string;
}
export interface Hall3Edit {
  action: "member" | "clearMember" | "party";
  team: number;
  slot?: number;
  all?: boolean;
  fields?: Hall3Fields;
}
export const supportsHall3 = (format: string) =>
  ["SAV3RS", "SAV3E", "SAV3FRLG"].includes(format);
export const hall3Id = (value: string) =>
  Math.min(65535, Number(value.replace(/[^0-9]/g, "") || "0"));
export const hall3Pid = (value: string) =>
  Number.parseInt(value.replace(/[^0-9a-f]/gi, "") || "0", 16);
export const hall3Draft = (m: Hall3Member) => ({
  species: m.species,
  level: String(m.level),
  tid: String(m.tid),
  sid: String(m.sid),
  pid: m.pid,
  nickname: m.nickname,
  nicknameHex: m.nicknameHex,
  mode: "keep" as "keep" | "text" | "bytes",
});
export function hall3Dirty(m: Hall3Member, d: ReturnType<typeof hall3Draft>) {
  return (
    d.species !== m.species ||
    d.level !== String(m.level) ||
    hall3Id(d.tid) !== m.tid ||
    hall3Id(d.sid) !== m.sid ||
    hall3Pid(d.pid) !== Number.parseInt(m.pid, 16) ||
    (d.mode === "text" && d.nickname !== m.nickname) ||
    (d.mode === "bytes" && d.nicknameHex.toUpperCase() !== m.nicknameHex)
  );
}
export function hall3MemberEdit(
  c: Hall3Catalog,
  team: number,
  slot: number,
  d: ReturnType<typeof hall3Draft>,
): Hall3Edit {
  const m = c.teams[team]?.[slot],
    fields: Hall3Fields = {};
  if (!c.canEdit || !Number.isInteger(team) || !Number.isInteger(slot) || !m)
    throw new Error("Invalid Hall of Fame position.");
  if (
    !Number.isInteger(d.species) ||
    d.species < 0 ||
    d.species > 386 ||
    !/^\d{1,3}$/.test(d.level) ||
    Number(d.level) > 255 ||
    d.pid.length > 8 ||
    d.tid.length > 5 ||
    d.sid.length > 5
  )
    throw new Error("Invalid Hall of Fame fields.");
  if (d.species !== m.species) fields.species = d.species;
  if (Number(d.level) !== m.level) fields.level = Number(d.level);
  if (hall3Id(d.tid) !== m.tid) fields.tid = hall3Id(d.tid);
  if (hall3Id(d.sid) !== m.sid) fields.sid = hall3Id(d.sid);
  if (hall3Pid(d.pid) !== Number.parseInt(m.pid, 16))
    fields.pid = hall3Pid(d.pid);
  if (d.mode === "text" && d.nickname !== m.nickname) {
    if (d.nickname.length > 10)
      throw new Error("Hall of Fame nickname too long.");
    fields.nickname = d.nickname;
  }
  if (d.mode === "bytes" && d.nicknameHex.toUpperCase() !== m.nicknameHex) {
    if (!/^[0-9a-f]{20}$/i.test(d.nicknameHex))
      throw new Error("Invalid Hall of Fame nickname bytes.");
    fields.nicknameHex = d.nicknameHex.toUpperCase();
  }
  if (!Object.keys(fields).length) throw new Error("No Hall of Fame changes.");
  return { action: "member", team, slot, fields };
}
export const hall3Words = {
  zh: {
    ...hall1Words.zh,
    version: "形态显示版本",
    tid: "训练家 ID",
    sid: "隐藏 ID",
    pid: "个性值（十六进制）",
    shiny: "异色",
    regular: "普通颜色",
    missing: "此存档缺少完整殿堂区域。",
    scope: "队伍导入范围",
    current: "当前记录",
    all: "全部 50 条记录",
    import: "导入当前队伍",
    note: "导入会覆盖所选范围的六个成员。修改可撤销，原存档保持不变。",
    levelNote: "新输入等级超过 100 时按 100 保存；未改动的旧等级保留。",
    versionNote: "此版本只用于显示形态，不改变存档版本。",
    none: "无种类",
  },
  en: {
    ...hall1Words.en,
    version: "Form display version",
    tid: "Trainer ID",
    sid: "Secret ID",
    pid: "Personality value (hex)",
    shiny: "Shiny",
    regular: "Regular color",
    missing: "The complete Hall of Fame region is missing.",
    scope: "Party import scope",
    current: "Current record",
    all: "All 50 records",
    import: "Import current party",
    note: "Import replaces all six members in the selected scope. Changes can be undone and the original save is preserved.",
    levelNote:
      "New levels above 100 are saved as 100. Unchanged original levels are preserved.",
    versionNote:
      "This version controls form display only; it does not change the save version.",
    none: "No species",
  },
  ja: {
    ...hall1Words.ja,
    version: "フォルム表示用バージョン",
    tid: "トレーナー ID",
    sid: "裏 ID",
    pid: "性格値（16 進数）",
    shiny: "色違い",
    regular: "通常色",
    missing: "完全な殿堂入り領域がありません。",
    scope: "手持ちの読み込み範囲",
    current: "現在の記録",
    all: "全 50 件の記録",
    import: "現在の手持ちを読み込む",
    note: "選択範囲の 6 匹を上書きします。変更は元に戻せ、元のセーブは保持されます。",
    levelNote:
      "新しいレベルが 100 を超える場合は 100 で保存します。変更しない元のレベルは保持します。",
    versionNote:
      "フォルム表示のみを切り替え、セーブのバージョンは変更しません。",
    none: "種類なし",
  },
};
