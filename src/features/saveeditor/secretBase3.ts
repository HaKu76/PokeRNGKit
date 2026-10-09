export interface Base3Member {
  slot: number;
  species: number;
  rawSpecies: number;
  pid: string;
  heldItem: number;
  moves: number[];
  level: number;
  ev: number;
  form: number;
  sprite: string;
}
export interface Base3Entry {
  slot: number;
  name: string;
  nameHex: string;
  language: number;
  location: number;
  class: number;
  tid: number;
  sid: number;
  gender: number;
  times: number;
  registry: number;
  battled: boolean;
  members: Base3Member[];
}
type Choice = { id: number; name: { zh: string; en: string; ja: string } };
export interface SecretBase3Catalog {
  canEdit: boolean;
  bases: Base3Entry[];
  speciesChoices: Choice[];
  moveChoices: Choice[];
  itemChoices: Choice[];
}
export interface Base3TrainerEdit {
  name?: string;
  nameHex?: string;
  tid?: number;
  sid?: number;
  gender?: number;
  times?: number;
  registry?: number;
  battled?: boolean;
}
export interface Base3MemberEdit {
  species?: number;
  pid?: number;
  heldItem?: number;
  moves?: (number | null)[];
  level?: number;
  ev?: number;
}
export type SecretBase3Edit =
  | { action: "trainer"; base: number; trainer: Base3TrainerEdit }
  | {
      action: "member";
      base: number;
      member: number;
      pokemon: Base3MemberEdit;
    };
export interface Base3FormQuery {
  base: number;
  member: number;
  pid: number;
  form: number;
}
export interface Base3FormSuggestion {
  pid: string;
  form: number;
  sprite: string;
}
export const supportsSecretBase3 = (format: string) =>
  format === "SAV3RS" || format === "SAV3E";
export const base3Digits = (value: string, max: number, width: number) =>
  String(
    Math.min(Number(value.replace(/\D/g, "").slice(0, width) || "0"), max),
  );
export const base3Pid = (value: string) => {
  const v = value.slice(0, 8).toUpperCase();
  return v === "" ? "0" : /^[0-9A-F]+$/.test(v) ? v : "FFFFFFFF";
};
export const base3TrainerDraft = (b: Base3Entry) => ({
  name: b.name,
  hex: b.nameHex,
  tid: String(b.tid),
  sid: String(b.sid),
  gender: String(b.gender),
  times: String(b.times),
  registry: "keep",
  battled: b.battled,
});
export const base3MemberDraft = (p: Base3Member) => ({
  species: "keep",
  pid: p.pid,
  item: "keep",
  moves: Array<string>(4).fill("keep"),
  level: String(p.level),
  ev: String(p.ev),
});
function decimal(v: string, max: number, width: number) {
  if (!new RegExp(`^\\d{0,${width}}$`).test(v) || Number(v) > max)
    throw Error("Invalid secret base value.");
  return Number(v);
}
function pid(v: string) {
  if (!/^[0-9A-Fa-f]{1,8}$/.test(v)) throw Error("Invalid secret base PID.");
  return parseInt(v, 16);
}
export function base3TrainerEdit(
  c: SecretBase3Catalog,
  b: Base3Entry,
  d: ReturnType<typeof base3TrainerDraft>,
  mode: "text" | "hex",
): SecretBase3Edit {
  if (!c.canEdit || !c.bases.some((v) => v.slot === b.slot))
    throw Error("Secret base is unavailable.");
  const t: Base3TrainerEdit = {};
  if (mode === "text" && d.name !== b.name) {
    if (d.name.length > 7) throw Error("Secret base name is too long.");
    t.name = d.name;
  }
  if (mode === "hex" && d.hex !== b.nameHex) {
    if (!/^[0-9A-Fa-f]{14}$/.test(d.hex))
      throw Error("Invalid secret base name bytes.");
    t.nameHex = d.hex.toUpperCase();
  }
  if (d.tid !== String(b.tid)) t.tid = decimal(d.tid, 65535, 5);
  if (d.sid !== String(b.sid)) t.sid = decimal(d.sid, 65535, 5);
  if (d.times !== String(b.times)) t.times = decimal(d.times, 255, 3);
  if (d.gender !== String(b.gender)) {
    if (!/^[01]$/.test(d.gender)) throw Error("Invalid gender.");
    t.gender = Number(d.gender);
  }
  if (d.registry !== "keep") {
    if (!/^[01]$/.test(d.registry)) throw Error("Invalid registry state.");
    t.registry = Number(d.registry);
  }
  if (d.battled !== b.battled) t.battled = d.battled;
  if (!Object.keys(t).length) throw Error("No secret base trainer changes.");
  return { action: "trainer", base: b.slot, trainer: t };
}
export function base3MemberEdit(
  c: SecretBase3Catalog,
  b: Base3Entry,
  p: Base3Member,
  d: ReturnType<typeof base3MemberDraft>,
): SecretBase3Edit {
  if (
    !c.canEdit ||
    !c.bases.some((v) => v.slot === b.slot) ||
    !b.members.some((v) => v.slot === p.slot) ||
    d.moves.length !== 4
  )
    throw Error("Secret base member is unavailable.");
  const f: Base3MemberEdit = {};
  const choice = (v: string, list: Choice[]) => {
    if (!/^\d{1,3}$/.test(v) || !list.some((c) => c.id === Number(v)))
      throw Error("Invalid secret base choice.");
    return Number(v);
  };
  if (d.species !== "keep") f.species = choice(d.species, c.speciesChoices);
  if (f.species === 0)
    return {
      action: "member",
      base: b.slot,
      member: p.slot,
      pokemon: { species: 0 },
    };
  if ((f.species ?? p.species) === 0) throw Error("Choose a species.");
  if (d.pid !== p.pid) f.pid = pid(d.pid);
  if (d.item !== "keep") f.heldItem = choice(d.item, c.itemChoices);
  const moves = d.moves.map((v) =>
    v === "keep" ? null : choice(v, c.moveChoices),
  );
  if (moves.some((v) => v !== null)) f.moves = moves;
  if (d.level !== String(p.level)) {
    f.level = decimal(d.level, 100, 3);
    if (f.level < 2) throw Error("Level starts at 2.");
  }
  if (d.ev !== String(p.ev)) f.ev = decimal(d.ev, 85, 2);
  if (!Object.keys(f).length) throw Error("No secret base member changes.");
  return { action: "member", base: b.slot, member: p.slot, pokemon: f };
}
export function base3FormQuery(
  c: SecretBase3Catalog,
  b: Base3Entry,
  p: Base3Member,
  value: string,
  form: number,
): Base3FormQuery {
  if (
    !c.canEdit ||
    !c.bases.some((v) => v.slot === b.slot) ||
    !b.members.some((v) => v.slot === p.slot) ||
    !Number.isInteger(form) ||
    form < 0 ||
    form > 27
  )
    throw Error("Invalid secret base form preview.");
  return { base: b.slot, member: p.slot, pid: pid(value), form };
}
export const base3Letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "!", "?"];
export const secretBase3Words = {
  zh: {
    title: "秘密基地",
    read: "读取秘密基地",
    base: "已记录的基地",
    empty: "没有已记录的秘密基地。",
    trainer: "基地训练家",
    team: "基地队伍",
    name: "训练家姓名",
    text: "文字",
    hex: "原始姓名字节",
    tid: "训练家 ID",
    sid: "隐藏 ID",
    gender: "性别",
    genders: ["男", "女"],
    times: "进入次数",
    registry: "登记状态",
    keepRegistry: "保留原始状态",
    registryStates: ["未登记", "已登记"],
    battled: "当天已对战",
    location: "基地位置代码",
    language: "记录语言代码",
    classes: [
      "大少爷／大小姐",
      "短裤小子／迷你裙",
      "捕虫少年／学生",
      "露营少年／野餐女孩",
      "精英训练家",
    ],
    applyTrainer: "应用训练家修改",
    applyMember: "应用成员修改",
    hide: "清空姓名会使该记录从已记录基地列表中消失；同槽其他信息保留。",
    species: "宝可梦",
    pid: "个性值（十六进制）",
    item: "携带道具",
    move: "招式",
    level: "等级",
    ev: "各项统一努力值",
    form: "目标未知图腾形态",
    originalForm: "原始形态",
    preview: "生成形态预览",
    previewNote:
      "形态预览显示将使用的个性值；切换形态时会重新生成，应用成员修改后才写入存档。",
    previewed: "预览个性值",
    clear: "选择空种类会清空该成员全部字段。",
    keep: "保留原始值",
    unknown: "未识别的原始成员",
    old: "旧等级、努力值或编号超出输入范围，未修改时保留。",
    discard: "放弃草稿",
    draft: "先应用或放弃草稿，再切换基地、成员或编辑另一组。",
    invalid:
      "请检查姓名、ID、原始字节和成员字段。新等级为 2–100，各项统一努力值为 0–85。",
    note: "修改可撤销，原存档与未选基地保持不变。",
  },
  en: {
    title: "Secret bases",
    read: "Read secret bases",
    base: "Recorded base",
    empty: "No recorded secret bases.",
    trainer: "Base trainer",
    team: "Base team",
    name: "Trainer name",
    text: "Text",
    hex: "Raw name bytes",
    tid: "Trainer ID",
    sid: "Secret ID",
    gender: "Gender",
    genders: ["Male", "Female"],
    times: "Entrances",
    registry: "Registry status",
    keepRegistry: "Keep original state",
    registryStates: ["Unregistered", "Registered"],
    battled: "Battled today",
    location: "Base location code",
    language: "Record language code",
    classes: [
      "Rich Boy/Lady",
      "Youngster/Lass",
      "Bug Catcher/Schoolkid",
      "Camper/Picnicker",
      "Ace Trainer",
    ],
    applyTrainer: "Apply trainer changes",
    applyMember: "Apply member changes",
    hide: "Clearing the name removes this entry from the recorded-base list. Other data in the slot is retained.",
    species: "Pokémon",
    pid: "PID (hex)",
    item: "Held item",
    move: "Move",
    level: "Level",
    ev: "EV for every stat",
    form: "Target Unown form",
    originalForm: "Original form",
    preview: "Generate form preview",
    previewNote:
      "The form preview displays the proposed PID and rerolls it when changing form. It is written only when member changes are applied.",
    previewed: "Preview PID",
    clear: "Choosing an empty species clears all fields of this member.",
    keep: "Keep original value",
    unknown: "Unrecognized original member",
    old: "Original levels, EVs or IDs exceed the input ranges. They are retained unless edited.",
    discard: "Discard draft",
    draft:
      "Apply or discard the draft before changing bases or members, or editing another group.",
    invalid:
      "Check the name, IDs, raw bytes and member fields. New levels are 2–100 and the EV for every stat is 0–85.",
    note: "Changes can be undone. The original save and unselected bases are preserved.",
  },
  ja: {
    title: "ひみつきち",
    read: "ひみつきちを読み込む",
    base: "記録された基地",
    empty: "記録されたひみつきちはありません。",
    trainer: "基地のトレーナー",
    team: "基地の手持ち",
    name: "トレーナー名",
    text: "文字",
    hex: "元の名前のバイト列",
    tid: "トレーナー ID",
    sid: "裏 ID",
    gender: "性別",
    genders: ["男", "女"],
    times: "入った回数",
    registry: "登録状態",
    keepRegistry: "元の状態を保持",
    registryStates: ["未登録", "登録済み"],
    battled: "本日対戦済み",
    location: "基地の場所コード",
    language: "記録の言語コード",
    classes: [
      "おぼっちゃま／おじょうさま",
      "たんぱんこぞう／ミニスカート",
      "むしとりしょうねん／じゅくがえり",
      "キャンプボーイ／ピクニックガール",
      "エリートトレーナー",
    ],
    applyTrainer: "トレーナーの変更を適用",
    applyMember: "メンバーの変更を適用",
    hide: "名前を空にすると記録一覧から消えます。同じスロットの他のデータは保持します。",
    species: "ポケモン",
    pid: "性格値（16進数）",
    item: "持ち物",
    move: "技",
    level: "レベル",
    ev: "各能力共通の努力値",
    form: "アンノーンの目標の姿",
    originalForm: "元の姿",
    preview: "姿をプレビュー",
    previewNote:
      "姿のプレビューでは使用する性格値を表示し、姿を変える場合は再生成します。メンバーの変更を適用した場合のみ保存します。",
    previewed: "プレビュー性格値",
    clear: "空の種類を選ぶと、このメンバーの全項目を消去します。",
    keep: "元の値を保持",
    unknown: "未認識の元のメンバー",
    old: "元のレベル、努力値または番号が入力範囲外です。編集しなければ保持します。",
    discard: "下書きを破棄",
    draft:
      "基地やメンバーの切り替え、別の編集の前に下書きを適用または破棄してください。",
    invalid:
      "名前、ID、バイト列、メンバー項目を確認してください。新しいレベルは 2–100、共通努力値は 0–85 です。",
    note: "変更は元に戻せ、元のセーブと選択していない基地は保持されます。",
  },
};
