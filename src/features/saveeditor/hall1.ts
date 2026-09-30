import type { LocalizedText } from "./domain";
export interface Hall1Member {
  species: number;
  speciesInternal: number;
  level: number;
  nickname: string;
  nicknameHex: string;
  empty: boolean;
  defaultNickname: string;
}
export interface Hall1Catalog {
  count: number;
  nicknameLength: number;
  canEdit: boolean;
  teams: { count: number; members: Hall1Member[] }[];
  speciesChoices: { id: number; name: LocalizedText }[];
}
export interface Hall1Fields {
  species?: number;
  level?: number;
  nickname?: string;
  nicknameHex?: string;
  defaultNickname?: boolean;
}
export interface Hall1Edit {
  action:
    | "member"
    | "count"
    | "clearSlot"
    | "deleteTeam"
    | "registerParty"
    | "clearAll";
  team?: number;
  slot?: number;
  count?: number;
  fields?: Hall1Fields;
}
export const supportsHall1 = (format: string) => format === "SAV1";
export const hall1Draft = (m: Hall1Member) => ({
  species: m.empty ? 0 : m.species,
  level: String(m.level),
  nickname: m.nickname,
  nicknameHex: m.nicknameHex,
  mode: "keep" as "keep" | "text" | "bytes" | "default",
});
export function hall1Dirty(
  m: Hall1Member,
  d: ReturnType<typeof hall1Draft>,
): boolean {
  return (
    d.species !== (m.empty ? 0 : m.species) ||
    d.level !== String(m.level) ||
    d.mode === "default" ||
    (d.mode === "text" && d.nickname !== m.nickname) ||
    (d.mode === "bytes" && d.nicknameHex.toUpperCase() !== m.nicknameHex)
  );
}
export function hall1Byte(value: string): number {
  if (!/^\d{1,3}$/.test(value) || Number(value) > 255)
    throw new Error("Invalid Hall of Fame byte value.");
  return Number(value);
}
export function hall1MemberEdit(
  c: Hall1Catalog,
  team: number,
  slot: number,
  d: ReturnType<typeof hall1Draft>,
): Hall1Edit {
  const m = c.teams[team]?.members[slot];
  if (!c.canEdit || !Number.isInteger(team) || !Number.isInteger(slot) || !m)
    throw new Error("Invalid Hall of Fame position.");
  const initial = hall1Draft(m),
    fields: Hall1Fields = {};
  if (d.species !== initial.species) {
    if (!Number.isInteger(d.species) || d.species < 0 || d.species > 151)
      throw new Error("Invalid Hall of Fame species.");
    fields.species = d.species;
    if (d.species === 0) return { action: "member", team, slot, fields };
  }
  const level = hall1Byte(d.level);
  if (level !== m.level) fields.level = level;
  if (d.mode === "text" && d.nickname !== m.nickname) {
    if (d.nickname.length > c.nicknameLength)
      throw new Error("Hall of Fame nickname too long.");
    fields.nickname = d.nickname;
  } else if (
    d.mode === "bytes" &&
    d.nicknameHex.toUpperCase() !== m.nicknameHex
  ) {
    if (
      !new RegExp(`^[0-9a-fA-F]{${(c.nicknameLength + 1) * 2}}$`).test(
        d.nicknameHex,
      )
    )
      throw new Error("Invalid Hall of Fame nickname bytes.");
    fields.nicknameHex = d.nicknameHex.toUpperCase();
  } else if (d.mode === "default") fields.defaultNickname = true;
  if (!Object.keys(fields).length) throw new Error("No Hall of Fame changes.");
  return { action: "member", team, slot, fields };
}
export const hall1Words = {
  zh: {
    title: "殿堂记录",
    read: "读取殿堂记录",
    team: "队伍",
    slot: "成员",
    count: "通关计数",
    species: "宝可梦种类",
    level: "等级",
    empty: "空格位",
    clearChoice: "清空此格位",
    nickname: "昵称",
    mode: "昵称处理",
    keep: "保留原始昵称",
    text: "编辑昵称",
    bytes: "编辑昵称原始字节",
    default: "恢复种类名",
    apply: "应用成员修改",
    applyCount: "应用计数",
    discard: "放弃草稿",
    register: "登记当前队伍",
    delete: "删除此队伍",
    clearSlot: "清空此成员",
    clearAll: "清空全部记录",
    invalid: "请检查输入范围、昵称长度与原始字节。",
    draft: "先应用或放弃当前草稿，再切换队伍或执行其他操作。",
    note: "记录最多保留 50 队；计数达到 50 后登记会移除最早一队。删除队伍不减计数，清空全部会归零。修改可撤销，原存档保持不变。",
    rawNote: "原始昵称区包含结束符及残留字节。只在需要精确编辑时修改。",
    unknown: "未知种类",
  },
  en: {
    title: "Hall of Fame",
    read: "Read Hall of Fame",
    team: "Team",
    slot: "Member",
    count: "Clear count",
    species: "Species",
    level: "Level",
    empty: "Empty slot",
    clearChoice: "Clear this slot",
    nickname: "Nickname",
    mode: "Nickname handling",
    keep: "Keep original nickname",
    text: "Edit nickname",
    bytes: "Edit raw nickname bytes",
    default: "Restore species name",
    apply: "Apply member changes",
    applyCount: "Apply count",
    discard: "Discard draft",
    register: "Register current party",
    delete: "Delete this team",
    clearSlot: "Clear this member",
    clearAll: "Clear all records",
    invalid: "Check the ranges, nickname length and raw bytes.",
    draft:
      "Apply or discard the draft before changing teams or performing another operation.",
    note: "Up to 50 teams are stored. Registering at count 50 or above removes the oldest team. Deleting a team does not decrease the count; clearing all resets it. Changes can be undone and the original save is preserved.",
    rawNote:
      "The raw nickname region includes terminators and trailing bytes. Change it only for precise byte editing.",
    unknown: "Unknown species",
  },
  ja: {
    title: "殿堂入り記録",
    read: "殿堂入り記録を読み込む",
    team: "チーム",
    slot: "メンバー",
    count: "クリア回数",
    species: "種類",
    level: "レベル",
    empty: "空き枠",
    clearChoice: "この枠を空にする",
    nickname: "ニックネーム",
    mode: "名前の処理",
    keep: "元の名前を保持",
    text: "名前を編集",
    bytes: "名前の生バイトを編集",
    default: "種族名に戻す",
    apply: "メンバーの変更を適用",
    applyCount: "回数を適用",
    discard: "下書きを破棄",
    register: "現在の手持ちを登録",
    delete: "このチームを削除",
    clearSlot: "このメンバーを消去",
    clearAll: "全記録を消去",
    invalid: "入力範囲、名前の長さ、生バイトを確認してください。",
    draft:
      "チームの切り替えや別の操作の前に下書きを適用または破棄してください。",
    note: "最大 50 チームを保持します。回数が 50 以上で登録すると最古のチームが削除されます。チーム削除では回数を減らさず、全消去でゼロに戻します。変更は元に戻せ、元のセーブは保持されます。",
    rawNote:
      "名前の生バイトには終端と余剰データが含まれます。正確なバイト編集が必要な場合のみ変更してください。",
    unknown: "不明な種類",
  },
};
