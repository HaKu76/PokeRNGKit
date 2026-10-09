import type { LocalizedText } from "./domain";
import { hall3Id, hall3Words } from "./hall3";
export interface Painting3Entry {
  index: number;
  enabled: boolean;
  species: number;
  speciesInternal: number;
  caption: number;
  captionRaw: number;
  tid: number;
  sid: number;
  pid: string;
  nickname: string;
  trainer: string;
  nicknameHex: string;
  trainerHex: string;
  shiny: boolean;
  sprite: string;
}
export interface Painting3Catalog {
  canEdit: boolean;
  entries: Painting3Entry[];
  speciesChoices: { id: number; name: LocalizedText }[];
}
export interface Painting3Fields {
  enabled?: boolean;
  species?: number;
  caption?: number;
  tid?: number;
  sid?: number;
  pid?: number;
  nickname?: string;
  trainer?: string;
  nicknameHex?: string;
  trainerHex?: string;
}
export interface Painting3Edit {
  index: number;
  fields: Painting3Fields;
}
export const supportsPaintings3 = (format: string) =>
  format === "SAV3RS" || format === "SAV3E";
// Util.GetHexValue wraps each shift to UInt32; the upstream TextBox uses the default 32767-character limit.
export function painting3Pid(value: string) {
  let result = 0;
  for (const c of value) {
    if (/^[0-9a-f]$/i.test(c))
      result = (result * 16 + Number.parseInt(c, 16)) >>> 0;
  }
  return result;
}
export const painting3Draft = (p: Painting3Entry) => ({
  enabled: p.enabled,
  species: p.species,
  caption: "keep",
  tid: String(p.tid),
  sid: String(p.sid),
  pid: p.pid,
  nickname: p.nickname,
  trainer: p.trainer,
  nicknameHex: p.nicknameHex,
  trainerHex: p.trainerHex,
  nicknameMode: "keep" as "keep" | "text" | "bytes",
  trainerMode: "keep" as "keep" | "text" | "bytes",
});
export function painting3Dirty(
  p: Painting3Entry,
  d: ReturnType<typeof painting3Draft>,
) {
  if (!d.enabled) return p.enabled;
  return (
    !p.enabled ||
    d.species !== p.species ||
    d.caption !== "keep" ||
    hall3Id(d.tid) !== p.tid ||
    hall3Id(d.sid) !== p.sid ||
    painting3Pid(d.pid) !== Number.parseInt(p.pid, 16) ||
    (["nickname", "trainer"] as const).some(
      (k) =>
        (d[`${k}Mode`] === "text" && d[k] !== p[k]) ||
        (d[`${k}Mode`] === "bytes" &&
          d[`${k}Hex`].toUpperCase() !== p[`${k}Hex`]),
    )
  );
}
export function painting3Edit(
  c: Painting3Catalog,
  index: number,
  d: ReturnType<typeof painting3Draft>,
): Painting3Edit {
  const p = c.entries[index],
    fields: Painting3Fields = {};
  if (!c.canEdit || !Number.isInteger(index) || index < 0 || index >= 5 || !p)
    throw new Error("Invalid Gen3 painting position.");
  if (!d.enabled) return { index, fields: { enabled: false } };
  if (
    d.pid.length > 32767 ||
    d.tid.length > 5 ||
    d.sid.length > 5 ||
    !Number.isInteger(d.species) ||
    d.species < 0 ||
    d.species > 386
  )
    throw new Error("Invalid Gen3 painting fields.");
  if (!p.enabled) fields.enabled = true;
  if (d.species !== p.species) fields.species = d.species;
  if (d.caption !== "keep") {
    if (!/^[0-2]$/.test(d.caption))
      throw new Error("Invalid Gen3 painting caption.");
    fields.caption = Number(d.caption);
  }
  if (hall3Id(d.tid) !== p.tid) fields.tid = hall3Id(d.tid);
  if (hall3Id(d.sid) !== p.sid) fields.sid = hall3Id(d.sid);
  if (painting3Pid(d.pid) !== Number.parseInt(p.pid, 16))
    fields.pid = painting3Pid(d.pid);
  for (const k of ["nickname", "trainer"] as const) {
    const max = k === "nickname" ? 10 : 7;
    if (d[`${k}Mode`] === "text" && d[k] !== p[k]) {
      if (d[k].length > max) throw new Error("Gen3 painting name too long.");
      fields[k] = d[k];
    }
    if (
      d[`${k}Mode`] === "bytes" &&
      d[`${k}Hex`].toUpperCase() !== p[`${k}Hex`]
    ) {
      if (!new RegExp(`^[0-9a-f]{${max * 2}}$`, "i").test(d[`${k}Hex`]))
        throw new Error("Invalid Gen3 painting name bytes.");
      fields[`${k}Hex`] = d[`${k}Hex`].toUpperCase();
    }
  }
  if (!Object.keys(fields).length) throw new Error("No Gen3 painting changes.");
  return { index, fields };
}
export const paintings3Words = {
  zh: {
    ...hall3Words.zh,
    title: "绘画",
    read: "读取绘画",
    painting: "绘画",
    enabled: "启用此绘画",
    trainer: "训练家姓名",
    caption: "说明",
    keepCaption: "保留原始说明",
    categories: ["帅气", "美丽", "可爱", "聪明", "强壮"],
    keep: "保留原始文本",
    text: "编辑文本",
    bytes: "编辑原始字节",
    apply: "应用绘画修改",
    clear: "关闭并清空此绘画",
    note: "关闭绘画会清空该幅记录。所有修改可撤销，原存档保持不变。",
    draft: "先应用或放弃草稿，再切换绘画。",
    invalid: "请检查种类、说明 0–2、ID 范围、文本长度与原始字节。",
  },
  en: {
    ...hall3Words.en,
    title: "Paintings",
    read: "Read paintings",
    painting: "Painting",
    enabled: "Enable this painting",
    trainer: "Original trainer name",
    caption: "Caption",
    keepCaption: "Keep original caption",
    categories: ["Cool", "Beauty", "Cute", "Smart", "Tough"],
    keep: "Keep original text",
    text: "Edit text",
    bytes: "Edit raw bytes",
    apply: "Apply painting changes",
    clear: "Disable and clear this painting",
    note: "Disabling clears this painting's record. All changes can be undone and the original save is preserved.",
    draft: "Apply or discard the draft before changing paintings.",
    invalid:
      "Check species, caption 0–2, ID ranges, text lengths and raw bytes.",
  },
  ja: {
    ...hall3Words.ja,
    title: "絵画",
    read: "絵画を読み込む",
    painting: "絵画",
    enabled: "この絵画を有効にする",
    trainer: "親の名前",
    caption: "説明",
    keepCaption: "元の説明を保持",
    categories: [
      "かっこよさ",
      "うつくしさ",
      "かわいさ",
      "かしこさ",
      "たくましさ",
    ],
    keep: "元の文字列を保持",
    text: "文字列を編集",
    bytes: "生バイトを編集",
    apply: "絵画の変更を適用",
    clear: "この絵画を無効にして消去",
    note: "無効にするとこの絵画の記録を消去します。変更は元に戻せ、元のセーブは保持されます。",
    draft: "絵画を切り替える前に下書きを適用または破棄してください。",
    invalid: "種類、説明 0–2、ID 範囲、文字数、生バイトを確認してください。",
  },
};
