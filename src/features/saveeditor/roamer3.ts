import type { LocalizedText } from "./domain";
import { hall3Pid, hall3Words } from "./hall3";
import { roamerWords } from "./roamer";
export interface Roamer3Catalog {
  canEdit: boolean;
  species: number;
  pid: string;
  ivs: number[];
  encounterIvs: number[];
  glitched: boolean;
  level: number;
  hp: number;
  active: boolean;
  shiny: boolean;
  sprite: string;
  speciesChoices: { id: number; name: LocalizedText }[];
}
export interface Roamer3Edit {
  species?: number;
  pid?: number;
  ivs?: (number | null)[];
  level?: number;
  hp?: number;
  active?: boolean;
}
export const supportsRoamer3 = (format: string) =>
  ["SAV3RS", "SAV3E", "SAV3FRLG"].includes(format);
export const roamer3Draft = (c: Roamer3Catalog) => ({
  species: c.species,
  pid: c.pid,
  ivs: c.ivs.map(String),
  level: String(c.level),
  hp: String(c.hp),
  active: c.active,
});
export const roamer3Dirty = (
  c: Roamer3Catalog,
  d: ReturnType<typeof roamer3Draft>,
) =>
  d.species !== c.species ||
  hall3Pid(d.pid) !== Number.parseInt(c.pid, 16) ||
  d.ivs.some((v, i) => v !== String(c.ivs[i])) ||
  d.level !== String(c.level) ||
  d.hp !== String(c.hp) ||
  d.active !== c.active;
export function roamer3Edit(
  c: Roamer3Catalog,
  d: ReturnType<typeof roamer3Draft>,
): Roamer3Edit {
  const fields: Roamer3Edit = {};
  if (!c.canEdit || d.pid.length > 8 || d.ivs.length !== 6)
    throw new Error("Invalid Gen3 roamer fields.");
  if (d.species !== c.species) {
    if (!Number.isInteger(d.species) || d.species < 0 || d.species > 386)
      throw new Error("Invalid Gen3 roamer species.");
    fields.species = d.species;
  }
  const pid = hall3Pid(d.pid);
  if (pid !== Number.parseInt(c.pid, 16)) fields.pid = pid;
  const ivs = d.ivs.map((v, i) => {
    if (!/^\d{0,2}$/.test(v)) throw new Error("Invalid Gen3 roamer IV.");
    return Number(v) === c.ivs[i] ? null : Number(v);
  });
  if (ivs.some((v) => v !== null)) fields.ivs = ivs;
  if (d.level !== String(c.level)) {
    if (!/^\d{1,3}$/.test(d.level) || Number(d.level) > 100)
      throw new Error("Invalid Gen3 roamer level.");
    if (Number(d.level) !== c.level) fields.level = Number(d.level);
  }
  if (!/^\d{1,5}$/.test(d.hp) || Number(d.hp) > 65535)
    throw new Error("Invalid Gen3 roamer HP.");
  if (Number(d.hp) !== c.hp) fields.hp = Number(d.hp);
  if (d.active !== c.active) fields.active = d.active;
  if (!Object.keys(fields).length) throw new Error("No Gen3 roamer changes.");
  return fields;
}
export const roamer3Words = {
  zh: {
    ...hall3Words.zh,
    ...roamerWords.zh,
    level: "等级",
    pid: "个性值（十六进制）",
    hp: "当前 HP",
    active: "游走已激活",
    ivs: ["体力", "攻击", "防御", "速度", "特攻", "特防"],
    ivTitle: "个体值",
    ivNote: "个体值可输入 0–99，超过 31 时按 31 保存。",
    glitch:
      "此版本遭遇游走宝可梦时只加载个体值最低一字节，完整存储值仍会保留。",
    encounter: "遭遇时的个体值",
    originalLevel: "原始等级超过 100；未修改时保留，新输入范围为 0–100。",
    invalid:
      "请检查种类、八位十六进制个性值、个体值 0–99、等级 0–100 和 HP 0–65535。",
    note: "修改作用于工作副本，可撤销；不会自动改写其他剧情、异常状态或华丽数值。",
    unknown: "未知种类",
  },
  en: {
    ...hall3Words.en,
    ...roamerWords.en,
    level: "Level",
    pid: "Personality value (hex)",
    hp: "Current HP",
    active: "Roaming active",
    ivs: ["HP", "Attack", "Defense", "Speed", "Sp. Atk", "Sp. Def"],
    ivTitle: "Individual values",
    ivNote: "IV inputs accept 0–99; values above 31 are saved as 31.",
    glitch:
      "This game loads only the lowest IV byte when encountering the roamer. Full stored values are preserved.",
    encounter: "Encounter IVs",
    originalLevel:
      "The original level exceeds 100. It is preserved unless changed; new input must be 0–100.",
    invalid:
      "Check species, eight-digit hexadecimal PID, IVs 0–99, level 0–100 and HP 0–65535.",
    note: "Changes apply to the working copy and can be undone. Other story flags, status and contest data remain unchanged.",
    unknown: "Unknown species",
  },
  ja: {
    ...hall3Words.ja,
    ...roamerWords.ja,
    level: "レベル",
    pid: "性格値（16 進数）",
    hp: "現在の HP",
    active: "徘徊中",
    ivs: ["HP", "攻撃", "防御", "素早さ", "特攻", "特防"],
    ivTitle: "個体値",
    ivNote: "個体値は 0–99 を入力でき、31 を超える値は 31 で保存します。",
    glitch:
      "このバージョンは遭遇時に個体値の下位 1 バイトだけを読み込みます。保存された全個体値は保持します。",
    encounter: "遭遇時の個体値",
    originalLevel:
      "元のレベルが 100 を超えています。変更しなければ保持し、新しい値は 0–100 です。",
    invalid:
      "種類、8 桁の 16 進性格値、個体値 0–99、レベル 0–100、HP 0–65535 を確認してください。",
    note: "変更は作業コピーに適用し、元に戻せます。他のイベント、状態異常、コンテスト値は変更しません。",
    unknown: "不明な種類",
  },
};
